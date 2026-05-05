# Phase 14 - Ultimate Color Management Expansion

## Status

Not started

## Functional Feature Outcome

The user gets a professional-grade color-management system with camera log profiles, ACES/OCIO-style workflows, HDR handling, display simulation, LUT management, and export conformance checks while preserving the app's inspectable learning model.

## Why This Phase Exists

Phase 13 establishes Apple Log and a managed pipeline foundation, but serious color workflows need broader source interpretation, display rendering, technical transform management, HDR awareness, and delivery validation. This phase turns color management from a narrow Apple Log feature into an extensible color-science spine for the whole application. The goal is not to clone every finishing-suite feature at once; it is to build an architecture where each profile, transform, display, scope, and export path has an explicit place in the pipeline and can be tested.

## Scope

- Add a profile and transform registry for camera, working, display, and delivery color spaces.
- Support major camera log families through validated input transforms.
- Add ACES/OCIO-compatible workflow concepts without making OCIO installation mandatory for the first pass.
- Support SDR, HDR PQ, HDR HLG, wide-gamut, display simulation, and technical LUT workflows.
- Separate technical transforms from creative grading nodes and creative LUTs.
- Add delivery validation for pixel transform, metadata tags, gamut, range, and HDR mastering assumptions.
- Document supported profiles, unsupported workflows, and required validation sources.

## Tasks

| Task | Summary |
| --- | --- |
| [P14-T1](../tasks/phase-14/p14-t1-profile-registry-and-transform-graph.md) | Build an explicit registry for source, working, display, and delivery transforms. |
| [P14-T2](../tasks/phase-14/p14-t2-camera-log-input-transform-library.md) | Add validated camera log input transforms beyond Apple Log. |
| [P14-T3](../tasks/phase-14/p14-t3-aces-and-ocio-compatible-workflows.md) | Add ACES/OCIO-style workflow concepts and optional OCIO integration points. |
| [P14-T4](../tasks/phase-14/p14-t4-hdr-wide-gamut-and-display-rendering.md) | Add HDR, wide-gamut, output transform, and display-rendering support. |
| [P14-T5](../tasks/phase-14/p14-t5-technical-lut-management.md) | Add technical LUT management, interpolation policy, validation, and portability. |
| [P14-T6](../tasks/phase-14/p14-t6-display-simulation-and-calibration-awareness.md) | Add display simulation, viewing-condition presets, and calibration-aware warnings. |
| [P14-T7](../tasks/phase-14/p14-t7-delivery-conformance-and-metadata-validation.md) | Validate export pixels and metadata against selected delivery intent. |
| [P14-T8](../tasks/phase-14/p14-t8-color-science-reference-validation.md) | Add reference vectors, tolerances, and parity coverage for every supported transform. |

## Dependencies

- Phase 13 managed pipeline, metadata model, Apple Log path, and CPU/WebGL parity rules are implemented.
- External transform sources are available with licensing and provenance clear enough for implementation and tests.
- Export paths can set and verify color metadata through FFmpeg/FFprobe.
- UI architecture can expose advanced settings without breaking the default Rec.709 workflow.

## Exit Criteria

- Users can choose a source, working, display, and delivery path from a validated profile matrix.
- Supported camera log footage transforms through technical input handling before creative grading.
- SDR and HDR outputs are explicitly tagged, validated, and explained in the export summary.
- Technical LUTs and creative LUTs have separate lifecycle, ordering, and validation rules.
- Unsupported profile combinations fail with clear warnings instead of silent Rec.709 fallback.
- Every supported transform has CPU/WebGL parity and reference-vector coverage.
