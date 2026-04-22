import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, "tmp", "phase00-verification");
await fs.mkdir(outDir, { recursive: true });

const { getFfmpegDiagnostics } = await import("../dist/main/main/ffmpeg.js");
const { exportSynthetic } = await import("../dist/main/main/exportSynthetic.js");
const { extractFrame } = await import("../dist/main/main/frame.js");
const { probeMedia } = await import("../dist/main/main/mediaProbe.js");

const diagnostics = await getFfmpegDiagnostics();
if (!diagnostics.available) {
  throw new Error(`FFmpeg diagnostics failed: ${diagnostics.errors.map((error) => error.message).join("; ")}`);
}

const outputPath = path.join(outDir, `synthetic-${Date.now()}-${process.pid}.mp4`);
const exportResult = await exportSynthetic({
  outputPath,
  width: 160,
  height: 90,
  frameCount: 12,
  fps: 24
});

const stat = await fs.stat(outputPath);
if (!stat.isFile() || stat.size === 0) {
  throw new Error("Synthetic export did not create a non-empty MP4.");
}

const metadata = await probeMedia(outputPath);
if (metadata.codec !== "h264" || metadata.width !== 160 || metadata.height !== 90) {
  throw new Error(`Unexpected export metadata: ${JSON.stringify(metadata)}`);
}

if ((metadata.totalFrames ?? 0) < 12) {
  throw new Error(`Expected at least 12 frames, got ${metadata.totalFrames ?? "unknown"}.`);
}

const frame = await extractFrame({ sourcePath: outputPath, timeSeconds: 0, maxWidth: 160 });
if (frame.mimeType !== "image/png" || !frame.dataUrl.startsWith("data:image/png;base64,")) {
  throw new Error("Frame extraction did not return a PNG data URL.");
}

await fs.access(path.join(root, "dist", "main", "main", "main.js"));
await fs.access(path.join(root, "dist", "main", "preload", "preload.js"));
await fs.access(path.join(root, "dist", "renderer", "index.html"));

console.log(
  [
    "Phase 00 verification passed.",
    `ffmpeg: ${diagnostics.ffmpegPath}`,
    `ffprobe: ${diagnostics.ffprobePath}`,
    `export: ${exportResult.outputPath}`,
    `temp: ${os.tmpdir()}`
  ].join("\n")
);
