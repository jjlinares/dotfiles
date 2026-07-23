# Goal

Add a `/subagents` TUI command to `pi/extensions/subagents` for listing, opening, and cancelling foreground and detached-background child agents without replacing the current subprocess executor.

Keep the existing `subagent` tool interface, fanout, profiles, fresh/fork context, foreground default, and durable background runs. Introduce one persisted read-model seam over run status files so tool rendering, footer status, notifications, and the new TUI consume the same child snapshots.

Each dashboard row represents one child subagent, even when several belong to one fanout run. Opening a child shows live status and bounded transcript/output. Foreground runs remain active while `/subagents` is open. Cancellation is routed to the owning executor through private filesystem control markers; no PID killing from the TUI.

Non-goals: changing execution to the Pi SDK, adding Claude/Codex backends, adding more model-facing tools, or pretending the current subprocess transport supports steering/continuing a child.

# Phases

### Phase 1 — shared read model and live dashboard

Prove `/subagents` can open during a foreground tool call and observe both foreground and background children through one interface.

Tasks:

- [x] Add a `SubagentReadModel` module with a small synchronous interface: `list`, `get`, `subscribe`, and lifecycle cleanup.
- [x] Flatten persisted `RunStatus` records into child snapshots containing child id, parent run id, execution mode, state, name, cwd, context, model, thinking, timing, usage, current tool, preview, artifact paths, and capabilities.
- [x] Persist `mode: "foreground" | "background"` in new run status files while reading older status files without failure.
- [x] Poll `RUN_ROOT` atomically and emit changes only when snapshots differ; recover already-running detached runs on session start without replaying notifications for old completed runs.
- [x] Register `/subagents` and open a TUI dashboard using `ctx.ui.custom({ overlay: true })`.
- [x] Render one row per child with selection, state, run id, model, elapsed time, current activity, and foreground/background mode.
- [x] Open a selected child in a read-only detail overlay showing current status, recent tools/output, final output when available, artifact paths, and resume command.
- [x] Preserve selection across polling updates and clean up timers/subscriptions when overlays close or the Pi session shuts down.
- [x] Keep pure snapshot, selection, and viewport logic independent from Pi TUI imports for direct unit testing.

Verification:

- [x] Unit tests cover status flattening, legacy status compatibility, stable selection, ordering, and change notifications.
- [x] Start a deliberately slow foreground subagent run, submit `/subagents`, and verify the overlay opens while the child and parent tool continue running.
- [x] Start a detached background run and verify it appears and updates in the same dashboard.
- [x] Restart/reload Pi during a detached run and verify the dashboard recovers it from disk.
- [x] Close and reopen both overlays repeatedly without leaked timers, duplicate rows, or lost editor focus.

### Phase 2 — executor-owned cancellation

Add safe per-child cancellation for foreground and detached-background runs before expanding transcript capture.

Tasks:

- [x] Define private, idempotent cancellation markers under each run directory, addressed by validated child index/id rather than user-provided paths.
- [x] Add a control helper that resolves a dashboard child snapshot to its owning run directory and writes cancellation markers atomically.
- [x] Make the shared executor observe cancellation while a child is queued or running.
- [x] For a running child, terminate its process group with the existing SIGTERM/SIGKILL grace path; for a queued child, mark it cancelled without spawning it.
- [x] Persist cancellation as terminal `cancelled` state with an explicit `Cancelled by user` reason; derive run outcome as failed-first, then cancelled, then complete.
- [x] Expose `requestAbort(id)` and `canAbort` through the read model.
- [x] Add an explicit dashboard/detail-view abort key with confirmation and visible pending/terminal feedback.
- [x] Keep parent Escape semantics intact: overlay Escape goes back/closes; explicit abort cancels the selected child; parent Escape still aborts the entire foreground tool run after the overlay closes.

Verification:

- [x] Executor tests cancel a queued child without launching it.
- [x] Executor tests cancel one running child while siblings continue and the aggregate result settles deterministically.
- [x] Repeated cancellation requests are harmless and do not target a reused or unrelated PID.
- [x] Cancel a live foreground child from `/subagents` and verify the foreground tool returns the expected cancelled child result without marking the tool result as an execution error.
- [x] Cancel a detached background child, restart Pi, and verify its terminal state remains visible.

### Phase 3 — bounded live transcript

Make opening a running child useful without requiring optional raw JSONL capture.

Tasks:

- [x] Add a normalized per-child transcript artifact, separate from optional raw JSONL.
- [x] Record assistant messages, tool starts/updates/ends, warnings, and terminal errors as the executor parses Pi JSON events.
- [x] Write transcript updates atomically or append safely so the TUI never reads partial JSON records.
- [x] Cap normalized transcript storage at 1 MiB per child and persist an explicit truncation marker.
- [x] Extend child snapshots with transcript path, size/truncation metadata, and latest activity.
- [x] Render sanitized, wrapped transcript lines in the detail view with bottom pinning, Up/Down/Home/End navigation, and live refresh throttling.
- [x] Preserve final `output-*.md` and aggregate `result.md` semantics; transcript capture must not alter model-facing results.

Verification:

- [x] Parser tests cover assistant text, tool activity, malformed JSON input, ANSI/control-character sanitization, and transcript truncation.
- [x] Open a running foreground child and verify tool and assistant activity appears without excessive repainting.
- [x] Open a running background child and verify the same transcript behavior.
- [ ] Verify every rendered line respects terminal width and a large transcript remains responsive.
- [x] Verify `includeJsonl: false` still provides the normalized transcript and `includeJsonl: true` still preserves capped raw JSONL.

### Phase 4 — status integration, documentation, and regression hardening

Route existing status behavior through the read model and finish the user-facing workflow.

Tasks:

- [x] Add a compact footer status showing running/completed/cancelled/failed child counts and `/subagents` hint; clear it when no tracked children remain.
- [x] Replace the extension-local background notification polling map where the read model can provide the same behavior without duplicate notifications.
- [x] Keep completion notification semantics: old terminal runs do not replay; a recovered running background run may notify when it later settles.
- [x] Reuse shared snapshot formatting in the existing tool renderer and `action: "status"` output where doing so removes duplication without changing model-facing text unnecessarily.
- [x] Document `/subagents`, foreground availability, dashboard keys, cancellation semantics, transcript limits, persistence, and the lack of steering in `pi/extensions/subagents/README.md`.
- [x] Add package smoke coverage proving the command registers and the extension loads under Pi.

Verification:

- [x] Run the complete subagent test suite with all new read-model, control, transcript, and UI-model tests.
- [x] Run `pi --offline -e ./pi/extensions/subagents --list-models nosuchmodel` successfully.
- [x] Run `./check.sh` successfully.
- [x] Exercise foreground fanout, background fanout, profile loading, fresh context, fork context, timeout, parent Escape abort, selected-child cancellation, completion notifications, `/subagents`, and session reload without regression.

# Open questions and future decisions

- Steering/continuation transport: add `requestSend` only after choosing and proving a persistent Pi RPC or in-process SDK transport; it is intentionally absent from the current read-model interface.
- Run retention: keep the existing `/tmp` history behavior initially; add age/count cleanup only after observing dashboard clutter and artifact growth.
- Stale-run recovery: decide whether to mark long-unmodified `running` records as abandoned after there is a reliable runner-liveness signal; timestamps alone are insufficient.
- External resume UX: initially display the existing resume command; decide later whether opening a completed child should launch another terminal or replace the current Pi session.
