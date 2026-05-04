# [P13-T4] Working Output Transforms And Tone Mapping

## Status

Not started

## Phase

[Phase 13 - Apple Log and Advanced Color Management](../../roadmap/phase-13-apple-log-and-advanced-color-management.md)

## Outcome

Add reusable working-space, output-space, tone-mapping, and gamut-mapping transforms that keep managed grading predictable beyond simple Rec.709 SDR footage.

## Scope

- Add transfer encode/decode helpers for Rec.709, sRGB, linear, HLG, PQ, and Apple Log where supported.
- Add primary conversion matrices for Rec.709, Display P3, and Rec.2020.
- Define the initial working-space policy for SDR and Apple Log workflows.
- Add SDR tone mapping for log/HDR sources targeting Rec.709 output.
- Add basic gamut handling for wide-gamut sources targeting narrower output spaces.

## Implementation Notes

- Separate transfer conversion, primary conversion, tone mapping, and gamut mapping into individually testable functions.
- Keep the first supported delivery target Rec.709 SDR unless Phase 11 export paths are ready for HDR-tagged outputs.
- Avoid changing the semantics of primary corrections until the working-space decision is explicit and tested.
- Decide how qualifiers and scopes report values: source-referred, working-referred, or output-referred. Default to output-referred scopes for user legibility.
- Document mathematical assumptions in developer docs so future grading tools do not reintroduce Rec.709-only assumptions.

## Acceptance Criteria

- The managed pipeline can represent source, working, and output profiles independently.
- Rec.709-to-Rec.709 remains an identity transform within tolerance.
- Wide-gamut source to Rec.709 output uses explicit tone/gamut handling instead of accidental clipping.
- Transform helpers have unit tests for known white points, neutral ramps, and primary colors.
- Qualifier and scope behavior is documented and tested for the chosen managed-space semantics.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- Working-space policy must be finalized before grading-control behavior can be verified.
