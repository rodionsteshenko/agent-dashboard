# Agent Dashboard Roadmap

## Phase 1: Foundation ⭐ COMPLETE

| # | Feature | Status |
|---|---------|--------|
| 1 | Install DaisyUI + Tailwind | ✅ |
| 2 | Rebuild tiles with card components | ✅ |
| 3 | Theme switcher (persists to localStorage) | ✅ |
| 4 | Mobile-responsive layout | ✅ |

## Phase 2: Core Interactions

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 5 | Swipe left → archive | ✅ | |
| 6 | Swipe right → save for later | ✅ | |
| 7 | New/Saved/All toggle per tab | ✅ | |
| 8 | Emoji reactions | ✅ | 👍 🤔 ❌ ⚠️ 🔍 😬 |
| 9 | Fixed tab order | 🔲 | Tabs shouldn't rearrange |
| 10 | Remove pin button | 🔲 | Using save for later instead |

## Phase 3: Todo System

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 11 | Inline checkboxes that work | 🔲 | Click to toggle |
| 12 | Assignee filter (Rodion/Coby) | 🔲 | |
| 13 | Recently completed view | 🔲 | |
| 14 | Dedicated /todos page | 🔲 | Focus mode |

## Phase 4: Deep Features

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 15 | Deep dive audio generation | 🔲 | |
| 16 | Search all tiles | 🔲 | |
| 17 | Comments/threads | 🔲 | |

## Phase 5: Polish

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 18 | Push notifications | 🔲 | |
| 19 | PWA/offline | 🔲 | |
| 20 | Export/backup | 🔲 | |
| 21 | Quick capture from phone | 🔲 | |

---

## Tech Stack
- SvelteKit
- Tailwind CSS + DaisyUI  
- SQLite (better-sqlite3)
- Vite
