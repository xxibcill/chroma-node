import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import type { Writable } from "node:stream";
import type {
  AppError,
  ExportJobResult,
  ExportProgress,
  ExportProjectRequest,
  ExportQuality
} from "../shared/ipc.js";
import { evaluateNodeGraph, normalizeNodeGraph, resolveTrackedNode, type ColorNode } from "../shared/colorEngine.js";
import { sanitizeProject } from "../shared/project.js";
import { createExportJobSnapshot, type ExportJobSnapshot } from "./exportPlanning.js";
import { appError, isAppError } from "./errors.js";
import { requireFfmpeg, requireFfprobe, getFfmpegDiagnostics } from "./ffmpeg.js";
import { runProcess } from "./process.js";
import { computeProfileResult, createProfilingTimers, formatProfileReport, type ProfilingTimers } from "./exportProfiling.js";

type ProgressListener = (progress: ExportProgress) => void;

interface ActiveExportJob {
  snapshot: ExportJobSnapshot;
  cancelled: boolean;
  processes: Set<ChildProcessWithoutNullStreams>;
  profiling?: ProfilingTimers;
  cancel(): ExportProgress;
}

interface FfprobeExportStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  r_frame_rate?: string;
  nb_frames?: string;
  nb_read_frames?: string;
}

interface FfprobeExportFormat {
  format_name?: string;
  duration?: string;
}

interface FfprobeExportJson {
  streams?: FfprobeExportStream[];
  format?: FfprobeExportFormat;
}

const activeJobs = new Map<string, ActiveExportJob>();
const codecPresets: Record<ExportQuality, string[]> = {
  draft: ["-preset", "ultrafast", "-crf", "28"],
  standard: ["-preset", "medium", "-crf", "23"],
  high: ["-preset", "slow", "-crf", "18"]
};

export async function outputPathExists(outputPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(outputPath);
    return stat.isFile();
  } catch {
    return false;
  }
}

export async function exportProject(
  request: ExportProjectRequest,
  onProgress: ProgressListener = () => {}
): Promise<ExportJobResult> {
  requireFfprobe();
  const ffmpegPath = requireFfmpeg();
  const sanitizedRequest = {
    ...request,
    project: sanitizeProject(cloneJson(request.project))
  };
  const snapshot = createExportJobSnapshot(sanitizedRequest);

  // Validate encoder availability before starting export
  const diagnostics = await getFfmpegDiagnostics();
  const codec = snapshot.project.exportSettings.codec;
  const encoderMap: Record<string, boolean> = {
    h264: diagnostics.h264EncoderAvailable,
    hevc: diagnostics.hevcEncoderAvailable,
    prores: diagnostics.proresEncoderAvailable,
    vp9: diagnostics.vp9EncoderAvailable
  };
  if (!encoderMap[codec]) {
    throw appError("EXPORT_FAILED", `The ${codec.toUpperCase()} encoder is not available in this FFmpeg build.`, diagnostics.ffmpegVersion ?? "unknown version");
  }

  if (await outputPathExists(snapshot.outputPath) && !request.overwriteConfirmed) {
    throw appError("EXPORT_OUTPUT_EXISTS", "Export output already exists and needs confirmation.", snapshot.outputPath);
  }

  const job = createActiveJob(snapshot);
  activeJobs.set(snapshot.id, job);
  emitProgress(snapshot, "pending", 0, "Preparing export.", onProgress);

  try {
    await fs.mkdir(path.dirname(snapshot.outputPath), { recursive: true });
    await fs.rm(snapshot.tempOutputPath, { force: true });
    emitProgress(snapshot, "running", 0, "Starting FFmpeg video encode.", onProgress);

    const renderedFrames = await processFrames(ffmpegPath, job, onProgress);

    // Audio passthrough: merge source audio into graded video if requested
    const { audioBehavior } = snapshot.project.exportSettings;
    if (audioBehavior === "passthrough" && snapshot.media.hasAudio) {
      emitProgress(snapshot, "running", renderedFrames, "Merging source audio.", onProgress);
      await mergeAudioPassthrough(ffmpegPath, snapshot);
    }

    const result = await finalizeExport(snapshot, renderedFrames);
    emitProgress(snapshot, "completed", renderedFrames, "Export complete.", onProgress);

    if (job.profiling) {
      const profile = computeProfileResult(
        snapshot.media.displayWidth,
        snapshot.media.displayHeight,
        snapshot.width,
        snapshot.height,
        renderedFrames,
        job.profiling
      );
      console.log(formatProfileReport(profile));
    }

    return result;
  } catch (error) {
    await fs.rm(snapshot.tempOutputPath, { force: true }).catch(() => undefined);

    if (job.cancelled || isCancellationError(error)) {
      const cancelError = appError("EXPORT_CANCELLED", "Export was cancelled.");
      emitProgress(snapshot, "canceled", 0, "Export cancelled.", onProgress, cancelError);
      throw cancelError;
    }

    const exportError = toExportError(error);
    emitProgress(snapshot, "failed", 0, exportError.message, onProgress, exportError);
    throw exportError;
  } finally {
    activeJobs.delete(snapshot.id);
    for (const child of job.processes) {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
      }
    }
  }
}

