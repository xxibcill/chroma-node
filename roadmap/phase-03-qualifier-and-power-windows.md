# Phase 03 - Qualifier and Power Windows

## Status

Done

## Functional Feature Outcome

The user can isolate node corrections with an HSL qualifier and spatial ellipse or rectangle power windows.

## Why This Phase Exists

Professional color systems are built around selective correction. This phase adds the mask layer of the grading pipeline and makes the relationship between pixel qualification, spatial windows, feathering, and node blending visible and editable.

## Scope

- Add one HSL qualifier per node.
- Add matte preview for the active node.
- Add one ellipse and one rectangle power window per node.
- Add viewer overlays and editable handles.
- Combine qualifier and window masks for node blending.

## Tasks

| Task | Summary |
| --- | --- |
| [P3-T1](../tasks/phase-03/p3-t1-hsl-qualifier-engine.md) | Implement HSL qualifier mask evaluation with hue wrapping and softness. |
| [P3-T2](../tasks/phase-03/p3-t2-qualifier-ui-and-matte.md) | Add qualifier controls and active-node matte preview. |
| [P3-T3](../tasks/phase-03/p3-t3-power-window-engine.md) | Implement ellipse and rectangle masks with softness, rotation, and invert. |
| [P3-T4](../tasks/phase-03/p3-t4-window-overlay-editor.md) | Add viewer overlays for moving, resizing, and rotating windows. |
| [P3-T5](../tasks/phase-03/p3-t5-mask-composition-tests.md) | Verify qualifier/window mask composition and node blending. |

## Dependencies

- Phase 02 is complete.
- Shader generator supports per-node uniforms.
- Viewer has active node selection state.

## Exit Criteria

- Qualifier affects only selected HSL ranges.
- Hue ranges wrap correctly around red.
- Matte preview shows the active node selection.
- Ellipse and rectangle windows can be edited in the viewer.
- Final node mask equals qualifier mask multiplied by unioned window mask.
