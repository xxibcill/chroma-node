# Developer Docs

This documentation set is for developers who are new to this codebase and may also be new to color grading and video-tool internals.

## What This App Is

Chroma Node is an Electron desktop app that teaches color grading by exposing a simplified Resolve-style workflow:

- import one clip
- grade it through up to 3 serial nodes
- isolate corrections with an HSL qualifier and power windows
- track a selected window with translation-only tracking
- inspect the result with waveform and vectorscope scopes
- export the graded result as H.264 MP4

The project is intentionally narrow. That is a feature, not a limitation in the architecture. The code is optimized for clarity and parity between preview and export.

## Recommended Reading Order

1. [Getting Started](./getting-started.md)
2. [Architecture](./architecture.md)
3. [Video Editing and Color Theory](./video-editing-and-color-theory.md)
4. [Feature Workflows](./feature-workflows.md)
5. [External Resources](./external-resources.md)

## Documentation Plan

This docs set is split on purpose:

- `getting-started.md`: environment setup, mental model, and first debugging steps
- `architecture.md`: Electron boundaries, module ownership, and runtime data flow
- `video-editing-and-color-theory.md`: the grading concepts behind the app, each tied back to the actual implementation
- `feature-workflows.md`: practical guidance for extending the app without breaking preview/export parity
- `external-resources.md`: curated official and high-authority references for deeper study

## What A New Developer Should Understand First

- `src/shared/` is the core domain layer.
  It defines the project schema, the color engine, and the IPC contract used by both Electron processes.
- `src/renderer/` is the interactive UI.
  It owns app state, playback UX, scopes, tracking UI, and the WebGL preview renderer.
- `src/main/` is the privileged backend.
  It owns dialogs, filesystem access, FFmpeg/FFprobe integration, frame extraction, relinking, and export jobs.
- Preview and export do not share the same execution engine.
  Preview runs through WebGL shaders. Export runs through CPU pixel evaluation.
  They stay aligned because both paths use the same shared color model from `src/shared/colorEngine.ts`.

## Fast Orientation

If you only have 15 minutes:

1. Read [Architecture](./architecture.md).
2. Open `src/shared/colorEngine.ts`.
3. Open `src/renderer/App.tsx`.
4. Open `src/main/ipc.ts`.
5. Read the sections on node evaluation, masks, scopes, and export parity in [Video Editing and Color Theory](./video-editing-and-color-theory.md).

## Suggested Learning Paths

### If You Are New To Electron

Read:

1. [Getting Started](./getting-started.md)
2. [Architecture](./architecture.md)
3. Electron links in [External Resources](./external-resources.md)

Then inspect:

- `src/main/main.ts`
- `src/main/ipc.ts`
- `src/preload/preload.cts`

### If You Are New To Color Grading

Read:

1. [Video Editing and Color Theory](./video-editing-and-color-theory.md)
2. Color grading and scope links in [External Resources](./external-resources.md)

Then inspect:

- `src/shared/colorEngine.ts`
- `src/renderer/scopes/scopeAnalysis.ts`

### If You Are New To This Codebase But Comfortable With Media Tools

Read:

1. [Architecture](./architecture.md)
2. [Feature Workflows](./feature-workflows.md)

Then inspect:

- `src/renderer/App.tsx`
- `src/renderer/webgl/FrameRenderer.ts`
- `src/main/exportProject.ts`

## Design Principles Behind The Repo

- Keep the grading math centralized.
- Keep privileged operations in the main process.
- Keep renderer state ergonomic, but do not let it become the source of truth for domain logic.
- Keep preview and export behavior aligned even when the execution path differs.
- Prefer clear, testable math over “magic” image-processing shortcuts.

## Terminology Snapshot

- `node`: one stage in the serial grade pipeline
- `primaries`: broad color corrections such as lift/gamma/gain/contrast/saturation
- `qualifier`: a color-based mask
- `power window`: a geometry-based mask
- `tracking`: time-varying window offsets
- `viewer`: the live preview area
- `scope`: a measurement display, not an image effect
- `parity`: preview and export produce the same effective grade

## Source Documents Worth Knowing About

- Root [README.md](../../README.md): product-level overview and setup
- [PRD.md](../../PRD.md): original product framing and theory goals
- [roadmap/README.md](../../roadmap/README.md): delivery phases
- `tasks/phase-*/*.md`: implementation-level history for specific subsystems
- [External Resources](./external-resources.md): official docs and theory reading
