import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, "tmp", "phase01-verification");
await fs.mkdir(outDir, { recursive: true });

const { appError, isAppError } = await import("../dist/main/main/errors.js");
const { exportSynthetic } = await import("../dist/main/main/exportSynthetic.js");
const { extractFrame } = await import("../dist/main/main/frame.js");
const { mapProbeOutput, probeMedia } = await import("../dist/main/main/mediaProbe.js");

const outputPath = path.join(outDir, `phase01-${Date.now()}-${process.pid}.mp4`);
await exportSynthetic({
  outputPath,
  width: 160,
  height: 90,
  frameCount: 16,
  fps: 24
});

const media = await probeMedia(outputPath);
if (media.width !== 160 || media.height !== 90 || media.codec !== "h264") {
  throw new Error(`Supported H.264 MP4 did not probe correctly: ${JSON.stringify(media)}`);
}

if (!media.totalFrames || media.totalFrames < 16) {
  throw new Error(`Expected at least 16 frames, got ${media.totalFrames ?? "unknown"}.`);
}

const firstFrame = await extractFrame({ sourcePath: outputPath, frameIndex: 0, maxWidth: 160 });
const lastFrame = await extractFrame({ sourcePath: outputPath, frameIndex: 15, maxWidth: 160 });
for (const frame of [firstFrame, lastFrame]) {
  if (frame.mimeType !== "image/png" || !frame.dataUrl.startsWith("data:image/png;base64,")) {
    throw new Error("Exact frame extraction did not return a PNG data URL.");
  }
}

expectAppError(() =>
  mapProbeOutput("/clips/oversized.mp4", {
    streams: [
      {
        index: 0,
        codec_type: "video",
        codec_name: "h264",
        width: 3840,
        height: 2160,
        duration: "1.0",
        avg_frame_rate: "24/1"
      }
    ],
    format: { format_name: "mp4", duration: "1.0" }
  })
);

expectAppError(() =>
  mapProbeOutput("/clips/audio-only.mov", {
    streams: [{ index: 0, codec_type: "audio", codec_name: "aac" }],
    format: { format_name: "mov", duration: "1.0" }
  })
);

const unsupportedPath = path.join(outDir, "unsupported.m4v");
await fs.writeFile(unsupportedPath, "");
await expectAsyncAppError(() => probeMedia(unsupportedPath));

await fs.access(path.join(root, "dist", "main", "main", "main.js"));
await fs.access(path.join(root, "dist", "main", "preload", "preload.js"));
await fs.access(path.join(root, "dist", "renderer", "index.html"));

console.log(
  [
    "Phase 01 verification passed.",
    `import: ${media.fileName}`,
    `frames: ${media.totalFrames ?? "unknown"}`,
    `viewer decode: first and last frames`,
    `temp: ${os.tmpdir()}`
  ].join("\n")
);

function expectAppError(fn) {
  try {
    fn();
  } catch (error) {
    if (isAppError(error)) {
      return;
    }

    throw error;
  }

  throw appError("UNKNOWN", "Expected operation to fail with an AppError.");
}

async function expectAsyncAppError(fn) {
  try {
    await fn();
  } catch (error) {
    if (isAppError(error)) {
      return;
    }

    throw error;
  }

  throw appError("UNKNOWN", "Expected async operation to fail with an AppError.");
}
