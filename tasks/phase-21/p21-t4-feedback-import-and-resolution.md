# [P21-T4] Feedback Import And Resolution

## Status

Not started

## Phase

[Phase 21 - Professional Review and Collaboration](../../roadmap/phase-21-professional-review-and-collaboration.md)

## Outcome

Import structured feedback and track each note through resolution inside the project.

## Scope

- Define a simple feedback file format for notes, frame references, version references, and reviewer labels.
- Add import flow with preview, merge, duplicate handling, and conflict warnings.
- Link imported feedback to existing versions or create missing review contexts.
- Add resolution tracking and filtered review lists.

## Implementation Notes

- Treat imported feedback as untrusted data.
- Keep reviewer identity as plain labels unless account support exists.
- Do not overwrite local notes during import without explicit user action.

## Acceptance Criteria

- Users can import a valid feedback file into a project.
- Conflicting or duplicate notes are handled predictably.
- Imported notes can be resolved and exported again.
- Tests cover malformed feedback and merge behavior.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- Review note schema must be stable.
