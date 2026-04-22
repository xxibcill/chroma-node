# Phase 02 - Color Engine and Serial Nodes

## Functional Feature Outcome

The user can apply primary corrections through up to 3 serial nodes and see deterministic graded output in the viewer.

## Why This Phase Exists

The node graph and color engine are the core learning value of the app. This phase builds the internal image-processing model, separates it from UI state, and establishes shader parity rules that later qualifier, window, scope, and export work can reuse.

## Scope

- Implement the project data model for nodes and primary corrections.
- Create a standalone color engine module.
- Support max 3 serial nodes.
- Add primary correction controls.
- Generate and run WebGL shaders for the node graph.
- Save and load project JSON.

## Tasks

| Task | Summary |
| --- | --- |
| [P2-T1](../tasks/phase-02/p2-t1-project-schema-and-state.md) | Define project schema, defaults, validation, and app state. |
| [P2-T2](../tasks/phase-02/p2-t2-color-engine-core.md) | Build color engine defaults, validation, CPU reference, and shader generation. |
| [P2-T3](../tasks/phase-02/p2-t3-node-graph-ui.md) | Add max 3 serial nodes with select, add, delete, rename, reset, and bypass. |
| [P2-T4](../tasks/phase-02/p2-t4-primary-controls.md) | Implement lift, gamma, gain, offset, contrast, pivot, saturation, temperature, and tint controls. |
| [P2-T5](../tasks/phase-02/p2-t5-project-save-load.md) | Save and reopen project JSON without embedding media. |

## Dependencies

- Phase 01 is complete.
- Viewer can display original and graded paths.
- WebGL frame renderer is stable enough for shader iteration.

## Exit Criteria

- A 3-node serial graph evaluates in order.
- Disabling a node passes input through unchanged.
- Neutral node values produce no visual change.
- Preview shader and CPU reference match within the agreed tolerance on test frames.
- Project JSON round-trips without losing node settings.

