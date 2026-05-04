# [P13-T7] Validation Fixtures Docs And Regression Coverage

## Status

Not started

## Phase

[Phase 13 - Apple Log and Advanced Color Management](../../roadmap/phase-13-apple-log-and-advanced-color-management.md)

## Outcome

Provide the reference material, automated coverage, and documentation needed to trust Apple Log and advanced color-management behavior over time.

## Scope

- Add synthetic color vectors and, where licensing permits, sample media fixtures for Apple Log and Rec.709 validation.
- Add tests for metadata probing, project migration, transform math, CPU/WebGL parity, scopes, and export metadata.
- Add developer documentation explaining the color pipeline and supported profile matrix.
- Add user-facing notes for Apple Log import, manual overrides, and Rec.709 export expectations.
- Add regression checks so future grading features do not bypass the managed pipeline.

## Implementation Notes

- Prefer synthetic vectors for unit tests and small media fixtures only when redistribution is clear.
- Keep reference outputs versioned or generated deterministically so tolerance changes are visible.
- Include FFprobe-based export metadata assertions for tagged video outputs.
- Update README/current-limit sections once the feature is implemented, not during planning.
- Document unsupported areas explicitly, such as full ACES workflows, HDR reference monitoring, and professional deliverable compliance if they remain out of scope.

## Acceptance Criteria

- Transform math and metadata mapping tests run in the normal test suite.
- CPU/WebGL parity tests cover both Rec.709 identity and Apple Log-managed paths.
- Export tests verify pixel output and color metadata for Rec.709 SDR delivery.
- Developer docs describe the order of operations for source, working, grade, output, and metadata stages.
- User docs explain how to import Apple Log footage, confirm/override detection, and export SDR Rec.709 deliverables.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- Redistributable Apple Log sample media or equivalent validated reference vectors must be available before end-to-end visual validation can be marked complete.
