# Subagents

Tiny subagent launcher for Pi.

## Philosophy

A subagent is not a special object type. It is a child Pi session launched with:

- a task
- an optional system-prompt append
- optional Pi config such as model, thinking, tools, cwd, and context mode

This extension provides orchestration infrastructure only. It does not own your agent taxonomy. The parent session decides what child roles are needed for the current problem and passes those roles as prompts.

The default workflow is orchestration fanout: launch focused children to inspect, critique, research, validate, or implement as explicitly instructed, then let the parent synthesize the results and decide what to do. Children are helpers, not decision owners.

The extension adds no default child role or safety policy. If a child should be read-only, the parent must say so in `appendSystemPrompt` and/or restrict `tools`.

When `appendSystemPrompt` is provided, it is always appended to Pi's core system prompt. The extension never replaces Pi's core system prompt.

Runs default to foreground/blocking so the parent sees all child results before answering. Use `async: true` when the parent should keep working while children run in the background.

## Tool

Registers one tool: `subagent`.

Runs are foreground by default. Set `async: true` for background execution that returns a run id immediately.

## Basic use

Single child:

```ts
subagent({
  subagents: [
    {
      task: "Review the current diff for correctness. Return findings only.",
      appendSystemPrompt: "You are a correctness reviewer."
    }
  ],
  context: "fresh"
})
```

Parallel fanout:

```ts
subagent({
  subagents: [
    {
      name: "correctness",
      task: "Review the current diff for correctness and regressions. Return findings only.",
      appendSystemPrompt: "You are a correctness reviewer."
    },
    {
      name: "simplicity",
      task: "Review the current diff for unnecessary complexity. Return findings only.",
      appendSystemPrompt: "You are a simplicity reviewer."
    },
    {
      name: "architecture",
      task: "Review the current diff for architectural boundary issues. Return findings only.",
      appendSystemPrompt: "You are an architecture reviewer."
    }
  ],
  context: "fresh",
  concurrency: 3
})
```

Check status:

```ts
subagent({ action: "status" })
subagent({ action: "status", id: "abc123" })
```

## Parameters

Top-level:

| Field | Meaning |
|---|---|
| `subagents` | Required non-empty array. Each entry launches one child Pi session. Use one entry for a single child. |
| `appendSystemPrompt` | Optional default role/config prompt appended to Pi's core system prompt. Used by subagents that omit their own. If omitted, no prompt override is passed. |
| `context` | `fresh` default, or `fork`. |
| `model` | Child model override. Thinking suffixes like `sonnet:high` also work. |
| `thinking` | Child thinking level: `off`, `minimal`, `low`, `medium`, `high`, or `xhigh`. Default `medium`. Passed as `--thinking`. |
| `tools` | Child tool allowlist string/array, or `false` for `--no-tools`. Omit for normal Pi tools. |
| `cwd` | Child working directory. |
| `concurrency` | Parallel concurrency. Default `4`. |
| `timeoutMs` | Per-child timeout in milliseconds. Omit for no timeout. |
| `includeJsonl` | Write raw child JSONL files, capped at 50 MB per child. Default `false`. |
| `async` | `false` default. Set `true` to run in background and return immediately. |
| `notify` | Background completion behavior: `tui` default, `followUp`, or `none`. Ignored for foreground runs. |

Per-subagent overrides inside `subagents[]`:

| Field | Meaning |
|---|---|
| `name` | Child label. |
| `task` | Required task for this child subagent. |
| `appendSystemPrompt` | Optional subagent-specific role/config prompt appended to Pi's core system prompt. If omitted, inherits the top-level prompt if present. |
| `context` | Override top-level `context`. |
| `model` | Override top-level `model`. |
| `thinking` | Override top-level `thinking`. |
| `tools` | Override top-level `tools`. |
| `cwd` | Relative to top-level resolved cwd. |

Actions:

| Action | Meaning |
|---|---|
| `status` | List recent runs, or show one run by `id`/prefix. |

## Foreground vs background

