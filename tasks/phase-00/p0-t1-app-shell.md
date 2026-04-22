# P0-T1 App Shell

## Status

Done

## Phase

[Phase 00 - Technical Foundation](../../roadmap/phase-00-technical-foundation.md)

## Outcome

The app launches as an Electron desktop shell with clear main-process, renderer-process, and IPC boundaries.

## Scope

- Create Electron, React, and TypeScript project structure.
- Add development scripts for launch, typecheck, lint, and test.
- Define IPC channels for file selection, media probe, frame access, and export jobs.
- Add a minimal empty-state UI.

## Implementation Notes

- Keep privileged file and process access in the Electron main process.
- Keep grading UI and WebGL rendering in the renderer process.
- Treat IPC payloads as versioned contracts.

## Acceptance Criteria

- `npm run dev` launches the desktop app.
- Renderer loads without console runtime errors.
- Main process exposes typed IPC handlers.
- Empty app state shows an import action.

## Progress

- [x] Not started
- [x] In progress
- [x] Implemented
- [x] Verified

## Verification

- `npm run dev` launched the Electron desktop shell through Vite.
- `npm run typecheck`, `npm run lint`, and `npm run build` passed.

## Blockers

- None
