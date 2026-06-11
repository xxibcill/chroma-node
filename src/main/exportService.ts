import { spawn } from "node:child_process";
import type { Writable } from "node:stream";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  AppError,
  ExportJobResult,
  ExportProgress,
  ExportProjectRequest,
  ExportQuality
} from "../shared/ipc.js";
import { sanitizeProject } from "../shared/project.js";
import {
  createExportJobSnapshot,
  validateExportRequest,
  type ExportJobSnapshot
} from "./exportPlanning.js";
import { appError, isAppError } from "./errors.js";
import { requireFfmpeg, requireFfprobe, getFfmpegDiagnostics } from "./ffmpeg.js";
import { runProcess } from "./process.js";
import { type ProfilingTimers } from "./exportProfiling.js";
import { renderRgbaFrame } from "./exportFrameRender.js";
import { transformRgbaFrame } from "./exportFrameTransform.js";

export type ExportJobState = "pending" | "running" | "canceled" | "failed" | "completed";

export interface ExportServiceOptions {
  processRunner?: ProcessRunner;
}

export interface ProcessRunner {
  run(
    executable: string,
    args: string[],
    options?: { input?: Buffer; timeoutMs?: number }
  ): Promise<ProcessOutput>;
  spawn(executable: string, args: string[]): ManagedChildProcess;
}

export interface ProcessOutput {
  stdout: Buffer;
  stderr: Buffer;
  exitCode: number | null;
}

export interface ManagedChildProcess {
  stdin: Writable;
  stdout: NodeJS.ReadableStream;
  stderr: NodeJS.ReadableStream;
  kill(signal: NodeJS.Signals | number): void;
  onClose(callback: (code: number | null, signal: NodeJS.Signals | null) => void): void;
  onError(callback: (error: Error) => void): void;
}

interface ActiveJob {
  snapshot: ExportJobSnapshot;
  cancelled: boolean;
  processes: Set<ManagedChildProcess>;
  profiling?: ProfilingTimers;
  cancel(): ExportProgress;
}

type ProgressListener = (progress: ExportProgress) => void;

const codecPresets: Record<ExportQuality, string[]> = {
  draft: ["-preset", "ultrafast", "-crf", "28"],
  standard: ["-preset", "medium", "-crf", "23"],
  high: ["-preset", "slow", "-crf", "18"]
};

const activeJobs = new Map<string, ActiveJob>();

class DefaultProcessRunner implements ProcessRunner {
  async run(
    executable: string,
    args: string[],
    options?: { input?: Buffer; timeoutMs?: number }
  ): Promise<ProcessOutput> {
    return runProcess(executable, args, options);
  }

  spawn(executable: string, args: string[]): ManagedChildProcess {
    const child = spawn(executable, args, { stdio: ["pipe", "pipe", "pipe"] });
    return {
      stdin: child.stdin,
      stdout: child.stdout,
      stderr: child.stderr,
      kill(signal: NodeJS.Signals | number) {
        child.kill(signal);
      },
      onClose(callback: (code: number | null, signal: NodeJS.Signals | null) => void) {
        child.on("close", callback);
      },
      onError(callback: (error: Error) => void) {
        child.on("error", callback);
      }
    };
  }
}

export function createExportService(options: ExportServiceOptions = {}): ExportService {
  const runner = options.processRunner ?? new DefaultProcessRunner();
  return new ExportServiceImpl(runner);
}

export interface ExportService {
  start(request: ExportProjectRequest, onProgress?: ProgressListener): Promise<ExportJobResult>;
  cancel(jobId: string): ExportProgress;
  getStatus(jobId: string): ExportProgress | undefined;
}

class ExportServiceImpl implements ExportService {
  private readonly runner: ProcessRunner;

  constructor(runner: ProcessRunner) {
    this.runner = runner;
  }

