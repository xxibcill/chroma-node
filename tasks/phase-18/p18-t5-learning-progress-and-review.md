# [P18-T5] Learning Progress And Review

## Status

Not started

## Phase

[Phase 18 - Guided Learning and Creator Workflows](../../roadmap/phase-18-guided-learning-and-creator-workflows.md)

## Outcome

Track lesson completion, practice exports, user-created looks, and review history so users have a reason to keep returning.

## Scope

- Add local progress storage for lessons, practice attempts, exported results, and saved looks.
- Add a compact progress view that works inside the workstation shell.
- Link progress records to project versions and exported media when available.
- Add reset and privacy controls for local learning history.

## Implementation Notes

- Keep progress local-first; do not require accounts for learning features.
- Avoid collecting analytics until the commercial telemetry policy exists.
- Store enough metadata to restore context without copying large media files.

## Acceptance Criteria

- Lesson and practice progress survives app restart.
- Users can review prior attempts and reopen related project states where available.
- Users can delete local learning history.
- Progress storage is covered by schema and corruption-recovery tests.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- Local app data location and retention policy must be decided.
