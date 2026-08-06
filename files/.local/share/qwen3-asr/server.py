#!/usr/bin/env python3
"""Local OpenAI-compatible transcription adapter for Qwen3-ASR."""

from __future__ import annotations

import argparse
import asyncio
import io
import logging
import os
import subprocess
import time
from contextlib import asynccontextmanager
from typing import Annotated

import numpy as np
import torch
import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from transformers import AutoModelForMultimodalLM, AutoProcessor
from transformers.models.qwen3_asr.processing_qwen3_asr import resolve_language

MODEL_ID = "Qwen/Qwen3-ASR-1.7B-hf"
MODEL_REVISION = "bcd2b5b7f32b480ab5790554cfa8347f246a14f3"
DEFAULT_PORT = 26_007
MAX_AUDIO_BYTES = 100 * 1024 * 1024
MAX_AUDIO_SECONDS = 3_600
MAX_PROMPT_CHARS = 4_000
MAX_NEW_TOKENS = 2_048

log = logging.getLogger("qwen3-asr")
processor = None
model = None
inference_lock = asyncio.Lock()


def decode_audio(data: bytes, sampling_rate: int) -> np.ndarray:
    """Decode any FFmpeg-supported audio container into mono float32 PCM."""
    try:
        result = subprocess.run(
            [
                "ffmpeg",
                "-nostdin",
                "-hide_banner",
                "-loglevel",
                "error",
                "-i",
                "pipe:0",
                "-vn",
                "-t",
                str(MAX_AUDIO_SECONDS + 1),
                "-ac",
                "1",
                "-ar",
                str(sampling_rate),
                "-f",
                "f32le",
                "pipe:1",
            ],
            input=data,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
            timeout=120,
        )
    except subprocess.TimeoutExpired as exc:
        raise ValueError("Audio decoding timed out") from exc

    if result.returncode != 0:
        detail = result.stderr.decode("utf-8", errors="replace").strip()
        raise ValueError(f"FFmpeg could not decode the audio: {detail[-500:]}")

    audio = np.frombuffer(result.stdout, dtype=np.float32)
    if audio.size == 0:
        raise ValueError("Decoded audio is empty")
    if audio.size > sampling_rate * MAX_AUDIO_SECONDS:
        raise ValueError("Audio exceeds the one-hour transcription limit")
    return audio


def prepare_inputs(audio: np.ndarray, language: str | None, prompt: str | None):
    """Mirror the corrected Qwen processor API while Transformers 5.14 ignores prompt."""
    canonical_language = resolve_language(language) if language else None
    messages: list[dict] = []
    if prompt:
        messages.append({"role": "system", "content": [{"type": "text", "text": prompt}]})
    messages.append({"role": "user", "content": [{"type": "audio", "audio": audio}]})

    # Qwen forces a language by prefilling the assistant response. With no
    # language, the model performs language detection itself.
    prefill = f"language {canonical_language}<asr_text>" if canonical_language else ""
    messages.append({"role": "assistant", "content": [{"type": "text", "text": prefill}]})

    return processor.apply_chat_template(
        messages,
        tokenize=True,
        return_dict=True,
        continue_final_message=True,
    )


def transcribe_sync(audio: np.ndarray, language: str | None, prompt: str | None) -> str:
    inputs = prepare_inputs(audio, language, prompt).to(model.device, model.dtype)
    input_length = inputs["input_ids"].shape[1]

    with torch.inference_mode():
        output_ids = model.generate(**inputs, max_new_tokens=MAX_NEW_TOKENS)

    generated_ids = output_ids[:, input_length:]
    text = processor.decode(generated_ids, return_format="transcription_only")[0]
    return text.strip()


@asynccontextmanager
async def lifespan(_: FastAPI):
    global processor, model

    if not torch.cuda.is_available():
        raise RuntimeError("CUDA is unavailable")

    log.info("Loading %s on %s", MODEL_ID, torch.cuda.get_device_name(0))
    processor = AutoProcessor.from_pretrained(
        MODEL_ID,
        revision=MODEL_REVISION,
        local_files_only=True,
        trust_remote_code=False,
    )
    model = AutoModelForMultimodalLM.from_pretrained(
        MODEL_ID,
        revision=MODEL_REVISION,
        dtype=torch.bfloat16,
        device_map={"": "cuda:0"},
        local_files_only=True,
        trust_remote_code=False,
    ).eval()
    log.info(
        "Ready; CUDA memory allocated %.1f MiB",
        torch.cuda.memory_allocated() / 2**20,
    )
    yield
    model = None
    processor = None
    torch.cuda.empty_cache()


app = FastAPI(title="Qwen3-ASR local server", lifespan=lifespan)


@app.get("/health")
def health():
    return {
        "status": "ok" if model is not None else "loading",
        "model": MODEL_ID,
        "revision": MODEL_REVISION,
        "cuda": torch.cuda.is_available(),
    }


@app.get("/v1/models")
def models():
    return {
        "object": "list",
        "data": [{"id": MODEL_ID, "object": "model", "owned_by": "Qwen"}],
    }


@app.post("/v1/audio/transcriptions")
async def transcriptions(
    file: Annotated[UploadFile, File()],
    requested_model: Annotated[str, Form(alias="model")],
    language: Annotated[str | None, Form()] = None,
    prompt: Annotated[str | None, Form()] = None,
    stream: Annotated[bool, Form()] = False,
):
    del stream  # OpenWhispr expects a normal JSON response for this endpoint.

    if requested_model != MODEL_ID:
        raise HTTPException(status_code=400, detail=f"Only {MODEL_ID!r} is loaded")
    if language and language.lower() == "auto":
        language = None
    if prompt:
        prompt = prompt.strip()[:MAX_PROMPT_CHARS] or None

    data = await file.read(MAX_AUDIO_BYTES + 1)
    if not data:
        raise HTTPException(status_code=400, detail="Audio file is empty")
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio file exceeds 100 MiB")

    started = time.perf_counter()
    try:
        audio = await asyncio.to_thread(decode_audio, data, processor.feature_extractor.sampling_rate)
        async with inference_lock:
            text = await asyncio.to_thread(transcribe_sync, audio, language, prompt)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except torch.OutOfMemoryError as exc:
        torch.cuda.empty_cache()
        raise HTTPException(status_code=503, detail="GPU out of memory") from exc
    except Exception:
        log.exception("Transcription failed")
        raise HTTPException(status_code=500, detail="Transcription failed; inspect server logs")

    log.info(
        "Transcribed %.1fs of audio in %.2fs",
        audio.size / processor.feature_extractor.sampling_rate,
        time.perf_counter() - started,
    )
    return {"text": text}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
