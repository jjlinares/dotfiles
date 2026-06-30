import test from "node:test";
import assert from "node:assert/strict";
import { BRAVE_SEARCH_ENDPOINT, parseBraveSearchResults } from "../providers/brave.ts";
import { parsePublicHttpUrl } from "../types.ts";

const endpoint = parsePublicHttpUrl(BRAVE_SEARCH_ENDPOINT);
assert.equal(endpoint._tag, "ok");

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
