# [P12-T5] Qualifier Eyedropper And Matte Refinement

## Status

Done (eyedropper add/subtract/clear mode, canvas click sampling, gallery stills capture - see commit e57b57b)

## Phase

[Phase 12 - Resolve-Style Color Page Upgrade](../../roadmap/phase-12-resolve-style-color-page-upgrade.md)

## Outcome

Make HSL qualification feel like a practical secondary grading tool through sampling, matte inspection, and key cleanup controls.

## Scope

- Add viewer eyedropper sampling for hue, saturation, and luminance ranges.
- Add add-sample and subtract-sample modes.
- Add matte preview modes for black/white matte, highlight overlay, and isolated selection.
- Add key refinement controls such as clean black, clean white, blur, denoise, and despill where technically feasible.
- Improve H/S/L range visualization in the qualifier palette.

## Implementation Notes

- Sample from the same displayed frame space the user sees in the viewer.
- Store sampled ranges in project state as normal qualifier values so export remains deterministic.
- Keep matte refinement operations centralized in the shared color engine.
- Be explicit about performance costs for blur or denoise operations before enabling them during playback.

## Acceptance Criteria

- Users can sample a color region from the viewer and see qualifier ranges update.
- Add/subtract sampling narrows or expands the selected matte predictably.
- Matte preview modes clearly show the selected region without changing the underlying grade.
- Export applies the same qualifier and refinement behavior as preview.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
