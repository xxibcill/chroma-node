# [P12-T8] Gallery Stills And Grade Versions

## Status

Not started

## Phase

[Phase 12 - Resolve-Style Color Page Upgrade](../../roadmap/phase-12-resolve-style-color-page-upgrade.md)

## Outcome

Add still capture, gallery comparison, and grade version workflows so users can compare looks and reuse grades.

## Scope

- Capture a still from the current graded frame.
- Add a gallery surface for saved stills with metadata and thumbnails.
- Add compare modes against a selected still.
- Add local grade versions for the current project or clip.
- Add copy/apply workflows for node settings and full grades.

## Implementation Notes

- Store grade metadata separately from large image assets where possible.
- Define whether still thumbnails are embedded in project JSON or stored as sidecar files before implementation.
- Keep still comparison independent from export so comparison state does not alter rendered output.
- Ensure copied grades include all current and future node state.

## Acceptance Criteria

- Users can save a still from the current frame and see it in a gallery.
- Users can compare the active grade against a saved still.
- Users can create, rename, switch, and delete local grade versions.
- Applying a saved grade updates preview/export state and remains undoable.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- Still asset storage strategy needs a product decision before implementation.
