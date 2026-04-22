import type { DecodedFrame, FrameExtractRequest } from "../shared/ipc.js";
import { appError } from "./errors.js";
import { requireFfmpeg } from "./ffmpeg.js";
import { probeMedia } from "./mediaProbe.js";
import { runProcess } from "./process.js";

export async function extractFrame(request: FrameExtractRequest): Promise<DecodedFrame> {
  const ffmpegPath = requireFfmpeg();
  const metadata = await probeMedia(request.sourcePath);
  const maxWidth = clampInteger(request.maxWidth ?? 1280, 32, 4096);
  const targetTime = clampNumber(request.timeSeconds ?? Math.min(0.5, metadata.durationSeconds / 2), 0, metadata.durationSeconds);

  const output = await runProcess(
    ffmpegPath,
    [
      "-hide_banner",
      "-nostdin",
      "-ss",
      targetTime.toFixed(3),
      "-i",
      request.sourcePath,
      "-frames:v",
      "1",
      "-vf",
      `scale='min(${maxWidth},iw)':-2`,
      "-f",
      "image2pipe",
      "-vcodec",
      "png",
      "pipe:1"
    ],
    { timeoutMs: 20_000 }
  );

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