export function cancelExport(jobId: string): ExportProgress {
  const job = activeJobs.get(jobId);
  if (!job) {
    throw appError("EXPORT_FAILED", "No active export job was found.", jobId);
  }

  return job.cancel();
}

export function renderRgbaFrame(source: Buffer, sourceWidth: number, sourceHeight: number, nodes: readonly ColorNode[], frameIndex: number): Buffer {
  const output = Buffer.allocUnsafe(source.length);
  const resolvedNodes = normalizeNodeGraph(nodes).map((node) => resolveTrackedNode(node, frameIndex));

  for (let y = 0; y < sourceHeight; y += 1) {
    for (let x = 0; x < sourceWidth; x += 1) {
      const offset = (y * sourceWidth + x) * 4;
      const pixel = {
        r: source[offset] / 255,
        g: source[offset + 1] / 255,
        b: source[offset + 2] / 255,
        a: source[offset + 3] / 255
      };
      const graded = evaluateNodeGraph(pixel, resolvedNodes, {
        x: (x + 0.5) / sourceWidth,
        y: (y + 0.5) / sourceHeight
      });

      output[offset] = floatToByte(graded.r);
      output[offset + 1] = floatToByte(graded.g);
      output[offset + 2] = floatToByte(graded.b);
      output[offset + 3] = floatToByte(graded.a ?? pixel.a);
    }
  }

  return output;
}

