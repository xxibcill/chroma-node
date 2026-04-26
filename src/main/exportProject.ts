import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { Writable } from "node:stream";
import type {
  AppError,
  ExportJobResult,
  ExportProgress,
  ExportProjectRequest,
  ExportQuality,
  MediaRef
} from "../shared/ipc.js";
import type { ChromaProject } from "../shared/project.js";
import { evaluateNodeGraph, normalizeNodeGraph, resolveTrackedNode, type ColorNode } from "../shared/colorEngine.js";
import { sanitizeProject } from "../shared/project.js";
import { appError, isAppError } from "./errors.js";
import { requireFfmpeg, requireFfprobe } from "./ffmpeg.js";
import { runProcess } from "./process.js";

export interface ExportJobSnapshot {
  id: string;
  project: ChromaProject;
  media: MediaRef;
  outputPath: string;
  tempOutputPath: string;
  quality: ExportQuality;
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  startedAt: number;
}

type ProgressListener = (progress: ExportProgress) => void;

interface ActiveExportJob {
  snapshot: ExportJobSnapshot;
  cancelled: boolean;
  processes: Set<ChildProcessWithoutNullStreams>;
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

export function createExportJobSnapshot(request: ExportProjectRequest): ExportJobSnapshot {
  const project = sanitizeProject(cloneJson(request.project));
  const media = project.media;
  if (!media) {
    throw appError("EXPORT_FAILED", "Export cannot start without imported media.");
  }

  const outputPath = normalizeOutputPath(request.outputPath ?? project.exportSettings.outputPath);
  if (!outputPath) {
    throw appError("EXPORT_FAILED", "Export output path is required.");
  }

  if (path.extname(outputPath).toLowerCase() !== ".mp4") {
    throw appError("EXPORT_FAILED", "H.264 export must use an .mp4 output path.", outputPath);
  }

  if (path.resolve(outputPath) === path.resolve(media.sourcePath)) {
    throw appError("EXPORT_FAILED", "Export output cannot overwrite the source media.", outputPath);
  }

  const quality = request.quality ?? project.exportSettings.quality ?? "standard";
  const width = clampInteger(media.displayWidth, 1, 7680);
  const height = clampInteger(media.displayHeight, 1, 4320);
  const fps = clampNumber(media.frameRate, 1, 240);
  const totalFrames = Math.max(1, media.totalFrames ?? (Math.round(media.durationSeconds * fps) || 1));
  const id = `export-${crypto.randomUUID()}`;

  return {
    id,
    project,
    media,
    outputPath,
    tempOutputPath: `${outputPath}.part-${id}.mp4`,
    quality,
    width,
    height,
    fps,
    totalFrames,
    startedAt: Date.now()
  };
}

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
  const snapshot = createExportJobSnapshot(request);

  if (await outputPathExists(snapshot.outputPath) && !request.overwriteConfirmed) {
    throw appError("EXPORT_OUTPUT_EXISTS", "Export output already exists and needs confirmation.", snapshot.outputPath);
  }

  const job = createActiveJob(snapshot);
  activeJobs.set(snapshot.id, job);
  emitProgress(snapshot, "pending", 0, "Preparing export.", onProgress);

  try {
    await fs.mkdir(path.dirname(snapshot.outputPath), { recursive: true });
    await fs.rm(snapshot.tempOutputPath, { force: true });
    emitProgress(snapshot, "running", 0, "Starting FFmpeg decode and H.264 encode.", onProgress);

    const renderedFrames = await processFrames(ffmpegPath, job, onProgress);
    const result = await finalizeExport(snapshot, renderedFrames);
    emitProgress(snapshot, "completed", renderedFrames, "Export complete.", onProgress);
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

export function renderRgbaFrame(source: Buffer, width: number, height: number, nodes: readonly ColorNode[], frameIndex: number): Buffer {
  const output = Buffer.allocUnsafe(source.length);
  const resolvedNodes = normalizeNodeGraph(nodes).map((node) => resolveTrackedNode(node, frameIndex));

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const pixel = {
        r: source[offset] / 255,
        g: source[offset + 1] / 255,
        b: source[offset + 2] / 255,
        a: source[offset + 3] / 255
      };
      const graded = evaluateNodeGraph(pixel, resolvedNodes, {
        x: (x + 0.5) / width,
        y: (y + 0.5) / height
      });

      output[offset] = floatToByte(graded.r);
      output[offset + 1] = floatToByte(graded.g);
      output[offset + 2] = floatToByte(graded.b);
      output[offset + 3] = floatToByte(graded.a ?? pixel.a);
    }
  }

  return output;
}

async function processFrames(
  ffmpegPath: string,
  job: ActiveExportJob,
  onProgress: ProgressListener
): Promise<number> {
  const { snapshot } = job;
  const frameSize = snapshot.width * snapshot.height * 4;
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

  try {
    for await (const chunk of decoder.stdout) {
      throwIfCancelled(job);
      pending = pending.length === 0 ? (chunk as Buffer) : Buffer.concat([pending, chunk as Buffer]);

      while (pending.length >= frameSize) {
        throwIfCancelled(job);
        const sourceFrame = pending.subarray(0, frameSize);
        pending = pending.subarray(frameSize);
        const rendered = renderRgbaFrame(sourceFrame, snapshot.width, snapshot.height, snapshot.project.nodes, frameIndex);
        await writeBuffer(encoder.stdin, rendered);
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

  encoder.stdin.end();
  const encoderExit = await encoderClosed;
  if (encoderExit.code !== 0) {
    throw appError("EXPORT_FAILED", "FFmpeg could not encode the H.264 MP4.", encoderStderr());
  }

  return frameIndex;
}

async function finalizeExport(snapshot: ExportJobSnapshot, renderedFrames: number): Promise<ExportJobResult> {
  const metadata = await probeExport(snapshot.tempOutputPath);
  const issues: string[] = [];

  if (metadata.codec !== "h264") {
    issues.push(`codec=${metadata.codec}`);
  }
  if (metadata.width !== snapshot.width || metadata.height !== snapshot.height) {
    issues.push(`resolution=${metadata.width}x${metadata.height}`);
  }
  if (metadata.hasAudio) {
    issues.push("audio stream present");
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
  return [
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
    "pipe:0",
    "-an",
    "-c:v",
    "libx264",
    ...codecPresets[snapshot.quality],
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    snapshot.tempOutputPath
  ];
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

function normalizeOutputPath(outputPath: string | undefined): string | undefined {
  const trimmed = outputPath?.trim();
  return trimmed ? path.resolve(trimmed) : undefined;
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, Math.round(value)));
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
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
