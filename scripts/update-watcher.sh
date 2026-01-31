#!/bin/bash
# Agent Dashboard Auto-Updater
# 
# Checks for updates from GitHub, pulls and restarts if needed.
# Run via cron every 5 minutes:
#   */5 * * * * /path/to/agent-dashboard/scripts/update-watcher.sh
#
# Or run as a continuous watcher:
#   ./scripts/update-watcher.sh --watch

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="${LOG_FILE:-/tmp/dashboard-updater.log}"
WATCH_INTERVAL="${WATCH_INTERVAL:-300}"  # 5 minutes

cd "$REPO_DIR"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $*" | tee -a "$LOG_FILE"
}

check_and_update() {
    # Fetch latest
    git fetch origin main --quiet 2>/dev/null || {
        log "ERROR: Failed to fetch from origin"
        return 1
    }

    # Check if we're behind
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/main)

    if [ "$LOCAL" = "$REMOTE" ]; then
        return 0  # No updates
    fi

    log "Update found: $(git rev-parse --short HEAD) -> $(git rev-parse --short origin/main)"
    
    # Get commit messages for the update
    CHANGES=$(git log --oneline HEAD..origin/main | head -5)
    log "Changes:"
    echo "$CHANGES" | while read line; do log "  $line"; done

    # Pull changes
    git pull origin main --quiet || {
        log "ERROR: Failed to pull"
        return 1
    }

    # Install any new dependencies
    if [ -f "package-lock.json" ]; then
        npm install --silent 2>/dev/null || npm install
    fi

    log "Updated to $(git rev-parse --short HEAD)"

    # Restart the dashboard
    restart_dashboard

    return 0
}

restart_dashboard() {
    # Try different restart methods in order of preference
    
    # 1. PM2
    if command -v pm2 &> /dev/null && pm2 list 2>/dev/null | grep -q "dashboard"; then
        log "Restarting via PM2..."
        pm2 restart dashboard
        return 0
    fi

    # 2. Systemd
    if systemctl is-active --quiet agent-dashboard 2>/dev/null; then
        log "Restarting via systemd..."
        sudo systemctl restart agent-dashboard
        return 0
    fi

    # 3. Kill and restart manually
    log "Restarting manually..."
    pkill -f "node.*vite.*agent-dashboard" 2>/dev/null || true
    sleep 2
    
    # Start in background
    nohup npm run dev -- --host > /tmp/dashboard.log 2>&1 &
    log "Started dashboard (PID: $!)"
}

# Main
case "${1:-}" in
    --watch)
        log "Starting continuous watcher (interval: ${WATCH_INTERVAL}s)"
        while true; do
            check_and_update || true
            sleep "$WATCH_INTERVAL"
        done
        ;;
    --check)
        # Just check, don't update
        git fetch origin main --quiet
        LOCAL=$(git rev-parse HEAD)
        REMOTE=$(git rev-parse origin/main)
        if [ "$LOCAL" = "$REMOTE" ]; then
            echo "Up to date"
            exit 0
        else
            echo "Updates available: $(git log --oneline HEAD..origin/main | wc -l | tr -d ' ') commits"
            git log --oneline HEAD..origin/main | head -5
            exit 1
        fi
        ;;
    *)
        check_and_update
        ;;
esac
