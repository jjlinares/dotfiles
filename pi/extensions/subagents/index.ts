import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runSubagents } from "./executor.mjs";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";
import {
	RUN_ROOT,
	buildRunConfig,
	ensureDir,
	findRunDir,
	formatStatus,
	needsFork,
	notifyCompletion,
	randomId,
	readJson,
	statusPath,
	type ContextMode,
	type NotifyMode,
	type RunConfig,
	type RunStatus,
	type SubagentParams,
} from "./core.ts";

type ActiveRun = { id: string; dir: string; notify: NotifyMode; notified?: boolean };
type PreparedRun = { id: string; dir: string; notify: NotifyMode; count: number; config: RunConfig; configPath: string };

const RUNNER_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "runner.mjs");
const POLL_MS = 250;

const ToolOverride = Type.Unsafe({
	anyOf: [
		{ type: "array", items: { type: "string" } },
		{ type: "string" },
		{ const: false },
	],
	description: "Child tool allowlist as comma-separated string/array, or false for --no-tools. Omit for normal Pi tools.",
});

const ThinkingSchema = Type.String({ enum: ["off", "minimal", "low", "medium", "high", "xhigh"], description: "Child thinking level passed to Pi --thinking. Default medium." });

const TaskSchema = Type.Object({
	name: Type.Optional(Type.String({ description: "Human-readable child label." })),
	task: Type.String({ description: "User task for this child Pi session." }),
	appendSystemPrompt: Type.Optional(Type.String({ description: "Optional role/config prompt appended to Pi's core system prompt for this child. No prompt override is passed when omitted." })),
	context: Type.Optional(Type.String({ enum: ["fresh", "fork"] })),
	model: Type.Optional(Type.String()),
	thinking: Type.Optional(ThinkingSchema),
	tools: Type.Optional(ToolOverride),
	cwd: Type.Optional(Type.String()),
}, { additionalProperties: false });

const SubagentParamsSchema = Type.Object({
	action: Type.Optional(Type.String({ enum: ["status"], description: "Use status to inspect runs." })),
	id: Type.Optional(Type.String({ description: "Run id or prefix for status." })),

	task: Type.Optional(Type.String({ description: "Single child task. Use either task or tasks." })),
	name: Type.Optional(Type.String({ description: "Single child label." })),
	appendSystemPrompt: Type.Optional(Type.String({ description: "Optional default role/config prompt appended to Pi's core system prompt; used by single child and by fanout tasks that omit appendSystemPrompt. No prompt override is passed when omitted." })),
	tasks: Type.Optional(Type.Array(TaskSchema, { description: "Parallel fanout tasks." })),

	context: Type.Optional(Type.String({ enum: ["fresh", "fork"], description: "Default fresh." })),
	model: Type.Optional(Type.String({ description: "Default model override for children." })),
	thinking: Type.Optional(ThinkingSchema),
	tools: Type.Optional(ToolOverride),
	cwd: Type.Optional(Type.String({ description: "Default child cwd." })),
	concurrency: Type.Optional(Type.Integer({ minimum: 1, maximum: 16, description: "Parallel child concurrency. Default 4." })),
	timeoutMs: Type.Optional(Type.Integer({ minimum: 1, description: "Hard per-child wall-clock kill timeout in milliseconds. Omit unless the user explicitly requested a cutoff; active children are killed when this expires." })),
	includeJsonl: Type.Optional(Type.Boolean({ description: "Write raw child JSONL files, capped at 50MB per child. Default false." })),
	async: Type.Optional(Type.Boolean({ description: "Run in background and return immediately. Default false: foreground/blocking." })),
	notify: Type.Optional(Type.String({ enum: ["tui", "followUp", "none"], description: "Background completion behavior. Default tui; followUp wakes parent agent. Ignored for foreground runs." })),
}, { additionalProperties: false });

function createForkResolver(ctx: ExtensionContext, context: ContextMode): (index: number) => string | undefined {
	if (context !== "fork") return () => undefined;
	const manager = ctx.sessionManager as unknown as {
		getSessionFile(): string | undefined;
		getLeafId(): string | null;
		getSessionDir?(): string;
		openSession?: (file: string, dir?: string) => { createBranchedSession(leafId: string): string | undefined };
	};
	const parentSessionFile = manager.getSessionFile();
	if (!parentSessionFile) throw new Error("Forked subagent context requires a persisted parent session.");
	const leafId = manager.getLeafId();
	if (!leafId) throw new Error("Forked subagent context requires a current session leaf.");
	const sessionDir = manager.getSessionDir?.();
	const cache = new Map<number, string>();
	return (index: number) => {
		const cached = cache.get(index);
		if (cached) return cached;
		const source = manager.openSession?.(parentSessionFile, sessionDir) ?? SessionManager.open(parentSessionFile, sessionDir);
		const sessionFile = source.createBranchedSession(leafId);
		if (!sessionFile) throw new Error("Session manager did not return a forked session file.");
		cache.set(index, sessionFile);
		return sessionFile;
	};
}

