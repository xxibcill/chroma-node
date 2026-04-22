# Phase 07 - Hardening and Packaging

## Functional Feature Outcome

The MVP is reliable enough for a solo developer to use end-to-end, with undo/redo, test coverage, clear errors, and a packaged desktop build.

## Why This Phase Exists

After the core feature loop works, the app needs reliability work before it can serve as a practical learning tool. This phase focuses on protecting user work, making failures understandable, proving performance targets, and packaging the app for real local use.

## Scope

- Add undo/redo for grading operations.
- Harden project relinking and validation.
- Add automated tests for color, masks, tracking, and export.
- Profile performance targets.
- Package the desktop app.
- Prepare MVP release notes.

## Tasks

| Task | Summary |
| --- | --- |
| [P7-T1](../tasks/phase-07/p7-t1-undo-redo.md) | Add undo and redo for grading, nodes, qualifier, windows, and tracking edits. |
| [P7-T2](../tasks/phase-07/p7-t2-error-handling-and-relink.md) | Harden errors, project repair, and missing-media relink. |
| [P7-T3](../tasks/phase-07/p7-t3-automated-test-suite.md) | Add unit, integration, Playwright, and golden-frame tests. |
| [P7-T4](../tasks/phase-07/p7-t4-performance-pass.md) | Measure and tune performance against MVP targets. |
| [P7-T5](../tasks/phase-07/p7-t5-packaging-and-release.md) | Package the app and document MVP limitations. |

## Dependencies

- Phases 00 through 06 are complete.
- Representative supported and unsupported media test files are available.
- Packaging target platform is decided.

## Exit Criteria

- MVP workflows pass end-to-end verification.
- Errors are structured and user-facing messages are actionable.
- Performance targets are measured and documented.
- The app can be packaged and launched outside the development environment.

