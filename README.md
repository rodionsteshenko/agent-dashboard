# Agent Dashboard

A personal dashboard for collaboration between you and your AI agent (Coby).

## Features

- **Inbox**: Receive digests, news, and updates in structured tiles
- **Todos**: Manage tasks for both you and the agent
- **Logs**: Track what the agent is doing (cron jobs, tasks, etc.)
- **Tiles**: Different content types rendered appropriately

## Tile Types

| Type | Description |
|------|-------------|
| `todo` | Tasks with optional subtasks |
| `digest` | News roundups with items and commentary |
| `log` | Activity entries from cron jobs etc. |
| `note` | Freeform markdown notes |
| `short` | Tweet-like short text |
| `article` | Link with title, excerpt, source |
| `song` | Music with artist, title, analysis |

## Quick Start

```bash
cd ~/agent-dashboard
npm run dev
```

Open http://localhost:5173

## API

### Get all tiles
```bash
curl http://localhost:5173/api/tiles
```

### Create a tile
```bash
curl -X POST http://localhost:5173/api/tiles \
  -H "Content-Type: application/json" \
  -d '{
    "type": "todo",
    "content": {
      "title": "Build dashboard MVP",
      "assignee": "coby"
    },
    "tags": ["project"]
  }'
```

### Update a tile (mark read, star, archive)
```bash
curl -X PATCH http://localhost:5173/api/tiles/<id> \
  -H "Content-Type: application/json" \
  -d '{"read": true}'
```

### Delete a tile
```bash
curl -X DELETE http://localhost:5173/api/tiles/<id>
```

## Data

SQLite database stored at `~/agent-dashboard/data/tiles.db`

## Next Steps

- [ ] Add todo-specific views (by assignee, status)
- [ ] Add search/filter
- [ ] Add ngrok/tunnel for remote access
- [ ] More tile types (image, code, quote)
- [ ] Different view modes (grid, list, board)
