# [P16-T3] Grading Control Ergonomics

## Status

Not started

## Phase

[Phase 16 - Color Page Usability and Workflow Upgrade](../../roadmap/phase-16-color-page-usability-and-workflow-upgrade.md)

## Outcome

Make grading controls faster, more precise, and easier to reset, compare, and operate from keyboard or pointer.

## Scope

- Improve color wheels, bars, sliders, numeric fields, steppers, reset controls, and grouped parameter readouts.
- Add fine-adjust behavior, typed input, drag gestures, and keyboard increments.
- Add per-control reset, per-section reset, and active-change indicators.
- Add compact parameter grouping for primaries, curves, qualifiers, windows, LUTs, and color management.

## Implementation Notes

- Use icons for reset, enable, link, lock, expand, and compare actions where familiar.
- Keep labels short and values aligned for scanning.
- Avoid text that explains how the app works inside the interface; use clear labels and discoverable controls.
- Ensure long labels and numeric values cannot overflow compact panels.

## Acceptance Criteria

- Users can adjust core grading values precisely with pointer, keyboard, and typed input.
- Reset behavior is available at parameter, section, node, and grade levels.
- Active or non-neutral controls are visibly distinguishable without visual noise.
- Tests cover keyboard adjustment, reset behavior, and text overflow.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- Final control set from Phase 12 must be stable enough to refine.