function prepareRun(params: SubagentParams, ctx: ExtensionContext): PreparedRun {
	const runId = randomId();
	const runDir = path.join(RUN_ROOT, runId);
	ensureDir(runDir);
	const forkSessionForIndex = needsFork(params) ? createForkResolver(ctx, "fork") : undefined;
	const config = buildRunConfig({ params, ctxCwd: ctx.cwd, runId, runDir, forkSessionForIndex });
	config.piScript = process.argv[1];
	const configPath = path.join(runDir, "config.json");
	fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
	return { id: runId, dir: runDir, notify: config.notify, count: config.tasks.length, config, configPath };
}

function compactPath(value: string | undefined): string {
	if (!value) return "";
	const home = process.env.HOME;
	const shortened = home && value.startsWith(home) ? `~${value.slice(home.length)}` : value;
	return shortened.length > 80 ? `…${shortened.slice(-79)}` : shortened;
}

function duration(ms: number): string {
	const seconds = Math.max(0, Math.round(ms / 1000));
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	const rest = seconds % 60;
	return `${minutes}m${rest ? ` ${rest}s` : ""}`;
}

function compactNumber(value: number): string {
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
	if (value >= 1_000) return `${Math.round(value / 100) / 10}k`;
	return String(value);
}

function taskTokens(task: RunStatus["tasks"][number]): number {
	return task.usage?.totalTokens || ((task.usage?.input ?? 0) + (task.usage?.output ?? 0));
}

function taskRuntime(task: RunStatus["tasks"][number]): string {
	if (!task.startedAt) return "";
	return duration((task.completedAt ?? Date.now()) - task.startedAt);
}

function truncateText(value: string, max = Math.max(80, (process.stdout.columns || 120) - 12)): string {
	return value.length > max ? `${value.slice(0, Math.max(0, max - 3))}...` : value;
}

function taskOutputLines(task: RunStatus["tasks"][number], limit: number): string[] {
	const recent = (task.recentOutput ?? []).filter((line) => line.trim());
	if (recent.length > 0) return recent.slice(-limit).map((line) => truncateText(line.trim(), 120));
	if (task.preview && !task.preview.startsWith("tool:")) return [truncateText(task.preview.trim(), 120)];
	return [];
}

function latestToolLine(task: RunStatus["tasks"][number]): string | undefined {
	if (task.currentTool) {
		const args = task.currentToolArgs || (task.currentPath ? String(task.currentPath) : "");
		return truncateText(`tool: ${task.currentTool}${args ? ` ${args}` : ""}`);
	}
	const tool = task.recentTools?.at(-1);
	if (!tool) return undefined;
	return truncateText(`tool: ${tool.tool}${tool.args ? ` ${tool.args}` : ""}`);
}

function taskGlyph(state: string, theme: ExtensionContext["ui"]["theme"]): string {
	if (state === "complete") return theme.fg("success", "✓");
	if (state === "failed") return theme.fg("error", "✗");
	if (state === "running") return theme.fg("accent", "◐");
	return theme.fg("dim", "◦");
}

function summarizeUsage(status: RunStatus): { tools: number; turns: number; tokens: number; cost: number } {
	let tools = 0;
	let turns = 0;
	let tokens = 0;
	let cost = 0;
	for (const task of status.tasks) {
		tools += task.toolCount ?? 0;
		turns += task.usage?.turns ?? 0;
		tokens += taskTokens(task);
		cost += task.usage?.cost ?? 0;
	}
	return { tools, turns, tokens, cost };
}

