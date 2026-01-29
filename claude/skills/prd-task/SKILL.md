---
name: prd-task
description: This skill should be used when the user asks to "convert PRD to tasks", "generate tasks.json", "create task file from PRD", "generate tasks from GitHub issue", "review tasks", "update tasks from issue", or references a PRD folder or GitHub issue URL for task generation.
---

# PRD Task Skill

Convert markdown PRDs or GitHub issues into executable JSON task files.

PRD defines **end state** via tasks with verification steps. Agent decides HOW to implement.

## Phase 1: Source Ingestion

**Goal:** Read and parse the source material.

### Option A: PRD Folder (default)
Read `.specs/prds/<feature-name>/prd.md`

### Option B: GitHub Issue
1. Fetch with `gh issue view <number> --json title,body,comments`
2. Extract requirements from body + comments
3. For attachments (images, files): fetch via WebFetch
4. Folder naming: `<issue-number>-<short-name>` (2-3 words, kebab-case)

See `references/github-sources.md` for details.

### Option C: Explicit Path
User provides path to PRD markdown file.

### Expected PRD structure
- `## Tasks` with `### Task Title [category]` headers
- `**Verification:**` sections with test steps
- `## Context` with patterns, key files, non-goals

## Phase 2: Codebase Context

**Goal:** Enrich context beyond what the PRD explicitly states.

Launch 1 `code-explorer` agent:

```
Explore the codebase for patterns and key files relevant to: <feature area from PRD>

Find:
- Existing patterns the feature should follow (naming, structure, conventions)
- Key files that will be modified or extended
- Related implementations to use as reference

Return: list of patterns, key files, and any constraints not mentioned in the PRD.
```

Merge agent findings into the `context` object alongside any context from the PRD itself.

## Phase 3: Task Extraction

**Goal:** Parse source into structured tasks.

Create TodoWrite list tracking phases. Mark Phase 3 in-progress.

### Extraction rules
- Each `### Title [category]` → one task
- `id`: `<category>-<number>` or descriptive slug
- Text after title → `description`
- `**Verification:**` items → `steps`
- `passes` always starts `false`

### Sizing rules
- Smallest possible unit of work
- One logical change per task
- Prefer many small tasks over few large
- Each task completable in one commit

### PRD name derivation
`# PRD: User Authentication` → `"prdName": "user-authentication"`

## Phase 4: User Review

**Goal:** Validate extracted tasks before writing files.

Present summary to user via AskUserQuestion:

```
Extracted N tasks from <source>:

Tasks by category:
  - api: N
  - functional: N
  ...

Task list:
  1. <id>: <description>
  2. <id>: <description>
  ...

Non-goals: <list>
```

Options: "Approve", "Edit tasks first", "Cancel"

Do NOT write files until user approves.

## Phase 5: Output

**Goal:** Write task files and confirm.

Output structure:
```
.specs/prds/<feature-name>/
├── prd.md        # Source PRD (if from PRD skill)
├── tasks.json    # Generated task file
└── progress.txt  # Progress tracking
```

### tasks.json schema

```json
{
  "prdName": "<feature-name>",
  "tasks": [
    {
      "id": "category-1",
      "category": "category",
      "description": "What exists when task complete",
      "steps": ["Verification step 1", "Verification step 2"],
      "passes": false
    }
  ],
  "context": {
    "patterns": ["Pattern: src/path/to/example.ts"],
    "keyFiles": ["src/relevant/file.ts"],
    "nonGoals": ["Excluded feature"]
  }
}
```

### Task object fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | `<category>-<number>` or descriptive slug |
| `category` | string | Grouping: "functional", "ui", "api", "db", "security", "testing" |
| `description` | string | What exists when task complete |
| `steps` | string[] | How to TEST it works (not how to build). Prefer automatable steps (test commands, API calls) over manual inspection |
| `passes` | boolean | `true` when ALL steps verified |

### Field rules
- **READ-ONLY** except `passes` (set `true` when all steps pass)
- **NEVER edit or remove tasks** — could lead to missing functionality

### After writing

Mark all TodoWrite items complete. Tell user:

```
Tasks generated at .specs/prds/<feature-name>/
  - tasks.json (X tasks)
  - progress.txt (created)

Tasks by category:
  - api: N
  - db: N
  - functional: N

Non-goals (excluded): <list>
```

## Review & Update Workflow

When user asks to "review tasks" or "update tasks from issue":

1. Read existing `tasks.json`
2. Fetch latest from source (GitHub issue comments, updated PRD)
3. Compare requirements and determine changes

### Change types

| Change | Action |
|--------|--------|
| New requirement | Add task with `passes: false` |
| Requirement removed | Remove task entirely |
| Steps changed | Update steps, set `passes: false` |
| Description clarified | Update description, keep `passes` |
| No change | Keep as-is |

### Rules
- Reset `passes: false` when steps change (needs re-verification)
- Keep `passes` if only description/wording improved
- Remove tasks only if requirement explicitly dropped
- Add context from new comments

### After update

Present changelog then write:
```
Tasks updated for <feature-name>:

Added:
  - <task-id>: <description>

Removed:
  - <task-id>: <reason>

Updated:
  - <task-id>: <what changed> (passes reset: yes/no)

Unchanged: N tasks
```

## Resources

- **`references/examples.md`** — Full input/output examples including GitHub issue and review workflows
- **`references/github-sources.md`** — GitHub issue fetching, attachments, and comment handling
