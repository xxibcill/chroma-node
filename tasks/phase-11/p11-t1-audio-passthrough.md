# [P11-T1] Audio Passthrough

## Status

Not started

## Phase

[Phase 11 - Format and Delivery Expansion](../../roadmap/phase-11-format-and-delivery-expansion.md)

## Outcome

Preserve compatible source audio during export.

## Scope

- Detect when source audio can be copied or remuxed safely.
- Extend export configuration and reporting for audio behavior.
- Preserve current video-only fallback when passthrough is not possible.

## Implementation Notes

- Start with passthrough before considering audio re-encode or editing features.
- Audio handling should remain explicit so the user knows whether export is silent or retained.

## Acceptance Criteria

- Compatible source audio can be preserved in export.
- Export results report whether audio was retained.
- Unsupported audio cases fall back predictably and clearly.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
