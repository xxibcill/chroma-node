# [P16-T4] Node Grade And Shot Navigation

## Status

Not started

## Phase

[Phase 16 - Color Page Usability and Workflow Upgrade](../../roadmap/phase-16-color-page-usability-and-workflow-upgrade.md)

## Outcome

Improve navigation across nodes, versions, stills, and shot-matching workflows so users can compare and reuse grades efficiently.

## Scope

- Improve node selection, naming, enable/disable, bypass, duplicate, reset, and ordering affordances.
- Add grade version navigation and visible current-version state.
- Improve still capture, still comparison, split view, wipe, and reference matching workflows.
- Add shot-match scaffolding for single-clip learning workflows and future multi-clip expansion.

## Implementation Notes

- Keep node operations visually compact and predictable.
- Preserve serial-node simplicity until parallel/layer behavior is truly supported.
- Make compare modes obvious in the viewer and scopes.
- Keep version and still metadata portable in project files.

## Acceptance Criteria

- Users can select, rename, duplicate, bypass, and reset nodes without hunting through panels.
- Grade versions and stills are easy to compare against the current grade.
- Viewer and scopes clearly indicate compare mode.
- Tests cover node operation state, version switching, and compare-mode persistence.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- Grade version data model must be stable before deep UI work.
