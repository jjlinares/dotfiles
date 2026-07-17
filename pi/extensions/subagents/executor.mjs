import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const KILL_GRACE_MS = 3000;
const MAX_JSONL_BYTES = 50 * 1024 * 1024;

function now() {
  return Date.now();
}

function safeName(value) {
  return String(value || "task").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "task";
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", `'"'"'`)}'`;
}

function formatResumeCommand(session) {
  return `(cd -- ${shellQuote(session.cwd)} && pi --session ${session.id})`;
}

function writeJsonAtomic(file, value) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, file);
}

function appendEvent(eventsPath, event) {
  fs.appendFileSync(eventsPath, `${JSON.stringify(event)}\n`, { mode: 0o600 });
}

function ensurePrivateDir(dir) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  try { fs.chmodSync(dir, 0o700); } catch {}
}

function emptyUsage() {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, totalTokens: 0, turns: 0 };
}

function normalizeTools(tools) {
  if (tools === undefined || tools === null) return undefined;
  if (tools === false) return false;
  if (Array.isArray(tools)) return tools.filter(Boolean).join(",");
  if (typeof tools === "string") return tools;
  return undefined;
}

function textFromMessage(message) {
  if (!message?.content || !Array.isArray(message.content)) return "";
  return message.content
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n");
}

function addUsage(target, message) {
  const usage = message?.usage;
  if (!usage) return;
  target.input += usage.input || 0;
  target.output += usage.output || 0;
  target.cacheRead += usage.cacheRead || 0;
  target.cacheWrite += usage.cacheWrite || 0;
  target.cost += usage.cost?.total || 0;
  target.totalTokens += usage.totalTokens || ((usage.input || 0) + (usage.output || 0));
}

function getPiInvocation(args, config) {
  const script = config.piScript || process.env.PI_SUBAGENTS_PI_SCRIPT;
  if (script) return { command: process.execPath, args: [script, ...args] };
  return { command: "pi", args };
}

function createStatus(config) {
  return {
    id: config.runId,
    state: "running",
    cwd: config.cwd,
    notify: config.notify,
    startedAt: now(),
    updatedAt: now(),
    completedAt: undefined,
    error: undefined,
    subagents: config.subagents.map((task, index) => ({
      id: task.id,
      index,
      name: task.name,
      state: "queued",
      cwd: task.cwd ?? config.cwd,
      context: task.context,
      model: task.model,
      thinking: task.thinking,
      sessionFile: task.sessionFile,
      sessionId: undefined,
      resumeCommand: undefined,
      startedAt: undefined,
      completedAt: undefined,
      updatedAt: now(),
      exitCode: undefined,
      error: undefined,
      warning: undefined,
      preview: "",
      currentTool: undefined,
      currentToolArgs: undefined,
      currentToolStartedAt: undefined,
      currentPath: undefined,
      toolCount: 0,
      recentTools: [],
      recentOutput: [],
      outputFile: path.join(config.runDir, `output-${index}-${safeName(task.name)}.md`),
      stderrFile: path.join(config.runDir, `subagent-${index}-${safeName(task.name)}.stderr.log`),
      ...(config.includeJsonl ? { stdoutFile: path.join(config.runDir, `subagent-${index}-${safeName(task.name)}.jsonl`) } : {}),
      usage: emptyUsage(),
    })),
  };
}

function persist(status, statusPath, onUpdate) {
  const completed = status.subagents.filter((task) => ["complete", "failed"].includes(task.state)).length;
  const failed = status.subagents.filter((task) => task.state === "failed").length;
  status.updatedAt = now();
  if (completed === status.subagents.length) {
    status.state = failed > 0 ? "failed" : "complete";
    status.completedAt ??= now();
  } else {
    status.state = "running";
  }
  writeJsonAtomic(statusPath, status);
  onUpdate?.(status);
}

function writeSubagentFiles(config, task, index) {
  const name = safeName(task.name);
  const promptPath = task.appendSystemPrompt ? path.join(config.runDir, `prompt-${index}-${name}.md`) : undefined;
  if (promptPath) fs.writeFileSync(promptPath, task.appendSystemPrompt, { encoding: "utf8", mode: 0o600 });

  const taskPath = path.join(config.runDir, `input-${index}-${name}.md`);
  fs.writeFileSync(taskPath, `Task:\n${task.task}\n`, { mode: 0o600 });
  return { promptPath, taskPath };
}

