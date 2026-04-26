# Phase 10 - High-Resolution Preview and Performance

## Status

Not started

## Functional Feature Outcome

The user can work with larger clips without the viewer, scopes, and export flow becoming impractically slow or memory-heavy.

## Why This Phase Exists

Once the app stops rejecting larger media, performance becomes the next limiting factor. Larger rasters multiply decode cost, scope sampling cost, tracking cost, and CPU export cost. This phase adds the proxy and profiling work needed to make the new geometry support practical rather than nominal.

## Scope

- Add a preview sizing policy for larger rasters.
- Improve frame extraction, caching, and scope sampling for large media.
- Document and enforce performance budgets.
- Profile export throughput and identify the first acceptable high-resolution target.
- Add fallback behavior when the app cannot sustain full-resolution preview.

## Tasks

| Task | Summary |
| --- | --- |
| [P10-T1](../tasks/phase-10/p10-t1-preview-proxy-policy.md) | Define and implement proxy preview rules for large media. |
| [P10-T2](../tasks/phase-10/p10-t2-frame-decode-and-cache-tuning.md) | Reduce repeated decode cost for playback, stepping, and tracking. |
| [P10-T3](../tasks/phase-10/p10-t3-scope-and-overlay-performance.md) | Tune scope sampling and overlay rendering for larger frame sizes. |
| [P10-T4](../tasks/phase-10/p10-t4-export-throughput-profiling.md) | Measure export throughput and establish practical large-raster targets. |
| [P10-T5](../tasks/phase-10/p10-t5-performance-guardrails-and-docs.md) | Add guardrails, user messaging, and documentation for large-media behavior. |

## Dependencies

- Phases 08 and 09 are complete or sufficiently stable.
- Performance instrumentation from Phase 07 can be extended.
- Representative large-raster samples are available for profiling.

## Exit Criteria

- Larger clips can be previewed through a documented proxy strategy.
- Scopes and overlays remain usable on larger media.
- Export throughput for larger rasters is measured and documented.
- The app surfaces clear fallback behavior when full-resolution preview is not practical.
