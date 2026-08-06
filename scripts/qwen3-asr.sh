#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=common.sh
. "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/common.sh"

MODEL_ID="Qwen/Qwen3-ASR-1.7B-hf"
MODEL_REVISION="bcd2b5b7f32b480ab5790554cfa8347f246a14f3"
PORT=26007
RUNTIME_DIR="$HOME/.local/share/qwen3-asr"
VENV="$RUNTIME_DIR/.venv"
HF_HOME_DIR="$HOME/.cache/huggingface"
MODEL_FILE="$HF_HOME_DIR/hub/models--Qwen--Qwen3-ASR-1.7B-hf/snapshots/$MODEL_REVISION/model.safetensors"
SERVICE_FILE="$HOME/.config/systemd/user/qwen3-asr.service"

usage() {
    cat >&2 <<EOF
usage: ${0##*/} {runtime|model|enable|status}

  runtime  Create the Python environment and install pinned dependencies.
  model    Explicitly download the pinned 3.9 GB model snapshot.
  enable   Enable and start the systemd user service.
  status   Show service and endpoint status.

The normal dotfiles installer never runs these commands.
EOF
    exit 2
}

require_runtime() {
    [ -x "$VENV/bin/python" ] || die "runtime missing; run: $0 runtime"
}

require_model() {
    [ -f "$MODEL_FILE" ] || die "model missing; run: $0 model"
}

install_runtime() {
    command -v uv >/dev/null 2>&1 || die "uv is required; run the dotfiles tools installer first"
    command -v ffmpeg >/dev/null 2>&1 || die "ffmpeg is required; run the dotfiles package installer first"

    uv python install 3.12.13
    if [ ! -x "$VENV/bin/python" ]; then
        mkdir -p "$RUNTIME_DIR"
        uv venv --python 3.12.13 "$VENV"
    fi

    uv pip sync \
        --python "$VENV/bin/python" \
        "$DOTFILES_ROOT/packages/qwen3-asr.txt"

    "$VENV/bin/python" - <<'PY'
import torch
import transformers

assert transformers.__version__ == "5.14.1"
assert torch.__version__.startswith("2.13.0")
assert torch.cuda.is_available(), "PyTorch cannot access CUDA"
assert torch.cuda.is_bf16_supported(), "GPU does not support BF16"
print(f"Transformers {transformers.__version__}; PyTorch {torch.__version__}; {torch.cuda.get_device_name(0)}")
PY
    log "Qwen3-ASR runtime is ready"
}

install_model() {
    require_runtime
    log "Downloading $MODEL_ID at revision $MODEL_REVISION (approximately 3.9 GB)"
    HF_HOME="$HF_HOME_DIR" MODEL_ID="$MODEL_ID" MODEL_REVISION="$MODEL_REVISION" "$VENV/bin/python" - <<'PY'
import json
import os
from huggingface_hub import snapshot_download
from transformers import AutoProcessor

model_id = os.environ["MODEL_ID"]
revision = os.environ["MODEL_REVISION"]
path = snapshot_download(
    repo_id=model_id,
    revision=revision,
    allow_patterns=[
        "chat_template.jinja",
        "config.json",
        "model.safetensors",
        "processor_config.json",
        "tokenizer_config.json",
        "tokenizer.json",
    ],
)
config = json.loads((__import__("pathlib").Path(path) / "config.json").read_text())
assert not config.get("auto_map"), "model unexpectedly requests remote code"
AutoProcessor.from_pretrained(
    model_id,
    revision=revision,
    local_files_only=True,
    trust_remote_code=False,
)
print(path)
PY
    require_model
    log "Pinned model snapshot is ready"
}

enable_service() {
    require_runtime
    require_model
    [ -L "$SERVICE_FILE" ] || die "service is not linked; run: $DOTFILES_ROOT/install.sh links"
    command -v systemctl >/dev/null 2>&1 || die "systemctl is required"

    systemctl --user daemon-reload
    systemctl --user enable --now qwen3-asr.service

    for _ in $(seq 1 40); do
        if curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
            log "Qwen3-ASR enabled at http://127.0.0.1:$PORT/v1"
            return
        fi
        systemctl --user is-active --quiet qwen3-asr.service \
            || die "qwen3-asr.service failed during startup; inspect its journal"
        sleep 3
    done
    die "qwen3-asr.service did not become healthy within 120 seconds"
}

show_status() {
    systemctl --user status qwen3-asr.service --no-pager || true
    printf '\nEndpoint: '
    if curl -fsS "http://127.0.0.1:$PORT/health"; then
        printf '\n'
    else
        printf 'unavailable\n'
    fi
}

[ "$#" -eq 1 ] || usage
case "$1" in
    runtime) install_runtime ;;
    model) install_model ;;
    enable) enable_service ;;
    status) show_status ;;
    *) usage ;;
esac
