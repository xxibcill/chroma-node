import fs from "node:fs/promises";
import path from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import type { ChromaProject } from "../shared/project.js";
import type { ExportJobResult, ExportSequenceRequest } from "../shared/ipc.js";
import { appError } from "./errors.js";
import { requireFfmpeg, requireFfprobe } from "./ffmpeg.js";
import { runProcess } from "./process.js";
import { computeExportGeometry, computeExportFps } from "./exportPlanning.js";
import { renderRgbaFrame } from "./exportProject.js";
import { sanitizeProject } from "../shared/project.js";

export async function exportSequence(request: ExportSequenceRequest): Promise<ExportJobResult> {
  const ffmpegPath = requireFfmpeg();
  const { project, outputPath, startFrame = 0, endFrame } = request;

  const media = project.media;
  if (!media) {
    throw appError("EXPORT_FAILED", "Export sequence requires imported media.");
  }

  const sanitizedProject = sanitizeProject(project);
  const { width, height } = computeExportGeometry(sanitizedProject.exportSettings, media);
  const { fps, totalFrames } = computeExportFps(media);

  const end = endFrame ?? totalFrames - 1;
  const frameCount = end - startFrame + 1;

  if (frameCount <= 0) {
    throw appError("EXPORT_FAILED", "Export sequence requires at least one frame.", `start=${startFrame}, end=${end}`);
  }

  // Use %04d pattern for sequential output
  const outputPattern = outputPath!.replace("%04d", "%04d").replace(/\.png$/, "-%04d.png");
  const outputDir = path.dirname(outputPath!);

  await fs.mkdir(outputDir, { recursive: true });

  // Decode source and process frame-by-frame
  const sourceWidth = media.displayWidth;
  const sourceHeight = media.displayHeight;
  const sourceFrameSize = sourceWidth * sourceHeight * 4;

  // Spawn ffmpeg to decode raw video
  const decoder = spawnFfmpeg(ffmpegPath, [
    "-hide_banner",
    "-nostdin",
    "-i",
    media.sourcePath,
    "-map",
    `0:${media.videoStreamIndex}`,
    "-an",
    "-sn",
    "-dn",
    "-f",
    "rawvideo",
    "-pix_fmt",
    "rgba",
    "pipe:1"
  ]);

  // Collect stderr for error reporting
  const stderrChunks: Buffer[] = [];
  decoder.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));
  decoder.stdin.end();

  let pending = Buffer.alloc(0);
  let frameIndex = 0;
  let exportedCount = 0;

  try {
    for await (const chunk of decoder.stdout) {
      const chunkBuffer = Buffer.from(chunk);
      pending = pending.length === 0 ? chunkBuffer : Buffer.concat([pending, chunkBuffer]);

      while (pending.length >= sourceFrameSize) {
        if (frameIndex >= startFrame && frameIndex <= end) {
          const sourceFrame = pending.subarray(0, sourceFrameSize);
          pending = pending.subarray(sourceFrameSize);

          // Apply color grading
          const graded = renderRgbaFrame(
            sourceFrame,
            sourceWidth,
            sourceHeight,
            sanitizedProject.nodes,
            frameIndex
          );

          // Write this frame to PNG file
          const frameOutputPath = outputPattern.replace("%04d", String(frameIndex).padStart(4, "0"));
          const tempRaw = `${frameOutputPath}.raw`;
          await fs.writeFile(tempRaw, graded);

          try {
            const result = await runProcess(ffmpegPath, [
              "-hide_banner",
              "-y",
              "-f",
              "rawvideo",
              "-pix_fmt",
              "rgba",
              "-s",
              `${sourceWidth}x${sourceHeight}`,
              "-i",
              tempRaw,
              "-frames:v",
              "1",
              frameOutputPath
            ], { timeoutMs: 10_000 });

            if (result.exitCode !== 0) {
              throw appError("EXPORT_FAILED", `Failed to encode frame ${frameIndex}.`, result.stderr.toString("utf8").trim());
            }
            exportedCount++;
          } finally {
            await fs.rm(tempRaw, { force: true });
          }
        } else {
          pending = pending.subarray(sourceFrameSize);
        }

        frameIndex++;

        if (frameIndex > end) {
          break;
        }
      }
    }
  } finally {
    if (decoder.exitCode === null) {
      decoder.kill("SIGKILL");
    }
  }

  if (pending.length !== 0) {
    // Incomplete frame - this may be expected at end
  }

  // Validate output
  const firstFramePath = outputPattern.replace("%04d", String(startFrame).padStart(4, "0"));
  let actualWidth = width;
  let actualHeight = height;

  try {
    const metadata = await probeImage(firstFramePath);
    actualWidth = metadata.width;
    actualHeight = metadata.height;
  } catch {
    // Use expected dimensions
  }

  return {
    outputPath: outputPattern,
    width: actualWidth,
    height: actualHeight,
    frameCount: exportedCount,
    fps: 0,
    codec: "png",
    container: "image2",
    durationSeconds: exportedCount / fps
  };
}

async function probeImage(imagePath: string): Promise<{ width: number; height: number }> {
  const ffprobePath = requireFfprobe();
  const result = await runProcess(ffprobePath, [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_entries",
    "stream=width,height",
    imagePath
  ], { timeoutMs: 10_000 });

  if (result.exitCode !== 0) {
    throw appError("EXPORT_FAILED", "Could not probe exported image.", result.stderr.toString("utf8").trim());
  }

  try {
    const parsed = JSON.parse(result.stdout.toString("utf8"));
    return {
      width: parsed.streams?.[0]?.width ?? 0,
      height: parsed.streams?.[0]?.height ?? 0
    };
  } catch {
    throw appError("EXPORT_FAILED", "Invalid probe output for image.");
  }
}

function spawnFfmpeg(executable: string, args: string[]): ChildProcessWithoutNullStreams {
  return spawn(executable, args, { stdio: ["pipe", "pipe", "pipe"] });
}
