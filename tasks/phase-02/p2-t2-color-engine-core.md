# P2-T2 Color Engine Core

## Status

Done

## Phase

[Phase 02 - Color Engine and Serial Nodes](../../roadmap/phase-02-color-engine-and-serial-nodes.md)

## Outcome

A standalone color engine validates node graphs, evaluates a CPU reference path, and generates WebGL shader code.

## Scope

- Create color engine module.
- Implement primary correction math.
- Implement serial node evaluation.
- Implement CPU reference evaluator for tests.
- Generate GLSL for max 3 serial nodes.

## Implementation Notes

- Keep engine independent of React.
- Apply primary operations in the PRD-defined order.
- Use Rec.709 luma coefficients.

## Acceptance Criteria

- Neutral graph returns unchanged pixels.
- Disabled node passes input through unchanged.
- CPU and shader outputs match within tolerance on test frames.
- Shader generation handles 1, 2, and 3 nodes.

## Progress

- [x] Not started
- [x] In progress
- [x] Implemented
- [x] Verified

## Blockers

- None
