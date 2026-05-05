# [P21-T1] Grade Versions And Approval States

## Status

Not started

## Phase

[Phase 21 - Professional Review and Collaboration](../../roadmap/phase-21-professional-review-and-collaboration.md)

## Outcome

Add named grade versions with review and approval state so users can manage alternatives professionally.

## Scope

- Add version creation, duplicate, rename, compare, approve, reject, and archive behavior.
- Store version metadata including date, author label, source recipe, notes, and export links.
- Add status labels for draft, ready for review, approved, rejected, and archived.
- Preserve existing node and project behavior when versions are unused.

## Implementation Notes

- Keep grade versions as project state, not separate project files by default.
- Ensure undo and save/load behavior are clear when switching versions.
- Avoid duplicating media or unrelated project data for each version.

## Acceptance Criteria

- Users can create and switch grade versions without losing node state.
- Review status persists in the project file.
- Approved versions can be used as export targets.
- Tests cover version creation, switching, persistence, and deletion.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- Project schema migration policy must support version metadata.
