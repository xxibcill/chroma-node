# [P18-T2] Interactive Color Lessons

## Status

Not started

## Phase

[Phase 18 - Guided Learning and Creator Workflows](../../roadmap/phase-18-guided-learning-and-creator-workflows.md)

## Outcome

Add guided lessons that teach color workflows through the actual viewer, controls, nodes, scopes, and export path.

## Scope

- Add lesson definitions for exposure, white balance, contrast, saturation, skin tone, secondaries, tracking, scopes, and export checks.
- Highlight the active control or panel without blocking normal interaction.
- Detect lesson milestones from real project state and scope measurements.
- Add lesson pause, resume, restart, and skip behavior.

## Implementation Notes

- Store lessons as structured data rather than hard-coded UI conditionals.
- Keep visible copy short and avoid turning the app into a lecture screen.
- Use the same command and focus system planned for Phase 16.

## Acceptance Criteria

- Users can complete at least three lessons using normal controls.
- Lesson state survives project reload and app restart.
- Lessons fail gracefully when media, profile, or scope data is unavailable.
- Tests cover lesson milestone detection for deterministic sample projects.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- Final command/focus behavior from Phase 16 must be available.
