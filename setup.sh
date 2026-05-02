#!/bin/bash
# setup.sh - Install, build, and deploy a Vite React project
# Usage: ./setup.sh

set -e

# --- Config (edit if needed) ---
PROJECT_DIR="$HOME/project/learndo-frontend"
DEPLOY_DIR="/var/www/learndo-frontend"
WEB_USER="www-data"

# --- Colors for output ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}==>${NC} $1"; }
warn() { echo -e "${YELLOW}!${NC} $1"; }
err()  { echo -e "${RED}✗${NC} $1"; }

# --- Sanity checks ---
if [ ! -d "$PROJECT_DIR" ]; then
    err "Project directory not found: $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"

if [ ! -f "package.json" ]; then
    err "No package.json found in $PROJECT_DIR"
    exit 1
fi

# --- Check for Node.js ---
if ! command -v node &> /dev/null; then
    err "Node.js is not installed. Install it first:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
    echo "  apt install -y nodejs"
    exit 1
fi

log "Using Node $(node -v) and npm $(npm -v)"

# --- Install dependencies ---
log "Installing dependencies..."
if [ -f "package-lock.json" ]; then
    npm ci
else
    npm install
fi

# --- Build ---
log "Building production bundle..."
npm run build

if [ ! -d "dist" ]; then
    err "Build failed — no dist/ folder created"
    exit 1
fi

if [ ! -f "dist/index.html" ]; then
    err "Build incomplete — no index.html in dist/"
    exit 1
fi

# --- Prepare deploy directory ---
log "Preparing $DEPLOY_DIR..."
mkdir -p "$DEPLOY_DIR"

# --- Sync files ---
log "Copying build to $DEPLOY_DIR..."
if command -v rsync &> /dev/null; then
    rsync -av --delete dist/ "$DEPLOY_DIR/"
else
    rm -rf "$DEPLOY_DIR"/*
    cp -r dist/* "$DEPLOY_DIR/"
fi

# --- Set permissions ---
log "Setting ownership to $WEB_USER..."
if id "$WEB_USER" &>/dev/null; then
    chown -R "$WEB_USER:$WEB_USER" "$DEPLOY_DIR"
else
    warn "User $WEB_USER not found — skipping chown"
fi

# --- Done ---
echo ""
log "Deploy complete!"
echo "  Source:  $PROJECT_DIR/dist"
echo "  Served:  $DEPLOY_DIR"
echo ""
echo "Files in $DEPLOY_DIR:"
ls -lh "$DEPLOY_DIR" | head -10