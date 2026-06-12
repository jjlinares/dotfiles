import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const here = path.dirname(fileURLToPath(import.meta.url));
const runner = path.join(here, "runner.mjs");

function execNode(args, options = {}) {
  return new Promise((resolve) => {
    execFile(process.execPath, args, options, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr, code: error?.code ?? 0 });
    });
  });
}

async function makeFakePi(dir) {
  const fake = path.join(dir, "fake-pi.mjs");
  await fs.writeFile(fake, `
import fs from "node:fs";
const taskArg = process.argv.find((arg) => arg.startsWith("@"));
const task = taskArg ? fs.readFileSync(taskArg.slice(1), "utf8") : "";
if (task.includes("fail")) {
  console.error("fake failure");
  process.exit(7);
}
const lingerAfterStop = task.includes("linger-after-stop");
if (task.includes("slow")) {
  setInterval(() => {}, 1000);
}
if (task.includes("many-jsonl")) {
  for (let i = 0; i < 20; i++) console.log(JSON.stringify({ type: "tool_execution_start", toolName: "read", args: { path: "file-" + i } }));
}
console.log(JSON.stringify({ type: "tool_execution_start", toolName: "read", args: { path: "README.md" } }));
console.log(JSON.stringify({
  type: "message_end",
  message: {
    role: "assistant",
    content: [{ type: "text", text: "result for " + task.trim().replace(/\\s+/g, " ") }],
    stopReason: "stop",
    usage: { input: 3, output: 5, cacheRead: 0, cacheWrite: 0, cost: { total: 0.02 }, totalTokens: 8 }
  }
}));
if (lingerAfterStop) setInterval(() => {}, 1000);
`, "utf8");
  return fake;
}

async function writeConfig(dir, config) {
  const runDir = path.join(dir, "run");
  await fs.mkdir(runDir, { recursive: true });
  const configPath = path.join(runDir, "config.json");
  await fs.writeFile(configPath, JSON.stringify({ runDir, cwd: dir, notify: "none", concurrency: 2, ...config }, null, 2));
  return { runDir, configPath };
}

test("runner completes parallel tasks and writes aggregate result", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "subagents-runner-test-"));
  const fakePi = await makeFakePi(dir);
  const { runDir, configPath } = await writeConfig(dir, {
    runId: "okrun",
    tasks: [
      { id: "okrun-0", name: "one", task: "inspect one", context: "fresh", thinking: "high" },
      { id: "okrun-1", name: "two", task: "inspect two", context: "fresh" },
    ],
  });

  const result = await execNode([runner, configPath], { env: { ...process.env, PI_SUBAGENTS_PI_SCRIPT: fakePi } });
  assert.equal(result.code, 0, result.stderr);

  const status = JSON.parse(await fs.readFile(path.join(runDir, "status.json"), "utf8"));
  assert.equal(status.state, "complete");
  assert.equal(status.tasks.length, 2);
  assert.deepEqual(status.tasks.map((task) => task.state), ["complete", "complete"]);
  assert.equal(status.tasks[0].usage.input, 3);
  assert.equal(status.tasks[1].usage.output, 5);
  assert.equal(status.tasks[0].thinking, "high");
  assert.match(path.basename(status.tasks[0].outputFile), /^output-0-one\.md$/);
  assert.equal(await fs.readFile(path.join(runDir, "input-0-one.md"), "utf8"), "Task:\ninspect one\n");
  assert.match(await fs.readFile(status.tasks[0].outputFile, "utf8"), /result for Task: inspect one/);

  const aggregate = await fs.readFile(path.join(runDir, "result.md"), "utf8");
  assert.match(aggregate, /## one — complete/);
  assert.match(aggregate, /result for Task: inspect one/);
  assert.match(aggregate, /## two — complete/);

  const files = await fs.readdir(runDir);
  assert.equal(files.some((file) => file.endsWith(".jsonl") && file.startsWith("task-")), false);
  const events = await fs.readFile(path.join(runDir, "events.jsonl"), "utf8");
  assert.match(events, /--thinking/);
  assert.match(events, /high/);
  assert.doesNotMatch(events, /child_event/);
});

