# [P14-T1] Profile Registry And Transform Graph

## Status

Implemented - Completed

Not started

## Phase

[Phase 14 - Ultimate Color Management Expansion](../../roadmap/phase-14-ultimate-color-management-expansion.md)

## Outcome

Build an explicit registry and transform graph for source, working, display, and delivery color profiles.

## Scope

- Define registry entries for primaries, transfer functions, matrices, white points, ranges, bit-depth expectations, and HDR metadata.
- Represent input, working, display, and delivery transforms as ordered pipeline stages.
- Add capability flags for CPU, GLSL, LUT-backed, and external-OCIO-backed transforms.
- Add validation for unsupported or ambiguous profile paths.

## Implementation Notes

- Keep the registry in shared code so preview, export, scopes, and project validation use the same definitions.
- Make transform ordering inspectable for debugging and export summaries.
- Avoid hiding missing transforms behind an automatic Rec.709 fallback.
- Design the graph so Phase 13 settings migrate into the richer registry without visual change.

## Acceptance Criteria

- The app can resolve a complete color pipeline from project settings and source metadata.
- Unsupported transform paths return structured warnings or errors.
- Existing Rec.709 settings resolve to the same identity pipeline as before.
- Unit tests cover valid, invalid, and partially supported profile graphs.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
