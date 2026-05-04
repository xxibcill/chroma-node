# [P13-T3] Apple Log Input Transform

## Status

Not started

## Phase

[Phase 13 - Apple Log and Advanced Color Management](../../roadmap/phase-13-apple-log-and-advanced-color-management.md)

## Outcome

Implement a validated Apple Log input transform so Apple Log / BT.2020 footage can enter the managed grading pipeline without remaining flat and unnormalized.

## Scope

- Add Apple Log as a first-class input profile with BT.2020 primaries.
- Implement the Apple Log transfer decode using an authoritative formula, Apple-provided transform, or validated reference LUT.
- Convert Apple Log values into the selected working profile before creative grading.
- Support both automatic profile detection and manual Apple Log assignment.
- Add reference tests for neutral ramps, exposure steps, saturation boundaries, and clipping/tone-map handoff.

## Implementation Notes

- Do not hard-code a guessed Apple Log curve. The transform must be traceable to official Apple material or a reference implementation with clear provenance.
- Keep the Apple Log transform in shared code that can emit equivalent CPU and GLSL behavior.
- Treat Apple Log-to-Rec.709 display rendering as input transform plus output/tone mapping, not as a creative contrast adjustment.
- Decide whether a technical 3D LUT is acceptable for the first implementation only if licensing and portability are clear.
- Include a manual override path because real-world files may have incomplete or inconsistent color metadata.

## Acceptance Criteria

- A clip assigned to Apple Log is transformed before creative node evaluation in both preview and export.
- Apple Log reference vectors match the selected reference transform within the agreed tolerance.
- Rec.709 identity behavior remains unchanged when Apple Log is not selected.
- Automatic detection and manual override both reach the same Apple Log transform path.
- Unsupported or unvalidated Apple Log transform state blocks silent conversion and presents a recoverable warning.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- The exact Apple Log transfer behavior must be sourced from official Apple documentation, an Apple-provided LUT, or validated reference material before native transform work can be verified.