function argsForSubagent(config, task, index) {
  const { promptPath, taskPath } = writeSubagentFiles(config, task, index);
  const args = ["--mode", "json", "-p", "--no-extensions"];
  if (task.sessionFile) args.push("--session", task.sessionFile);
  if (task.model) args.push("--model", task.model);
  if (task.thinking) args.push("--thinking", task.thinking);

  const tools = normalizeTools(task.tools);
  if (tools === false) args.push("--no-tools");
  else if (tools) args.push("--tools", tools);

  if (promptPath) args.push("--append-system-prompt", promptPath);
  args.push(`@${taskPath}`);
  return args;
}

function appendRawJsonl(subagentStatus, line, rawJsonlBytes, config) {
  if (!subagentStatus.stdoutFile) return;
  const maxBytes = config.maxJsonlBytes ?? MAX_JSONL_BYTES;
  const chunk = `${line}\n`;
  const current = rawJsonlBytes.get(subagentStatus.stdoutFile) ?? 0;
  const size = Buffer.byteLength(chunk, "utf8");
  if (current >= maxBytes) return;
  if (current + size > maxBytes) {
    const marker = `{"type":"subagent_jsonl_truncated","maxBytes":${maxBytes}}\n`;
    fs.appendFileSync(subagentStatus.stdoutFile, marker, { mode: 0o600 });
    rawJsonlBytes.set(subagentStatus.stdoutFile, maxBytes);
    return;
  }
  fs.appendFileSync(subagentStatus.stdoutFile, chunk, { mode: 0o600 });
  rawJsonlBytes.set(subagentStatus.stdoutFile, current + size);
}

function processJsonLine({ line, subagentStatus, config, index, setFinalOutput, status, statusPath, onUpdate, rawJsonlBytes, onFinalStop, onSession, onAssistantMessage }) {
  if (!line.trim()) return;
  appendRawJsonl(subagentStatus, line, rawJsonlBytes, config);

  let event;
  try {
    event = JSON.parse(line);
  } catch {
    return;
  }

  if (event.type === "session" && typeof event.id === "string") {
    const session = { id: event.id, cwd: typeof event.cwd === "string" ? event.cwd : subagentStatus.cwd };
    subagentStatus.sessionId = event.id;
    onSession?.(session);
    subagentStatus.updatedAt = now();
    persist(status, statusPath, onUpdate);
  }

  if (event.type === "message_end" && event.message) {
    if (event.message.role === "assistant") {
      onAssistantMessage?.();
      subagentStatus.usage.turns += 1;
      addUsage(subagentStatus.usage, event.message);
      const text = textFromMessage(event.message).trim();
      if (text) {
        setFinalOutput(text);
        const outputLines = text.split("\n").filter((part) => part.trim()).slice(-5);
        subagentStatus.recentOutput = outputLines;
        subagentStatus.preview = text.split("\n").find((part) => part.trim())?.slice(0, 240) || subagentStatus.preview;
      }
      if (event.message.errorMessage) subagentStatus.warning = event.message.errorMessage;
      const stopReason = event.message.stopReason;
      const hasToolCall = Array.isArray(event.message.content) && event.message.content.some((part) => part?.type === "toolCall");
      if (stopReason === "stop" && !hasToolCall) onFinalStop?.({ clean: !event.message.errorMessage && Boolean(text) });
    }
    subagentStatus.updatedAt = now();
    persist(status, statusPath, onUpdate);
  }

  if (event.type === "tool_execution_start" || event.type === "tool_call") {
    subagentStatus.currentTool = event.toolName || event.name || "unknown";
    subagentStatus.currentToolArgs = event.args ? JSON.stringify(event.args).slice(0, 240) : undefined;
    subagentStatus.currentToolStartedAt = now();
    subagentStatus.currentPath = event.args?.path || event.args?.file_path || event.args?.command;
    subagentStatus.toolCount = (subagentStatus.toolCount || 0) + 1;
    subagentStatus.preview = `tool: ${subagentStatus.currentTool}${subagentStatus.currentPath ? ` ${String(subagentStatus.currentPath).slice(0, 160)}` : ""}`;
    subagentStatus.updatedAt = now();
    persist(status, statusPath, onUpdate);
  }

  if (event.type === "tool_execution_end") {
    if (subagentStatus.currentTool) {
      subagentStatus.recentTools = [...(subagentStatus.recentTools || []), {
        tool: subagentStatus.currentTool,
        args: subagentStatus.currentToolArgs || "",
        endMs: now(),
      }].slice(-3);
    }
    subagentStatus.currentTool = undefined;
    subagentStatus.currentToolArgs = undefined;
    subagentStatus.currentToolStartedAt = undefined;
    subagentStatus.currentPath = undefined;
    subagentStatus.updatedAt = now();
    persist(status, statusPath, onUpdate);
  }
}

