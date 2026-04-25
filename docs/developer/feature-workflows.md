# Feature Workflows

This guide is about making changes safely.

## Workflow 1: Add A New Grading Parameter

Example: imagine adding a new per-node scalar control.

### Files you will likely touch

- `src/shared/colorEngine.ts`
- `src/renderer/App.tsx`
- `src/renderer/webgl/FrameRenderer.ts`
- `src/shared/project.ts` only if persistence shape changes
- tests in `src/shared/` and `src/renderer/`

### Order of work

1. Add the parameter to the shared type and default/sanitize paths.
2. Update CPU evaluation in `applyPrimaryCorrection()` or the relevant engine function.
3. Update shader generation and uniform upload.
4. Add renderer controls.
5. Add or update parity tests.

### Why this order matters

The shared engine is the source of truth. If you start in the UI, it is easy to produce a control that preview understands but export ignores.

### Extra Checks

- Does the new parameter need to participate in project serialization?
- Does it affect qualifier or window behavior, or only primaries?
- Does the shader uniform layout still match the CPU evaluator?
- Does the neutral/default value truly behave as a no-op?

## Workflow 2: Add A New Cross-Process Operation

Example: a new “analyze clip” action.

### Files you will likely touch

- `src/shared/ipc.ts`
- `src/preload/preload.cts`
- `src/main/ipc.ts`
- one or more `src/main/*.ts` implementation files
- `src/renderer/App.tsx` or another renderer caller

### Order of work

1. Define request/response types in `src/shared/ipc.ts`.
2. Expose the new method in preload.
3. Register the handler in the main process.
4. Implement the actual main-process behavior.
5. Call it from the renderer.

### Rule

Do not bypass the contract with ad hoc IPC strings in the renderer. Keep the shared type definitions authoritative.

## Workflow 3: Change Project Persistence

Example: adding a new field to node tracking data.

### Files you will likely touch

- `src/shared/project.ts`
- `src/shared/colorEngine.ts`
- tests around project validation and serialization

### Checklist

- give the field a safe default
- sanitize loaded values
- think about old JSON files
- confirm save and load round-trip
- decide whether invalid data should clamp, default, truncate, or fail

### Practical Tip

When in doubt, be more explicit in validation code than more clever. Persistence bugs are expensive because they survive across sessions.

## Workflow 4: Change Tracking Behavior

Example: tuning confidence or search radius.

### Files you will likely touch

- `src/renderer/tracking/templateTracker.ts`
- `src/renderer/App.tsx`
- tracking tests

### Watch-outs

- tracker output feeds project data, not just live UI state
- low-confidence behavior matters more than the happy path
- changing pixel-space thresholds may have different effects at different resolutions

### Additional Questions

- Are you changing search behavior, confidence scoring, or failure semantics?
- Will existing tests still be meaningful at the new threshold?
- Does the change need UI messaging updates when tracking fails?

## Workflow 5: Change Scope Behavior

### Files you will likely touch

- `src/renderer/scopes/scopeAnalysis.ts`
- `src/renderer/scopes/scopeRender.ts`
- `src/renderer/App.tsx`

### Rule

Scopes should sample the graded frame consistently. If you change their math, be explicit about whether the change is about measurement accuracy, rendering style, or performance.

### Additional Questions

- Are you changing the measurement itself or only the visualization?
- Are you still using the same color standard assumptions?
- Is the scope update cadence still appropriate during playback?

## A Small Real Example: Trace A Grade Through The System

Suppose the user changes saturation in the UI.

The flow is:

1. `App.tsx` updates the active node in React state.
2. The node graph is passed to `FrameRenderer`.
3. `FrameRenderer` uploads the updated saturation uniform.
4. The preview shader uses that value during interactive rendering.
5. If the user exports, `exportProject.ts` uses the same node data.
6. `evaluateNodeGraph()` applies the same conceptual saturation logic on CPU.

That is the main pattern in this project: edit shared model once, consume it in multiple runtimes.

## Tests To Prefer

When changing core behavior, prefer:

- shared-engine unit tests for math
- parity tests for preview/export agreement
- renderer tests for playback or tracking orchestration
- main-process tests for media validation and export lifecycle

## Review Checklist For Large Changes

Before merging a significant feature, review:

- architecture boundary correctness
- project schema impact
- preview/export parity
- normalized coordinate usage
- FFmpeg/process lifecycle implications
- failure handling and error messaging
- documentation updates in `docs/developer/`

## Questions To Ask Before You Merge A Change

1. Does preview still match export?
2. Does the project JSON still load safely?
3. Did I put the logic in the lowest sensible layer?
4. Is the behavior resolution-independent where it should be?
5. Did I update docs or tests for the new concept?

## Learn More

Use [Architecture](./architecture.md) and [Video Editing and Color Theory](./video-editing-and-color-theory.md) together when planning non-trivial features.