function renderStatusCard(
	status: RunStatus,
	runDir: string | undefined,
	theme: ExtensionContext["ui"]["theme"],
	expanded: boolean,
	finalText?: string,
): Text {
	const done = status.tasks.filter((task) => task.state === "complete" || task.state === "failed").length;
	const failed = status.tasks.filter((task) => task.state === "failed").length;
	const running = status.tasks.filter((task) => task.state === "running").length;
	const queued = status.tasks.filter((task) => task.state === "queued").length;
	const elapsed = duration((status.completedAt ?? Date.now()) - status.startedAt);
	const usage = summarizeUsage(status);
	const stateGlyph = status.state === "complete" ? theme.fg("success", "✓") : status.state === "failed" ? theme.fg("error", "✗") : theme.fg("accent", "◐");
	const stats = [
		`${done}/${status.tasks.length}`,
		running ? `${running} running` : "",
		queued ? `${queued} queued` : "",
		failed ? `${failed} failed` : "",
		usage.tools ? `${usage.tools} tools` : "",
		usage.turns ? `${usage.turns} turns` : "",
		usage.tokens ? `${compactNumber(usage.tokens)} tok` : "",
		usage.cost ? `$${usage.cost.toFixed(4)}` : "",
		elapsed,
	].filter(Boolean).join(" · ");
	const lines = [`${stateGlyph} ${theme.fg("toolTitle", theme.bold("subagents"))} ${theme.fg("dim", `· ${status.state} · ${stats}`)}`];
	if (!expanded && status.state === "running") lines.push(theme.fg("accent", "  Press Ctrl+O for details"));

	for (const task of status.tasks) {
		const label = `${task.index + 1}. ${task.name}`;
		const tokenCount = taskTokens(task);
		const taskStats = [
			task.state,
			expanded && task.context ? `context ${task.context}` : "",
			expanded && task.model ? `model ${task.model}` : "",
			expanded && task.thinking ? `thinking ${task.thinking}` : "",
			task.toolCount ? `${task.toolCount} tools` : "",
			task.usage?.turns ? `${task.usage.turns} turns` : "",
			tokenCount ? `${compactNumber(tokenCount)} tok` : "",
			task.usage?.cost ? `$${task.usage.cost.toFixed(4)}` : "",
			taskRuntime(task),
		].filter(Boolean).join(" · ");
		lines.push(`  ${taskGlyph(task.state, theme)} ${theme.bold(label)} ${theme.fg("dim", `· ${taskStats}`)}`);

		if (task.state === "failed" && task.error) lines.push(theme.fg("error", `     ${truncateText(task.error.split("\n", 1)[0], 120)}`));
		else if (task.warning) lines.push(theme.fg("warning", `     warning: ${truncateText(task.warning.split("\n", 1)[0], 110)}`));

		const currentOrRecentTool = latestToolLine(task);
		if (currentOrRecentTool) lines.push(theme.fg("dim", `     ${currentOrRecentTool}`));
		if (expanded) {
			for (const tool of task.recentTools?.slice(-3, -1) ?? []) lines.push(theme.fg("dim", `     ${truncateText(`tool: ${tool.tool}${tool.args ? ` ${tool.args}` : ""}`)}`));
		}
		for (const line of taskOutputLines(task, expanded ? 5 : 2)) lines.push(theme.fg("dim", `     ${line}`));
		if (expanded) {
			if (task.outputFile) lines.push(theme.fg("dim", `     output: ${compactPath(task.outputFile)}`));
			if (task.stdoutFile) lines.push(theme.fg("dim", `     jsonl: ${compactPath(task.stdoutFile)}`));
		}
	}
	if (expanded && runDir) lines.push("", theme.fg("dim", `Artifacts: ${compactPath(runDir)}`));
	if (expanded && finalText && status.state !== "running") lines.push("", finalText.trim());
	return new Text(lines.join("\n"), 0, 0);
}

function statusFromDetails(details: unknown): { status: RunStatus; dir?: string } | undefined {
	if (!details || typeof details !== "object") return undefined;
	const record = details as { status?: RunStatus; dir?: string };
	if (record.status?.tasks) return { status: record.status, dir: record.dir };
	return undefined;
}

function launchAsyncRun(params: SubagentParams, ctx: ExtensionContext): { id: string; dir: string; notify: NotifyMode; count: number } {
	const run = prepareRun(params, ctx);
	const child = spawn(process.execPath, [RUNNER_PATH, run.configPath], {
		cwd: run.config.cwd,
		detached: true,
		stdio: "ignore",
		env: { ...process.env, PI_SUBAGENTS_PI_SCRIPT: process.argv[1] },
	});
	child.unref();
	return { id: run.id, dir: run.dir, notify: run.notify, count: run.count };
}

async function runForeground(
	params: SubagentParams,
	ctx: ExtensionContext,
	signal: AbortSignal | undefined,
	onUpdate: ((result: { content: Array<{ type: "text"; text: string }>; details: unknown; isError?: boolean }) => void) | undefined,
) {
	const run = prepareRun(params, ctx);
	let lastStatusText = "";
	const emitUpdate = (status: RunStatus) => {
		const statusText = formatStatus(run.dir);
		if (statusText === lastStatusText) return;
		lastStatusText = statusText;
		onUpdate?.({ content: [{ type: "text", text: `Subagent run ${run.id} ${status.state} (${status.tasks.filter((task) => task.state === "complete" || task.state === "failed").length}/${status.tasks.length}).` }], details: { ...run, status } });
	};
	const { status, resultText } = await runSubagents(run.config, { signal, onUpdate: emitUpdate });
	return {
		content: [{ type: "text" as const, text: resultText }],
		details: { ...run, status },
		...(status.state === "failed" ? { isError: true } : {}),
	};
}

