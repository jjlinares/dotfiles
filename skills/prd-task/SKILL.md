---
name: prd-task
description: This skill should be used when the user asks to "convert PRD to tasks", "generate tasks.json", "create task file from PRD", "generate tasks from GitHub issue", "review tasks", "update tasks from issue", or references a PRD folder or GitHub issue URL for task generation.
---

# PRD Task Skill

Convert markdown PRDs to executable JSON format for autonomous task completion.

PRD defines **end state** via tasks with verification steps. Agent decides HOW to implement.

## Workflow

1. User requests task conversion for a PRD or GitHub issue
2. Read from source (PRD file, GitHub issue, or explicit path)
3. Extract tasks with verification steps
4. Output JSON to `.specs/prds/<feature-name>/tasks.json`
5. Create empty `.specs/prds/<feature-name>/progress.txt`

Output structure:
```
.specs/prds/<feature-name>/
├── prd.md        # Source PRD (if from PRD skill)
├── tasks.json    # Generated task file
└── progress.txt  # Progress tracking
```

## Input Sources

### Option A: PRD Folder (default)
Read from `.specs/prds/<feature-name>/prd.md`

### Option B: GitHub Issue
1. Use `gh issue view <number> --json title,body,comments` to fetch issue
2. Extract requirements from issue body
3. Include any comments as additional context
4. For attachments (images, files):
   - Images in body: URLs in markdown `![](url)` - use WebFetch to view
   - File attachments: Download via `gh` or WebFetch if URL provided
   - User-attachments bucket URLs: Fetch directly

**Folder naming:** `<issue-number>-<short-name>`
- Example: Issue #42 "Add user notifications system" → `42-user-notifications`
- Keep short name to 2-3 words max, kebab-case

See `references/github-sources.md` for detailed GitHub handling.

### Option C: Explicit Path
User provides path to PRD markdown file directly.

## Input Format

Expect markdown PRD at `.specs/prds/<feature-name>/prd.md` with:
- `## Tasks` section containing task definitions
- `### Task Title [category]` headers
- `**Verification:**` sections with test steps
- `## Context` section with patterns, key files, non-goals

## Output Format

Generate `tasks.json`:

```json
{
  "prdName": "<feature-name>",
  "tasks": [
    {
      "id": "category-1",
      "category": "category",
      "description": "What this task accomplishes",
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

## Schema

### Task Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | `<category>-<number>` or descriptive slug |
| `category` | string | Grouping: "functional", "ui", "api", "db", "security", "testing" |
| `description` | string | What exists when task complete |
| `steps` | string[] | Verification steps - how to TEST it works |
| `passes` | boolean | `true` when ALL steps verified |

### Key Points

- **Steps are verification, not implementation** - Describe HOW TO TEST, not how to build
- **Category is flexible** - Use what fits the codebase
- **Context helps exploration** - Patterns and key files guide initial investigation

## Conversion Rules

### Task Extraction
- Each `### Title [category]` becomes a task
- Generate `id` as `<category>-<number>` or descriptive slug
- Text after title is the `description`
- Items under `**Verification:**` become `steps`
- `passes` always starts as `false`

### Task Sizing
- One logical change per task
- Break large sections into multiple tasks
- Prefer many small tasks over few large
- Each task completable in one commit

### Context Preservation
- `context.patterns` - existing code patterns to follow
- `context.keyFiles` - files to explore first
- `context.nonGoals` - explicit scope boundaries

## Field Rules

**READ-ONLY except:**
- `passes`: Set to `true` when ALL verification steps pass

**NEVER edit or remove tasks** - Could lead to missing functionality.

## PRD Name Derivation

Extract from PRD title:
- `# PRD: User Authentication` → `"prdName": "user-authentication"`

## After Conversion

Tell user:

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

### Change Types

| Change | Action |
|--------|--------|
| New requirement | Add new task with `passes: false` |
| Requirement removed | Remove task entirely |
| Steps changed | Update steps, set `passes: false` |
| Description clarified | Update description, keep `passes` value |
| No change | Keep task as-is |

### Rules
- Reset `passes: false` when steps change (needs re-verification)
- Keep `passes` value if only description/wording improved
- Remove tasks only if requirement explicitly dropped
- Add context from new comments

### After Update

Output changelog summary:
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

- **`references/examples.md`** - Full input/output examples including GitHub issue and review workflows
- **`references/github-sources.md`** - GitHub issue fetching, attachments, and comment handling
