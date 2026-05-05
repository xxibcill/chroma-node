# [P18-T1] First Run Sample Projects

## Status

Not started

## Phase

[Phase 18 - Guided Learning and Creator Workflows](../../roadmap/phase-18-guided-learning-and-creator-workflows.md)

## Outcome

Give first-time users a fast path into a working sample project with media, nodes, scopes, and export settings already prepared.

## Scope

- Add a first-run state that offers sample media, open existing project, and import own clip.
- Package or download licensed sample clips with known color-management metadata.
- Create sample project files for beginner, skin tone, landscape, low light, and phone-log workflows.
- Preserve normal app startup for returning users.

## Implementation Notes

- Keep sample projects inspectable plain project files where possible.
- Do not require network access for the basic first-run path unless sample licensing forces download.
- Ensure bundled sample media does not bloat production installers beyond the packaging budget.

## Acceptance Criteria

- First launch can open a sample project in one action.
- Sample project metadata validates through the normal project loader.
- Returning users can bypass or disable the first-run surface.
- Missing sample assets produce a clear recovery path.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- Sample media licensing must be resolved.
