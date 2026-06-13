import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRunConfig,
  ensureDir,
  findRunDir,
  formatStatus,
  loadSubagentProfile,
  needsFork,
  notifyCompletion,
  randomId,
  resolveSubagents,
  statusPath,
} from "./core.ts";

test("randomId returns a 64-bit hex run id", () => {
  assert.match(randomId(), /^[0-9a-f]{16}$/);
});

test("resolveSubagents requires a non-empty subagents array", () => {
  assert.throws(() => resolveSubagents({}), /at least one subagent/);
  assert.throws(() => resolveSubagents({ subagents: [] }), /at least one subagent/);
  assert.deepEqual(resolveSubagents({ subagents: [{ name: "solo", task: "one" }] }), [{ name: "solo", task: "one" }]);
});

test("buildRunConfig applies defaults and subagent overrides", () => {
  const config = buildRunConfig({
    params: {
      context: "fresh",
      cwd: "repo",
      appendSystemPrompt: "Default reviewer",
      model: "model-a",
      thinking: "high",
      tools: "read,bash",
      notify: "followUp",
      timeoutMs: 1234,
      includeJsonl: true,
      subagents: [
        { task: "a" },
        { name: "custom", task: "b", appendSystemPrompt: "Special", model: "model-b", thinking: "low", tools: false, cwd: "pkg" },
      ],
    },
    ctxCwd: "/work",
    runId: "abc",
    runDir: "/tmp/run",
  });

  assert.equal(config.cwd, "/work/repo");
  assert.equal(config.notify, "followUp");
  assert.equal(config.concurrency, 4);
  assert.equal(config.timeoutMs, 1234);
  assert.equal(config.includeJsonl, true);
  assert.equal(config.subagents[0].name, "Default-reviewer");
  assert.equal(config.subagents[0].appendSystemPrompt, "Default reviewer");
  assert.equal(config.subagents[0].model, "model-a");
  assert.equal(config.subagents[0].thinking, "high");
  assert.equal(config.subagents[0].tools, "read,bash");
  assert.equal(config.subagents[1].name, "custom");
  assert.equal(config.subagents[1].appendSystemPrompt, "Special");
  assert.equal(config.subagents[1].model, "model-b");
  assert.equal(config.subagents[1].thinking, "low");
  assert.equal(config.subagents[1].tools, false);
  assert.equal(config.subagents[1].cwd, "/work/repo/pkg");
});

test("buildRunConfig merges profile between top-level defaults and inline overrides", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "subagents-profile-test-"));
  await fs.writeFile(path.join(dir, "reviewer.yaml"), `
name: profile-reviewer
description: Parent-facing hint.
appendSystemPrompt: Profile prompt
context: fresh
model: profile-model
thinking: high
tools: read,bash
cwd: profile-cwd
`);

  const config = buildRunConfig({
    params: {
      model: "default-model",
      thinking: "low",
      subagents: [{ profile: "reviewer.yaml", task: "review", thinking: "minimal", cwd: "inline-cwd" }],
    },
    ctxCwd: dir,
    runId: "profile",
    runDir: "/tmp/profile",
  });

  assert.equal(config.subagents[0].name, "profile-reviewer");
  assert.equal(config.subagents[0].appendSystemPrompt, "Profile prompt");
  assert.equal(config.subagents[0].model, "profile-model");
  assert.equal(config.subagents[0].thinking, "minimal");
  assert.equal(config.subagents[0].tools, "read,bash");
  assert.equal(config.subagents[0].cwd, path.join(dir, "inline-cwd"));
});

test("loadSubagentProfile accepts standard YAML arrays", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "subagents-profile-test-"));
  await fs.writeFile(path.join(dir, "array.yaml"), "tools:\n  - read\n  - bash\n");
  assert.deepEqual(loadSubagentProfile("array.yaml", dir).tools, ["read", "bash"]);
});

test("loadSubagentProfile rejects task, nested profile, remote paths, and unknown fields", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "subagents-profile-test-"));
  await fs.writeFile(path.join(dir, "task.yaml"), "task: nope\n");
  await fs.writeFile(path.join(dir, "nested.yaml"), "profile: other.yaml\n");
  await fs.writeFile(path.join(dir, "unknown.yaml"), "banana: nope\n");

  assert.throws(() => loadSubagentProfile(path.join(dir, "task.yaml"), dir), /task belongs/);
  assert.throws(() => loadSubagentProfile(path.join(dir, "nested.yaml"), dir), /nested profiles/);
  assert.throws(() => loadSubagentProfile(path.join(dir, "unknown.yaml"), dir), /unknown field banana/);
  assert.throws(() => loadSubagentProfile("https://example.com/profile.yaml", dir), /local file path/);
});

