# Phase 01 - Import, Viewer, Playback

## Status

Done

## Functional Feature Outcome

The user can import one supported video clip, view it, play or pause it, scrub through it, frame-step, and compare original versus graded output.

## Why This Phase Exists

Playback and inspection are the base interaction loop for every later grading feature. This phase establishes media validation, viewer layout, frame addressing, playback state, and before/after comparison before color manipulation is introduced.

## Scope

- Import one MP4 or MOV clip.
- Validate media against MVP constraints.
- Show the source frame in the viewer.
- Implement play, pause, scrub, frame-step, first frame, and last frame.
- Implement original, graded, and split viewer modes.

## Tasks

| Task | Summary |
| --- | --- |
| [P1-T1](../tasks/phase-01/p1-t1-media-import-validation.md) | Import one clip and reject unsupported media. |
| [P1-T2](../tasks/phase-01/p1-t2-viewer-playback-controls.md) | Build the viewer and playback controls. |
| [P1-T3](../tasks/phase-01/p1-t3-frame-stepping-and-scrubbing.md) | Add deterministic frame stepping and responsive scrubbing. |
| [P1-T4](../tasks/phase-01/p1-t4-before-after-viewer.md) | Add original, graded, and split comparison modes. |

## Dependencies

- Phase 00 is complete.
- FFmpeg probe and frame access are available.
- The app has a stable renderer state store.

## Exit Criteria

- One supported clip can be imported and displayed.
- Unsupported files fail with clear errors.
- Playback controls update the viewer and frame/timecode display.
- Before/after comparison works even before grading is implemented.

## Verification

- `npm run test:phase01` passed unit tests, production build, supported H.264 MP4 probe, exact first/last frame extraction, and unsupported media rejection checks.
