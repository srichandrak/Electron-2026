# Electron-2026

PlanCode ProMax - Electron PDF Viewer Monorepo

## Structure

```
Electron-2026/
├── apps/
│   └── desktop/          # Electron desktop app
├── packages/
│   ├── services/         # Backend services (OBC RAG)
│   ├── pdf-viewer/       # PDF viewer (EmbedPDF)
│   ├── ui/               # React components & contexts
│   └── shared/           # Shared utilities
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 9.0

### Installation

```bash
# Install dependencies
pnpm install

# Run development mode
pnpm dev:desktop

# Build for production
pnpm build:desktop
```

## Packages

### @electron-2026/shared
Shared utilities including ArrayBuffer helpers for PDF handling.

### @electron-2026/services
Backend services including OBC RAG service with Gemini AI integration.

### @electron-2026/pdf-viewer
PDF viewer component using EmbedPDF with plugins for zoom, pan, rotate, etc.

### @electron-2026/ui
React components and context providers for authentication, theming, notifications, and file management.

### @electron-2026/desktop
Main Electron application that combines all packages.

## Development

Each package can be developed independently:

```bash
# Run tests for a specific package
pnpm test --filter @electron-2026/pdf-viewer

# Build a specific package
pnpm build --filter @electron-2026/services
```

## License

ISC