  async start(request: ExportProjectRequest, onProgress: ProgressListener = () => {}): Promise<ExportJobResult> {
    requireFfprobe();
    const ffmpegPath = requireFfmpeg();
    const sanitizedRequest = {
      ...request,
      project: sanitizeProject(cloneJson(request.project))
    };

    const validationIssues = validateExportRequest(sanitizedRequest);
    if (validationIssues.length > 0) {
      throw appError("EXPORT_FAILED", `Export validation failed: ${validationIssues.join("; ")}`);
    }

    const snapshot = createExportJobSnapshot(sanitizedRequest);

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

    const job = createActiveJob(snapshot, this.runner);
    activeJobs.set(snapshot.id, job);
    emitProgress(snapshot, "pending", 0, "Preparing export.", onProgress);

    try {
      await fs.mkdir(path.dirname(snapshot.outputPath), { recursive: true });
      await fs.rm(snapshot.tempOutputPath, { force: true });
      emitProgress(snapshot, "running", 0, "Starting FFmpeg video encode.", onProgress);

      const renderedFrames = await processFrames(ffmpegPath, job, snapshot, this.runner, onProgress);

      const { audioBehavior } = snapshot.project.exportSettings;
      if (audioBehavior === "passthrough" && snapshot.media.hasAudio) {
        emitProgress(snapshot, "running", renderedFrames, "Merging source audio.", onProgress);
        await mergeAudioPassthrough(ffmpegPath, snapshot, this.runner);
      }

      const result = await finalizeExport(snapshot, renderedFrames, this.runner);
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
      for (const proc of job.processes) {
        proc.kill("SIGKILL");
      }
    }
  }

  cancel(jobId: string): ExportProgress {
    const job = activeJobs.get(jobId);
    if (!job) {
      throw appError("EXPORT_FAILED", "No active export job was found.", jobId);
    }
    return job.cancel();
  }

