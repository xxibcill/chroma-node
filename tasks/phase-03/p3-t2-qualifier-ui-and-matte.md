# P3-T2 Qualifier UI And Matte

## Status

Done

## Phase

[Phase 03 - Qualifier and Power Windows](../../roadmap/phase-03-qualifier-and-power-windows.md)

## Outcome

The user can edit qualifier controls and view the active node matte in the viewer.

## Scope

- Add qualifier enable toggle.
- Add hue, saturation, and luminance controls.
- Add invert toggle.
- Add show matte toggle.
- Add active-node matte viewer mode.

## Implementation Notes

- Matte preview should be active-node only.
- White means selected, black means rejected, gray means soft selection.
- Show matte should not affect export output.

## Acceptance Criteria

- Qualifier controls update only the active node.
- Show matte displays the active node mask.
- Disabling show matte returns to normal viewer output.
- Qualifier state serializes in project JSON.

## Progress

- [x] Not started
- [x] In progress
- [x] Implemented
- [x] Verified

## Blockers

- None
