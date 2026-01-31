# Agent Dashboard Roadmap

## Phase 1: Foundation ⭐ (Do First)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Install DaisyUI + Tailwind | ✅ Done | |
| 2 | Rebuild tiles with card components | ✅ Done | |
| 3 | Theme switcher | ✅ Done | Now persists to localStorage |
| 4 | Mobile-responsive layout | ✅ Done | |

## Phase 2: Core Interactions

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 5 | Swipe left → dismiss | 🔲 | Quick triage |
| 6 | Swipe down → save for later | 🔲 | Queue for later |
| 7 | Swipe up → deep dive | 🔲 | Unique feature |
| 8 | Emoji reactions | 🔲 | Quick feedback loop |
| 9 | Pin tiles to top | 🔲 | Keep important visible |

## Phase 3: Todo System

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 10 | Inline checkboxes | 🔲 | Actually useful todos |
| 11 | Assignee filter (Rodion/Coby) | 🔲 | See who owns what |
| 12 | Recently completed view | 🔲 | Track progress |
| 13 | Dedicated /todos page | 🔲 | Focus mode |

## Phase 4: Deep Features

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 14 | Deep dive audio generation | 🔲 | The cool unique thing |
| 15 | Search all tiles | 🔲 | Essential as it grows |
| 16 | Comments/threads | 🔲 | Collaboration |
| 17 | Save for later bin | 🔲 | Review saved items |

## Phase 5: Polish

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 18 | Push notifications | 🔲 | Know when tiles arrive |
| 19 | PWA/offline | 🔲 | Works anywhere |
| 20 | Export/backup | 🔲 | Data safety |
| 21 | Quick capture | 🔲 | Add from phone fast |

---

## Feature Ideas (Backlog)

### Per-Tab Archive/History View
Each tab (Songs, etc.) should have a toggle between:
- **Current** - active, non-archived items
- **All** - full timeline including archived/viewed items

### Fixed Tab Order
Tabs at the top should be in a fixed order, never rearrange.

### Timeline View
Global timeline showing all activity across tiles:
- Todos added/completed/updated
- Songs listened to
- Items archived
- etc.

---

## Tech Stack
- SvelteKit
- Tailwind CSS + DaisyUI
- SQLite (better-sqlite3)
- Vite

## Database Schema
See `src/lib/db.ts` for current schema.

Columns: id, type, content, source, tags, read, starred, archived, pinned, saved_for_later, reactions, created_at, updated_at
