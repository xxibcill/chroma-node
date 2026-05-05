# Phase 21 - Professional Review and Collaboration

## Status

Not started

## Functional Feature Outcome

The user gets professional review workflows for sharing grades, collecting feedback, comparing versions, and delivering client-ready results without leaving Chroma Node.

## Why This Phase Exists

Users pay for tools that help them finish work with other people. Even a single-clip color product becomes more valuable when it supports client review, annotated feedback, version comparison, and deliverable approval. This phase keeps collaboration local-first and file-based at first, then prepares the product for cloud review or team workflows later.

## Scope

- Add grade versions, review snapshots, annotations, and approval states.
- Add exportable review packages with media, stills, scopes, notes, and metadata.
- Add side-by-side compare for versions, references, and client notes.
- Add feedback import from structured review files.
- Add project packaging for handoff, archive, and support diagnostics.

## Tasks

| Task | Summary |
| --- | --- |
| [P21-T1](../tasks/phase-21/p21-t1-grade-versions-and-approval-states.md) | Add version naming, snapshots, approvals, and review status. |
| [P21-T2](../tasks/phase-21/p21-t2-annotations-and-review-notes.md) | Add frame-accurate annotations and review notes. |
| [P21-T3](../tasks/phase-21/p21-t3-review-package-export.md) | Export client review packages with media, stills, notes, and metadata. |
| [P21-T4](../tasks/phase-21/p21-t4-feedback-import-and-resolution.md) | Import structured feedback and track resolution. |
| [P21-T5](../tasks/phase-21/p21-t5-project-handoff-and-archive.md) | Package projects for handoff, archive, diagnostics, and support. |

## Dependencies

- Phase 16 compare and grade-version workflows exist.
- Phase 20 asset packaging patterns are available for safe package export/import.
- Export workflows can produce review-quality files and stills reliably.
- Privacy rules for sharing project/media metadata are defined.

## Exit Criteria

- Users can create named grade versions and mark review status.
- Users can add frame-accurate notes and export a review package.
- Imported feedback links back to frames, versions, and resolution state.
- Project handoff packages can be validated before export and after import.
- Review workflows do not require cloud accounts to be useful.
