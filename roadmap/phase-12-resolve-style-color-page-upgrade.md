# Phase 12 - Resolve-Style Color Page Upgrade

## Status

Not started

## Functional Feature Outcome

The user gets a more professional Color page workspace with Resolve-inspired layout, grading controls, secondary tools, scopes, grade management, LUTs, and parity-safe export behavior.

## Why This Phase Exists

The MVP already proves the core grading loop, but its UI and tool depth are still closer to a technical prototype than a focused color page. This phase uses DaVinci Resolve as a workflow reference while keeping Chroma Node scoped as a learning app: improve the workbench first, then deepen primaries, curves, secondaries, monitoring, grade management, and advanced delivery-safe grading features without losing preview/export consistency.

## Scope

- Rework the renderer into a Color page workbench with viewer, node graph, palette tabs, scopes, and supporting panels.
- Upgrade primary grading from numeric sliders into wheel/bar-based controls with resettable, inspectable values.
- Add curves, improved qualifiers, enhanced power windows, tracker controls, expanded scopes, and grade comparison workflows.
- Add LUT and simple color-management support after the core grading interactions are stable.
- Preserve CPU/GPU grading parity, project migration safety, and export reproducibility throughout the phase.

## Tasks

| Task | Summary |
| --- | --- |
| [P12-T1](../tasks/phase-12/p12-t1-color-page-workbench-layout.md) | Rebuild the main renderer as a Resolve-inspired Color page workbench. |
| [P12-T2](../tasks/phase-12/p12-t2-primary-wheels-and-bars.md) | Add color wheels, master levels, primary bars, and supplemental primary controls. |
| [P12-T3](../tasks/phase-12/p12-t3-curves-palette.md) | Add custom RGB/luma curves and hue-vs curve tools. |
| [P12-T4](../tasks/phase-12/p12-t4-visual-node-graph.md) | Upgrade serial nodes into a visual node graph with stronger node operations. |
| [P12-T5](../tasks/phase-12/p12-t5-qualifier-eyedropper-and-matte-refinement.md) | Add eyedropper sampling, matte preview modes, and key refinement controls. |
| [P12-T6](../tasks/phase-12/p12-t6-power-window-and-tracker-upgrade.md) | Improve viewer window editing, add gradient windows, and deepen tracker controls. |
| [P12-T7](../tasks/phase-12/p12-t7-expanded-scopes-and-monitoring.md) | Add RGB parade, histogram, scope controls, and improved monitoring layouts. |
| [P12-T8](../tasks/phase-12/p12-t8-gallery-stills-and-grade-versions.md) | Add still capture, gallery comparison, grade versions, and copy/apply workflows. |
| [P12-T9](../tasks/phase-12/p12-t9-luts-and-basic-color-management.md) | Add LUT application and simple color-space transform support. |
| [P12-T10](../tasks/phase-12/p12-t10-color-page-parity-performance-and-tests.md) | Add parity, performance, migration, and workflow tests for the upgraded Color page. |

## Dependencies

- Phase 11 delivery work is complete enough that export settings and output workflows are stable.
- Existing shared color engine remains the source of truth for grading math.
- The renderer can be refactored without breaking current import, playback, save/open, tracking, scopes, and export workflows.
- DaVinci Resolve is used as a workflow reference, not as a requirement to duplicate every professional feature.

## Exit Criteria

- The main UI reads as a dedicated Color page with viewer, node graph, palette tabs, scopes, and grade-management surfaces.
- Users can grade through wheels/bars, curves, qualifiers, windows, tracker tools, scopes, gallery stills, versions, LUTs, and basic color-management controls.
- Preview and export produce matching results for every new grading operation covered by this phase.
- Migration and regression coverage protect existing projects, existing node graphs, and current export workflows.
