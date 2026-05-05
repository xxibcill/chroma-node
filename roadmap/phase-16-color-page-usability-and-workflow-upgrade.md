# Phase 16 - Color Page Usability and Workflow Upgrade

## Status

Not started

## Functional Feature Outcome

The user gets a calmer, faster, more usable Color page that keeps the viewer dominant, makes advanced grading and monitoring tools discoverable, and lets common grading workflows fit inside a compact desktop viewport.

## Why This Phase Exists

Advanced color management and a large scope suite can make the Color page more powerful but also more fragile and crowded. Chroma Node's design context calls for a precise, grounded, studio-like workstation UI with compact controls and the viewer as the anchor. This phase improves the Color page as a working console: better layout, faster navigation, clearer state, stronger control ergonomics, fewer redundant panels, and workflows that reveal depth without burying the basic grade path.

## Scope

- Rebuild the Color page shell around a dominant viewer, stable panel regions, compact controls, and internal panel scrolling.
- Add workspace presets for grade, scopes, color management, compare, export check, and learning/debug modes.
- Improve grading-control ergonomics with keyboardable controls, reset affordances, readouts, grouping, and precision input.
- Improve node, version, still, compare, and shot-matching workflows.
- Add command/search, shortcuts, undo history, focus management, and state feedback.
- Add warning and empty-state patterns for missing media, unknown profiles, unsupported transforms, and performance reductions.
- Add layout regression, accessibility, and usability checks for desktop and constrained laptop viewports.

## Tasks

| Task | Summary |
| --- | --- |
| [P16-T1](../tasks/phase-16/p16-t1-workstation-shell-and-viewer-first-layout.md) | Rebuild the Color page shell around a dominant viewer and stable workstation regions. |
| [P16-T2](../tasks/phase-16/p16-t2-workspace-presets-and-adaptive-panels.md) | Add workspace presets and adaptive panels for grading, scopes, color management, compare, and export checks. |
| [P16-T3](../tasks/phase-16/p16-t3-grading-control-ergonomics.md) | Improve wheels, sliders, numeric inputs, reset behavior, keyboard control, and precision editing. |
| [P16-T4](../tasks/phase-16/p16-t4-node-grade-and-shot-navigation.md) | Improve node graph, grade versions, stills, shot matching, and navigation workflows. |
| [P16-T5](../tasks/phase-16/p16-t5-command-shortcuts-and-undo-workflows.md) | Add command search, shortcuts, undo history, focus management, and fast workflow actions. |
| [P16-T6](../tasks/phase-16/p16-t6-status-warnings-and-empty-states.md) | Add clear state feedback for media, profiles, transforms, scopes, export, and performance. |
| [P16-T7](../tasks/phase-16/p16-t7-accessibility-responsive-and-usability-validation.md) | Add accessibility, viewport-fit, interaction, and usability validation for the Color page. |

## Dependencies

- Phase 12 Color page workbench exists or is ready to be refactored.
- Phase 13/14 color-management state is available for UI controls and warnings.
- Phase 15 scope layout needs are known enough to reserve panel infrastructure.
- The existing dark workstation design context in `.impeccable.md` remains the design source of truth.

## Exit Criteria

- The default Color page fits a typical laptop viewport with the viewer, primary controls, nodes, and scopes immediately usable.
- Advanced color-management and scope tools are discoverable through workspace presets and progressive disclosure.
- Common grading actions are keyboardable and have visible state, reset, and undo behavior.
- Unknown media/profile/performance states are communicated close to the affected workflow.
- Layout, accessibility, and interaction tests protect the workstation shell from regression.
