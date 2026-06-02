# [P21-T4] Feedback Import And Resolution

## Status

Partial

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
- [x] In progress
- [ ] Implemented
- [ ] Verified

## Implementation Audit - 2026-05-15

Status: Partial.

Evidence:
- `src/shared/feedbackFile.ts` defines and validates a structured feedback file format.
- `src/shared/feedbackFile.test.ts` covers creation, validation, defaults, and serialization.
- IPC and preload contracts expose feedback import and feedback resolution.
- `src/main/feedbackStore.ts` parses feedback files, converts feedback notes to annotations, resolves imported notes, exports annotations back to feedback, and handles skip/replace/rename duplicate strategies.
- The IPC import handler now merges feedback into project annotations and returns import counts/conflict actions.
- `ReviewWorkflowPanel` provides a renderer import path for feedback JSON.
- `src/main/feedbackStore.test.ts` covers duplicate rename behavior.

Remaining work:
- Conflict preview/merge behavior is not implemented.
- Add richer renderer conflict preview before import.

## Blockers

- Review note schema must be stable.
