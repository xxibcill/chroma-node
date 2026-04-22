import fs from "node:fs/promises";
import path from "node:path";
import type { ExportJobResult, ExportSyntheticRequest } from "../shared/ipc.js";
import { appError } from "./errors.js";
import { defaultExportPath, requireFfmpeg, requireFfprobe } from "./ffmpeg.js";
import { probeMedia } from "./mediaProbe.js";
import { runProcess } from "./process.js";

export async function exportSynthetic(request: ExportSyntheticRequest = {}): Promise<ExportJobResult> {
  const width = clampInteger(request.width ?? 320, 64, 1920);
  const height = clampInteger(request.height ?? 180, 64, 1080);
  const frameCount = clampInteger(request.frameCount ?? 48, 1, 600);
  const fps = clampInteger(request.fps ?? 24, 1, 60);
  const outputPath = request.outputPath ?? defaultExportPath();

  requireFfprobe();
  const ffmpegPath = requireFfmpeg();
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.rm(outputPath, { force: true });

  const frames = createRgbaFrameSequence(width, height, frameCount);
  const output = await runProcess(
    ffmpegPath,
    [
      "-hide_banner",
      "-y",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgba",
      "-s",
      `${width}x${height}`,
      "-r",
      String(fps),
      "-i",
      "pipe:0",
      "-an",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      outputPath
    ],
    { input: frames, timeoutMs: 30_000 }
  );

  if (output.exitCode !== 0) {
    throw appError("EXPORT_FAILED", "FFmpeg could not encode the synthetic MP4.", output.stderr.toString("utf8").trim());
  }

  const metadata = await probeMedia(outputPath);
  return {
    outputPath,
    width: metadata.width,
    height: metadata.height,
    frameCount: metadata.totalFrames ?? frameCount,
    fps: metadata.frameRate || fps,
    codec: metadata.codec,
    durationSeconds: metadata.durationSeconds
  };
}

export function createRgbaFrameSequence(width: number, height: number, frameCount: number): Buffer {
  const frameSize = width * height * 4;
  const buffer = Buffer.alloc(frameSize * frameCount);

  for (let frame = 0; frame < frameCount; frame += 1) {
    const progress = frameCount === 1 ? 0 : frame / (frameCount - 1);
    const blockX = Math.round(progress * (width - 1));

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = frame * frameSize + (y * width + x) * 4;
        const luma = Math.round((x / Math.max(1, width - 1)) * 220 + 18);
        const chroma = Math.round((y / Math.max(1, height - 1)) * 190 + 28);
        const marker = Math.abs(x - blockX) < Math.max(2, width * 0.02) ? 255 : 0;

        buffer[offset] = Math.max(luma, marker);
        buffer[offset + 1] = chroma;
        buffer[offset + 2] = Math.round(210 - progress * 120);
        buffer[offset + 3] = 255;
      }
    }
  }

  return buffer;
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, Math.round(value)));
}
