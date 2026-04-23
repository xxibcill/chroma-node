import { readFile } from "node:fs/promises";

const requiredFiles = [
  "src/main/exportProject.ts",
  "src/main/exportProject.test.ts",
  "src/shared/ipc.ts",
  "src/shared/project.ts",
  "src/renderer/App.tsx"
];

const requiredPatterns = [
  ["roadmap/phase-06-h264-export.md", "## Status\n\nDone"],
  ["tasks/phase-06/p6-t1-export-job-model.md", "## Status\n\nDone"],
  ["tasks/phase-06/p6-t2-offscreen-render-export.md", "## Status\n\nDone"],
  ["tasks/phase-06/p6-t3-ffmpeg-h264-encode.md", "## Status\n\nDone"],
  ["tasks/phase-06/p6-t4-export-progress-cancel.md", "## Status\n\nDone"],
  ["tasks/phase-06/p6-t5-export-validation.md", "## Status\n\nDone"],
  ["src/main/exportProject.ts", "export function createExportJobSnapshot"],
  ["src/main/exportProject.ts", "export function renderRgbaFrame"],
  ["src/main/exportProject.ts", "\"libx264\""],
  ["src/main/exportProject.ts", "\"yuv420p\""],
  ["src/main/exportProject.ts", "cancelExport"],
  ["src/shared/ipc.ts", "ExportProgress"],
  ["src/renderer/App.tsx", "ExportProgressPanel"]
];

for (const filePath of requiredFiles) {
  await readFile(filePath, "utf8");
}

for (const [filePath, pattern] of requiredPatterns) {
  const contents = await readFile(filePath, "utf8");
  if (!contents.includes(pattern)) {
    throw new Error(`${filePath} is missing required phase 06 marker: ${pattern}`);
  }
}

console.log("Phase 06 implementation markers verified.");
