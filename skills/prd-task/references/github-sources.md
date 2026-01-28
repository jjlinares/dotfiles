# GitHub Sources Reference

## Fetching Issues

### Basic Issue Fetch
```bash
gh issue view <number> --json title,body,comments
```

### Full Issue Data
```bash
gh issue view <number> --json title,body,comments,labels,assignees,state
```

### Response Structure
```json
{
  "title": "Feature: User Notifications",
  "body": "## Requirements\n- Push notifications\n- Email digest\n\n## Acceptance Criteria\n- [ ] Users receive push within 30s\n- [ ] Daily digest at 9am",
  "comments": [
    {
      "author": { "login": "user1" },
      "body": "Also need SMS support",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

## Handling Attachments

### Images in Issue Body
Images appear as markdown: `![description](https://user-images.githubusercontent.com/...)`

To view image content:
```
Use WebFetch with the image URL to analyze visual requirements
```

### File Attachments
GitHub-hosted files in `user-attachments` bucket:
- URL format: `https://github.com/user-attachments/files/...`
- Fetch directly via WebFetch or curl

### Code Blocks
Extract inline code and code blocks as implementation hints:
```markdown
```typescript
interface NotificationConfig {
  channels: ('push' | 'email' | 'sms')[];
  frequency: 'realtime' | 'daily' | 'weekly';
}
```
```

## Extracting Tasks from Issues

### Common Patterns

**Acceptance Criteria (checkbox list):**
```markdown
## Acceptance Criteria
- [ ] Criterion becomes verification step
- [ ] Another criterion
```

**Requirements Section:**
```markdown
## Requirements
- Requirement becomes task description
- Sub-bullets become verification steps
```

**Task Lists:**
```markdown
## Tasks
- [ ] Task 1
- [ ] Task 2
```

### Deriving Categories

Map GitHub labels to task categories:
| Label | Category |
|-------|----------|
| `api`, `backend` | api |
| `database`, `schema` | db |
| `ui`, `frontend` | ui |
| `security`, `auth` | security |
| `test`, `testing` | testing |
| (default) | functional |

## Processing Comments

Comments may contain:
- **Clarifications** - Update task descriptions
- **New requirements** - Add as new tasks
- **Scope changes** - Remove or modify tasks
- **Implementation hints** - Add to context.patterns

### Comment Priority
Later comments supersede earlier ones for conflicting requirements.

## Example: Issue to Tasks

### Input: `gh issue view 42`
```json
{
  "title": "Add user notifications",
  "body": "## Requirements\nUsers need notifications for important events.\n\n## Acceptance Criteria\n- [ ] Push notifications within 30 seconds\n- [ ] Email digest option\n- [ ] User can disable notifications\n\n## Non-Goals\n- SMS support (future)\n",
  "comments": [
    {
      "body": "Also add notification preferences UI"
    }
  ]
}
```

### Output: `.specs/prds/42-user-notifications/tasks.json`
```json
{
  "prdName": "42-user-notifications",
  "tasks": [
    {
      "id": "functional-1",
      "category": "functional",
      "description": "Push notifications within 30 seconds",
      "steps": [
        "Trigger event, verify push received in <30s",
        "Check notification payload matches event"
      ],
      "passes": false
    },
    {
      "id": "functional-2",
      "category": "functional",
      "description": "Email digest option",
      "steps": [
        "Enable digest in settings",
        "Verify daily email contains events"
      ],
      "passes": false
    },
    {
      "id": "functional-3",
      "category": "functional",
      "description": "User can disable notifications",
      "steps": [
        "Disable in settings",
        "Trigger event, verify no notification"
      ],
      "passes": false
    },
    {
      "id": "ui-1",
      "category": "ui",
      "description": "Notification preferences UI (from comment)",
      "steps": [
        "Preferences page accessible from settings",
        "Toggle controls for each notification type"
      ],
      "passes": false
    }
  ],
  "context": {
    "patterns": [],
    "keyFiles": [],
    "nonGoals": ["SMS support (future)"]
  }
}
```