export function transformRgbaFrame(
  source: Buffer,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  policy: "fit" | "crop" | "pad"
): Buffer {
  const output = Buffer.alloc(targetWidth * targetHeight * 4);
  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = targetWidth / targetHeight;

  let srcX = 0;
  let srcY = 0;
  let srcVisibleWidth = sourceWidth;
  let srcVisibleHeight = sourceHeight;

  if (policy === "fit") {
    if (sourceAspect > targetAspect) {
      srcVisibleHeight = Math.round(sourceWidth / targetAspect);
      srcY = Math.round((sourceHeight - srcVisibleHeight) / 2);
    } else if (sourceAspect < targetAspect) {
      srcVisibleWidth = Math.round(sourceHeight * targetAspect);
      srcX = Math.round((sourceWidth - srcVisibleWidth) / 2);
    }
  } else if (policy === "crop") {
    if (sourceAspect > targetAspect) {
      srcVisibleWidth = Math.round(sourceHeight * targetAspect);
      srcX = Math.round((sourceWidth - srcVisibleWidth) / 2);
    } else if (sourceAspect < targetAspect) {
      srcVisibleHeight = Math.round(sourceWidth / targetAspect);
      srcY = Math.round((sourceHeight - srcVisibleHeight) / 2);
    }
  }
  // For "pad", use full source, output has padding (handled separately)

  const sx = srcVisibleWidth / targetWidth;
  const sy = srcVisibleHeight / targetHeight;

  for (let ty = 0; ty < targetHeight; ty += 1) {
    for (let tx = 0; tx < targetWidth; tx += 1) {
      let r: number, g: number, b: number, a: number;

      if (policy === "pad") {
        const normX = (tx + 0.5) / targetWidth;
        const normY = (ty + 0.5) / targetHeight;
        const aspectOk = sourceAspect <= targetAspect
          ? normX >= (1 - targetAspect / sourceAspect) / 2 && normX <= (1 + targetAspect / sourceAspect) / 2
          : normY >= (1 - sourceAspect / targetAspect) / 2 && normY <= (1 + sourceAspect / targetAspect) / 2;
        if (aspectOk) {
          const srcX = Math.round((normX - 0.5) * sourceWidth + sourceWidth / 2);
          const srcY = Math.round((normY - 0.5) * sourceHeight + sourceHeight / 2);
          const idx = (Math.max(0, Math.min(sourceHeight - 1, srcY)) * sourceWidth + Math.max(0, Math.min(sourceWidth - 1, srcX))) * 4;
          r = source[idx];
          g = source[idx + 1];
          b = source[idx + 2];
          a = source[idx + 3];
        } else {
          r = 16;
          g = 128;
          b = 128;
          a = 255;
        }
      } else {
        const px = Math.round(srcX + tx * sx);
        const py = Math.round(srcY + ty * sy);
        const idx = (Math.max(0, Math.min(sourceHeight - 1, py)) * sourceWidth + Math.max(0, Math.min(sourceWidth - 1, px))) * 4;
        r = source[idx];
        g = source[idx + 1];
        b = source[idx + 2];
        a = source[idx + 3];
      }

      const outOffset = (ty * targetWidth + tx) * 4;
      output[outOffset] = r;
      output[outOffset + 1] = g;
      output[outOffset + 2] = b;
      output[outOffset + 3] = a;
    }
  }

  return output;
}

async function processFrames(
  ffmpegPath: string,
  job: ActiveExportJob,
  onProgress: ProgressListener
): Promise<number> {
  const { snapshot, profiling } = job;
  const sourceWidth = snapshot.media.displayWidth;
  const sourceHeight = snapshot.media.displayHeight;
  const sourceFrameSize = sourceWidth * sourceHeight * 4;
  const decoder = spawnFfmpeg(ffmpegPath, buildDecodeArgs(snapshot));
  const encoder = spawnFfmpeg(ffmpegPath, buildEncodeArgs(snapshot));
  decoder.stdin.end();
  encoder.stdout.resume();
  encoder.stdin.on("error", () => undefined);
  job.processes.add(decoder);
  job.processes.add(encoder);

  const decoderStderr = collectStream(decoder.stderr);
  const encoderStderr = collectStream(encoder.stderr);
  const decoderClosed = waitForClose(decoder);
  const encoderClosed = waitForClose(encoder);
  let pending: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  let frameIndex = 0;

  if (profiling) {
    profiling.decodeStart = performance.now();
  }

  try {
    for await (const chunk of decoder.stdout) {
      throwIfCancelled(job);
      pending = pending.length === 0 ? (chunk as Buffer) : Buffer.concat([pending, chunk as Buffer]);

      while (pending.length >= sourceFrameSize) {
        throwIfCancelled(job);
        const sourceFrame = pending.subarray(0, sourceFrameSize);
        pending = pending.subarray(sourceFrameSize);

        if (profiling) {
          profiling.decodeEnd = performance.now();
          profiling.renderStart = performance.now();
        }

        const graded = renderRgbaFrame(sourceFrame, sourceWidth, sourceHeight, snapshot.project.nodes, frameIndex);
        const resized = transformRgbaFrame(graded, sourceWidth, sourceHeight, snapshot.width, snapshot.height, snapshot.project.exportSettings.resizePolicy);

        if (profiling) {
          profiling.renderEnd = performance.now();
        }

        await writeBuffer(encoder.stdin, resized);
        frameIndex += 1;
        emitProgress(snapshot, "running", frameIndex, `Rendered ${frameIndex} / ${snapshot.totalFrames} frames.`, onProgress);
      }
    }
  } catch (error) {
    if (job.cancelled) {
      throw createCancellationError();
    }
    throw error;
  }

  if (pending.length !== 0) {
    throw appError("EXPORT_FAILED", "FFmpeg returned an incomplete raw video frame.", `${pending.length} trailing bytes`);
  }

  const decoderExit = await decoderClosed;
  if (decoderExit.code !== 0) {
    throw appError("EXPORT_FAILED", "FFmpeg could not decode the source media.", decoderStderr());
  }

  if (profiling) {
    profiling.encodeStart = performance.now();
  }

  encoder.stdin.end();
  const encoderExit = await encoderClosed;

  if (profiling) {
    profiling.encodeEnd = performance.now();
  }

  if (encoderExit.code !== 0) {
    throw appError("EXPORT_FAILED", "FFmpeg could not encode the H.264 MP4.", encoderStderr());
  }

  return frameIndex;
}

