# [P17-T1] Deepen Color Rendering Module

## Status

Not started

## Phase

[Phase 17 - Architecture and Quality Foundation](../../roadmap/phase-17-architecture-and-quality-foundation.md)

## Outcome

Create a deeper color/rendering pipeline boundary that keeps CPU export, WebGL preview, color management, LUTs, tone mapping, and shader generation aligned through one explicit contract.

## Scope

- Identify the public pipeline inputs and outputs needed by preview, export, scopes, and parity tests.
- Move color pipeline resolution out of scattered call sites and into a shared module boundary.
- Keep CPU pixel evaluation and generated GLSL behavior parity-safe.
- Separate data model types, sanitization, pipeline resolution, LUT handling, color management, and shader generation into clearer ownership areas.
- Preserve current Rec.709 SDR behavior while supporting planned Apple Log, HDR, ACES/OCIO-style, and LUT expansion.

## Implementation Notes

- Current hotspots include `src/shared/colorEngine.ts`, `src/renderer/webgl/FrameRenderer.ts`, and `src/main/exportProject.ts`.
- Treat this as an in-process dependency refactor: no new runtime service is needed.
- Prefer boundary tests that assert observable rendered color behavior instead of tests coupled to internal helper layout.
- Keep old parity tests passing throughout the migration, then replace shallow helper tests only when equivalent boundary coverage exists.

## Acceptance Criteria

- Preview and export resolve color management and source metadata through the same pipeline contract.
- CPU and shader parity tests cover at least neutral grade, primary correction, qualifier/window masking, curves, transfer decoding/encoding, tone mapping, and gamut conversion paths.
- `FrameRenderer` no longer reconstructs color pipeline decisions that already exist in shared code.
- `exportProject` no longer owns low-level color management decisions beyond passing source metadata and project settings to the pipeline.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None

