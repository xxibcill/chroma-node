# P1-T1 Media Import Validation

## Status

Not started

## Phase

[Phase 01 - Import, Viewer, Playback](../../roadmap/phase-01-import-viewer-playback.md)

## Outcome

The user can import exactly one supported MP4/MOV clip and unsupported media fails with actionable errors.

## Scope

- Add import file picker for `.mp4` and `.mov`.
- Probe selected media.
- Enforce max 1920x1080.
- Enforce video stream presence.
- Replace current media only after confirmation.

## Implementation Notes

- Keep source media read-only.
- Store imported media as a path reference, not embedded bytes.
- Detect audio but ignore it.

## Acceptance Criteria

- Supported 1080p-or-smaller H.264 clip imports successfully.
- Oversized media is rejected.
- Media with no video stream is rejected.
- Importing a second clip asks for confirmation.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None

