# Phase 00 - Technical Foundation

## Status

Done

## Functional Feature Outcome

The developer has a working technical spike that proves the app shell, media probing, WebGL frame rendering, and export approach before product features are built.

## Why This Phase Exists

This phase reduces the highest technical uncertainty before investing in UI-heavy work. The MVP depends on Electron process boundaries, FFmpeg availability, GPU rendering, frame access, and a future export path. Proving these pieces early prevents later phases from being blocked by foundational architecture problems.

## Scope

- Create the Electron, React, TypeScript application shell.
- Add FFmpeg discovery and media probing.
- Render a decoded frame through WebGL2.
- Prove a minimal processed-frame export path.

## Tasks

| Task | Summary |
| --- | --- |
| [P0-T1](../tasks/phase-00/p0-t1-app-shell.md) | Create the Electron app shell and process boundaries. |
| [P0-T2](../tasks/phase-00/p0-t2-ffmpeg-probe.md) | Add FFmpeg discovery, diagnostics, and metadata probing. |
| [P0-T3](../tasks/phase-00/p0-t3-webgl-frame-spike.md) | Display a decoded frame through a WebGL2 renderer. |
| [P0-T4](../tasks/phase-00/p0-t4-export-spike.md) | Prove that processed frames can be encoded into an MP4. |

## Dependencies

- Node.js and package manager are available.
- A bundled or local FFmpeg binary can be invoked by the app.
- A short H.264 MP4 test clip is available.

## Exit Criteria

- App launches into a desktop shell without runtime errors.
- FFmpeg metadata probe returns width, height, duration, frame rate, codec, and stream data.
- A frame from a supported clip is visible through WebGL2.
- A minimal processed frame sequence can be encoded to H.264 MP4.

## Verification

- `npm run dev` launched Vite, compiled Electron main/preload files, and opened the desktop shell.
- `npm run test:phase00` passed unit tests, production build, FFmpeg diagnostics, synthetic H.264 export, metadata probe, and preview frame extraction.
