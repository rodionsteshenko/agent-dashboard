# Agent Dashboard Roadmap

## Phase 1: Foundation ✅ COMPLETE

| # | Feature | Status |
|---|---------|--------|
| 1 | DaisyUI + Tailwind | ✅ |
| 2 | Card components | ✅ |
| 3 | Theme switcher (persists) | ✅ |
| 4 | Mobile-responsive | ✅ |

## Phase 2: Core Interactions ✅ COMPLETE

| # | Feature | Status |
|---|---------|--------|
| 5 | Swipe left → archive | ✅ |
| 6 | Swipe right → save for later | ✅ |
| 7 | Swipe animations (fly-out, colors) | ✅ |
| 8 | New/Saved/All toggle per tab | ✅ |
| 9 | Emoji reactions with labels | ✅ |
| 10 | Category selector (dropdown + grid) | ✅ |
| 11 | Fixed category counts | ✅ |
| 12 | Search tiles | ✅ |

## Phase 3: Todo System ✅ COMPLETE

| # | Feature | Status |
|---|---------|--------|
| 13 | /todos page | ✅ |
| 14 | Add/complete/delete todos | ✅ |
| 15 | Assignee filter (Rodion/Coby) | ✅ |
| 16 | Todo tiles = activity notifications | ✅ |

## Phase 4: Extras ✅ COMPLETE

| # | Feature | Status |
|---|---------|--------|
| 17 | Feedback button (💬) | ✅ |
| 18 | Blog post links on log tiles | ✅ |
| 19 | Local timezone timestamps | ✅ |
| 20 | Feedback tile type | ✅ |

## Phase 5: Future

| # | Feature | Status |
|---|---------|--------|
| 21 | Deep dive audio generation | 🔲 |
| 22 | PWA/offline | 🔲 |
| 23 | Push notifications | 🔲 |
| 24 | Quick capture from phone | 🔲 |
| 25 | Export/backup | 🔲 |
| 26 | Comments/threads | 🔲 |

---

## Tech Stack
- SvelteKit
- Tailwind CSS + DaisyUI  
- SQLite (better-sqlite3)
- Vite

## API Endpoints

- `GET /api/tiles` - list tiles (with ?type=, ?mode=, ?q= params)
- `POST /api/tiles` - create tile
- `PATCH /api/tiles/[id]` - update tile
- `DELETE /api/tiles/[id]` - delete tile
- `GET /api/todos` - list todos
- `POST /api/todos` - create todo
- `PATCH /api/todos/[id]` - update todo
- `DELETE /api/todos/[id]` - delete todo
- `POST /api/feedback` - submit feedback
