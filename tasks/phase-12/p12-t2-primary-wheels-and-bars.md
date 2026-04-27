# [P12-T2] Primary Wheels And Bars

## Status

Not started

## Phase

[Phase 12 - Resolve-Style Color Page Upgrade](../../roadmap/phase-12-resolve-style-color-page-upgrade.md)

## Outcome

Add Resolve-inspired primary wheel and bar controls while preserving the existing primary correction model and export parity.

## Scope

- Add wheel-style controls for lift, gamma, gain, and offset chroma balance.
- Add master level controls under each primary range.
- Add a primary bars mode for RGB/Y channel adjustments.
- Add supplemental primary controls for hue, color boost, midtone detail, shadows, and highlights where the color engine can support them clearly.
- Add individual reset affordances for each control group.

## Implementation Notes

- Extend `src/shared/colorEngine.ts` before wiring UI so preview shader generation and CPU export stay aligned.
- Represent wheel interaction as explicit numeric values in project state, not hidden UI-only deltas.
- Keep the existing slider controls available until the wheel UI is fully verified.
- Add focused tests for neutral defaults, reset behavior, and CPU/GPU parity.

## Acceptance Criteria

- Users can adjust lift, gamma, gain, and offset through wheel controls and master levels.
- Primary bars can make channel-specific changes without corrupting existing project data.
- Resetting a primary range returns it to the same neutral result as a new node.
- Preview and export match for every new primary operation.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
