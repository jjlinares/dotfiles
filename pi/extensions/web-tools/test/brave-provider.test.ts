import test from "node:test";
import assert from "node:assert/strict";
import {
	BRAVE_SEARCH_ENDPOINT,
	BraveSearchProvider,
	MAX_SEARCH_RESPONSE_BYTES,
	parseBraveSearchResults,
} from "../providers/brave.ts";
import { parsePublicHttpUrl, parseSearchQuery } from "../types.ts";

const endpoint = parsePublicHttpUrl(BRAVE_SEARCH_ENDPOINT);
assert.equal(endpoint._tag, "ok");

test("BraveSearchProvider sends the Brave request contract", async () => {
	let capturedUrl: URL | undefined;
	let capturedInit: RequestInit | undefined;
	await withMockFetch(async (input, init) => {
		capturedUrl = new URL(String(input));
		capturedInit = init;
		return jsonResponse({
			web: {
				results: [
					{ title: "Example", url: "https://example.com/", description: "Example result" },
				],
			},
		});
	}, async () => {
		const provider = new BraveSearchProvider({ endpoint: endpoint.value, apiKey: "test-token" });
		const result = await provider.search(searchRequest("example query", 3));

		assert.equal(result._tag, "ok");
		assert.equal(capturedUrl?.searchParams.get("q"), "example query");
		assert.equal(capturedUrl?.searchParams.get("count"), "3");
		assert.equal(capturedInit?.method, "GET");
		assert.deepEqual(capturedInit?.headers, {
			accept: "application/json",
			"x-subscription-token": "test-token",
		});
		assert.equal(result.value[0]?.url, "https://example.com/");
	});
});

test("BraveSearchProvider rejects non-2xx responses", async () => {
	await withMockFetch(async () => new Response("rate limited", { status: 429 }), async () => {
		const provider = new BraveSearchProvider({ endpoint: endpoint.value, apiKey: "test-token" });
		const result = await provider.search(searchRequest("example", 3));

		assert.deepEqual(result, {
			_tag: "err",
			error: { _tag: "SearchProviderStatusRejected", provider: "brave", status: 429 },
		});
	});
});

test("BraveSearchProvider rejects invalid JSON", async () => {
	await withMockFetch(async () => new Response("not json", { headers: { "content-type": "application/json" } }), async () => {
		const provider = new BraveSearchProvider({ endpoint: endpoint.value, apiKey: "test-token" });
		const result = await provider.search(searchRequest("example", 3));

		assert.deepEqual(result, {
			_tag: "err",
			error: { _tag: "SearchProviderProtocolInvalid", provider: "brave", reason: "Invalid JSON response" },
		});
	});
});

test("BraveSearchProvider rejects oversized responses", async () => {
	await withMockFetch(async () => new Response("", { headers: { "content-length": String(MAX_SEARCH_RESPONSE_BYTES + 1) } }), async () => {
		const provider = new BraveSearchProvider({ endpoint: endpoint.value, apiKey: "test-token" });
		const result = await provider.search(searchRequest("example", 3));

		assert.deepEqual(result, {
			_tag: "err",
			error: { _tag: "SearchProviderResponseTooLarge", provider: "brave", maxBytes: MAX_SEARCH_RESPONSE_BYTES },
		});
	});
});

test("BraveSearchProvider rejects oversized streamed bodies", async () => {
	await withMockFetch(async () => new Response("x".repeat(MAX_SEARCH_RESPONSE_BYTES + 1)), async () => {
		const provider = new BraveSearchProvider({ endpoint: endpoint.value, apiKey: "test-token" });
		const result = await provider.search(searchRequest("example", 3));

		assert.deepEqual(result, {
			_tag: "err",
			error: { _tag: "SearchProviderResponseTooLarge", provider: "brave", maxBytes: MAX_SEARCH_RESPONSE_BYTES },
		});
	});
});

test("parseBraveSearchResults normalizes web results", () => {
	const result = parseBraveSearchResults({
		web: {
			results: [
				{
					title: "Example <strong>Domain</strong>",
					url: "https://example.com/",
					description: "Documentation-safe <em>example</em> domain.",
					profile: { name: "Example" },
				},
			],
		},
	});

	assert.equal(result._tag, "ok");
	assert.deepEqual(result.value, [
		{
			title: "Example Domain",
			url: "https://example.com/",
			snippet: "Documentation-safe example domain.",
			source: "Example",
		},
	]);
});

test("parseBraveSearchResults rejects unrecognized response shapes", () => {
	assert.deepEqual(parseBraveSearchResults({}), {
		_tag: "err",
		error: { _tag: "SearchProviderNoRecognizedResults", provider: "brave" },
	});
});

test("parseBraveSearchResults filters unsafe URLs", () => {
	const result = parseBraveSearchResults({
		web: {
			results: [
				{ title: "File", url: "file:///tmp/example", description: "bad" },
				{ title: "Credentials", url: "https://user:pass@example.com/", description: "bad" },
				{ title: "Safe", url: "https://example.net/path", description: "ok" },
			],
		},
	});

	assert.equal(result._tag, "ok");
	assert.equal(result.value.length, 1);
	assert.equal(result.value[0]?.url, "https://example.net/path");
});

function searchRequest(queryText: string, maxResults: number) {
	const query = parseSearchQuery(queryText);
	assert.equal(query._tag, "ok");
	return { query: query.value, maxResults };
}

function jsonResponse(payload: unknown): Response {
	return new Response(JSON.stringify(payload), { headers: { "content-type": "application/json" } });
}

async function withMockFetch(
	mock: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
	callback: () => Promise<void>,
): Promise<void> {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = mock;
	try {
		await callback();
	} finally {
		globalThis.fetch = originalFetch;
	}
}
