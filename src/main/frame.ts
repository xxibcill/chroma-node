import type { DecodedFrame, FrameExtractRequest } from "../shared/ipc.js";
import { appError } from "./errors.js";
import { requireFfmpeg } from "./ffmpeg.js";
import { probeMedia } from "./mediaProbe.js";
import { runProcess } from "./process.js";

export async function extractFrame(request: FrameExtractRequest): Promise<DecodedFrame> {
  const ffmpegPath = requireFfmpeg();
  const metadata = await probeMedia(request.sourcePath);
  const maxWidth = clampInteger(request.maxWidth ?? 1280, 32, 4096);
  const filter = `scale='min(${maxWidth},iw)':-2`;
  const args =
    request.frameIndex === undefined
      ? buildTimeSeekArgs(request, metadata.durationSeconds, filter)
      : buildFrameSeekArgs(request, metadata.totalFrames, filter);

  const output = await runProcess(ffmpegPath, args, { timeoutMs: 20_000 });

  if (output.exitCode !== 0 || output.stdout.length === 0) {
    throw appError(
      "FRAME_EXTRACT_FAILED",
      "FFmpeg could not decode a preview frame.",
      output.stderr.toString("utf8").trim()
    );
  }

  const size = readPngSize(output.stdout);
  return {
    width: size.width,
    height: size.height,
    mimeType: "image/png",
    dataUrl: `data:image/png;base64,${output.stdout.toString("base64")}`
  };
}

function buildTimeSeekArgs(request: FrameExtractRequest, durationSeconds: number, filter: string): string[] {
  const targetTime = clampNumber(request.timeSeconds ?? Math.min(0.5, durationSeconds / 2), 0, durationSeconds);

  return [
    "-hide_banner",
    "-nostdin",
    "-ss",
    targetTime.toFixed(3),
    "-i",
    request.sourcePath,
    "-frames:v",
    "1",
    "-vf",
    filter,
    "-f",
    "image2pipe",
    "-vcodec",
    "png",
    "pipe:1"
  ];
}

function buildFrameSeekArgs(request: FrameExtractRequest, totalFrames: number | undefined, filter: string): string[] {
  const upperBound = totalFrames === undefined ? Number.MAX_SAFE_INTEGER : Math.max(0, totalFrames - 1);
  const targetFrame = clampInteger(request.frameIndex ?? 0, 0, upperBound);

  return [
    "-hide_banner",
    "-nostdin",
    "-i",
    request.sourcePath,
    "-vf",
    `select=eq(n\\,${targetFrame}),${filter}`,
    "-frames:v",
    "1",
    "-f",
    "image2pipe",
    "-vcodec",
    "png",
    "pipe:1"
  ];
}

function readPngSize(buffer: Buffer): { width: number; height: number } {
  const pngSignature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== pngSignature || buffer.length < 24) {
    throw appError("FRAME_EXTRACT_FAILED", "Decoded frame was not a valid PNG.");
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}
