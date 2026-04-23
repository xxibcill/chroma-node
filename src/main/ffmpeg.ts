import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AppError, FfmpegDiagnostics } from "../shared/ipc.js";
import { appError } from "./errors.js";
import { runProcess } from "./process.js";

export interface FfmpegPaths {
  ffmpegPath?: string;
  ffprobePath?: string;
}

const binaryNames = {
  ffmpeg: process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg",
  ffprobe: process.platform === "win32" ? "ffprobe.exe" : "ffprobe"
};

export async function getFfmpegDiagnostics(): Promise<FfmpegDiagnostics> {
  const paths = discoverFfmpegPaths();
  const errors: AppError[] = [];
  let ffmpegVersion: string | undefined;
  let ffprobeVersion: string | undefined;
  let h264EncoderAvailable = false;

  if (!paths.ffmpegPath) {
    errors.push(appError("FFMPEG_MISSING", "FFmpeg was not found on PATH or in bundled resources."));
  } else {
    ffmpegVersion = await readVersion(paths.ffmpegPath);
    h264EncoderAvailable = await hasH264Encoder(paths.ffmpegPath);
    if (!h264EncoderAvailable) {
      errors.push(appError("FFMPEG_MISSING", "FFmpeg was found, but the libx264 encoder is unavailable."));
    }
  }

  if (!paths.ffprobePath) {
    errors.push(appError("FFPROBE_MISSING", "FFprobe was not found on PATH or in bundled resources."));
  } else {
    ffprobeVersion = await readVersion(paths.ffprobePath);
  }

  return {
    ...paths,
    ffmpegVersion,
    ffprobeVersion,
    h264EncoderAvailable,
    available: errors.length === 0,
    errors
  };
}

export function discoverFfmpegPaths(env: NodeJS.ProcessEnv = process.env): FfmpegPaths {
  return {
    ffmpegPath: discoverBinary("ffmpeg", env.CHROMA_NODE_FFMPEG_PATH),
    ffprobePath: discoverBinary("ffprobe", env.CHROMA_NODE_FFPROBE_PATH)
  };
}

export function requireFfmpeg(): string {
  const ffmpegPath = discoverFfmpegPaths().ffmpegPath;
  if (!ffmpegPath) {
    throw appError("FFMPEG_MISSING", "FFmpeg is required for this operation.");
  }
  return ffmpegPath;
}

export function requireFfprobe(): string {
  const ffprobePath = discoverFfmpegPaths().ffprobePath;
  if (!ffprobePath) {
    throw appError("FFPROBE_MISSING", "FFprobe is required for this operation.");
  }
  return ffprobePath;
}

function discoverBinary(kind: keyof typeof binaryNames, explicitPath?: string): string | undefined {
  const candidates = [
    explicitPath,
    bundledBinaryPath(binaryNames[kind]),
    ...pathCandidates(binaryNames[kind])
  ].filter((candidate): candidate is string => Boolean(candidate));

  return candidates.find((candidate) => isExecutableFile(candidate));
}

function bundledBinaryPath(binaryName: string): string | undefined {
  const electronProcess = process as NodeJS.Process & { resourcesPath?: string };
  const resourcesPath = electronProcess.resourcesPath ?? process.cwd();
  return path.join(resourcesPath, "bin", process.platform, process.arch, binaryName);
}

function pathCandidates(binaryName: string): string[] {
  const entries = (process.env.PATH ?? "")
    .split(path.delimiter)
    .filter((entry) => entry.length > 0);

  const commonUnixPaths =
    process.platform === "win32"
      ? []
      : ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"];

  return [...entries, ...commonUnixPaths].map((entry) => path.join(entry, binaryName));
}

function isExecutableFile(candidate: string): boolean {
  try {
    fs.accessSync(candidate, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function readVersion(executable: string): Promise<string | undefined> {
  try {
    const output = await runProcess(executable, ["-version"], { timeoutMs: 5_000 });
    return output.stdout.toString("utf8").split(/\r?\n/)[0]?.trim();
  } catch {
    return undefined;
  }
}

async function hasH264Encoder(executable: string): Promise<boolean> {
  try {
    const output = await runProcess(executable, ["-hide_banner", "-encoders"], { timeoutMs: 5_000 });
    return output.exitCode === 0 && /\blibx264\b/.test(output.stdout.toString("utf8"));
  } catch {
    return false;
  }
}

export function defaultExportPath(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(os.tmpdir(), `chroma-node-export-${timestamp}.mp4`);
}
