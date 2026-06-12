import { randomBytes } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type ContextMode = "fresh" | "fork";
export type NotifyMode = "tui" | "followUp" | "none";
export type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";

export type TaskInput = {
	name?: string;
	task: string;
	systemPrompt?: string;
	systemPromptMode?: "append" | "replace";
	context?: ContextMode;
	model?: string;
	thinking?: ThinkingLevel;
	tools?: string | string[] | false;
	cwd?: string;
};

export type SubagentParams = {
	action?: "status";
	id?: string;
	task?: string;
	name?: string;
	systemPrompt?: string;
	systemPromptMode?: "append" | "replace";
	tasks?: TaskInput[];
	context?: ContextMode;
	model?: string;
	thinking?: ThinkingLevel;
	tools?: string | string[] | false;
	cwd?: string;
	concurrency?: number;
	timeoutMs?: number;
	includeJsonl?: boolean;
	async?: boolean;
	notify?: NotifyMode;
};

export type RunStatus = {
	id: string;
	state: "running" | "complete" | "failed";
	cwd: string;
	notify: NotifyMode;
	startedAt: number;
	updatedAt: number;
	completedAt?: number;
	error?: string;
	tasks: Array<{
		id: string;
		index: number;
		name: string;
		state: "queued" | "running" | "complete" | "failed";
		preview?: string;
		outputFile?: string;
		stderrFile?: string;
		cwd?: string;
		context?: ContextMode;
		model?: string;
		thinking?: ThinkingLevel;
		sessionFile?: string;
		startedAt?: number;
		completedAt?: number;
		updatedAt?: number;
		error?: string;
		warning?: string;
		currentTool?: string;
		currentToolArgs?: string;
		currentToolStartedAt?: number;
		currentPath?: string;
		toolCount?: number;
		recentTools?: Array<{ tool: string; args: string; endMs: number }>;
		recentOutput?: string[];
		stdoutFile?: string;
		exitCode?: number;
		usage?: { input: number; output: number; cacheRead?: number; cacheWrite?: number; cost: number; turns: number; totalTokens: number };
	}>;
};

export type PlannedTask = Required<Pick<TaskInput, "task" | "context">> & {
	id: string;
	name: string;
	systemPrompt?: string;
	systemPromptMode: "append" | "replace";
	model?: string;
	thinking?: ThinkingLevel;
	tools?: string | string[] | false;
	cwd: string;
	sessionFile?: string;
};

export type RunConfig = {
	runId: string;
	runDir: string;
	cwd: string;
	notify: NotifyMode;
	concurrency: number;
	timeoutMs?: number;
	includeJsonl: boolean;
	piScript?: string;
	tasks: PlannedTask[];
};

