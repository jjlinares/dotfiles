---
name: architector
description: This skill should be used when the user asks to "create architecture docs", "document the architecture", "update architecture.md", "explain system design", "document design decisions", "create .specs/architecture.md", or needs a quick reference guide on project architecture and complex design decisions.
---
# Architector Skill

Create and maintain `.specs/architecture.md` - a living document providing quick reference to project architecture plus explanations of complex design decisions.

## Purpose

Three audiences:
1. **New contributors** - Quick onboarding to understand system structure
2. **Future maintainers** - Context on WHY decisions were made
3. **AI agents** - Sufficient context to navigate and modify codebase effectively

## Workflow

### Creating New

1. Explore codebase: structure, entry points, key abstractions, data flow, dependencies
2. Draft document sections (Tech Stack, Project Structure, Key Abstractions, Data Flow)
3. Identify architectural decisions worth documenting
4. **Before writing Architectural Decisions section**: present proposed decisions to user for feedback - some may not be important enough, or user may want different framing
5. Create `.specs/architecture.md` incorporating user feedback

### Updating Existing

1. Read current `.specs/architecture.md`
2. Identify changes: new components, decisions made, patterns established
3. Update non-decision sections as needed (Tech Stack, Structure, Abstractions, Data Flow)
4. **Before adding/modifying Architectural Decisions**: present proposed changes to user for feedback
5. Apply approved changes

## Document Structure

### Header
- `Last updated: YYYY-MM-DD`
- **System Overview**: 1-2 sentences describing what this system does and its purpose

### Tech Stack
Table format:
| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 |
| Database | PostgreSQL + Drizzle |

### Project Structure
Tree diagram showing key directories with brief purpose annotations.

### Architectural Decisions
Numbered entries, each with:
- **Decision**: What was chosen (one line)
- **Implementation**: File paths and brief explanation
- **Rationale/Tradeoff**: Why this approach, what was sacrificed

### Key Abstractions
Table mapping concepts to file locations:
| Abstraction | Location | Purpose |
|-------------|----------|---------|

## Key Principles

- **Living document** - Update when architecture changes
- **Why over what** - Code shows what, docs explain why
- **Concise** - Quick reference should be scannable
- **Future-proof** - Assume reader has no prior context
- **Machine-readable** - Consistent structure, clear headings, explicit file paths

## When to Document Decisions

**Do document:**
- Technology/framework choices
- Structural patterns chosen
- Trade-offs made (perf vs maintainability, etc)
- Deviations from common practices

**Skip:**
- Obvious/standard choices
- Minor implementation details

## Output

Create/update: `.specs/architecture.md`

Tell user location when done. If updating, summarize what changed.
