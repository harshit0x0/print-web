# Project Context: OpenClaw Design App

## Overview

- **Name**: `@clawnify/open-design` / "OpenClaw Design App"
- **Version**: 1.0.0
- **License**: MIT (Copyright 2026 Clawnify)
- **Purpose**: Open-source Canva alternative for social media graphics (LinkedIn posts, quote cards, announcements, banners). Part of the OpenClaw ecosystem. Zero cloud dependencies, runs locally with SQLite.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | Preact ^10.25.0 |
| Language | TypeScript ^5.7.0 |
| Bundler | Vite ^6.0.0 |
| Styling | Tailwind CSS v4 ^4.2.2 |
| Canvas Engine | Fabric.js ^6.0.0 |
| Backend Framework | Hono ^4.6.0 |
| Database | SQLite (Cloudflare D1) via @clawnify/db |
| Validation | Zod ^3.24.0 |
| Icons | lucide-preact |
| Fonts | Google Fonts (WebFontLoader) |

## Project Structure

```
open-design/
├── index.html                    # Vite entry HTML
├── vite.config.ts                # Vite config (Preact + Tailwind)
├── wrangler.toml                 # Cloudflare Workers/D1 config
├── src/
│   ├── client/                   # Frontend (Preact SPA)
│   │   ├── main.tsx              # Entry: renders <App /> into #app
│   │   ├── app.tsx               # Root: routing, font loading, context
│   │   ├── api.ts                # Generic fetch wrapper
│   │   ├── context.tsx           # EditorContext + CanvasSize presets
│   │   ├── styles.css            # Global styles (Tailwind v4 @theme)
│   │   ├── types.ts              # TypeScript interfaces
│   │   ├── components/
│   │   │   ├── editor.tsx        # Main editor layout
│   │   │   ├── home.tsx          # Gallery/home view
│   │   │   ├── toolbar.tsx       # Top toolbar
│   │   │   ├── left-sidebar.tsx  # Left panel (icons + content)
│   │   │   ├── right-sidebar.tsx # Properties panel
│   │   │   ├── canvas-area.tsx   # Scrollable canvas workspace
│   │   │   ├── page-canvas.tsx   # Individual Fabric.js canvas
│   │   │   ├── pages-bar.tsx     # Bottom page thumbnails
│   │   │   ├── template-card.tsx # Template preview card
│   │   │   └── design-list.tsx   # Saved designs list
│   │   └── hooks/
│   │       ├── use-canvas.ts     # Canvas state management
│   │       ├── use-designs.ts    # Designs CRUD, auto-save
│   │       └── use-router.ts     # Simple hash-based router
│   └── server/                   # Backend (Hono)
│       ├── index.ts              # API routes
│       ├── db.ts                 # SQLite wrapper
│       ├── schema.sql            # SQLite schema + seed data
│       └── uploads.ts            # File upload management
```

## Current UI State

**Fully functional graphic design editor with:**
- Fabric.js canvas with retina rendering (2x DPR)
- Custom object selection controls
- Multi-page design support (add, duplicate, delete, rename)
- 6 pre-built LinkedIn templates
- Text editing: 3 presets, 10 Google Fonts, full styling options
- Shape tools: rectangle, circle, triangle, line
- Image upload (drag-and-drop)
- Background system: solid colors, gradients, image upload
- Undo/redo (50-step history, Cmd+Z/Cmd+Shift+Z)
- Canvas size presets: LinkedIn Square/Landscape/Portrait, Instagram Story
- Zoom: in/out, fit-to-screen, Cmd+wheel
- 2x PNG export
- Design management: create, rename, delete, auto-save (2s debounce)
- Three-panel editor layout (toolbar top, left sidebar, center canvas, right sidebar, pages bar bottom)

## Styling Approach

- Tailwind CSS v4 with `@theme` directive for custom tokens
- 100% Tailwind utility classes (no CSS modules, no styled-components)
- Color palette: zinc/gray neutrals with indigo (#6366f1) accent
- Theme tokens defined in `src/client/styles.css`:
  - `--color-surface`: #F3F4F7
  - `--color-accent`: #6366f1
  - Plus border, hover, and card colors

## Data Model

```sql
designs   (id, name, canvas_json, width, height, thumbnail_url, created_at, updated_at)
templates (id, name, category, canvas_json, width, height, thumbnail_url, sort_order)
pages     (id, design_id, title, canvas_json, sort_order, created_at)
```

## API Endpoints

- `GET/POST /api/designs` - List/create designs
- `GET/PUT/DELETE /api/designs/:id` - Design CRUD
- `POST /api/designs/:id/pages` - Add page
- `POST /api/pages/:pageId/duplicate` - Duplicate page
- `PUT/DELETE /api/pages/:pageId` - Update/delete page
- `GET /api/templates` - List templates
- `POST /api/uploads` - Upload image
- `GET /api/uploads/:filename` - Serve uploaded image

## Design Patterns

- Context-based state management (EditorContext)
- Custom hooks pattern (useCanvasState, useDesigns, useRouter)
- Multi-canvas architecture (one fabric.Canvas per page)
- Auto-save with debounce
- Zod OpenAPI schemas for type-safe API

## Dev Commands

```bash
# Development
pnpm dev  # Starts DB init + Vite (5178) + Wrangler (8787)

# Build
pnpm build  # vite build -> dist/

# Type check
pnpm typecheck  # tsc --noEmit
```

---

*Generated for UI redefinition planning - part of a larger system integration.*
