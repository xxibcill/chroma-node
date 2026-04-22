# P2-T5 Project Save Load

## Status

Not started

## Phase

[Phase 02 - Color Engine and Serial Nodes](../../roadmap/phase-02-color-engine-and-serial-nodes.md)

## Outcome

The user can save project state to JSON and reopen it without losing media references or grading settings.

## Scope

- Add save project action.
- Add open project action.
- Serialize media path, playback state, nodes, and export settings.
- Validate loaded JSON.
- Add missing-media detection for future relink handling.

## Implementation Notes

- Use atomic save through temp file then rename.
- Do not embed media bytes.
- Treat unknown schema versions as unsupported until migrations exist.

## Acceptance Criteria

- Saved JSON validates against the project schema.
- Loaded project restores node values and playback state.
- Missing media produces a clear warning instead of crashing.
- Source video file is never modified.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None