test("needsFork reads context from profiles", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "subagents-profile-test-"));
  await fs.writeFile(path.join(dir, "fork.yaml"), "context: fork\n");
  assert.equal(needsFork({ subagents: [{ profile: "fork.yaml", task: "review" }] }, dir), true);
});

test("buildRunConfig defaults thinking to medium", () => {
  const config = buildRunConfig({
    params: { subagents: [{ task: "inspect" }] },
    ctxCwd: "/work",
    runId: "think",
    runDir: "/tmp/think",
  });

  assert.equal(config.subagents[0].thinking, "medium");
});

test("buildRunConfig assigns fork sessions only to forked subagents", () => {
  const calls = [];
  const params = {
    context: "fresh",
    subagents: [
      { task: "fresh task" },
      { task: "fork task", context: "fork" },
    ],
  };
  assert.equal(needsFork(params), true);

  const config = buildRunConfig({
    params,
    ctxCwd: "/work",
    runId: "forky",
    runDir: "/tmp/forky",
    forkSessionForIndex(index) {
      calls.push(index);
      return `/sessions/${index}.jsonl`;
    },
  });

  assert.equal(config.subagents[0].sessionFile, undefined);
  assert.equal(config.subagents[1].sessionFile, "/sessions/1.jsonl");
  assert.deepEqual(calls, [1]);
});

test("ensureDir creates private directories", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "subagents-core-test-"));
  const dir = path.join(root, "private");
  ensureDir(dir);
  assert.equal((await fs.stat(dir)).mode & 0o777, 0o700);
});

test("findRunDir supports exact and prefix matches", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "subagents-core-test-"));
  await fs.mkdir(path.join(root, "abcdef12"));
  await fs.mkdir(path.join(root, "99999999"));
  assert.equal(path.basename(findRunDir("abcdef12", root)), "abcdef12");
  assert.equal(path.basename(findRunDir("abc", root)), "abcdef12");
  assert.equal(findRunDir("missing", root), undefined);
});

test("formatStatus lists runs and includes subagent details", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "subagents-core-test-"));
  const runDir = path.join(root, "run1");
  await fs.mkdir(runDir);
  const stderr = path.join(runDir, "subagent.stderr.log");
  const output = path.join(runDir, "subagent.md");
  await fs.writeFile(stderr, "warning");
  await fs.writeFile(output, "details");
  await fs.writeFile(path.join(runDir, "result.md"), "aggregate");
  await fs.writeFile(statusPath(runDir), JSON.stringify({
    id: "run1",
    state: "failed",
    cwd: "/work",
    notify: "tui",
    startedAt: 1000,
    updatedAt: 2000,
    completedAt: 3000,
    subagents: [{ id: "run1-0", index: 0, name: "review", state: "failed", preview: "bad", outputFile: output, stderrFile: stderr }],
  }));

  assert.match(formatStatus(undefined, root, 3000), /✗ run1 failed 1\/1 2s/);
  const detail = formatStatus(runDir, root, 3000);
  assert.match(detail, /## review — failed/);
  assert.match(detail, /bad/);
  assert.match(detail, /stderr:/);
  assert.match(detail, /result:/);
});

test("notifyCompletion sends TUI notification by default path", () => {
  const ui = [];
  const sent = [];
  const mode = notifyCompletion({
    notify: "tui",
    status: { id: "abc", state: "complete", cwd: "/work", notify: "tui", startedAt: 0, updatedAt: 1, subagents: [] },
    runDir: "/tmp/run",
    hasUI: true,
    isIdle: true,
    sendUserMessage: (...args) => sent.push(args),
    uiNotify: (...args) => ui.push(args),
  });
  assert.equal(mode, "tui");
  assert.deepEqual(ui, [["Subagent abc complete", "info"]]);
  assert.deepEqual(sent, []);
});

test("notifyCompletion followUp queues when parent is busy", () => {
  const sent = [];
  const mode = notifyCompletion({
    notify: "followUp",
    status: { id: "abc", state: "failed", cwd: "/work", notify: "followUp", startedAt: 0, updatedAt: 1, subagents: [] },
    runDir: "/tmp/run",
    hasUI: true,
    isIdle: false,
    sendUserMessage: (...args) => sent.push(args),
    uiNotify: () => {},
  });
  assert.equal(mode, "followUp");
  assert.match(sent[0][0], /Subagent run abc failed/);
  assert.deepEqual(sent[0][1], { deliverAs: "followUp" });
});
