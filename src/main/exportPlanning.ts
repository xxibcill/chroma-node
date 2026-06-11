import crypto from "node:crypto";
import path from "node:path";
import type { ExportQuality, MediaRef } from "../shared/ipc.js";
import type { ChromaProject } from "../shared/project.js";
import { sanitizeProject } from "../shared/project.js";
import {
  computeExportGeometry,
  validateExportGeometry
} from "../shared/exportGeometry.js";
import { appError } from "./errors.js";

export {
  PRESET_DIMENSIONS,
  computeExportGeometry,
  planExportGeometry,
  validateExportGeometry
} from "../shared/exportGeometry.js";

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

export interface ExportPlanningResult {
  snapshot: ExportJobSnapshot;
  validationIssues: string[];
}

export function validateExportRequest(request: {
  project: ChromaProject;
  outputPath?: string;
  overwriteConfirmed?: boolean;
  quality?: ExportQuality;
}): string[] {
  const issues: string[] = [];
  const project = request.project;
  const media = project.media;

  if (!media) {
    issues.push("Export cannot start without imported media.");
    return issues;
  }

  const outputPath = normalizeOutputPath(request.outputPath ?? project.exportSettings.outputPath);
  if (!outputPath) {
    issues.push("Export output path is required.");
    return issues;
  }

  const codec = project.exportSettings.codec;
  const ext = codecContainerExt(codec);
  if (!outputPath.toLowerCase().endsWith(ext)) {
    issues.push(`${codec.toUpperCase()} export must use a${ext.startsWith(".m") ? "n" : ""} ${ext} output path.`);
  }

  if (path.resolve(outputPath) === path.resolve(media.sourcePath)) {
    issues.push("Export output cannot overwrite the source media.");
  }

  const geometryIssues = validateExportGeometry(project.exportSettings, media);
  issues.push(...geometryIssues);

  return issues;
}

export function computeExportFps(media: MediaRef): { fps: number; totalFrames: number } {
  const fps = clampNumber(media.frameRate, 1, 240);
  const totalFrames = Math.max(1, media.totalFrames ?? (Math.round(media.durationSeconds * fps) || 1));
  return { fps, totalFrames };
}

export function createExportJobSnapshot(request: {
  project: ChromaProject;
  outputPath?: string;
  overwriteConfirmed?: boolean;
  quality?: ExportQuality;
}): ExportJobSnapshot {
  const project = sanitizeProject(cloneJson(request.project));
  const media = project.media;
  if (!media) {
    throw appError("EXPORT_FAILED", "Export cannot start without imported media.");
  }

  const outputPath = normalizeOutputPath(request.outputPath ?? project.exportSettings.outputPath);
  if (!outputPath) {
    throw appError("EXPORT_FAILED", "Export output path is required.");
  }

  const codec = project.exportSettings.codec;
  const ext = codecContainerExt(codec);
  if (!outputPath.toLowerCase().endsWith(ext)) {
    throw appError("EXPORT_FAILED", `${codec.toUpperCase()} export must use a${ext.startsWith(".m") ? "n" : ""} ${ext} output path.`, outputPath);
  }

  if (path.resolve(outputPath) === path.resolve(media.sourcePath)) {
    throw appError("EXPORT_FAILED", "Export output cannot overwrite the source media.", outputPath);
  }

  const geometryIssues = validateExportGeometry(project.exportSettings, media);
  if (geometryIssues.length > 0) {
    throw appError("EXPORT_FAILED", `Export geometry validation failed: ${geometryIssues.join("; ")}`);
  }

  const quality = request.quality ?? project.exportSettings.quality ?? "standard";
  const { width, height } = computeExportGeometry(project.exportSettings, media);
  const { fps, totalFrames } = computeExportFps(media);
  const id = `export-${crypto.randomUUID()}`;

  return {
    id,
    project,
    media,
    outputPath,
    tempOutputPath: `${outputPath}.part-${id}${ext}`,
    quality,
    width,
    height,
    fps,
    totalFrames,
    startedAt: Date.now()
  };
}

function codecContainerExt(codec: string): string {
  switch (codec) {
    case "h264":
    case "hevc":
      return ".mp4";
    case "prores":
      return ".mov";
    case "vp9":
      return ".webm";
    default:
      return ".mp4";
  }
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeOutputPath(outputPath: string | undefined): string | undefined {
  const trimmed = outputPath?.trim();
  return trimmed ? path.resolve(trimmed) : undefined;
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}
