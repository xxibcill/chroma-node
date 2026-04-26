import fs from "node:fs/promises";
import path from "node:path";
import type { ExportJobResult, ExportStillRequest } from "../shared/ipc.js";
import { appError } from "./errors.js";
import { requireFfmpeg } from "./ffmpeg.js";
import { runProcess } from "./process.js";
import { renderRgbaFrame } from "./exportProject.js";

export async function exportStill(request: ExportStillRequest): Promise<ExportJobResult> {
  const ffmpegPath = requireFfmpeg();
  const {
    sourcePath,
    outputPath,
    frameIndex = 0,
    timeSeconds,
    nodes,
    width,
    height
  } = request;

  const defaultOutput = sourcePath.replace(/\.[^.\\/]+$/, `-still.png`);
  const output = outputPath ?? defaultOutput;

  await fs.mkdir(path.dirname(output), { recursive: true });

  // Decode one frame from the source
  const seekTime = timeSeconds ?? (frameIndex / 24); // Assume 24fps if not specified
  const decoded = await decodeFrame(ffmpegPath, sourcePath, seekTime, width, height);

  // Apply color grading
  const graded = renderRgbaFrame(
    decoded,
    width,
    height,
    nodes,
    frameIndex
  );

  // Write to PNG
  const tempRaw = `${output}.raw`;
  await fs.writeFile(tempRaw, graded);

  try {
    // Encode RGBA to PNG
    const result = await runProcess(
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
        "-i",
        tempRaw,
        "-frames:v",
        "1",
        output
      ],
      { timeoutMs: 30_000 }
    );

    if (result.exitCode !== 0) {
      throw appError("EXPORT_FAILED", "FFmpeg could not encode the still image.", result.stderr.toString("utf8").trim());
    }

    return {
      outputPath: output,
      width,
      height,
      frameCount: 1,
      fps: 0,
      codec: "png",
      container: "image2",
      durationSeconds: 0
    };
  } finally {
    await fs.rm(tempRaw, { force: true });
  }
}

async function decodeFrame(
  ffmpegPath: string,
  sourcePath: string,
  timeSeconds: number,
  width: number,
  height: number
): Promise<Buffer> {
  const output = await runProcess(
    ffmpegPath,
    [
      "-hide_banner",
      "-y",
      "-ss",
      String(timeSeconds),
      "-i",
      sourcePath,
      "-map",
      "0:v",
      "-an",
      "-sn",
      "-dn",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgba",
      "-s",
      `${width}x${height}`,
      "-frames:v",
      "1",
      "pipe:1"
    ],
    { timeoutMs: 15_000 }
  );

  if (output.exitCode !== 0) {
    throw appError("EXPORT_FAILED", "FFmpeg could not decode the frame.", output.stderr.toString("utf8").trim());
  }

  return output.stdout;
}
