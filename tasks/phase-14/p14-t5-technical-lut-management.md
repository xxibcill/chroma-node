# [P14-T5] Technical LUT Management

## Status

Implemented - Completed

Not started

## Phase

[Phase 14 - Ultimate Color Management Expansion](../../roadmap/phase-14-ultimate-color-management-expansion.md)

## Outcome

Add technical LUT management for input, display, and output transforms without confusing those LUTs with creative looks.

## Scope

- Support technical LUT slots for input transform, display transform, output transform, and calibration/viewing simulation.
- Preserve creative LUTs as node-level looks with separate ordering.
- Add `.cube` validation improvements and prepare for additional LUT formats when parsers are reliable.
- Add interpolation policy, domain handling, shaper LUT handling, and metadata storage.
- Add relink and missing-LUT recovery flows.

## Implementation Notes

- Technical LUTs should be project-level or transform-level assets, not arbitrary node corrections by default.
- Prefer tetrahedral interpolation for 3D LUTs when performance allows.
- Validate LUT dimensions, domains, finite values, and expected input/output profiles.
- Export summaries should list active technical LUTs separately from creative looks.

## Acceptance Criteria

- Users can attach, inspect, relink, and remove technical LUTs.
- Missing technical LUTs block silent output changes and produce clear warnings.
- Creative LUT behavior remains unchanged.
- CPU/WebGL parity tests cover LUT interpolation and technical LUT ordering.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- LUT storage and project portability policy must be finalized.
