# [P21-T3] Review Package Export

## Status

Not started

## Phase

[Phase 21 - Professional Review and Collaboration](../../roadmap/phase-21-professional-review-and-collaboration.md)

## Outcome

Export a portable review package with graded media, stills, annotations, scopes, and version metadata.

## Scope

- Add review package presets for client review, internal review, and technical QC.
- Include selected exports, stills, notes, approval state, project metadata, and scope snapshots.
- Add package manifest validation and size estimate before export.
- Add optional redaction for local paths and sensitive metadata.

## Implementation Notes

- Reuse package validation patterns from Phase 20.
- Keep review packages readable without requiring the app where possible.
- Do not include source media by default unless the user chooses a handoff package.

## Acceptance Criteria

- Users can export a review package from selected versions.
- Package manifest validates before and after export.
- Redaction removes local paths from exported metadata.
- Tests cover package contents and manifest validation.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- Export stills and scope snapshots must be reliable.
