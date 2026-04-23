# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build, Test, and Lint Commands

```sh
npm install           # install dependencies
npm run dev           # run Electron app in development (Vite + tsc watchers + Electron)
npm run build         # production build (typecheck + vite + tsc main)
npm run typecheck     # TS type checking (renderer + main)
npm run lint          # ESLint
npm test              # Vitest unit tests
npm run test:phaseNN  # run vitest + build + phase verification script (NN = 00-06)
```

## Tech Stack

- Electron 34 (desktop shell)
- React 19 / Vite 6 (renderer)
- TypeScript 5.7 (strict)
- WebGL2 (live preview rendering)
- FFmpeg/FFprobe (media probing, frame extraction, H.264 export)
- Vitest (tests), ESLint 9 (linting)

## Architecture Overview

### Split Electron Process Model

Renderer (React UI) ←→ Preload bridge (`window.chromaNode`) ←→ Main process (IPC handlers)

- Renderer makes typed calls through the preload bridge → IPC channels.
- Main process handles: filesystem dialogs, FFmpeg/FFprobe, project file IO, export jobs.
- Shared modules (`src/shared/`) keep preview and export behavior aligned.

### Color Engine: One Source of Truth

`src/shared/colorEngine.ts` is the core module. It defines:
- Node data structures, primary corrections, qualifiers, power windows, tracking keyframes
- CPU evaluation (used by export)
- WebGL fragment shader generation (used by preview)

Both preview (GPU) and export (CPU) use the same node math — they diverge only at execution.

### Key Modules

| Module | Responsibility |
|---|---|
| `src/main/ipc.ts` | Registers all Electron IPC handlers |
| `src/main/ffmpeg.ts` | FFmpeg/FFprobe discovery and diagnostics |
| `src/main/mediaProbe.ts` | Validates imports, maps FFprobe metadata |
| `src/main/frame.ts` | Exact frame extraction for preview/tracking |
| `src/main/exportProject.ts` | Decode → CPU node eval → H.264 encode pipeline |
| `src/main/projectFile.ts` | JSON project save/load + validation/sanitization |
| `src/preload/preload.ts` | Exposes `window.chromaNode` API to renderer |
| `src/shared/ipc.ts` | Versioned IPC request/response contract |
| `src/shared/project.ts` | Project schema, validation, serialization |
| `src/shared/colorEngine.ts` | Node math, CPU eval, WebGL shader generation |
| `src/renderer/webgl/FrameRenderer.ts` | WebGL2 live preview rendering |
| `src/renderer/scopes/` | Waveform and vectorscope analysis/rendering |
| `src/renderer/tracking/templateTracker.ts` | Translation-only template matching |

### Preview vs Export Execution Path

**Preview**: Renderer → WebGL2 fragment shaders generated from color engine → real-time graded display.

**Export**: FFmpeg decodes raw RGBA frames → CPU evaluation via color engine → rendered frames streamed to FFmpeg/libx264 → H.264 MP4 output.

### Project Schema

Projects are JSON with schema version `1.0.0`. Loading validates and sanitizes; unsupported versions fail, out-of-range values are clamped/defaulted.

## Requirements

- FFmpeg+FFprobe on `PATH` or in common Unix paths, or via `CHROMA_NODE_FFMPEG_PATH`/`CHROMA_NODE_FFPROBE_PATH` env vars.
- FFmpeg must include `libx264` for export.
- WebGL2 support required in the browser environment.
- `.mp4` and `.mov` only; max 1920x1080.

## Roadmap

The project is organized by phase in `roadmap/` with task notes in `tasks/`.
- Phases 00–06: Implemented (technical foundation → H.264 export).
- Phase 07: Hardening, packaging, release polish (not started).