export default function registerSubagents(pi: ExtensionAPI): void {
	if (process.env.PI_SIMPLE_SUBAGENT_CHILD === "1") return;
	ensureDir(RUN_ROOT);
	const activeRuns = new Map<string, ActiveRun>();
	let lastCtx: ExtensionContext | undefined;
	let poller: NodeJS.Timeout | undefined;

	const ensurePoller = () => {
		if (poller) return;
		poller = setInterval(() => {
			if (!lastCtx) return;
			for (const run of activeRuns.values()) {
				if (run.notified) continue;
				const status = readJson<RunStatus>(statusPath(run.dir));
				if (!status || status.state === "running") continue;
				run.notified = true;
				notifyCompletion({
					notify: run.notify,
					status,
					runDir: run.dir,
					hasUI: lastCtx.hasUI,
					isIdle: lastCtx.isIdle(),
					sendUserMessage: (message, options) => pi.sendUserMessage(message, options),
					uiNotify: (message, type) => lastCtx?.ui.notify(message, type),
				});
			}
		}, POLL_MS);
	};

	pi.registerTool({
		name: "subagent",
		label: "Subagent",
		description: [
			"Launch foreground or async/background child Pi sessions for orchestration fanout.",
			"No predefined agents: pass task plus optional appendSystemPrompt/model/thinking/tools/cwd/context.",
			"The extension adds no default child role or safety prompt; the orchestrator must define instructions and tool access explicitly.",
			"Default is foreground/blocking; set async:true for background execution.",
			"For background runs, default notify is TUI completion notification; set notify:'followUp' to wake the parent agent.",
		].join(" "),
		parameters: SubagentParamsSchema,
		async execute(_id, rawParams, signal, onUpdate, ctx) {
			lastCtx = ctx;
			const params = rawParams as SubagentParams;
			if (params.action === "status") {
				const runDir = params.id ? findRunDir(params.id) : undefined;
				const status = runDir ? readJson<RunStatus>(statusPath(runDir)) : undefined;
				return {
					content: [{ type: "text", text: params.id && !runDir ? `No subagent run found for '${params.id}'.` : formatStatus(runDir) }],
					details: status ? { status, dir: runDir } : {},
				};
			}
			try {
				if (params.async === true) {
					const run = launchAsyncRun(params, ctx);
					activeRuns.set(run.id, run);
					ensurePoller();
					return {
						content: [{
							type: "text",
							text: `Started subagent run ${run.id} (${run.count} task${run.count === 1 ? "" : "s"}).\nStatus: subagent({ action: "status", id: "${run.id}" })\nDir: ${run.dir}`,
						}],
						details: run,
					};
				}
				return await runForeground(params, ctx, signal, onUpdate);
			} catch (error) {
				return {
					content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }],
					isError: true,
					details: {},
				};
			}
		},
		renderCall(args, theme) {
			if ((args as SubagentParams).action === "status") {
				return new Text(`${theme.fg("toolTitle", theme.bold("subagent "))}status ${(args as SubagentParams).id ?? ""}`, 0, 0);
			}
			const params = args as SubagentParams;
			const count = params.tasks?.length ?? 1;
			const mode = params.async === true ? "async" : "foreground";
			return new Text(`${theme.fg("toolTitle", theme.bold("subagent "))}${mode} ${theme.fg("accent", String(count))} task${count === 1 ? "" : "s"}`, 0, 0);
		},
		renderResult(result, options, theme) {
			const rendered = statusFromDetails(result.details);
			if (rendered) {
				const finalText = result.content.find((item) => item.type === "text")?.text;
				return renderStatusCard(rendered.status, rendered.dir, theme, Boolean(options?.expanded), finalText);
			}
			const text = result.content.find((item) => item.type === "text")?.text ?? "";
			return new Text(theme.fg(result.isError ? "error" : "muted", text), 0, 0);
		},
	});

	pi.on("session_start", (_event, ctx) => {
		lastCtx = ctx;
		ensurePoller();
	});

	pi.on("session_shutdown", () => {
		if (poller) clearInterval(poller);
		poller = undefined;
	});
}
