# [P15-T1] Scope Engine And Measurement Model

## Status

Not started

## Phase

[Phase 15 - Professional Scopes and Monitoring Suite](../../roadmap/phase-15-professional-scopes-and-monitoring-suite.md)

## Outcome

Build a shared scope engine that can measure source, working, display-rendered, and output pixels with consistent sampling, scaling, and caching.

## Scope

- Define scope measurement spaces: source, input-transformed, working, display-rendered, output, original compare, and graded compare.
- Centralize scope frame sampling, color-management stage selection, cache keys, and playback throttling.
- Add reusable binning, density, scale, grid, guide, and annotation primitives.
- Add scope capability metadata for SDR, HDR, RGB, luma, chroma, gamut, and comparison support.

## Implementation Notes

- Treat scope output as measurement data first and canvas drawing second.
- Make scope cache keys include frame, node graph, color pipeline, measurement space, scale, and sampling policy.
- Keep scope calculation independent from component layout.
- Preserve current waveform/vectorscope behavior as default output-referred measurement.

## Acceptance Criteria

- Existing scopes are migrated onto the shared engine without visual regression.
- Scope measurement space is explicit in data and UI state.
- Playback throttling and large-raster sampling remain configurable.
- Unit tests cover cache keys, measurement-space selection, and basic binning primitives.

## Progress

- [x] Not started
- [x] In progress
- [x] Implemented
- [x] Verified

## Blockers

- Managed pipeline stages must be available before all measurement spaces can be implemented.
