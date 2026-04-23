# Chroma Node

Chroma Node is a desktop color grading learning app inspired by the DaVinci Resolve Color page. It is built as an Electron application with a React/Vite renderer, a TypeScript main process, WebGL2 preview rendering, and FFmpeg/FFprobe for local media probing, frame extraction, and H.264 export.

The current MVP supports one imported clip at a time, up to three serial color nodes, primary corrections, HSL qualification, power windows, translation-only tracking, waveform/vectorscope displays, JSON project save/load, and video-only H.264 MP4 export.

## Current Capabilities

- Import one MP4 or MOV clip up to 1920 x 1080.
- Inspect playback with play/pause, first/last frame, frame stepping, scrubbing, timecode, original/graded/split viewer modes, and split position control.
- Grade through up to 3 serial nodes.
- Toggle, rename, add, delete, and bypass nodes.
- Adjust primary controls per node:
  - lift, gamma, gain, and offset RGB controls
  - contrast, pivot, saturation, temperature, and tint
- Gate a node with an HSL qualifier:
  - hue center, width, softness
  - saturation min/max/softness
  - luminance min/max/softness
  - invert and matte preview
- Gate a node with ellipse and rectangle power windows:
  - enable/invert
  - center, size, rotation, and softness controls
  - direct viewer overlay editing
- Track one selected power window with translation-only forward/backward template matching.
- Display luma waveform and chroma vectorscope from the graded frame.
- Save and open JSON project files.
- Export the graded clip as a video-only H.264 MP4 with draft, standard, or high quality presets.
- Cancel active exports and receive progress updates.

## Tech Stack

- Electron 34 for the desktop shell and native dialogs.
- React 19 and Vite 6 for the renderer UI.
- TypeScript 5.7 with strict type checking.
- WebGL2 fragment shaders for live viewer color processing.
- Shared TypeScript color engine for preview shader generation and CPU export evaluation.
- FFmpeg and FFprobe for media diagnostics, probing, frame extraction, raw frame decode, and MP4 encode.
- Vitest for unit tests.
- ESLint 9 for linting.

## Requirements

- Node.js with npm.
- FFmpeg and FFprobe available either:
  - on `PATH`,
  - in common Unix paths such as `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, or `/bin`,
  - through explicit environment variables,
  - or as bundled binaries under `bin/<platform>/<arch>/` in Electron resources.
- FFmpeg must include the `libx264` encoder for project export.
- A system/browser environment with WebGL2 support.

Explicit FFmpeg paths can be set with:

```sh
export CHROMA_NODE_FFMPEG_PATH=/absolute/path/to/ffmpeg
export CHROMA_NODE_FFPROBE_PATH=/absolute/path/to/ffprobe
```

## Getting Started

Install dependencies:

```sh
npm install
```

Run the Electron app in development:

```sh
npm run dev
```

The development script starts:

- the Vite renderer dev server on `127.0.0.1:5173`
- the Electron main/preload TypeScript watcher
- Electron after the renderer and compiled main/preload files are available

Build the app artifacts:

```sh
npm run build
```

Run type checks:

```sh
npm run typecheck
```

Run linting:

```sh
npm run lint
```

Run the unit test suite:

```sh
npm test
```

Run phase verification suites:

```sh
npm run test:phase00
npm run test:phase01
npm run test:phase02
npm run test:phase03
npm run test:phase04
npm run test:phase05
npm run test:phase06
```

Each phase script runs Vitest, builds the app, then runs the matching verification script from `scripts/`.

## Project Layout

```text
src/
  main/       Electron main process, IPC handlers, FFmpeg integration, project IO, export pipeline
  preload/    Secure Electron preload bridge exposed to the renderer
  renderer/   React UI, playback controls, WebGL viewer, scopes, tracking UI
  shared/     IPC contract, project schema, shared color engine, validation, shader generation
