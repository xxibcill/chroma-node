# Phase 18 - Guided Learning and Creator Workflows

## Status

Not started

## Functional Feature Outcome

The user gets a guided color-learning workstation that turns Chroma Node from a tool into a repeatable path for learning, practicing, and producing better grades.

## Why This Phase Exists

A technically strong color app can still fail commercially if users do not reach value quickly. Chroma Node's strongest market opening is not competing feature-for-feature with mature professional suites, but making professional color concepts teachable, visible, and repeatable. This phase adds structured lessons, guided practice, explainable controls, grade recipes, and progress loops so new users understand what to do next and advanced users can build repeatable workflows.

## Scope

- Add first-run onboarding that imports sample media and lands users in a useful grading workflow.
- Add guided lessons for exposure balance, white balance, skin tone, contrast, secondaries, tracking, scopes, and export checks.
- Add grade recipes that apply structured node setups without hiding the underlying controls.
- Add practice projects with target references, measurable scope goals, and before/after review.
- Add progress tracking for completed lessons, user-created looks, and exported practice results.

## Tasks

| Task | Summary |
| --- | --- |
| [P18-T1](../tasks/phase-18/p18-t1-first-run-sample-projects.md) | Add first-run sample projects and a guided import path. |
| [P18-T2](../tasks/phase-18/p18-t2-interactive-color-lessons.md) | Build interactive lessons for core color workflows. |
| [P18-T3](../tasks/phase-18/p18-t3-grade-recipes-and-node-starters.md) | Add transparent grade recipes and node starter setups. |
| [P18-T4](../tasks/phase-18/p18-t4-practice-targets-and-scope-goals.md) | Add practice targets with measurable scope and image goals. |
| [P18-T5](../tasks/phase-18/p18-t5-learning-progress-and-review.md) | Track learning progress, practice history, and review outcomes. |

## Dependencies

- Phase 16 workstation shell supports guided states without crowding the viewer.
- Phase 15 scopes expose stable measurement data for lesson validation.
- Project save/load can store lesson progress and recipe metadata safely.
- Sample media licensing and distribution policy are resolved.

## Exit Criteria

- A new user can open the app, load a sample project, complete a guided exposure and white-balance lesson, and export a result.
- Lessons use real app controls instead of detached tutorial screens.
- Grade recipes create inspectable node states that users can modify normally.
- Practice goals can be measured with existing scopes and comparison tools.
- Progress state survives app restart without corrupting normal project files.
