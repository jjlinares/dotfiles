import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRunConfig,
  findRunDir,
  formatStatus,
  needsFork,
  notifyCompletion,
  resolveTasks,
  statusPath,
} from "./core.ts";

test("resolveTasks rejects missing or mixed execution modes", () => {
  assert.throws(() => resolveTasks({}), /exactly one/);
  assert.throws(() => resolveTasks({ task: "one", tasks: [{ task: "two" }] }), /exactly one/);
  assert.deepEqual(resolveTasks({ task: "one", name: "solo" }), [{ name: "solo", task: "one", context: undefined, cwd: undefined, model: undefined, systemPrompt: undefined, systemPromptMode: undefined, tools: undefined }]);
});

test("buildRunConfig applies defaults and task overrides", () => {
  const config = buildRunConfig({
    params: {
      context: "fresh",
      cwd: "repo",
      systemPrompt: "Default reviewer",
      model: "model-a",
      tools: "read,bash",
      notify: "followUp",
      timeoutMs: 1234,
      includeJsonl: true,
      tasks: [
        { task: "a" },
        { name: "custom", task: "b", systemPrompt: "Special", model: "model-b", tools: false, cwd: "pkg" },
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
  assert.equal(config.tasks[0].name, "Default-reviewer");
  assert.equal(config.tasks[0].systemPrompt, "Default reviewer");
  assert.equal(config.tasks[0].model, "model-a");
  assert.equal(config.tasks[0].tools, "read,bash");
  assert.equal(config.tasks[1].name, "custom");
  assert.equal(config.tasks[1].systemPrompt, "Special");
  assert.equal(config.tasks[1].model, "model-b");
  assert.equal(config.tasks[1].tools, false);
  assert.equal(config.tasks[1].cwd, "/work/repo/pkg");
});

test("buildRunConfig assigns fork sessions only to forked tasks", () => {
  const calls = [];
  const params = {
    context: "fresh",
    tasks: [
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

  assert.equal(config.tasks[0].sessionFile, undefined);
  assert.equal(config.tasks[1].sessionFile, "/sessions/1.jsonl");
  assert.deepEqual(calls, [1]);
});

test("findRunDir supports exact and prefix matches", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "subagents-core-test-"));
  await fs.mkdir(path.join(root, "abcdef12"));
  await fs.mkdir(path.join(root, "99999999"));
  assert.equal(path.basename(findRunDir("abcdef12", root)), "abcdef12");
  assert.equal(path.basename(findRunDir("abc", root)), "abcdef12");
  assert.equal(findRunDir("missing", root), undefined);
});

test("formatStatus lists runs and includes task details", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "subagents-core-test-"));
  const runDir = path.join(root, "run1");
  await fs.mkdir(runDir);
  const stderr = path.join(runDir, "task.stderr.log");
  const output = path.join(runDir, "task.md");
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
    tasks: [{ id: "run1-0", index: 0, name: "review", state: "failed", preview: "bad", outputFile: output, stderrFile: stderr }],
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
    status: { id: "abc", state: "complete", cwd: "/work", notify: "tui", startedAt: 0, updatedAt: 1, tasks: [] },
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
    status: { id: "abc", state: "failed", cwd: "/work", notify: "followUp", startedAt: 0, updatedAt: 1, tasks: [] },
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
