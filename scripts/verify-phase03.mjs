import { readFile } from "node:fs/promises";

const requiredFiles = [
  "src/shared/colorEngine.ts",
  "src/shared/colorEngine.test.ts",
  "src/shared/project.test.ts",
  "src/renderer/App.tsx",
  "src/renderer/webgl/FrameRenderer.ts"
];

const requiredPatterns = [
  ["roadmap/phase-03-qualifier-and-power-windows.md", "## Status\n\nDone"],
  ["tasks/phase-03/p3-t1-hsl-qualifier-engine.md", "## Status\n\nDone"],
  ["tasks/phase-03/p3-t2-qualifier-ui-and-matte.md", "## Status\n\nDone"],
  ["tasks/phase-03/p3-t3-power-window-engine.md", "## Status\n\nDone"],
  ["tasks/phase-03/p3-t4-window-overlay-editor.md", "## Status\n\nDone"],
  ["tasks/phase-03/p3-t5-mask-composition-tests.md", "## Status\n\nDone"],
  ["src/shared/colorEngine.ts", "export function evaluateQualifierMask"],
  ["src/shared/colorEngine.ts", "export function evaluatePowerWindowMask"],
  ["src/shared/colorEngine.ts", "export function evaluateNodeMask"],
  ["src/shared/colorEngine.ts", "uMatteNodeIndex"],
  ["src/renderer/App.tsx", "Show Matte"],
  ["src/renderer/App.tsx", "WindowOverlay"],
  ["src/renderer/webgl/FrameRenderer.ts", "setMatteNode"]
];

for (const filePath of requiredFiles) {
  await readFile(filePath, "utf8");
}

for (const [filePath, pattern] of requiredPatterns) {
  const contents = await readFile(filePath, "utf8");
  if (!contents.includes(pattern)) {
    throw new Error(`${filePath} is missing required phase 03 marker: ${pattern}`);
  }
}

console.log("Phase 03 implementation markers verified.");