function killChild(child, signal = "SIGTERM") {
  try {
    if (child.pid) process.kill(-child.pid, signal);
    else child.kill(signal);
  } catch {
    try { child.kill(signal); } catch {}
  }
}

async function runSubagent(config, status, statusPath, eventsPath, task, index, options) {
  const subagentStatus = status.subagents[index];
  subagentStatus.state = "running";
  subagentStatus.startedAt = now();
  subagentStatus.updatedAt = now();
  persist(status, statusPath, options.onUpdate);

  const args = argsForSubagent(config, task, index);
  const invocation = getPiInvocation(args, config);
  appendEvent(eventsPath, { type: "subagent_start", ts: now(), index, name: task.name, args: invocation.args });

  let finalOutput = "";
  let stdoutBuffer = "";
  let stderrBuffer = "";
  let session;
  let sawAssistantMessage = false;
  const onSession = (value) => {
    session = value;
    if (task.sessionFile) subagentStatus.resumeCommand = formatResumeCommand(value);
  };
  const rawJsonlBytes = new Map();
  let timedOut = false;
  let aborted = false;
  let childExited = false;
  let forcedFinalDrain = false;
  let cleanTerminalAssistantStop = false;
  let finalDrainTimer;
  let finalHardKillTimer;
  const hardKillTimers = [];
  const child = spawn(invocation.command, invocation.args, {
    cwd: task.cwd ?? config.cwd,
    detached: true,
    env: { ...process.env, PI_SIMPLE_SUBAGENT_CHILD: "1" },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  const clearFinalDrainTimers = () => {
    if (finalDrainTimer) clearTimeout(finalDrainTimer);
    if (finalHardKillTimer) clearTimeout(finalHardKillTimer);
    finalDrainTimer = undefined;
    finalHardKillTimer = undefined;
  };

  const startFinalDrain = ({ clean }) => {
    cleanTerminalAssistantStop ||= clean;
    if (childExited || finalDrainTimer || timedOut || aborted) return;
    finalDrainTimer = setTimeout(() => {
      forcedFinalDrain = true;
      if (!cleanTerminalAssistantStop && !subagentStatus.error) subagentStatus.error = "Subagent process did not exit after final message.";
      killChild(child, "SIGTERM");
      finalHardKillTimer = setTimeout(() => killChild(child, "SIGKILL"), KILL_GRACE_MS);
      finalHardKillTimer.unref?.();
    }, 1000);
    finalDrainTimer.unref?.();
  };

  const timeout = config.timeoutMs && config.timeoutMs > 0
    ? setTimeout(() => {
      timedOut = true;
      subagentStatus.error = `Timed out after ${config.timeoutMs}ms`;
      killChild(child, "SIGTERM");
      const hardKill = setTimeout(() => killChild(child, "SIGKILL"), KILL_GRACE_MS);
      hardKill.unref?.();
      hardKillTimers.push(hardKill);
    }, config.timeoutMs)
    : undefined;
  timeout?.unref?.();

  const abort = () => {
    aborted = true;
    subagentStatus.error = "Aborted";
    killChild(child, "SIGTERM");
    const hardKill = setTimeout(() => killChild(child, "SIGKILL"), KILL_GRACE_MS);
    hardKill.unref?.();
    hardKillTimers.push(hardKill);
  };
  if (options.signal?.aborted) abort();
  else options.signal?.addEventListener("abort", abort, { once: true });

  child.stdout.on("data", (chunk) => {
    stdoutBuffer += chunk.toString();
    const lines = stdoutBuffer.split("\n");
    stdoutBuffer = lines.pop() || "";
    for (const line of lines) {
      processJsonLine({ line, subagentStatus, config, index, setFinalOutput: (text) => { finalOutput = text; }, status, statusPath, onUpdate: options.onUpdate, rawJsonlBytes, onFinalStop: startFinalDrain, onSession, onAssistantMessage: () => { sawAssistantMessage = true; } });
    }
  });

  child.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    stderrBuffer += text;
    fs.appendFileSync(subagentStatus.stderrFile, text, { mode: 0o600 });
  });

  const exitCode = await new Promise((resolve) => {
    child.on("exit", () => {
      childExited = true;
      clearFinalDrainTimers();
    });
    child.on("close", (code, signal) => resolve(code ?? (signal ? 1 : 0)));
    child.on("error", (error) => {
      subagentStatus.error = error.message;
      resolve(1);
    });
  });

  if (timeout) clearTimeout(timeout);
  clearFinalDrainTimers();
  for (const timer of hardKillTimers) clearTimeout(timer);
  options.signal?.removeEventListener?.("abort", abort);

  if (stdoutBuffer.trim()) {
    processJsonLine({ line: stdoutBuffer, subagentStatus, config, index, setFinalOutput: (text) => { finalOutput = text; }, status, statusPath, onUpdate: options.onUpdate, rawJsonlBytes, onFinalStop: startFinalDrain, onSession, onAssistantMessage: () => { sawAssistantMessage = true; } });
  }

  if (!task.sessionFile && session && sawAssistantMessage) subagentStatus.resumeCommand = formatResumeCommand(session);
  if (!finalOutput && stderrBuffer.trim()) finalOutput = stderrBuffer.trim();
  if (!finalOutput && subagentStatus.warning) subagentStatus.error = subagentStatus.warning;
  if (!finalOutput) finalOutput = subagentStatus.error || "(no output)";

  const effectiveExitCode = forcedFinalDrain && cleanTerminalAssistantStop && finalOutput && !timedOut && !aborted ? 0 : exitCode;
  subagentStatus.exitCode = effectiveExitCode;
  subagentStatus.completedAt = now();
  subagentStatus.updatedAt = now();
  if (timedOut) subagentStatus.error = `Timed out after ${config.timeoutMs}ms`;
  if (aborted) subagentStatus.error = "Aborted";
  subagentStatus.state = effectiveExitCode === 0 && !subagentStatus.error ? "complete" : "failed";
  subagentStatus.currentTool = undefined;
  subagentStatus.currentToolArgs = undefined;
  subagentStatus.currentToolStartedAt = undefined;
  subagentStatus.currentPath = undefined;
  fs.writeFileSync(subagentStatus.outputFile, finalOutput, { encoding: "utf8", mode: 0o600 });
  subagentStatus.preview = finalOutput.split("\n").find((line) => line.trim())?.slice(0, 240) || "(no output)";
  appendEvent(eventsPath, { type: "subagent_end", ts: now(), index, name: task.name, exitCode: effectiveExitCode, error: subagentStatus.error, forcedFinalDrain });
  persist(status, statusPath, options.onUpdate);
}

