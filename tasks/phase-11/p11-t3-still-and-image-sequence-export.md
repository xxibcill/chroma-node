# [P11-T3] Still And Image Sequence Export

## Status

Not started

## Phase

[Phase 11 - Format and Delivery Expansion](../../roadmap/phase-11-format-and-delivery-expansion.md)

## Outcome

Add still-frame and image-sequence export for inspection and iteration workflows.

## Scope

- Export the current frame as a still image.
- Support image-sequence export for a graded clip.
- Define naming, folder output, and overwrite behavior for sequence exports.

## Implementation Notes

- Still and sequence export should reuse the same color-evaluation path as video export.
- Sequence output needs clear path and cleanup semantics to avoid partial-output confusion.

## Acceptance Criteria

- The user can export a graded still from the current clip.
- The user can export a graded image sequence with deterministic naming.
- Sequence export reports partial-output or overwrite issues clearly.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
