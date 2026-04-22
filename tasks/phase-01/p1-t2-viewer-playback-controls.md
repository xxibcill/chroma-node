# P1-T2 Viewer Playback Controls

## Status

Done

## Phase

[Phase 01 - Import, Viewer, Playback](../../roadmap/phase-01-import-viewer-playback.md)

## Outcome

The viewer can play and pause the imported clip while displaying current frame and timecode state.

## Scope

- Build central video viewer.
- Add play and pause actions.
- Add current frame and timecode display.
- Preserve source aspect ratio.
- Handle first-frame display after import.

## Implementation Notes

- Preview playback may drop frames to preserve responsiveness.
- Keep playback state independent from future exact-frame access.
- Use source frame rate from metadata for frame number display.

## Acceptance Criteria

- Play starts viewer playback.
- Pause freezes on the current frame.
- Frame number and timecode update during playback.
- Viewer does not distort the source image.

## Progress

- [x] Implemented
- [x] Verified

## Blockers

- None