async function mapConcurrent(items, concurrency, fn, signal) {
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, async () => {
    while (next < items.length && !signal?.aborted) {
      const index = next++;
      await fn(items[index], index);
    }
  });
  await Promise.all(workers);
}

function markQueuedAborted(status) {
  for (const task of status.subagents) {
    if (task.state !== "queued") continue;
    task.state = "failed";
    task.error = "Aborted before start";
    task.completedAt = now();
    task.updatedAt = now();
    task.preview = task.error;
  }
}

function writeAggregate(config, status, resultPath) {
  const sections = status.subagents.map((task) => {
    const output = fs.existsSync(task.outputFile) ? fs.readFileSync(task.outputFile, "utf8").trim() : "(no output)";
    const resume = task.resumeCommand ? `> Resume: \`${task.resumeCommand}\`\n\n` : "";
    return `## ${task.name} — ${task.state}\n\n${resume}${output}`;
  });
  const resultText = `# Subagent run ${config.runId}\n\n${sections.join("\n\n---\n\n")}\n`;
  fs.writeFileSync(resultPath, resultText, { encoding: "utf8", mode: 0o600 });
  return resultText;
}

export async function runSubagents(config, options = {}) {
  ensurePrivateDir(config.runDir);
  const statusPath = path.join(config.runDir, "status.json");
  const eventsPath = path.join(config.runDir, "events.jsonl");
  const resultPath = path.join(config.runDir, "result.md");
  const status = createStatus(config);
  persist(status, statusPath, options.onUpdate);
  try {
    await mapConcurrent(config.subagents, config.concurrency || 4, (task, index) => runSubagent(config, status, statusPath, eventsPath, task, index, options), options.signal);
    if (options.signal?.aborted) markQueuedAborted(status);
    const resultText = writeAggregate(config, status, resultPath);
    persist(status, statusPath, options.onUpdate);
    return { status, resultText, resultPath };
  } catch (error) {
    status.state = "failed";
    status.error = error instanceof Error ? error.stack || error.message : String(error);
    status.completedAt = now();
    persist(status, statusPath, options.onUpdate);
    appendEvent(eventsPath, { type: "runner_error", ts: now(), error: status.error });
    throw error;
  }
}
