# Lodge CMS

A simple, cozy headless CMS with emphasis on ease of deployment.

## Core Principles
- **Single binary deployment** - Everything including the web UI ships as one executable
- **Simple tooling** - No complex build tools, just esbuild
- **Cross-platform** - Supports Linux and FreeBSD

## Technology Stack

### Backend
- **Language**: Golang
- **Database**: SQLite (embedded)
- **Architecture**: REST API for headless operation

### Frontend
- **Framework**: Preact (lightweight React alternative)
- **Styling**: Tailwind CSS
- **Build Tool**: esbuild only (no Vite or other complex tools)
- **Deployment**: Built JS and CSS are embedded in the Go binary

## Data Model

### Core Entities
1. **Collections** - Content types/schemas
2. **Users** - Authentication and authorization
3. **Settings** - System configuration

### Field System
Fields are UI-driven, mapping directly to input components:
- `text` → Text input field
- `markdown` → Textarea with markdown editor
- Additional field types to be defined based on UI components

## Development Guidelines
- Keep the build process simple - just esbuild
- Production binary must be self-contained with all assets
- Focus on ease of deployment over complex features
- Maintain cross-platform compatibility (Linux, FreeBSD)