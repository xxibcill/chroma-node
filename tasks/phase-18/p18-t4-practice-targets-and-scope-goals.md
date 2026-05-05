# [P18-T4] Practice Targets And Scope Goals

## Status

Not started

## Phase

[Phase 18 - Guided Learning and Creator Workflows](../../roadmap/phase-18-guided-learning-and-creator-workflows.md)

## Outcome

Add measurable practice goals so users can compare their grades against reference targets instead of guessing.

## Scope

- Add reference stills and target ranges for luma, contrast, saturation, skin tone, and legal delivery.
- Show goal status near scopes and compare tools.
- Support target snapshots for user-created references.
- Add pass, close, and needs-work states without blocking creative choice.

## Implementation Notes

- Use measurements from the existing scope engine rather than duplicating analysis logic.
- Keep targets tolerant enough for learning; avoid false precision.
- Store user-created targets inside project files or a local library with migration support.

## Acceptance Criteria

- Practice projects can report measurable target progress.
- Scope targets update as the grade changes.
- Users can compare current grade, original, and reference still without losing context.
- Tests cover deterministic target scoring from fixed fixtures.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- Phase 15 scope metrics must be queryable from lesson and target logic.
