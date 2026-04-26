# Phase 09 - Flexible Export Geometry

## Status

Not started

## Functional Feature Outcome

The user can export the current grade to source resolution or to preset and custom aspect ratios, with explicit fit, crop, or pad behavior.

## Why This Phase Exists

Supporting more video sizes is only partly an import problem. The app also needs an export model that can deliberately target vertical and social formats without forcing the source raster through a one-size-fits-all pipeline. This phase turns export geometry into a first-class product feature instead of an implicit side effect of source media dimensions.

## Scope

- Extend export settings with output size presets and custom dimensions.
- Support fit, fill/crop, and pad composition behaviors.
- Update export job planning and validation to derive dimensions from export settings.
- Expose export geometry controls in the renderer.
- Add verification coverage for geometry transforms and output metadata.

## Tasks

| Task | Summary |
| --- | --- |
| [P9-T1](../tasks/phase-09/p9-t1-export-settings-schema-and-presets.md) | Add export size presets, custom dimensions, and resize policy to project and IPC models. |
| [P9-T2](../tasks/phase-09/p9-t2-fit-fill-pad-render-pipeline.md) | Implement fit, crop, and pad transforms in the export pipeline. |
| [P9-T3](../tasks/phase-09/p9-t3-export-ui-for-size-and-aspect.md) | Add export controls for social presets and custom dimensions. |
| [P9-T4](../tasks/phase-09/p9-t4-export-validation-and-job-metadata.md) | Validate geometry choices and report final output raster in job status. |
| [P9-T5](../tasks/phase-09/p9-t5-export-geometry-verification.md) | Verify source, portrait, square, crop, and padded export paths. |

## Dependencies

- Phase 08 is complete.
- Export snapshotting and encode progress remain stable.
- The renderer has a trustworthy display-space geometry model.

## Exit Criteria

- The user can choose source, preset, or custom export dimensions.
- Exported outputs honor fit, crop, or pad behavior predictably.
- Progress and results report the final output raster, not only the source raster.
- Verification covers at least one portrait preset, one square preset, one crop case, and one pad case.
