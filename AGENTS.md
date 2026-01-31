# Agent Dashboard - Agent Guidelines

## Testing Rule (MANDATORY)

**Before asking Rodion to look at any changes, you MUST test them yourself using the browser tool.**

```
browser action=snapshot profile=openclaw targetUrl=http://localhost:5173
```

Verify:
1. No errors in the UI
2. The feature you changed actually works
3. Nothing else broke

Don't waste Rodion's time with broken code. Test first.

## Dev Server

The dashboard runs at `http://localhost:5173` (also on LAN at `192.168.1.203:5173`).

To restart:
```bash
# Find and kill existing
ps aux | grep vite | grep agent-dashboard
kill <pid>

# Start fresh
cd /Users/rodion/agent-dashboard && npm run dev -- --host
```

## Database

SQLite at `~/agent-dashboard/data/tiles.db`

Check schema: `sqlite3 ~/agent-dashboard/data/tiles.db ".schema tiles"`

## Key Files

- `src/lib/db.ts` - Database schema and queries
- `src/routes/+layout.svelte` - Theme switcher, nav
- `src/routes/+page.svelte` - Main tile view
- `ROADMAP.md` - Development phases and features
