import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function (pi: ExtensionAPI) {
	pi.on("session_start", (_event, ctx) => {
		if (pi.getSessionName()) return;

		const sessionId = ctx.sessionManager.getSessionId();
		if (!sessionId || UUID_RE.test(sessionId)) return;

		pi.setSessionName(sessionId);
	});
}
