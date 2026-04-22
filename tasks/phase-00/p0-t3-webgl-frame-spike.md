# P0-T3 WebGL Frame Spike

## Status

Done

## Phase

[Phase 00 - Technical Foundation](../../roadmap/phase-00-technical-foundation.md)

## Outcome

A decoded frame from a supported clip is uploaded to a WebGL2 texture and displayed in the viewer.

## Scope

- Extract or decode a single test frame.
- Upload the frame to WebGL2.
- Render it with aspect-ratio preservation.
- Add a placeholder shader hook for future color processing.

## Implementation Notes

- Use a simple full-screen triangle or quad.
- Start with RGBA upload for simplicity.
- Keep rendering code outside React components where possible.

## Acceptance Criteria

- A frame appears in the app viewer.
- The frame is not stretched or vertically flipped.
- Renderer handles canvas resize.
- A neutral shader pass produces visually unchanged output.

## Progress

- [x] Not started
- [x] In progress
- [x] Implemented
- [x] Verified

## Verification

- The renderer initializes a WebGL2 neutral shader pass and renders decoded PNG frames as textures.
- `npm run test:phase00` extracted a frame from a generated MP4, and unit tests cover aspect-ratio containment.

## Blockers

- None