async function mergeAudioPassthrough(ffmpegPath: string, snapshot: ExportJobSnapshot): Promise<void> {
  const tempWithAudioPath = `${snapshot.tempOutputPath}.audio-temp`;
  const audioStreamIndex = snapshot.media.audioStreamIndex ?? snapshot.media.videoStreamIndex + 1;

  const args = [
    "-hide_banner",
    "-y",
    "-i",
    snapshot.tempOutputPath,
    "-i",
    snapshot.media.sourcePath,
    "-map",
    "0:v",
    "-map",
    `1:a:${audioStreamIndex}`,
    "-c:v",
    "copy",
    "-c:a",
    "copy",
    "-shortest",
    tempWithAudioPath
  ];

  const result = await runProcess(ffmpegPath, args, { timeoutMs: 120_000 });
  if (result.exitCode !== 0) {
    throw appError("EXPORT_FAILED", "Failed to merge source audio into export.", result.stderr.toString("utf8").trim());
  }

  await fs.rm(snapshot.tempOutputPath, { force: true });
  await fs.rename(tempWithAudioPath, snapshot.tempOutputPath);
}

async function finalizeExport(snapshot: ExportJobSnapshot, renderedFrames: number): Promise<ExportJobResult> {
  const metadata = await probeExport(snapshot.tempOutputPath);
  const issues: string[] = [];

  const expectedCodec = snapshot.project.exportSettings.codec === "prores" ? "prores" : snapshot.project.exportSettings.codec === "vp9" ? "vp9" : snapshot.project.exportSettings.codec === "hevc" ? "hevc" : "h264";
  if (metadata.codec !== expectedCodec) {
    issues.push(`codec=${metadata.codec}`);
  }
  if (metadata.width !== snapshot.width || metadata.height !== snapshot.height) {
    issues.push(`resolution=${metadata.width}x${metadata.height}`);
  }
  if (Math.abs(metadata.fps - snapshot.fps) > 0.01) {
    issues.push(`fps=${metadata.fps}`);
  }
  if (metadata.frameCount !== undefined && metadata.frameCount !== renderedFrames) {
    issues.push(`frames=${metadata.frameCount}, expected=${renderedFrames}`);
  }

  if (issues.length > 0) {
    throw appError("EXPORT_FAILED", "Export validation failed.", issues.join("; "));
  }

  await fs.rm(snapshot.outputPath, { force: true });
  await fs.rename(snapshot.tempOutputPath, snapshot.outputPath);

  return {
    jobId: snapshot.id,
    outputPath: snapshot.outputPath,
    width: metadata.width,
    height: metadata.height,
    frameCount: metadata.frameCount ?? renderedFrames,
    fps: metadata.fps,
    codec: metadata.codec,
    container: metadata.container,
    hasAudio: metadata.hasAudio,
    audioBehavior: snapshot.project.exportSettings.audioBehavior,
    durationSeconds: metadata.durationSeconds
  };
}

