import { readFile } from "node:fs/promises";

const requiredFiles = [
  "src/shared/project.ts",
  "src/shared/colorEngine.ts",
  "src/shared/project.test.ts",
  "src/shared/colorEngine.test.ts",
  "src/main/projectFile.ts"
];

const requiredPatterns = [
  ["roadmap/phase-02-color-engine-and-serial-nodes.md", "## Status\n\nDone"],
  ["tasks/phase-02/p2-t1-project-schema-and-state.md", "## Status\n\nDone"],
  ["tasks/phase-02/p2-t2-color-engine-core.md", "## Status\n\nDone"],
  ["tasks/phase-02/p2-t3-node-graph-ui.md", "## Status\n\nDone"],
  ["tasks/phase-02/p2-t4-primary-controls.md", "## Status\n\nDone"],
  ["tasks/phase-02/p2-t5-project-save-load.md", "## Status\n\nDone"],
  ["src/shared/colorEngine.ts", "export const MAX_SERIAL_NODES = 3"],
  ["src/shared/colorEngine.ts", "export function generateColorFragmentShader"],
  ["src/shared/project.ts", "export const PROJECT_SCHEMA_VERSION = \"1.0.0\""],
  ["src/renderer/App.tsx", "Add Node"],
  ["src/renderer/App.tsx", "Save"],
  ["src/renderer/webgl/FrameRenderer.ts", "setNodeGraph"]
];

for (const filePath of requiredFiles) {
  await readFile(filePath, "utf8");
}

for (const [filePath, pattern] of requiredPatterns) {
  const contents = await readFile(filePath, "utf8");
  if (!contents.includes(pattern)) {
    throw new Error(`${filePath} is missing required phase 02 marker: ${pattern}`);
  }
}

console.log("Phase 02 implementation markers verified.");
