# Quick Start Guide

## Setup (First Time)

```bash
# 1. Clone the repo
git clone https://github.com/srichandrak/Electron-2026.git
cd Electron-2026

# 2. Install dependencies
pnpm install

# 3. Create .env file in apps/desktop/
cat > apps/desktop/.env << EOF
GEMINI_API_KEY=your_api_key_here
NODE_ENV=development
EOF

# 4. Copy OBC documents (if you have them)
# Place PDF files in: apps/desktop/assets/obc-docs/
```

## Development

```bash
# Start development mode (React + Electron with hot reload)
pnpm dev:desktop
```

This opens:
- React dev server: http://localhost:3000
- Electron app with DevTools

## Common Tasks

```bash
# Build for production
pnpm build:desktop

# Test a specific package
pnpm test --filter @electron-2026/pdf-viewer

# Install a new dependency to a package
cd packages/ui
pnpm add some-package

# Install dev dependency to desktop app
cd apps/desktop
pnpm add -D some-dev-package

# Clean install (if issues arise)
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

## Package Structure

```
@electron-2026/shared      → Utilities (ArrayBuffer helpers)
@electron-2026/services    → Backend (OBC RAG service)
@electron-2026/pdf-viewer  → PDF viewing (EmbedPDF)
@electron-2026/ui          → React contexts & components
@electron-2026/desktop     → Main Electron app
```

## Troubleshooting

### Problem: Dependencies not found
```bash
pnpm install
```

### Problem: Stale cache
```bash
rm -rf .turbo node_modules
pnpm install
```

### Problem: Build errors
```bash
# Check which package is failing
pnpm build --filter @electron-2026/pdf-viewer
pnpm build --filter @electron-2026/ui
```

### Problem: Electron won't start
1. Check React dev server is running (port 3000)
2. Check main.js for errors
3. Verify preload.js path is correct

## Architecture at a Glance

```
Electron Main Process (main.js)
    ├── IPC Handlers → @electron-2026/services
    └── Window Management

React Renderer (App.jsx)
    ├── Context Providers → @electron-2026/ui
    ├── PDF Viewer → @electron-2026/pdf-viewer
    └── Utilities → @electron-2026/shared
```

## Key Files

- `apps/desktop/main.js` - Electron main process
- `apps/desktop/preload.js` - IPC security bridge
- `apps/desktop/src/App.jsx` - React app root
- `packages/services/src/obcRagService.js` - AI service
- `packages/pdf-viewer/src/EmbedPDFViewer.jsx` - PDF viewer
- `turbo.json` - Build configuration
- `pnpm-workspace.yaml` - Workspace definition

For detailed information, see [MIGRATION-SUMMARY.md](./MIGRATION-SUMMARY.md)