async function probeExport(outputPath: string): Promise<{
  codec: string;
  container: string;
  width: number;
  height: number;
  fps: number;
  frameCount?: number;
  hasAudio: boolean;
  durationSeconds: number;
}> {
  const ffprobePath = requireFfprobe();
  const output = await runProcess(
    ffprobePath,
    [
      "-v",
      "error",
      "-count_frames",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      outputPath
    ],
    { timeoutMs: 20_000 }
  );

  if (output.exitCode !== 0) {
    throw appError("EXPORT_FAILED", "FFprobe could not validate the exported MP4.", output.stderr.toString("utf8").trim());
  }

  let parsed: FfprobeExportJson;
  try {
    parsed = JSON.parse(output.stdout.toString("utf8")) as FfprobeExportJson;
  } catch (error) {
    throw appError("EXPORT_FAILED", "FFprobe returned invalid export metadata.", String(error));
  }

  const streams = parsed.streams ?? [];
  const video = streams.find((stream) => stream.codec_type === "video");
  if (!video?.codec_name || !video.width || !video.height) {
    throw appError("EXPORT_FAILED", "Exported file does not contain a readable video stream.");
  }

  return {
    codec: video.codec_name,
    container: parsed.format?.format_name ?? "unknown",
    width: video.width,
    height: video.height,
    fps: parseRational(video.avg_frame_rate) || parseRational(video.r_frame_rate),
    frameCount: parseOptionalInteger(video.nb_read_frames) ?? parseOptionalInteger(video.nb_frames),
    hasAudio: streams.some((stream) => stream.codec_type === "audio"),
    durationSeconds: Number(parsed.format?.duration) || 0
  };
}

function createActiveJob(snapshot: ExportJobSnapshot): ActiveExportJob {
  const job: ActiveExportJob = {
    snapshot,
    cancelled: false,
    processes: new Set(),
    profiling: createProfilingTimers(),
    cancel() {
      job.cancelled = true;
      for (const child of job.processes) {
        if (child.exitCode === null && child.signalCode === null) {
          child.kill("SIGKILL");
        }
      }
      return buildProgress(snapshot, "canceled", 0, "Cancelling export.", appError("EXPORT_CANCELLED", "Export cancellation requested."));
    }
  };

  return job;
}

function buildDecodeArgs(snapshot: ExportJobSnapshot): string[] {
  return [
    "-hide_banner",
    "-nostdin",
    "-i",
    snapshot.media.sourcePath,
    "-map",
    `0:${snapshot.media.videoStreamIndex}`,
    "-an",
    "-sn",
    "-dn",
    "-f",
    "rawvideo",
    "-pix_fmt",
    "rgba",
    "pipe:1"
  ];
}

function buildEncodeArgs(snapshot: ExportJobSnapshot): string[] {
  const { codec, quality } = snapshot.project.exportSettings;
  const args = [
    "-hide_banner",
    "-y",
    "-f",
    "rawvideo",
    "-pix_fmt",
    "rgba",
    "-s",
    `${snapshot.width}x${snapshot.height}`,
    "-r",
    String(snapshot.fps),
    "-i",
    "pipe:0"
  ];

  switch (codec) {
    case "h264":
      args.push(
        "-an",
        "-c:v",
        "libx264",
        ...codecPresets[quality],
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart"
      );
      break;
    case "hevc":
      args.push(
        "-an",
        "-c:v",
        "libx265",
        ...codecPresets[quality],
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart"
      );
      break;
    case "prores":
      args.push(
        "-an",
        "-c:v",
        "prores_ks",
        "-pix_fmt",
        "yuv420p10le"
      );
      break;
    case "vp9":
      args.push(
        "-an",
        "-c:v",
        "libvpx-vp9",
        "-b:v",
        "0",
        quality === "draft" ? "-crf" : "-b:v",
        quality === "draft" ? "40" : quality === "standard" ? "8M" : "16M",
        "-pix_fmt",
        "yuv420p"
      );
      break;
  }

  args.push(snapshot.tempOutputPath);
  return args;
}

