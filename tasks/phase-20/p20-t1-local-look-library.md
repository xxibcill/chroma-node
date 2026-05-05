# [P20-T1] Local Look Library

## Status

Not started

## Phase

[Phase 20 - Look Library and Marketplace Foundation](../../roadmap/phase-20-look-library-and-marketplace-foundation.md)

## Outcome

Create a local library where users can save and reuse looks, LUTs, recipes, stills, sample projects, and lesson assets.

## Scope

- Define library item types and shared metadata.
- Add save-to-library actions from grade versions, stills, LUTs, and recipes.
- Store thumbnails, profile compatibility, tags, author, and source project references.
- Add delete, duplicate, rename, and favorite behavior.

## Implementation Notes

- Keep library storage local and human-recoverable where practical.
- Use schema validation for every item before display or apply.
- Do not copy large media unless the user explicitly creates a packaged asset.

## Acceptance Criteria

- Users can save a current look and reapply it to another project.
- Library items survive app restart and schema validation.
- Corrupt items are quarantined or skipped with a clear warning.
- Tests cover item creation, validation, and deletion.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- App data storage policy must be finalized.