function sanitizeTempScopeSegment(value: string): string {
	const sanitized = value
		.trim()
		.replace(/[^A-Za-z0-9._-]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return sanitized || "unknown";
}

export function resolveTempScopeId(): string {
	if (typeof process.getuid === "function") return `uid-${process.getuid()}`;
	for (const key of ["USERNAME", "USER", "LOGNAME"] as const) {
		const value = process.env[key];
		if (value) return `user-${sanitizeTempScopeSegment(value)}`;
	}
	try {
		const username = os.userInfo().username;
		if (username) return `user-${sanitizeTempScopeSegment(username)}`;
	} catch {}
	const home = process.env.HOME ?? process.env.USERPROFILE ?? os.homedir();
	if (home) return `home-${sanitizeTempScopeSegment(home)}`;
	return "shared";
}

export const RUN_ROOT = path.join(os.tmpdir(), `pi-subagents-${resolveTempScopeId()}`, "runs");
export const DEFAULT_CONCURRENCY = 4;
export const MAX_LISTED_RUNS = 12;
export const DEFAULT_THINKING: ThinkingLevel = "medium";

export function ensureDir(dir: string): void {
	fs.mkdirSync(dir, { recursive: true });
}

export function randomId(): string {
	return randomBytes(8).toString("hex");
}

export function safeName(value: string | undefined, fallback: string): string {
	return (value ?? fallback).replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || fallback;
}

export function readJson<T>(file: string): T | undefined {
	try {
		return JSON.parse(fs.readFileSync(file, "utf8")) as T;
	} catch {
		return undefined;
	}
}

export function statusPath(runDir: string): string {
	return path.join(runDir, "status.json");
}

export function resultPath(runDir: string): string {
	return path.join(runDir, "result.md");
}

export function listRunDirs(root = RUN_ROOT): string[] {
	ensureDir(root);
	return fs.readdirSync(root, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => path.join(root, entry.name))
		.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}

export function findRunDir(id?: string, root = RUN_ROOT): string | undefined {
	if (!id) return undefined;
	const dirs = listRunDirs(root);
	return dirs.find((dir) => path.basename(dir) === id) ?? dirs.find((dir) => path.basename(dir).startsWith(id));
}

export function resolveTasks(params: SubagentParams): TaskInput[] {
	const hasTasks = (params.tasks?.length ?? 0) > 0;
	const hasSingle = Boolean(params.task);
	if (Number(hasTasks) + Number(hasSingle) !== 1) {
		throw new Error("Provide exactly one execution mode: task or tasks[].");
	}
	return hasTasks ? params.tasks! : [{
		name: params.name,
		task: params.task!,
		systemPrompt: params.systemPrompt,
		systemPromptMode: params.systemPromptMode,
		context: params.context,
		model: params.model,
		thinking: params.thinking,
		tools: params.tools,
		cwd: params.cwd,
	}];
}

export function buildRunConfig(input: {
	params: SubagentParams;
	ctxCwd: string;
	runId: string;
	runDir: string;
	forkSessionForIndex?: (index: number) => string | undefined;
}): RunConfig {
	const { params, ctxCwd, runId, runDir } = input;
	const cwd = path.resolve(ctxCwd, params.cwd ?? ".");
	const topContext = params.context ?? "fresh";
	const forkSessionForIndex = input.forkSessionForIndex ?? (() => undefined);
	const tasks = resolveTasks(params).map((task, index): PlannedTask => {
		const context = task.context ?? topContext;
		const systemPrompt = task.systemPrompt ?? params.systemPrompt;
		const model = task.model ?? params.model;
		const thinking = task.thinking ?? params.thinking ?? DEFAULT_THINKING;
		const tools = task.tools ?? params.tools;
		return {
			id: `${runId}-${index}`,
			name: task.name ?? safeName(systemPrompt?.split("\n", 1)[0], `task-${index + 1}`),
			task: task.task,
			...(systemPrompt ? { systemPrompt } : {}),
			systemPromptMode: task.systemPromptMode ?? params.systemPromptMode ?? "append",
			context,
			...(model ? { model } : {}),
			...(thinking ? { thinking } : {}),
			...(tools !== undefined ? { tools } : {}),
			cwd: path.resolve(cwd, task.cwd ?? "."),
			...(context === "fork" ? { sessionFile: forkSessionForIndex(index) } : {}),
		};
	});
	return {
		runId,
		runDir,
		cwd,
		notify: params.notify ?? "tui",
		concurrency: params.concurrency ?? DEFAULT_CONCURRENCY,
		...(params.timeoutMs ? { timeoutMs: params.timeoutMs } : {}),
		includeJsonl: params.includeJsonl === true,
		tasks,
	};
}

export function needsFork(params: SubagentParams): boolean {
	const topContext = params.context ?? "fresh";
	return resolveTasks(params).some((task) => (task.context ?? topContext) === "fork");
}

export function formatDuration(ms: number): string {
	const seconds = Math.max(0, Math.round(ms / 1000));
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	const rest = seconds % 60;
	return `${minutes}m${rest ? ` ${rest}s` : ""}`;
}

export function formatRunLine(status: RunStatus, now = Date.now()): string {
	const icon = status.state === "complete" ? "✓" : status.state === "failed" ? "✗" : "…";
	const done = status.tasks.filter((task) => task.state === "complete" || task.state === "failed").length;
	const age = formatDuration((status.completedAt ?? now) - status.startedAt);
	return `${icon} ${status.id} ${status.state} ${done}/${status.tasks.length} ${age}`;
}

export function formatStatus(runDir?: string, root = RUN_ROOT, now = Date.now()): string {
	if (!runDir) {
		const runs = listRunDirs(root)
			.map((dir) => readJson<RunStatus>(statusPath(dir)))
			.filter((status): status is RunStatus => Boolean(status))
			.slice(0, MAX_LISTED_RUNS);
		if (runs.length === 0) return "No subagent runs found.";
		return ["Subagent runs:", ...runs.map((status) => formatRunLine(status, now))].join("\n");
	}

	const status = readJson<RunStatus>(statusPath(runDir));
	if (!status) return `No status found for ${path.basename(runDir)}.`;
	const lines = [formatRunLine(status, now), `dir: ${runDir}`];
	for (const task of status.tasks) {
		lines.push(`\n## ${task.name} — ${task.state}`);
		if (task.preview) lines.push(task.preview);
		if (task.outputFile) lines.push(`output: ${task.outputFile}`);
		if (task.stderrFile && fs.existsSync(task.stderrFile) && fs.statSync(task.stderrFile).size > 0) {
			lines.push(`stderr: ${task.stderrFile}`);
		}
	}
	const result = resultPath(runDir);
	if (fs.existsSync(result)) lines.push(`\nresult: ${result}`);
	return lines.join("\n");
}

export function completionMessage(status: RunStatus, runDir: string): string {
	const failed = status.state === "failed";
	return [
		`Subagent run ${status.id} ${failed ? "failed" : "completed"}.`,
		`Result: ${resultPath(runDir)}`,
		`Inspect with subagent({ action: "status", id: "${status.id}" }).`,
	].join("\n");
}

export function notifyCompletion(input: {
	notify: NotifyMode;
	status: RunStatus;
	runDir: string;
	hasUI: boolean;
	isIdle: boolean;
	sendUserMessage: (message: string, options?: { deliverAs: "followUp" }) => void;
	uiNotify: (message: string, type: "info" | "error") => void;
}): "followUp" | "tui" | "none" {
	if (input.notify === "followUp") {
		const message = completionMessage(input.status, input.runDir);
		if (input.isIdle) input.sendUserMessage(message);
		else input.sendUserMessage(message, { deliverAs: "followUp" });
		return "followUp";
	}
	if (input.notify === "tui" && input.hasUI) {
		input.uiNotify(`Subagent ${input.status.id} ${input.status.state}`, input.status.state === "failed" ? "error" : "info");
		return "tui";
	}
	return "none";
}
