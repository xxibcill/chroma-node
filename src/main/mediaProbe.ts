import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { MediaRef } from "../shared/ipc.js";
import { appError } from "./errors.js";
import { requireFfprobe } from "./ffmpeg.js";
import { runProcess } from "./process.js";

interface FfprobeStream {
  index?: number;
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  duration?: string;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  nb_frames?: string;
  tags?: Record<string, string>;
  side_data_list?: Array<{ rotation?: number; displaymatrix?: string }>;
}

interface FfprobeFormat {
  format_name?: string;
  duration?: string;
}

interface FfprobeJson {
  streams?: FfprobeStream[];
  format?: FfprobeFormat;
}

const supportedExtensions = new Set([".mp4", ".mov"]);
const maxDisplayWidth = 1920;
const maxDisplayHeight = 1080;

export async function probeMedia(sourcePath: string): Promise<MediaRef> {
  await assertSupportedPath(sourcePath);

  const ffprobePath = requireFfprobe();
  const output = await runProcess(
    ffprobePath,
    [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      sourcePath
    ],
    { timeoutMs: 15_000 }
  );

  if (output.exitCode !== 0) {
    throw appError(
      "PROBE_FAILED",
      "FFprobe could not read this media file.",
      output.stderr.toString("utf8").trim()
    );
  }

  let parsed: FfprobeJson;
  try {
    parsed = JSON.parse(output.stdout.toString("utf8")) as FfprobeJson;
  } catch (error) {
    throw appError("PROBE_FAILED", "FFprobe returned invalid JSON.", String(error));
  }

  return mapProbeOutput(sourcePath, parsed);
}

export function parseRationalFrameRate(value?: string): number {
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

export function mapProbeOutput(sourcePath: string, parsed: FfprobeJson): MediaRef {
  const streams = parsed.streams ?? [];
  const videoStream = streams.find((stream) => stream.codec_type === "video");

  if (!videoStream?.width || !videoStream.height || !videoStream.codec_name) {
    throw appError("UNSUPPORTED_MEDIA", "No supported video stream was found in this file.");
  }

  const rotation = readRotation(videoStream);
  const displaySize = getDisplaySize(videoStream.width, videoStream.height, rotation);
  if (displaySize.width > maxDisplayWidth || displaySize.height > maxDisplayHeight) {
    throw appError(
      "UNSUPPORTED_MEDIA",
      "Media exceeds the Phase 01 limit of 1920 x 1080.",
      `${displaySize.width} x ${displaySize.height}`
    );
  }

  const durationSeconds = toPositiveNumber(videoStream.duration) ?? toPositiveNumber(parsed.format?.duration) ?? 0;
  const frameRate =
    parseRationalFrameRate(videoStream.avg_frame_rate) || parseRationalFrameRate(videoStream.r_frame_rate);
  const nbFrames = toPositiveInteger(videoStream.nb_frames);
  const totalFrames = nbFrames ?? (durationSeconds > 0 && frameRate > 0 ? Math.round(durationSeconds * frameRate) : undefined);

  return {
    id: crypto.createHash("sha1").update(sourcePath).digest("hex"),
    sourcePath,
    fileName: path.basename(sourcePath),
    container: parsed.format?.format_name ?? path.extname(sourcePath).slice(1),
    codec: videoStream.codec_name,
    width: videoStream.width,
    height: videoStream.height,
    durationSeconds,
    frameRate,
    totalFrames,
    hasAudio: streams.some((stream) => stream.codec_type === "audio"),
    rotation,
    videoStreamIndex: videoStream.index ?? 0
  };
}

async function assertSupportedPath(sourcePath: string): Promise<void> {
  const extension = path.extname(sourcePath).toLowerCase();
  if (!supportedExtensions.has(extension)) {
    throw appError("UNSUPPORTED_MEDIA", "Only MP4 and MOV files are supported in this phase.");
  }

  try {
    const stat = await fs.stat(sourcePath);
    if (!stat.isFile()) {
      throw appError("FILE_NOT_FOUND", "Selected path is not a file.");
    }
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      throw appError("FILE_NOT_FOUND", "Selected media file does not exist.", sourcePath);
    }
    throw error;
  }
}

function toPositiveNumber(value?: string): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function toPositiveInteger(value?: string): number | undefined {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

function readRotation(stream: FfprobeStream): number {
  const tagRotation = Number(stream.tags?.rotate);
  if (Number.isFinite(tagRotation)) {
    return normalizeRotation(tagRotation);
  }

  const sideDataRotation = stream.side_data_list?.find((item) => typeof item.rotation === "number")?.rotation;
  if (sideDataRotation !== undefined) {
    return normalizeRotation(sideDataRotation);
  }

  return 0;
}

function normalizeRotation(rotation: number): number {
  const normalized = rotation % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function getDisplaySize(width: number, height: number, rotation: number): { width: number; height: number } {
  return rotation === 90 || rotation === 270 ? { width: height, height: width } : { width, height };
}