test("runner writes raw child jsonl only when includeJsonl is true", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "subagents-runner-test-"));
  const fakePi = await makeFakePi(dir);
  const { runDir, configPath } = await writeConfig(dir, {
    runId: "jsonlrun",
    includeJsonl: true,
    tasks: [
      { id: "jsonlrun-0", name: "one", task: "inspect one", context: "fresh" },
    ],
  });

  const result = await execNode([runner, configPath], { env: { ...process.env, PI_SUBAGENTS_PI_SCRIPT: fakePi } });
  assert.equal(result.code, 0, result.stderr);

  const status = JSON.parse(await fs.readFile(path.join(runDir, "status.json"), "utf8"));
  assert.match(await fs.readFile(status.tasks[0].stdoutFile, "utf8"), /message_end/);
});

test("runner caps raw child jsonl", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "subagents-runner-test-"));
  const fakePi = await makeFakePi(dir);
  const { runDir, configPath } = await writeConfig(dir, {
    runId: "caprun",
    includeJsonl: true,
    maxJsonlBytes: 200,
    tasks: [
      { id: "caprun-0", name: "one", task: "many-jsonl", context: "fresh" },
    ],
  });

  const result = await execNode([runner, configPath], { env: { ...process.env, PI_SUBAGENTS_PI_SCRIPT: fakePi } });
  assert.equal(result.code, 0, result.stderr);

  const status = JSON.parse(await fs.readFile(path.join(runDir, "status.json"), "utf8"));
  assert.match(await fs.readFile(status.tasks[0].stdoutFile, "utf8"), /subagent_jsonl_truncated/);
});

test("runner final-drains child that lingers after clean final output", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "subagents-runner-test-"));
  const fakePi = await makeFakePi(dir);
  const { runDir, configPath } = await writeConfig(dir, {
    runId: "linger",
    tasks: [
      { id: "linger-0", name: "linger", task: "linger-after-stop", context: "fresh" },
    ],
  });

  const started = Date.now();
  const result = await execNode([runner, configPath], { env: { ...process.env, PI_SUBAGENTS_PI_SCRIPT: fakePi }, timeout: 5000 });
  assert.equal(result.code, 0, result.stderr);
  assert.ok(Date.now() - started < 4000);

  const status = JSON.parse(await fs.readFile(path.join(runDir, "status.json"), "utf8"));
  assert.equal(status.state, "complete");
  assert.equal(status.tasks[0].state, "complete");
  assert.equal(status.tasks[0].exitCode, 0);
});

test("runner marks failed task and exits nonzero", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "subagents-runner-test-"));
  const fakePi = await makeFakePi(dir);
  const { runDir, configPath } = await writeConfig(dir, {
    runId: "failrun",
    tasks: [
      { id: "failrun-0", name: "good", task: "inspect", context: "fresh" },
      { id: "failrun-1", name: "bad", task: "fail this", context: "fresh" },
    ],
  });

  const result = await execNode([runner, configPath], { env: { ...process.env, PI_SUBAGENTS_PI_SCRIPT: fakePi } });
  assert.equal(result.code, 1);

  const status = JSON.parse(await fs.readFile(path.join(runDir, "status.json"), "utf8"));
  assert.equal(status.state, "failed");
  assert.deepEqual(status.tasks.map((task) => task.state), ["complete", "failed"]);
  assert.equal(status.tasks[1].exitCode, 7);

  const stderr = await fs.readFile(status.tasks[1].stderrFile, "utf8");
  assert.match(stderr, /fake failure/);
});

test("runner times out slow tasks", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "subagents-runner-test-"));
  const fakePi = await makeFakePi(dir);
  const { runDir, configPath } = await writeConfig(dir, {
    runId: "slowrun",
    timeoutMs: 100,
    tasks: [
      { id: "slowrun-0", name: "slow", task: "slow task", context: "fresh" },
    ],
  });

  const result = await execNode([runner, configPath], { env: { ...process.env, PI_SUBAGENTS_PI_SCRIPT: fakePi }, timeout: 5000 });
  assert.equal(result.code, 1);

  const status = JSON.parse(await fs.readFile(path.join(runDir, "status.json"), "utf8"));
  assert.equal(status.state, "failed");
  assert.match(status.tasks[0].error, /Timed out/);
});
