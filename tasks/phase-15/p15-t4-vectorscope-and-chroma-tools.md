# [P15-T4] Vectorscope And Chroma Tools

## Status

Not started

## Phase

[Phase 15 - Professional Scopes and Monitoring Suite](../../roadmap/phase-15-professional-scopes-and-monitoring-suite.md)

## Outcome

Add advanced vectorscope modes and chroma diagnostics for hue, saturation, skin tone, broadcast targets, and gamut behavior.

## Scope

- Add Rec.709, Rec.2020, P3, and output-profile-aware vectorscope guides.
- Add 75%/100% color target boxes, skin-tone line, saturation rings, hue labels, and zoom controls.
- Add UV, CbCr, and polar hue/saturation views where useful.
- Add chroma magnitude, hue error, and target-delta diagnostics for selected pixels or regions.

## Implementation Notes

- Vectorscope guides must be generated from the active output profile, not hard-coded to Rec.709 when the user is monitoring another space.
- Keep skin-tone guide optional and visually quiet.
- Add hover/readout values only when the UI has a stable pointer interaction pattern.
- Do not overload vectorscope with gamut volume tasks better handled by CIE/gamut scopes.

## Acceptance Criteria

- Users can inspect chroma with profile-aware guides.
- 75%/100% targets and skin-tone guide can be toggled.
- Vectorscope zoom and intensity controls do not affect measured values.
- Tests cover guide generation for Rec.709, P3, and Rec.2020.

## Progress

- [x] Not started
- [x] In progress
- [x] Implemented
- [x] Verified

## Blockers

- Output-profile-aware guide generation depends on the profile registry.
