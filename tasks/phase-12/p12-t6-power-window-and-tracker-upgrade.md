# [P12-T6] Power Window And Tracker Upgrade

## Status

In progress (power window infrastructure present, full handle editing deferred)

## Phase

[Phase 12 - Resolve-Style Color Page Upgrade](../../roadmap/phase-12-resolve-style-color-page-upgrade.md)

## Outcome

Improve window editing and tracking so localized corrections are easier to place, feather, inspect, and track over time.

## Scope

- Add full viewer handles for move, scale, rotate, and feather adjustments.
- Add a linear gradient window alongside ellipse and rectangle windows.
- Add per-window opacity or key strength controls.
- Add a tracker panel with forward, backward, stop, reset, and keyframe-inspection controls.
- Improve tracking failure messages and avoid writing low-confidence keyframes.

## Implementation Notes

- Keep all window geometry in display-space coordinates shared by preview, tracking, scopes, and export.
- Extend the current translation-only tracker before considering scale or rotation tracking.
- Make window handle hit targets stable and usable at different viewer sizes.
- Keep tracker state cancelable and resilient to media changes, relink, and project load.

## Acceptance Criteria

- Users can edit window position, size, rotation, and softness directly in the viewer.
- Gradient windows can restrict a node correction in preview and export.
- Tracker controls show progress, stop safely, and preserve existing good keyframes when tracking fails.
- Window overlays remain aligned after scrub, playback, relink, and export geometry changes.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