Default foreground behavior:

```ts
subagent({ subagents: [{ task: "Review the diff" }] })
```

The tool waits for all children, streams status updates, then returns the aggregate result to the parent.

Background behavior:

```ts
subagent({ subagents: [{ task: "Review the diff" }], async: true })
```

The tool returns a run id immediately. Inspect later with `subagent({ action: "status", id })`.

## Background notifications

Default for background runs:

```ts
notify: "tui"
```

Shows a Pi TUI notification when the run completes.

Opt into parent wake-up:

```ts
notify: "followUp"
```

When complete, sends a user follow-up message containing the result path and status command. If parent Pi is busy, it queues as `followUp`.

Disable notifications:

```ts
notify: "none"
```

## Context

### `fresh`

Starts a new child Pi process with no parent conversation history.

Use for isolated or adversarial work. This is the default.

### `fork`

Creates a branched Pi session from the parent session leaf and starts the child from that session file.

Use when inherited conversation matters. Fork fails if the parent session is not persisted or has no current leaf. It does not silently downgrade to fresh.

## Safety and tool boundaries

The extension does not inject a read-only prompt. The parent/orchestrator owns child instructions and tool access.

Prompt-only safety is not a sandbox. If you allow `bash`, a child can mutate files no matter what the prompt says. Pass a restrictive `tools` allowlist if you want harder limits:

```ts
subagent({
  appendSystemPrompt: "You are a read-only reviewer. Do not modify files.",
  subagents: [{ task: "Review src/" }],
  tools: "read,grep,find,ls"
})
```

## Runtime model

Foreground and background runs share the same executor (`executor.mjs`). Foreground calls it in-process so status updates can stream back to the parent tool call. Background launches `runner.mjs`, which is only a thin detached wrapper around the same executor.

Foreground progress is rendered from structured status details, not raw child logs. Collapsed results show a fanout card with queued/running/complete/failed states, current tool/path, per-subagent tools/turns/tokens/cost/runtime, recent tool use, and up to two output lines. Expanded results add more recent tools/output plus per-subagent output/jsonl paths.

## Runtime files

Runs are stored under:

```text
/tmp/pi-subagents-<scope>/runs/<run-id>/
```

Important files:

| File | Meaning |
|---|---|
| `config.json` | Runner config. |
| `status.json` | Current run/subagent state. |
| `events.jsonl` | Compact runner subagent start/end/error events. Does not duplicate child JSON. |
| `result.md` | Aggregate result after completion. |
| `prompt-*.md` | Optional per-child system prompt append, only written when `appendSystemPrompt` is provided. |
| `input-*.md` | Per-child task input passed to Pi. |
| `output-*.md` | Per-child final output. |
| `subagent-*.jsonl` | Per-child raw Pi JSON stdout, only when `includeJsonl: true`; capped at 50 MB per child. |
| `subagent-*.stderr.log` | Per-child stderr. |

## Install

### Dotfiles setup

From the dotfiles repo root, run:

```bash
./pi/setup.sh
```

The setup script installs each package under `pi/extensions/*` with `pi install <local-path>`. It also removes the old legacy symlink for this extension if present.

Then restart Pi or run `/reload`.

### Manual local package install

This folder is a private Pi package. From the dotfiles repo root:

```bash
pi install ./pi/extensions/subagents
```

`"private": true` only prevents accidental npm publishing. It does not stop Pi from installing a local path package.

This extension registers the tool name `subagent`. Do not load another extension that registers the same tool name unless you intentionally want a collision.

## Tests

Run:

```bash
node --experimental-strip-types --test \
  pi/extensions/subagents/core.test.mjs \
  pi/extensions/subagents/runner.test.mjs
```

Coverage targets:

- shared executor success/failure behavior through the background runner
- status/result file writing
- config generation
- fresh/fork assignment
- defaults and overrides
- status formatting
- notification decisions

Smoke-load extension through Pi:

```bash
pi --offline -e ./pi/extensions/subagents --list-models nosuchmodel
```
