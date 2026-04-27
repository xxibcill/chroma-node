# [P12-T7] Expanded Scopes And Monitoring

## Status

Done (RGB histogram, luminance histogram, RGB parade in scopeAnalysis; histogram rendering in scopeRender - see commit e57b57b)

## Phase

[Phase 12 - Resolve-Style Color Page Upgrade](../../roadmap/phase-12-resolve-style-color-page-upgrade.md)

## Outcome

Expand monitoring beyond waveform and vectorscope so users can inspect exposure and color balance from multiple professional views.

## Scope

- Add RGB parade.
- Add luminance/RGB histogram.
- Add vectorscope skin-tone guide and scope intensity controls.
- Add scope layout modes such as stacked, side-by-side, and drawer view.
- Add scope zoom or scale controls where useful for inspection.

## Implementation Notes

- Reuse `src/renderer/scopes` analysis/rendering patterns and keep scope sampling throttled during playback.
- Keep scopes derived from the graded frame unless a specific original/compare mode is selected.
- Avoid blocking playback with high-resolution scope analysis.
- Add deterministic tests for scope binning and guide generation.

## Acceptance Criteria

- Users can switch between waveform, vectorscope, RGB parade, and histogram views.
- Scope controls do not resize or destabilize the main grading layout.
- Playback remains responsive with expanded scopes enabled.
- Scope tests cover representative RGB, luma, saturation, and neutral-gray frames.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
