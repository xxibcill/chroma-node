# Phase 15 - Professional Scopes and Monitoring Suite

## Status

Not started

## Functional Feature Outcome

The user gets a comprehensive monitoring suite with waveform, parade, vectorscope, histogram, CIE, gamut, HDR exposure, false-color, clipping, and comparison scopes that can inspect source, managed working data, and final output.

## Why This Phase Exists

Chroma Node already has basic waveform, vectorscope, histogram, and RGB parade support, but advanced color management needs scopes that understand color spaces, transfer functions, HDR scales, gamut limits, and comparison workflows. "All scopes" should not mean a cluttered drawer of novelty views; it should mean a disciplined scope engine where every measurement answers a grading question, shares sampling logic, and stays performant during playback.

## Scope

- Build a reusable scope engine with explicit measurement spaces, sampling policy, scale options, and cache behavior.
- Add the professional waveform, parade, vectorscope, histogram, CIE, gamut, false-color, clipping, and HDR exposure families.
- Add source/working/output inspection modes so color-managed footage can be diagnosed at the right pipeline stage.
- Add configurable scope layouts, presets, capture, freeze, overlays, intensity, zoom, and comparison modes.
- Keep scope performance predictable on large rasters and during playback.
- Add deterministic tests and reference images for each supported scope family.

## Tasks

| Task | Summary |
| --- | --- |
| [P15-T1](../tasks/phase-15/p15-t1-scope-engine-and-measurement-model.md) | Build the shared scope engine, measurement-space model, and sampling policy. |
| [P15-T2](../tasks/phase-15/p15-t2-waveform-family.md) | Add luma, RGB, YRGB overlay, YCbCr, HDR, and line-select waveform variants. |
| [P15-T3](../tasks/phase-15/p15-t3-parade-family.md) | Add RGB, YRGB, YCbCr, channel, and HDR parade variants. |
| [P15-T4](../tasks/phase-15/p15-t4-vectorscope-and-chroma-tools.md) | Add advanced vectorscope modes, skin-tone guides, targets, and chroma diagnostics. |
| [P15-T5](../tasks/phase-15/p15-t5-histogram-levels-and-distribution-scopes.md) | Add RGB, luma, log, cumulative, zone, and channel distribution scopes. |
| [P15-T6](../tasks/phase-15/p15-t6-cie-gamut-and-3d-color-visualization.md) | Add CIE, gamut boundary, gamut warning, and 3D color-volume visualization. |
| [P15-T7](../tasks/phase-15/p15-t7-exposure-false-color-and-clipping-monitors.md) | Add false color, zebras, range check, clipping, and HDR nit monitors. |
| [P15-T8](../tasks/phase-15/p15-t8-scope-layouts-performance-and-validation.md) | Add layouts, presets, freeze/capture, performance controls, and validation coverage. |

## Dependencies

- Phase 13/14 color-management stages are explicit enough for scopes to choose source, working, display, or output measurements.
- Existing scope analysis/rendering code can be extended or refactored without breaking current waveform, vectorscope, histogram, and parade behavior.
- Performance sampling policies from Phase 10 remain available for large-raster playback.
- UI shell work can provide enough space and interaction affordances for multiple scopes without overwhelming the viewer.

## Exit Criteria

- Users can switch between common professional scope families without losing playback responsiveness.
- Each scope declares whether it is measuring source, working, display-rendered, or output pixels.
- HDR and wide-gamut footage can be monitored with appropriate scales and warnings.
- Scope layouts support compact, stacked, side-by-side, full-height, and focused inspection workflows.
- Every scope family has deterministic binning/rendering tests and representative visual validation.
