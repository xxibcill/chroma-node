import { readFile } from "node:fs/promises";

const requiredFiles = [
  "src/renderer/App.tsx",
  "src/renderer/styles.css",
  "src/renderer/scopes/scopeAnalysis.ts",
  "src/renderer/scopes/scopeAnalysis.test.ts",
  "src/renderer/scopes/scopeRender.ts"
];

const requiredPatterns = [
  ["roadmap/phase-04-waveform-and-vectorscope.md", "## Status\n\nDone"],
  ["tasks/phase-04/p4-t1-scope-frame-sampling.md", "## Status\n\nDone"],
  ["tasks/phase-04/p4-t2-waveform-renderer.md", "## Status\n\nDone"],
  ["tasks/phase-04/p4-t3-vectorscope-renderer.md", "## Status\n\nDone"],
  ["tasks/phase-04/p4-t4-scope-update-scheduling.md", "## Status\n\nDone"],
  ["src/renderer/scopes/scopeAnalysis.ts", "export function createGradedScopeFrame"],
  ["src/renderer/scopes/scopeAnalysis.ts", "export function createWaveformHistogram"],
  ["src/renderer/scopes/scopeAnalysis.ts", "export function createVectorscopeHistogram"],
  ["src/renderer/scopes/scopeAnalysis.ts", "export function calculateRec709Luma"],
  ["src/renderer/App.tsx", "const scopeDebounceMs = 50"],
  ["src/renderer/App.tsx", "const playbackScopeIntervalMs = 1000 / 15"],
  ["src/renderer/App.tsx", "scopeRequestId"],
  ["src/renderer/App.tsx", "Waveform"],
  ["src/renderer/App.tsx", "Vectorscope"]
];

for (const filePath of requiredFiles) {
  await readFile(filePath, "utf8");
}

for (const [filePath, pattern] of requiredPatterns) {
  const contents = await readFile(filePath, "utf8");
  if (!contents.includes(pattern)) {
    throw new Error(`${filePath} is missing required phase 04 marker: ${pattern}`);
  }
}

console.log("Phase 04 implementation markers verified.");
