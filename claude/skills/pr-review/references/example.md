# Canonical PR Example

## Problem Statement
This branch implements dynamic UI rendering for assistant responses so data can be shown as rich components instead of plain markdown tables/text.  
It targets PRD in `.agents/features/dynamic-ui-rendering`.

## Outcome Summary
SpecStream-based json-render is now working end-to-end in chat:

1. LLM emits fenced `json-render-specstream` patches.
2. UI compiles/repairs patches incrementally and renders components during streaming.
3. Raw assistant text persists in `textText`; replay works after refresh.
4. Catalog and registry now support table/chart/map/cards components.
5. Prompt contracts are hardened and test-covered.

Branch context:
- Branch: `feature/dynamic-ui-rendering`
- Commits since `master`: `17`
- Diff vs `master`: `30 files`, `+3936/-15`

## Change Areas
1. Scope and decisions:
- `.agents/features/dynamic-ui-rendering/prd.md`
- `.agents/features/dynamic-ui-rendering/learnings.md`

2. Prompt and AI contract
- `src/ai/agents/oos-agent.ts`
- `src/ai/json-render/prompt-source.ts`
- `src/ai/json-render/prompt.ts`

3. SpecStream compile/repair
- `src/ai/json-render/specstream-compiler.ts`
- `src/ai/json-render/spec-repair.ts`

4. Chat rendering integration
- `src/components/chat/chat-messages.tsx`
- `src/components/chat/json-render-utils.ts`
- `src/ai/message-mapping.ts`

5. json-render catalog and component runtime
- `src/components/json-render/catalog.ts`
- `src/components/json-render/json-render-block.tsx`
- `src/components/json-render/json-render-specstream-block.tsx`
- `src/components/json-render/registry/core.tsx`
- `src/components/json-render/registry/data-table.tsx`
- `src/components/json-render/registry/charts.tsx`
- `src/components/json-render/registry/geo-map.tsx`
- `src/components/json-render/registry/cards.tsx`
- `src/components/json-render/registry.tsx`

6. Test coverage
- `test/ai/json-render/specstream-compiler.test.ts`
- `test/ai/json-render/json-render-prompt.test.ts`
- `test/components/chat/json-render-utils.test.ts`
- `test/components/json-render/json-render-block.test.tsx`
- `test/components/json-render/json-render-specstream-block.test.tsx`

## Non-goals / Deferred Scope
1. Local interaction model (`on.press`, `setState`, `pushState`, `removeState`)
2. Visibility conditions (`visible` expressions)
3. Repeat loops (`repeat`, `$item`, `$index`)
4. LLM context pruning/reinjection strategy for prior UI blocks
5. Action-plan artifact staging from json-render output
6. Reliability instrumentation to prove `>90%` valid-spec rate in production-like runs

## How to Test
Commands run in this session:
1. `pnpm check` -> pass
2. `pnpm exec tsc --noEmit` -> pass
3. `pnpm test -- test/ai/json-render/specstream-compiler.test.ts test/ai/json-render/json-render-prompt.test.ts test/components/chat/json-render-utils.test.ts test/components/json-render/json-render-block.test.tsx test/components/json-render/json-render-specstream-block.test.tsx` -> pass (`27 tests`)

Manual scenarios:
1. Ask for a table, chart, map, and stats cards in chat; confirm structured render (not raw JSON).
2. Watch initial streaming: structure appears first, data fills progressively.
3. Refresh page; confirm rendered UI replays from persisted message text.
4. Force malformed block; confirm fallback/error card without chat crash.

## Evidence (screenshots, payload examples, logs)
1. Test evidence from this session: all listed checks passed.
2. Screenshots added to PR.

## Risk Hotspots
1. Streaming patch order sensitivity:
- If model sends rows before structure, UX degrades.
- Mitigation: prompt ordering rules + compiler/repair path.

2. Spec shape drift from model output:
- Common malformed element shapes can regress rendering.
- Mitigation: centralized `repairSpecShape` + runtime validation + tests.

3. Contract drift between prompts and renderer:
- Prompt/catalog mismatch can silently break components.
- Mitigation: prompt contract tests + catalog-driven prompt sections.

4. Large table/chart payloads:
- Rendering and layout cost may spike with big datasets.
- Mitigation: keep sizes bounded in prompt guidance and monitor real chats.
