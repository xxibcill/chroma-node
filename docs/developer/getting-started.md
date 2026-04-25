# Getting Started

This guide assumes you are new to this repo and possibly new to video tooling in general.

## Prerequisites

- Node.js and npm
- FFmpeg
- FFprobe
- WebGL2-capable system graphics stack

The app looks for FFmpeg and FFprobe:

- on `PATH`
- in common Unix paths such as `/opt/homebrew/bin` and `/usr/local/bin`
- or through:
  - `CHROMA_NODE_FFMPEG_PATH`
  - `CHROMA_NODE_FFPROBE_PATH`

## First Run

```sh
npm install
npm run dev
```

Useful commands:

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

## The Mental Model

Think of the app as four layers:

1. `src/main/`
   The Electron main process. It can touch the filesystem, open native dialogs, and run FFmpeg.
2. `src/preload/`
   The secure bridge between renderer and main.
3. `src/renderer/`
   The React UI, playback controls, scopes, and tracking interface.
4. `src/shared/`
   The application model: project schema, node graph, and color math.

If you do not know where a behavior belongs, start with this rule:

- UI-only behavior belongs in `renderer`
- file/process/OS behavior belongs in `main`
- any data model or math that must match in preview and export belongs in `shared`

## The Runtime Flow

At startup:

1. `src/main/main.ts` creates the Electron window.
2. `src/main/ipc.ts` registers the IPC handlers.
3. `src/preload/preload.cts` exposes `window.chromaNode`.
4. `src/renderer/App.tsx` calls that API to import media, load/save projects, extract frames, and export.

The most important design decision is that the renderer never talks to FFmpeg or the filesystem directly.

## Vocabulary You Will See In The Code

- `MediaRef`: normalized metadata about the imported source clip
- `DecodedFrame`: one extracted preview frame represented as a PNG data URL plus dimensions
- `ChromaProject`: the persisted application model
- `ColorNode`: one serial grading stage
- `TrackingKeyframe`: one tracked offset for a given frame
- `ViewerMode`: `original`, `graded`, or `split`

These types live mostly in:

- `src/shared/ipc.ts`
- `src/shared/project.ts`
- `src/shared/colorEngine.ts`

## What Happens On App Startup

The startup sequence is short but worth understanding because it explains most of the app boundary decisions.

1. Electron launches `dist/main/main/main.js`.
2. `src/main/main.ts` creates the `BrowserWindow`.
3. The preload script is attached with `contextIsolation: true`.
4. `registerIpcHandlers()` wires main-process actions such as import, save, open, relink, diagnostics, frame extraction, and export.
5. The renderer bootstraps React from `src/renderer/main.tsx`.
6. `App.tsx` queries FFmpeg diagnostics and waits for user interaction.

If startup fails, this sequence tells you where to look:

- window or process problem: `src/main/main.ts`
- bridge problem: `src/preload/preload.cts`
- first-render problem: `src/renderer/main.tsx` and `src/renderer/App.tsx`

## What The Build Produces

At a high level:

- Vite builds the renderer bundle
- TypeScript builds the main and preload bundles
- Electron loads the compiled outputs from `dist/`

Important paths from `package.json`:

- app `main`: `dist/main/main/main.js`
- preload output: `dist/main/preload/preload.js` or `preload.cjs` depending on the build path used by Electron

When debugging build issues, check whether the failure is:

- TypeScript compilation
- renderer bundling
- Electron startup after compilation

## Where To Start Reading Code

Read in this order:

1. `src/shared/project.ts`
   Understand what a project is.
2. `src/shared/colorEngine.ts`
   Understand how a node graph transforms a pixel.
3. `src/renderer/App.tsx`
   Understand how the UI edits the shared model.
4. `src/renderer/webgl/FrameRenderer.ts`
   Understand how preview rendering maps shared state into GPU uniforms.
5. `src/main/ipc.ts`
   Understand which renderer actions cross into the privileged process.
6. `src/main/exportProject.ts`
   Understand how the same grade is rendered offline for export.

## Where Features Usually Live

### Import And Metadata

- `src/main/mediaProbe.ts`
- `src/main/frame.ts`
- `src/main/ffmpeg.ts`

### Project Persistence

- `src/shared/project.ts`
- `src/main/projectFile.ts`

### Grading Math

- `src/shared/colorEngine.ts`

### Live Preview

- `src/renderer/webgl/FrameRenderer.ts`

### Scopes

- `src/renderer/scopes/scopeAnalysis.ts`
- `src/renderer/scopes/scopeRender.ts`

### Tracking

- `src/renderer/tracking/templateTracker.ts`
- tracking orchestration in `src/renderer/App.tsx`

### Export

- `src/main/exportProject.ts`

## What A Project Actually Stores

A project is not a timeline edit. It is mostly:

- one media reference
- viewer/playback state
- up to 3 color nodes
- per-node primaries, qualifier, windows, and tracking data
- export settings

That shape is defined in `src/shared/project.ts`.

## Common Debugging Starting Points

If the app cannot import a clip:

- check `src/main/mediaProbe.ts`
- confirm FFprobe is available
- confirm the file is `.mp4` or `.mov`
- confirm display size is not above `1920x1080`

If preview looks wrong but export looks right:

- inspect `src/renderer/webgl/FrameRenderer.ts`
- inspect shader uniform upload
- compare against `evaluateNodeGraph` in `src/shared/colorEngine.ts`

If export looks wrong but preview looks right:

- inspect `src/main/exportProject.ts`
- confirm the exported frame uses `resolveTrackedNode`
- confirm frame indexing and normalized coordinates match preview expectations

If a saved project reloads strangely:

- inspect `validateProject` and `sanitizeProject` in `src/shared/project.ts`
- check whether values were clamped, defaulted, or truncated

If scopes look wrong:

- inspect `createGradedScopeFrame()`, `createWaveformHistogram()`, and `createVectorscopeHistogram()`
- confirm the sampled frame is graded before scope generation
- confirm coordinate normalization is consistent across preview and scope math

If tracking behaves unexpectedly:

- inspect `matchTranslation()` in `src/renderer/tracking/templateTracker.ts`
- check whether the window is too small or too low-texture
- check if confidence fell below the expected threshold

If the preload bridge seems broken:

- confirm `window.chromaNode` exists in the renderer
- inspect `src/preload/preload.cts`
- confirm the IPC channel names match `src/shared/ipc.ts`

## First Safe Contributions

Good first changes:

- improve error text in renderer panels
- add docs or tests around existing node behavior
- add validation tests for project schema edge cases
- extend a scope or tracking test with a clearer fixture

Higher-risk changes:

- changing color math in `src/shared/colorEngine.ts`
- changing preview shader generation
- changing export frame rendering order
- changing project schema without a migration plan

## Good Habits In This Repository

- Read the shared module first when touching any behavior that affects grading output.
- Trace a feature end to end before editing it.
- Prefer adding tests around math and serialization before refactoring them.
- Treat the README as a product overview and the `docs/developer/` folder as the engineering handbook.
- When adding a new concept, document both the theory and the implementation touchpoints.

## Practical Rule For New Contributors

Before editing code, answer these two questions:

1. Is this behavior UI-only, or must preview and export agree on it?
2. Does this change affect project persistence?

Those questions usually tell you which files you must touch.

## Learn More

For external reading, continue with [External Resources](./external-resources.md).