roadmap/      Phase plans and current roadmap status
tasks/        Task-level implementation notes by phase
scripts/      Phase verification scripts
```

Important modules:

- `src/main/ipc.ts` registers the Electron IPC handlers.
- `src/main/ffmpeg.ts` discovers FFmpeg/FFprobe and reports diagnostics.
- `src/main/mediaProbe.ts` validates MP4/MOV imports and maps FFprobe metadata.
- `src/main/frame.ts` extracts exact preview/tracking frames.
- `src/main/projectFile.ts` saves and opens JSON project files.
- `src/main/exportProject.ts` decodes source frames, evaluates the node graph on CPU, and encodes H.264 MP4 output.
- `src/preload/preload.ts` exposes the safe `window.chromaNode` renderer API.
- `src/shared/ipc.ts` defines the versioned IPC request/response contract.
- `src/shared/project.ts` defines the project schema, validation, sanitization, and serialization.
- `src/shared/colorEngine.ts` defines node data, primary corrections, qualifiers, power windows, tracking keyframes, CPU evaluation, and WebGL shader generation.
- `src/renderer/App.tsx` owns the main workspace UI and app state.
- `src/renderer/webgl/FrameRenderer.ts` renders live preview frames with WebGL2.
- `src/renderer/scopes/` analyzes and draws waveform/vectorscope views.
- `src/renderer/tracking/templateTracker.ts` implements translation-only template matching.

## Runtime Architecture

The app uses a split Electron architecture:

1. The renderer asks the preload bridge for media, project, diagnostics, frame, and export operations.
2. The preload bridge forwards typed calls through versioned IPC channels.
3. The main process performs filesystem dialogs, FFmpeg/FFprobe work, project file IO, and export jobs.
4. Shared project and color-engine modules keep renderer preview behavior and export behavior aligned.

Preview rendering and export use different execution paths:

- Preview uses WebGL2 in `FrameRenderer`, with fragment shader code generated from the shared color engine.
- Export uses FFmpeg to decode raw RGBA frames, applies the same node graph through CPU evaluation, then streams rendered frames into FFmpeg/libx264.

This keeps the UI responsive while preserving a single source of truth for node math and project data.

## Project Files

Projects are saved as JSON. The schema version is currently `1.0.0`.

A project stores:

- project id and name
- optional media reference
- playback state
- up to 3 serial color nodes
- per-node primary controls, qualifier, power windows, and tracking data
- H.264 export settings

Project loading validates and sanitizes the file. Unsupported schema versions fail, while invalid or out-of-range values are clamped/defaulted where possible.

## Media and Export Notes

- Imports are limited to `.mp4` and `.mov`.
- Display dimensions above 1920 x 1080 are rejected.
- FFprobe is required for import metadata.
- FFmpeg is required for exact frame extraction and export.
- Export writes `.mp4` only.
- Export cannot overwrite the source media.
- Export presets map to libx264 settings:
  - draft: `ultrafast`, CRF 28
  - standard: `medium`, CRF 23
  - high: `slow`, CRF 18
- Export is video-only; audio preservation is not implemented in the current MVP.

## Current Limits

- One clip at a time.
- MP4/MOV only.
- 1080p maximum display size.
- No timeline, trimming, multi-clip editing, audio editing, or audio export.
- Maximum of 3 serial nodes.
- No parallel node graph or node reordering.
- No LUT import.
- No eyedropper; qualifier values are controlled with numeric/range inputs.
- Tracking is translation-only and stores per-frame offsets for the selected power window.
- Packaging and bundled FFmpeg distribution are still tracked as roadmap work.
- Undo/redo is not implemented yet.

## Roadmap

The roadmap is organized by phase in `roadmap/` with task files in `tasks/`.

Current implemented phase coverage includes:

- Phase 00: technical foundation
- Phase 01: import, viewer, playback
- Phase 02: color engine and serial nodes
- Phase 03: qualifier and power windows
- Phase 04: waveform and vectorscope
- Phase 05: translation tracking
- Phase 06: H.264 export

Phase 07 focuses on hardening, automated coverage, performance work, packaging, and release polish.
