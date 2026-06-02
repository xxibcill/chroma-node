# [P21-T2] Annotations And Review Notes

## Status

Partial

## Phase

[Phase 21 - Professional Review and Collaboration](../../roadmap/phase-21-professional-review-and-collaboration.md)

## Outcome

Allow users to add frame-accurate notes and visual annotations for review and revision workflows.

## Scope

- Add text notes tied to frame, version, timecode, and optional image region.
- Add simple viewer annotations such as point, rectangle, and freehand stroke where appropriate.
- Add note status for open, resolved, deferred, and rejected.
- Add filtering by status, version, and frame range.

## Implementation Notes

- Store annotations in normalized display coordinates so geometry changes remain safe.
- Keep annotation overlays separate from grading masks.
- Avoid letting notes block playback or grading controls.

## Acceptance Criteria

- Users can add, edit, resolve, and delete frame-accurate notes.
- Notes remain aligned after viewer resize and project reload.
- Annotation overlays can be hidden during grading and export.
- Tests cover note persistence and coordinate mapping.

## Progress

- [ ] Not started
- [x] In progress
- [ ] Implemented
- [ ] Verified

## Implementation Audit - 2026-05-15

Status: Partial.

Evidence:
- `Annotation`, `AnnotationStatus`, and geometry types are defined in `src/shared/project.ts`.
- Project validation round-trips annotations and defaults invalid annotation status values.
- IPC and preload contracts expose create, update, delete, and list annotations.
- `src/main/annotationStore.ts` implements annotation CRUD, filtering, and basic stats.
- `ReviewWorkflowPanel` can add frame notes and resolve/reopen notes from the renderer.

Remaining work:
- Add dedicated annotation edit/delete/filter controls beyond the compact frame-note list.
- Annotation overlay rendering and normalized display-coordinate interaction are not wired into the viewer.
- Add tests for annotation store behavior and coordinate mapping through the actual viewer helpers.

## Blockers

- Centralized geometry from Phase 17 must be available.
