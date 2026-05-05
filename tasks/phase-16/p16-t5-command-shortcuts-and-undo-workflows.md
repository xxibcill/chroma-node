# [P16-T5] Command Shortcuts And Undo Workflows

## Status

Not started

## Phase

[Phase 16 - Color Page Usability and Workflow Upgrade](../../roadmap/phase-16-color-page-usability-and-workflow-upgrade.md)

## Outcome

Add fast workflow affordances through command search, keyboard shortcuts, focus management, and a clearer undo history.

## Scope

- Add command search for common actions such as import, export, add node, reset node, toggle scopes, toggle compare, change workspace, and assign input profile.
- Add configurable or documented keyboard shortcuts for core grading and navigation actions.
- Improve undo/redo labeling and history visibility.
- Add focus management for panels, viewer, scopes, and active controls.

## Implementation Notes

- Command search should execute real app actions, not duplicate business logic.
- Keep shortcut conflicts visible and testable.
- Avoid modal-heavy workflows; command search can be transient and keyboard-first.
- Undo labels should use user-facing operation names.

## Acceptance Criteria

- Users can find and run core actions from command search.
- Keyboard shortcuts work without breaking text entry or numeric fields.
- Undo/redo history communicates what will be reverted.
- Tests cover command execution, shortcut routing, and focus behavior.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- Central action registry is needed before command search can remain maintainable.
