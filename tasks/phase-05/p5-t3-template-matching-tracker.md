# P5-T3 Template Matching Tracker

## Status

Not started

## Phase

[Phase 05 - Translation Tracking](../../roadmap/phase-05-translation-tracking.md)

## Outcome

The app can estimate frame-to-frame translation for a selected window using template matching or phase correlation.

## Scope

- Extract template region from active window bounds.
- Search within a bounded radius on adjacent frames.
- Estimate dx/dy translation.
- Calculate confidence score.
- Stop when confidence drops below threshold.

## Implementation Notes

- MVP search radius target is 48 px at 1080p.
- MVP minimum confidence target is 0.55.
- Reject tracking if the window is too small or outside usable bounds.

## Acceptance Criteria

- Simple horizontal motion produces correct dx keyframes.
- Simple vertical motion produces correct dy keyframes.
- Low-texture regions fail cleanly.
- Object leaving frame stops tracking without corrupting prior keyframes.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None

