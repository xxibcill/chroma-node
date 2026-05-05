# Phase 13 - Apple Log and Advanced Color Management

## Status

Not started

## Functional Feature Outcome

The user can import Apple Log and other tagged wide-gamut or HDR clips, verify the detected color profile, grade through a predictable managed pipeline, and export correctly tagged Rec.709 SDR output with preview/export parity.

## Why This Phase Exists

Chroma Node currently treats decoded frames as Rec.709 SDR, which keeps the MVP simple but makes log and wide-gamut footage unreliable. Apple Log footage can decode as a normal `.mov`, but without an input transform it looks flat and grading decisions do not match professional color-managed workflows. This phase adds a profile-aware pipeline while preserving the app's learning focus: make source interpretation explicit, keep the math shared between preview and export, and support Apple Log without turning the product into a full ACES/HDR finishing system.

## Scope

- Capture and normalize source color metadata from FFprobe and project files.
- Add project-level color management settings for input, working, output, tone mapping, and gamut handling.
- Implement Apple Log as a BT.2020-primary input profile with a validated Apple Log transfer transform.
- Add common profile support around Rec.709 SDR, Display P3, Rec.2020 HLG/PQ, and linear working transforms where practical.
- Keep creative grading, LUTs, qualifiers, scopes, preview, stills, image sequences, and video export aligned with the managed pipeline.
- Surface detected color metadata, manual overrides, transform warnings, and export metadata in the UI.
- Add parity, metadata, migration, and sample/vector validation coverage.

## Tasks

| Task | Summary |
| --- | --- |
| [P13-T1](../tasks/phase-13/p13-t1-color-metadata-and-profile-model.md) | Capture source color metadata and normalize it into shared profile types. |
| [P13-T2](../tasks/phase-13/p13-t2-project-color-management-settings.md) | Add project-level color-management settings, defaults, migration, and validation. |
| [P13-T3](../tasks/phase-13/p13-t3-apple-log-input-transform.md) | Implement a validated Apple Log input transform into the working pipeline. |
| [P13-T4](../tasks/phase-13/p13-t4-working-output-transforms-and-tone-mapping.md) | Add working/output transforms, tone mapping, and gamut handling for managed grading. |
| [P13-T5](../tasks/phase-13/p13-t5-preview-export-parity-and-output-metadata.md) | Apply the managed pipeline consistently in WebGL preview, CPU export, and output metadata. |
| [P13-T6](../tasks/phase-13/p13-t6-color-management-ui-and-warnings.md) | Add color-management controls, detected-profile display, overrides, and warnings. |
| [P13-T7](../tasks/phase-13/p13-t7-validation-fixtures-docs-and-regression-coverage.md) | Add fixtures, reference validation, docs, and regression tests for color-managed workflows. |

## Dependencies

- The shared color engine remains the single source of truth for grading behavior across preview and export.
- Phase 12 LUT support is stable enough that transform LUTs and creative LUTs can be handled as separate concepts.
- FFprobe color metadata fields are captured reliably enough to detect common Rec.709, Rec.2020, P3, HLG, PQ, and Apple Log source cases.
- Apple Log transfer behavior is sourced from official Apple documentation, an Apple-provided transform, or validated reference material before native math is marked complete.
- Sample media or synthetic vectors are available with clear licensing and expected reference output.

## Exit Criteria

- Apple Log clips can be detected or manually assigned, transformed into a managed working/output path, and exported without the flat untransformed look.
- Existing Rec.709 SDR projects open and export with unchanged default appearance.
- Preview, scopes, still export, image sequence export, and video export use the same color-management decisions.
- Exported SDR files carry explicit Rec.709 color metadata that FFprobe can verify.
- Missing, unknown, or unsupported source metadata produces clear warnings and recoverable manual override options.
- CPU/WebGL parity tests and reference validations cover the Apple Log path and existing Rec.709 identity path.