  getStatus(jobId: string): ExportProgress | undefined {
    const job = activeJobs.get(jobId);
    if (!job) {
      return undefined;
    }
    const state: ExportJobState = job.cancelled ? "canceled" : "running";
    return buildProgress(job.snapshot, state, 0, state === "canceled" ? "Cancelling export." : "Export in progress.");
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createActiveJob(snapshot: ExportJobSnapshot, _runner: ProcessRunner): ActiveJob {
  const job: ActiveJob = {
    snapshot,
    cancelled: false,
    processes: new Set(),
    profiling: undefined,
    cancel() {
      job.cancelled = true;
      for (const proc of job.processes) {
        proc.kill("SIGKILL");
      }
      return buildProgress(snapshot, "canceled", 0, "Cancelling export.", appError("EXPORT_CANCELLED", "Export cancellation requested."));
    }
  };
  return job;
}

async function processFrames(
  ffmpegPath: string,
  job: ActiveJob,
  snapshot: ExportJobSnapshot,
  runner: ProcessRunner,
  onProgress: ProgressListener
): Promise<number> {
  const sourceWidth = snapshot.media.displayWidth;
  const sourceHeight = snapshot.media.displayHeight;
  const sourceFrameSize = sourceWidth * sourceHeight * 4;

  const decoder = runner.spawn(ffmpegPath, buildDecodeArgs(snapshot));
  const encoder = runner.spawn(ffmpegPath, buildEncodeArgs(snapshot));

  job.processes.add(decoder);
  job.processes.add(encoder);

  const stderrChunks: Buffer[] = [];
  decoder.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

  encoder.stdout.resume();
  encoder.stdin.on("error", () => undefined);

  const decoderClosed = waitForCloseProxy(decoder);
  const encoderClosed = waitForCloseProxy(encoder);
  decoder.stdin.end();

  let pending: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  let frameIndex = 0;

  if (job.profiling) {
    job.profiling.decodeStart = performance.now();
  }

  try {
    for await (const chunk of decoder.stdout) {
      throwIfCancelled(job);
      pending = pending.length === 0 ? (chunk as Buffer) : Buffer.concat([pending, chunk as Buffer]);

      while (pending.length >= sourceFrameSize) {
        throwIfCancelled(job);
        const sourceFrame = pending.subarray(0, sourceFrameSize);
        pending = pending.subarray(sourceFrameSize);

        if (job.profiling) {
          job.profiling.decodeEnd = performance.now();
          job.profiling.renderStart = performance.now();
        }

        const graded = renderRgbaFrame(sourceFrame, sourceWidth, sourceHeight, snapshot.project.nodes, frameIndex, {
          colorManagement: snapshot.project.colorManagementSettings,
          sourceTransfer: snapshot.media.colorMetadata?.transfer.type ?? "bt1886",
          sourcePrimaries: snapshot.media.colorMetadata?.primaries.type ?? "rec709",
          isHdr: !!(snapshot.media.colorMetadata?.transfer.type === "hlg" ||
                 snapshot.media.colorMetadata?.transfer.type === "pq" ||
                 snapshot.media.colorMetadata?.transfer.type === "appleLog")
        });
        const resized = transformRgbaFrame(
          graded,
          sourceWidth,
          sourceHeight,
          snapshot.width,
          snapshot.height,
          snapshot.project.exportSettings.resizePolicy
        );

        if (job.profiling) {
          job.profiling.renderEnd = performance.now();
        }

        await writeBufferProxy(encoder.stdin, resized);
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

  const decoderStderr = Buffer.concat(stderrChunks).toString("utf8").trim();
  const decoderExit = await decoderClosed;
  if (decoderExit.code !== 0) {
    throw appError("EXPORT_FAILED", "FFmpeg could not decode the source media.", decoderStderr);
  }

  if (job.profiling) {
    job.profiling.encodeStart = performance.now();
  }

  encoder.stdin.end();
  const encoderExit = await encoderClosed;

  if (job.profiling) {
    job.profiling.encodeEnd = performance.now();
  }

  if (encoderExit.code !== 0) {
    throw appError("EXPORT_FAILED", "FFmpeg could not encode the H.264 MP4.", decoderStderr);
  }

  return frameIndex;
}

async function mergeAudioPassthrough(ffmpegPath: string, snapshot: ExportJobSnapshot, runner: ProcessRunner): Promise<void> {
  const outputExt = path.extname(snapshot.outputPath) || path.extname(snapshot.tempOutputPath);
  const tempWithAudioPath = `${snapshot.tempOutputPath}.audio-temp${outputExt}`;
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
    `1:${audioStreamIndex}`,
    "-c:v",
    "copy",
    "-c:a",
    "copy",
    "-shortest",
    tempWithAudioPath
  ];

  const result = await runner.run(ffmpegPath, args, { timeoutMs: 120_000 });
  if (result.exitCode !== 0) {
    throw appError("EXPORT_FAILED", "Failed to merge source audio into export.", result.stderr.toString("utf8").trim());
  }

  await fs.rm(snapshot.tempOutputPath, { force: true });
  await fs.rename(tempWithAudioPath, snapshot.tempOutputPath);
}

async function finalizeExport(snapshot: ExportJobSnapshot, renderedFrames: number, runner: ProcessRunner): Promise<ExportJobResult> {
  const metadata = await probeExport(snapshot.tempOutputPath, runner);
  const issues: string[] = [];

  const expectedCodec = snapshot.project.exportSettings.codec === "prores" ? "prores" :
    snapshot.project.exportSettings.codec === "vp9" ? "vp9" :
    snapshot.project.exportSettings.codec === "hevc" ? "hevc" : "h264";
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

interface ProbeResult {
  codec: string;
  container: string;
  width: number;
  height: number;
  fps: number;
  frameCount?: number;
  hasAudio: boolean;
  durationSeconds: number;
}

async function probeExport(outputPath: string, runner: ProcessRunner): Promise<ProbeResult> {
  const ffprobePath = requireFfprobe();
  const output = await runner.run(
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

  let parsed: { streams?: Array<{ codec_type?: string; codec_name?: string; width?: number; height?: number; avg_frame_rate?: string; r_frame_rate?: string; nb_frames?: string; nb_read_frames?: string }>; format?: { format_name?: string; duration?: string } };
  try {
    parsed = JSON.parse(output.stdout.toString("utf8"));
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
        "yuv422p10le"
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

function waitForCloseProxy(child: ManagedChildProcess): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  return new Promise((resolve, reject) => {
    child.onError(reject);
    child.onClose((code, signal) => resolve({ code, signal }));
  });
}

async function writeBufferProxy(stream: Writable, buffer: Buffer): Promise<void> {
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
    stream.write(buffer, (error: Error | null | undefined) => {
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
  state: ExportJobState,
  currentFrame: number,
  message: string,
  onProgress: ProgressListener,
  error?: AppError
): void {
  onProgress(buildProgress(snapshot, state, currentFrame, message, error));
}

function buildProgress(
  snapshot: ExportJobSnapshot,
  state: ExportJobState,
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

function throwIfCancelled(job: ActiveJob): void {
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
