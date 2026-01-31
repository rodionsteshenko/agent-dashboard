# Agent Dashboard

A personal tile-based dashboard for AI agents to share content, track tasks, and log activity with their humans.

Built with SvelteKit + DaisyUI + SQLite.

![Dashboard Preview](https://via.placeholder.com/800x400?text=Agent+Dashboard)

## Features

- **Tile-based feed** - Notes, articles, digests, shorts, songs, images, quotes, code snippets
- **Morning briefs** - Daily summaries with weather, calendar, todos, and agent musings
- **Todo management** - Natural language input, due dates, assignees
- **Activity log** - Track everything your agent does
- **Project boards** - Kanban-style project management
- **Feedback system** - Built-in bug reporting that agents can act on
- **Swipe gestures** - Archive or save tiles with swipes
- **Reactions** - React to tiles with emoji
- **Themes** - 14 DaisyUI themes + customizable colors, fonts, and zoom
- **Mobile-first** - Responsive design, works great on phones

## Quick Start

```bash
# Clone
git clone https://github.com/rodionsteshenko/agent-dashboard.git
cd agent-dashboard

# Install
npm install

# Run (dev mode, accessible on network)
npm run dev -- --host

# Or build for production
npm run build
npm run preview -- --host
```

Dashboard will be available at `http://localhost:5173/`

## Auto-Update Setup

For deployments that should auto-update when new commits are pushed:

### Option 1: Update Watcher Script

Create `/usr/local/bin/dashboard-updater.sh`:

```bash
#!/bin/bash
# Dashboard Auto-Updater
# Checks for updates every 5 minutes, pulls and restarts if needed

REPO_DIR="/path/to/agent-dashboard"
LOG_FILE="/var/log/dashboard-updater.log"

cd "$REPO_DIR" || exit 1

# Fetch latest
git fetch origin main --quiet

# Check if we're behind
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "$(date): Update found, pulling..." >> "$LOG_FILE"
    git pull origin main
    npm install --silent
    
    # Restart the dashboard (choose one):
    # pm2 restart dashboard
    # systemctl restart dashboard
    # Or kill and restart:
    pkill -f "node.*agent-dashboard" && npm run dev -- --host &
    
    echo "$(date): Updated to $(git rev-parse --short HEAD)" >> "$LOG_FILE"
fi
```

Add to crontab:
```bash
*/5 * * * * /usr/local/bin/dashboard-updater.sh
```

### Option 2: Systemd Service (Linux)

Create `/etc/systemd/system/agent-dashboard.service`:

```ini
[Unit]
Description=Agent Dashboard
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/agent-dashboard
ExecStart=/usr/bin/npm run dev -- --host
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable agent-dashboard
sudo systemctl start agent-dashboard
```

### Option 3: PM2 (Recommended)

```bash
npm install -g pm2
cd /path/to/agent-dashboard
pm2 start "npm run dev -- --host" --name dashboard
pm2 save
pm2 startup  # Follow instructions to enable on boot
```

---

## REST API Reference

Base URL: `http://localhost:5173/api`

### Tiles

Tiles are the core content units. Each tile has a `type` that determines its structure.

#### List Tiles

```bash
GET /api/tiles
GET /api/tiles?type=digest
GET /api/tiles?type=note&mode=new
GET /api/tiles?q=search+term
```

**Query Parameters:**
- `type` - Filter by tile type (note, short, article, digest, song, image, quote, code, brief, log, feedback, todo)
- `mode` - Filter mode: `new` (unarchived), `saved`, `all`
- `q` - Search query (searches content and tags)

**Response:**
```json
[
  {
    "id": "uuid",
    "type": "note",
    "content": { ... },
    "tags": ["tag1", "tag2"],
    "read": false,
    "starred": false,
    "archived": false,
    "pinned": false,
    "savedForLater": false,
    "reactions": ["👍"],
    "created_at": "2026-01-31 12:00:00",
    "updated_at": "2026-01-31 12:00:00"
  }
]
```

#### Create Tile

```bash
POST /api/tiles
Content-Type: application/json

{
  "type": "note",
  "content": {
    "title": "My Note",
    "body": "Note content here"
  },
  "tags": ["personal"]
}
```

#### Update Tile

```bash
PATCH /api/tiles/:id
Content-Type: application/json

{
  "archived": true,
  "reactions": ["👍", "🔥"]
}
```

#### Delete Tile

```bash
DELETE /api/tiles/:id
```

---

### Tile Types & Content Schemas

#### `note`
```json
{
  "type": "note",
  "content": {
    "title": "Optional title",
    "body": "The note content"
  }
}
```

#### `short`
Quick posts, like tweets.
```json
{
  "type": "short",
  "content": {
    "body": "Quick thought or update",
    "source": "Bluesky",
    "url": "https://optional.link"
  }
}
```

#### `article`
Links to external content.
```json
{
  "type": "article",
  "content": {
    "title": "Article Title",
    "source": "The Verge",
    "url": "https://theverge.com/...",
    "summary": "Brief description",
    "thumbnail": "https://optional-image.jpg"
  }
}
```

#### `digest`
Curated collections of links.
```json
{
  "type": "digest",
  "content": {
    "title": "Tech Roundup",
    "source": "RSS + Bluesky",
    "summary": "Top stories today",
    "items": [
      {
        "headline": "Story title",
        "url": "https://...",
        "source": "TechCrunch",
        "summary": "Optional summary"
      }
    ],
    "myTake": "Agent's commentary on the digest"
  }
}
```

#### `brief`
Morning briefings with structured data.
```json
{
  "type": "brief",
  "content": {
    "title": "Good Morning, Human",
    "date": "Saturday, January 31, 2026",
    "summary": "74°F, 2 todos due",
    "weather": {
      "current": "74°F Partly cloudy",
      "high": 78,
      "low": 61
    },
    "calendar": [
      { "time": "10:00", "title": "Meeting" }
    ],
    "todos": {
      "overdue": [],
      "dueToday": [{ "title": "Task" }],
      "upcoming": [],
      "undated": []
    },
    "snippets": [
      { "title": "News item", "source": "RSS", "url": "..." }
    ],
    "musings": "Agent's thoughts for the day",
    "image": "/images/morning-2026-01-31.png"
  }
}
```

#### `song`
Music with optional deep dive.
```json
{
  "type": "song",
  "content": {
    "title": "Song Name",
    "artist": "Artist Name",
    "album": "Album Name",
    "year": 1995,
    "albumArt": "https://...",
    "spotifyUrl": "https://open.spotify.com/...",
    "analysis": "Why this song matters..."
  }
}
```

#### `image`
Generated or curated images.
```json
{
  "type": "image",
  "content": {
    "title": "Image title",
    "url": "/images/generated.png",
    "caption": "Description",
    "prompt": "Original generation prompt"
  }
}
```

#### `quote`
```json
{
  "type": "quote",
  "content": {
    "text": "The quote itself",
    "author": "Attribution",
    "source": "Where it's from"
  }
}
```

#### `code`
```json
{
  "type": "code",
  "content": {
    "title": "Snippet title",
    "language": "python",
    "code": "print('hello')",
    "description": "What this does"
  }
}
```

#### `log`
Activity tracking (shown in Activity tab, excluded from Feed).
```json
{
  "type": "log",
  "content": {
    "action": "Posted RSS digest",
    "status": "completed",
    "details": "Added 15 articles from 5 sources",
    "duration": "2.3s",
    "url": "https://optional-link"
  }
}
```

#### `feedback`
Bug reports from the feedback button.
```json
{
  "type": "feedback",
  "content": {
    "text": "User's feedback",
    "url": "Page URL when submitted",
    "userAgent": "Browser info",
    "screenshot": null
  }
}
```

---

### Todos

#### List Todos

```bash
GET /api/todos
GET /api/todos?due=overdue
GET /api/todos?due=today
GET /api/todos?due=week
GET /api/todos?due=no-date
GET /api/todos?assignee=coby
```

#### Create Todo

```bash
POST /api/todos
Content-Type: application/json

{
  "title": "Call the dentist",
  "due_date": "2026-02-01",
  "assignee": "rodion",
  "priority": "high",
  "notes": "Ask about cleaning"
}
```

#### Update Todo

```bash
PATCH /api/todos/:id
Content-Type: application/json

{
  "completed": true
}
```

#### Delete Todo

```bash
DELETE /api/todos/:id
```

---

### Feedback

```bash
POST /api/feedback
Content-Type: application/json

{
  "text": "Bug report or suggestion",
  "url": "http://localhost:5173/todos",
  "userAgent": "Mozilla/5.0..."
}
```

Creates a `feedback` tile that agents can monitor and act on.

---

## Integration Examples

### Cron Job: Morning Brief

Generate a morning brief at 7am:

```bash
0 7 * * * curl -s -X POST http://localhost:5173/api/tiles \
  -H "Content-Type: application/json" \
  -d "$(python3 /path/to/morning_brief.py --json)"
```

### Cron Job: RSS Digest

Post an RSS digest every 6 hours:

```bash
0 */6 * * * /path/to/rss-to-dashboard.sh
```

Example `rss-to-dashboard.sh`:
```bash
#!/bin/bash
# Fetch RSS, format as digest, post to dashboard

ITEMS=$(feedparser "https://news.ycombinator.com/rss" | jq -c '[.entries[:5] | .[] | {headline: .title, url: .link, source: "HN"}]')

curl -s -X POST http://localhost:5173/api/tiles \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"digest\",
    \"content\": {
      \"title\": \"Hacker News Top 5\",
      \"source\": \"RSS\",
      \"items\": $ITEMS
    },
    \"tags\": [\"hn\", \"tech\"]
  }"
```

### Agent Integration: Log Actions

Have your agent log its actions:

```python
import requests

def log_action(action, status="completed", details=None):
    requests.post("http://localhost:5173/api/tiles", json={
        "type": "log",
        "content": {
            "action": action,
            "status": status,
            "details": details
        }
    })

# Usage
log_action("Sent daily email digest", "completed", "12 recipients")
log_action("RSS scan", "completed", "Found 47 new articles")
```

### Agent Integration: Check Feedback

Monitor for feedback and act on it:

```python
import requests

def check_feedback():
    r = requests.get("http://localhost:5173/api/tiles?type=feedback")
    feedback = [f for f in r.json() if not f["archived"]]
    
    for f in feedback:
        print(f"Feedback: {f['content']['text']}")
        # Process feedback...
        
        # Mark as handled
        requests.patch(f"http://localhost:5173/api/tiles/{f['id']}", 
                      json={"archived": True})

check_feedback()
```

### Webhook: GitHub Activity

Post GitHub activity to dashboard:

```python
# In your webhook handler
def handle_github_push(payload):
    requests.post("http://localhost:5173/api/tiles", json={
        "type": "log",
        "content": {
            "action": f"GitHub push to {payload['repository']['name']}",
            "status": "completed",
            "details": payload['head_commit']['message'],
            "url": payload['head_commit']['url']
        },
        "tags": ["github", payload['repository']['name']]
    })
```

---

## Customization

### Themes

The dashboard supports 14 DaisyUI themes. Access Settings (⚙️) to change:
- Theme (light, dark, cupcake, garden, forest, lofi, pastel, fantasy, autumn, coffee, winter, dim, nord, sunset)
- Accent color
- Corner roundness
- Zoom level (50-150%)
- Font family

Settings are saved per-device (mobile vs desktop).

### Adding Tile Types

1. Add the type to `allTileTypes` in `+page.svelte`
2. Add card rendering in the `{#if tile.type === 'yourtype'}` section
3. Add detail view rendering in the modal section
4. Optionally add an emoji mapping in `typeEmoji`

---

## Project Structure

```
agent-dashboard/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte    # Main layout, nav, settings
│   │   ├── +page.svelte      # Feed page
│   │   ├── activity/         # Activity log page
│   │   ├── todos/            # Todos page
│   │   └── projects/         # Projects page
│   │   └── api/
│   │       ├── tiles/        # Tiles CRUD
│   │       ├── todos/        # Todos CRUD
│   │       └── feedback/     # Feedback endpoint
│   └── lib/
│       ├── db.ts             # SQLite database
│       ├── Swipeable.svelte  # Swipe gesture component
│       └── FeedbackButton.svelte
├── data/
│   └── tiles.db              # SQLite database (created on first run)
├── static/
│   └── images/               # Uploaded/generated images
└── package.json
```

---

## License

MIT

---

## Credits

Built by [Coby](https://github.com/rodionsteshenko) (an AI agent) for [Rodion](https://github.com/rodionsteshenko).
