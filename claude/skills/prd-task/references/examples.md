# PRD-Task Examples

## Example: User Favorites

### Input: `.specs/prds/user-favorites/prd.md`

```markdown
# PRD: User Favorites

## End State
- [ ] Users can favorite items
- [ ] Favorites persist
- [ ] Users can list favorites

## Tasks

### Favorites Storage [db]
Database table for storing favorites.

**Verification:**
- Favorites table exists with userId, itemId, createdAt
- Unique constraint prevents duplicates
- Foreign keys reference users and items tables

### Add Favorite [api]
User can add an item to favorites.

**Verification:**
- POST /api/favorites with itemId
- Verify 201 response
- Verify item appears in database
- Attempt duplicate, verify 409
- Attempt without auth, verify 401

### List Favorites [api]
User can retrieve their favorites.

**Verification:**
- GET /api/favorites returns array
- Results are paginated (20 per page)
- Results sorted by createdAt desc
- Only returns current user's favorites

## Context

### Patterns
- API routes: `src/routes/items.ts`
- Auth middleware: `src/middleware/auth.ts`

### Key Files
- `src/db/schema.ts`

### Non-Goals
- Favorite folders
- Sharing favorites
```

### Output: `.specs/prds/user-favorites/tasks.json`

```json
{
  "prdName": "user-favorites",
  "tasks": [
    {
      "id": "db-1",
      "category": "db",
      "description": "Database table for storing favorites",
      "steps": [
        "Favorites table exists with userId, itemId, createdAt",
        "Unique constraint prevents duplicates",
        "Foreign keys reference users and items tables"
      ],
      "passes": false
    },
    {
      "id": "api-1",
      "category": "api",
      "description": "User can add an item to favorites",
      "steps": [
        "POST /api/favorites with itemId",
        "Verify 201 response",
        "Verify item appears in database",
        "Attempt duplicate, verify 409",
        "Attempt without auth, verify 401"
      ],
      "passes": false
    },
    {
      "id": "api-2",
      "category": "api",
      "description": "User can retrieve their favorites",
      "steps": [
        "GET /api/favorites returns array",
        "Results are paginated (20 per page)",
        "Results sorted by createdAt desc",
        "Only returns current user's favorites"
      ],
      "passes": false
    }
  ],
  "context": {
    "patterns": [
      "API routes: src/routes/items.ts",
      "Auth middleware: src/middleware/auth.ts"
    ],
    "keyFiles": ["src/db/schema.ts"],
    "nonGoals": ["Favorite folders", "Sharing favorites"]
  }
}
```

### Output: `.specs/prds/user-favorites/progress.txt`

Empty file for tracking task completion progress.

---

## Markdown PRD Structure

Expected markdown structure with `### Title [category]` and `**Verification:**` sections:

```markdown
# PRD: <Feature Name>

## End State
- [ ] Capability 1
- [ ] Capability 2

## Tasks

### Task Title [category]
Description of what this task accomplishes.

**Verification:**
- Step to verify it works
- Another verification step

## Context

### Patterns
- Pattern: `src/path/to/example.ts`

### Key Files
- `src/relevant/file.ts`

### Non-Goals
- Thing explicitly excluded
```

---

## Example: GitHub Issue Input

### Command
```
/prd-task from issue #47
```

### Fetch Issue
```bash
gh issue view 47 --json title,body,comments
```

### Issue Content
```json
{
  "title": "Add search filters",
  "body": "## Requirements\nUsers need to filter search results.\n\n## Acceptance Criteria\n- [ ] Filter by date range\n- [ ] Filter by category\n- [ ] Filters persist in URL\n\n## Technical Notes\nUse query params: `?from=2024-01-01&to=2024-12-31&category=api`",
  "comments": [
    {
      "body": "Add 'clear all filters' button"
    }
  ]
}
```

### Output: `.specs/prds/47-search-filters/tasks.json`
```json
{
  "prdName": "47-search-filters",
  "tasks": [
    {
      "id": "functional-1",
      "category": "functional",
      "description": "Filter by date range",
      "steps": [
        "Select date range in filter UI",
        "Verify results only include items in range",
        "Verify URL updates with from/to params"
      ],
      "passes": false
    },
    {
      "id": "functional-2",
      "category": "functional",
      "description": "Filter by category",
      "steps": [
        "Select category in filter UI",
        "Verify results only include selected category",
        "Verify URL updates with category param"
      ],
      "passes": false
    },
    {
      "id": "functional-3",
      "category": "functional",
      "description": "Filters persist in URL",
      "steps": [
        "Apply filters, copy URL",
        "Open URL in new tab",
        "Verify filters are applied"
      ],
      "passes": false
    },
    {
      "id": "ui-1",
      "category": "ui",
      "description": "Clear all filters button (from comment)",
      "steps": [
        "Apply multiple filters",
        "Click 'clear all' button",
        "Verify all filters removed and URL cleared"
      ],
      "passes": false
    }
  ],
  "context": {
    "patterns": ["Query params: ?from=&to=&category="],
    "keyFiles": [],
    "nonGoals": []
  }
}
```

---

## Example: Review & Update Workflow

### Command
```
/prd-task review 47-search-filters
```

### Existing tasks.json (2 tasks completed)
```json
{
  "prdName": "47-search-filters",
  "tasks": [
    {
      "id": "functional-1",
      "category": "functional",
      "description": "Filter by date range",
      "steps": ["Select date range", "Verify results filtered"],
      "passes": true
    },
    {
      "id": "functional-2",
      "category": "functional",
      "description": "Filter by category",
      "steps": ["Select category", "Verify results filtered"],
      "passes": true
    }
  ]
}
```

### Updated Issue (new comment)
```json
{
  "comments": [
    { "body": "Also need filter by author" },
    { "body": "Date range filter needs to support 'last 7 days' preset" }
  ]
}
```

### Updated tasks.json
```json
{
  "prdName": "47-search-filters",
  "tasks": [
    {
      "id": "functional-1",
      "category": "functional",
      "description": "Filter by date range",
      "steps": [
        "Select date range",
        "Verify results filtered",
        "Select 'last 7 days' preset",
        "Verify preset calculates correct range"
      ],
      "passes": false
    },
    {
      "id": "functional-2",
      "category": "functional",
      "description": "Filter by category",
      "steps": ["Select category", "Verify results filtered"],
      "passes": true
    },
    {
      "id": "functional-3",
      "category": "functional",
      "description": "Filter by author (from comment)",
      "steps": [
        "Select author in filter UI",
        "Verify results only include selected author"
      ],
      "passes": false
    }
  ]
}
```

### Changelog Output
```
Tasks updated for 47-search-filters:

Added:
  - functional-3: Filter by author (from comment)

Removed:
  (none)

Updated:
  - functional-1: Added 'last 7 days' preset steps (passes reset: yes)

Unchanged: 1 task (functional-2)
```
