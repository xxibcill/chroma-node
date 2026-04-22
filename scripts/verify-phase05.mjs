import { readFile } from "node:fs/promises";

const requiredFiles = [
  "src/shared/colorEngine.ts",
  "src/shared/project.ts",
  "src/renderer/App.tsx",
  "src/renderer/webgl/FrameRenderer.ts",
  "src/renderer/tracking/templateTracker.ts",
  "src/renderer/tracking/templateTracker.test.ts"
];

const requiredPatterns = [
  ["roadmap/phase-05-translation-tracking.md", "## Status\n\nDone"],
  ["tasks/phase-05/p5-t1-tracking-data-model.md", "## Status\n\nDone"],
  ["tasks/phase-05/p5-t2-frame-access-for-tracking.md", "## Status\n\nDone"],
  ["tasks/phase-05/p5-t3-template-matching-tracker.md", "## Status\n\nDone"],
  ["tasks/phase-05/p5-t4-tracking-ui-and-progress.md", "## Status\n\nDone"],
  ["tasks/phase-05/p5-t5-tracked-window-playback.md", "## Status\n\nDone"],
  ["src/shared/colorEngine.ts", "export interface TrackingKeyframe"],
  ["src/shared/colorEngine.ts", "export function resolveTrackedPowerWindows"],
  ["src/shared/colorEngine.ts", "export function invalidateTrackingForWindow"],
  ["src/renderer/tracking/templateTracker.ts", "export function matchTranslation"],
  ["src/renderer/tracking/templateTracker.ts", "export class TrackingFailure"],
  ["src/renderer/App.tsx", "const runWindowTracking"],
  ["src/renderer/App.tsx", "Track Forward"],
  ["src/renderer/App.tsx", "Track Back"],
  ["src/renderer/webgl/FrameRenderer.ts", "setCurrentFrame"]
];

for (const filePath of requiredFiles) {
  await readFile(filePath, "utf8");
}

for (const [filePath, pattern] of requiredPatterns) {
  const contents = await readFile(filePath, "utf8");
  if (!contents.includes(pattern)) {
    throw new Error(`${filePath} is missing required phase 05 marker: ${pattern}`);
  }
}

console.log("Phase 05 implementation markers verified.");
