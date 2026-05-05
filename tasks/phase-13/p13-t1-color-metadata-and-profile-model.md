# [P13-T1] Color Metadata And Profile Model

## Status

Not started

## Phase

[Phase 13 - Apple Log and Advanced Color Management](../../roadmap/phase-13-apple-log-and-advanced-color-management.md)

## Outcome

Capture video color metadata at import and normalize it into shared color-profile types that the renderer, export pipeline, UI, and project file can all use.

## Scope

- Extend media probing to read color primaries, transfer characteristics, matrix coefficients, range, pixel format, and bit depth when FFprobe reports them.
- Add normalized shared types for primaries, transfer function, matrix, range, bit depth, and high-level source profile.
- Preserve unknown or missing metadata instead of guessing silently.
- Store normalized metadata in `MediaRef` and project files.
- Add tests for common Rec.709, Display P3, Rec.2020 HLG/PQ, and Apple Log-style metadata payloads.

## Implementation Notes

- Start in `src/main/mediaProbe.ts`, `src/shared/ipc.ts`, and `src/shared/project.ts`.
- Normalize FFprobe strings into app-owned enums so downstream code does not depend on raw FFmpeg labels.
- Keep unsupported metadata as inspectable data; decode support and color-management support should be separate decisions.
- Treat Apple Log detection as a high-level profile inferred from reliable metadata and/or explicit user override, not from file extension alone.
- Add project validation warnings when old files lack color metadata.

## Acceptance Criteria

- Imported media records color metadata when FFprobe provides it.
- Missing or unknown metadata is represented explicitly as `unknown` or `auto`, not coerced to Rec.709.
- Project save/open preserves normalized color metadata.
- Unit tests cover representative FFprobe JSON for Rec.709 SDR, Rec.2020 HLG, Rec.2020 PQ, Display P3, and Apple Log candidates.
- Existing import tests pass without requiring old fixtures to provide color metadata.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