function spawnFfmpeg(executable: string, args: string[]): ChildProcessWithoutNullStreams {
  return spawn(executable, args, { stdio: ["pipe", "pipe", "pipe"] });
}

function collectStream(stream: NodeJS.ReadableStream): () => string {
  const chunks: Buffer[] = [];
  stream.on("data", (chunk: Buffer) => chunks.push(chunk));
  return () => Buffer.concat(chunks).toString("utf8").trim();
}

function waitForClose(child: ChildProcessWithoutNullStreams): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code, signal) => resolve({ code, signal }));
  });
}

async function writeBuffer(stream: Writable, buffer: Buffer): Promise<void> {
  if (stream.destroyed) {
    throw appError("EXPORT_FAILED", "FFmpeg encoder pipe closed before export finished.");
  }

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      stream.off("error", onError);
      stream.off("close", onClose);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(appError("EXPORT_FAILED", "FFmpeg encoder pipe failed.", error.message));
    };
    const onClose = () => {
      cleanup();
      reject(appError("EXPORT_FAILED", "FFmpeg encoder pipe closed before export finished."));
    };

    stream.once("error", onError);
    stream.once("close", onClose);
    stream.write(buffer, (error) => {
      cleanup();
      if (error) {
        reject(appError("EXPORT_FAILED", "FFmpeg encoder pipe failed.", error.message));
        return;
      }

      resolve();
    });
  });
}

function emitProgress(
  snapshot: ExportJobSnapshot,
  state: ExportProgress["state"],
  currentFrame: number,
  message: string,
  onProgress: ProgressListener,
  error?: AppError
): void {
  onProgress(buildProgress(snapshot, state, currentFrame, message, error));
}

function buildProgress(
  snapshot: ExportJobSnapshot,
  state: ExportProgress["state"],
  currentFrame: number,
  message: string,
  error?: AppError
): ExportProgress {
  const boundedFrame = Math.min(Math.max(0, currentFrame), snapshot.totalFrames);
  const percent = state === "completed" ? 100 : Math.round((boundedFrame / snapshot.totalFrames) * 1000) / 10;

  return {
    jobId: snapshot.id,
    state,
    currentFrame: boundedFrame,
    totalFrames: snapshot.totalFrames,
    percent,
    elapsedMs: Date.now() - snapshot.startedAt,
    outputPath: snapshot.outputPath,
    message,
    error
  };
}

function throwIfCancelled(job: ActiveExportJob): void {
  if (job.cancelled) {
    throw createCancellationError();
  }
}

function createCancellationError(): Error {
  return new Error("EXPORT_CANCELLED");
}

function isCancellationError(error: unknown): boolean {
  return error instanceof Error && error.message === "EXPORT_CANCELLED";
}

function toExportError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  return appError("EXPORT_FAILED", "Export failed.", error instanceof Error ? error.message : String(error));
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function floatToByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value * 255)));
}

function parseRational(value?: string): number {
  if (!value || value === "0/0") {
    return 0;
  }

  const [numeratorRaw, denominatorRaw] = value.split("/");
  const numerator = Number(numeratorRaw);
  const denominator = denominatorRaw === undefined ? 1 : Number(denominatorRaw);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return 0;
  }

  return numerator / denominator;
}

function parseOptionalInteger(value?: string): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}
