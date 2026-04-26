import crypto from "node:crypto";
import path from "node:path";
import type { ExportQuality, MediaRef } from "../shared/ipc.js";
import type { ChromaProject } from "../shared/project.js";
import { clampDisplayWidth, clampDisplayHeight } from "../shared/mediaGeometry.js";
import { sanitizeProject } from "../shared/project.js";
import { appError } from "./errors.js";

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

  if (path.extname(outputPath).toLowerCase() !== ".mp4") {
    issues.push("H.264 export must use an .mp4 output path.");
  }

  if (path.resolve(outputPath) === path.resolve(media.sourcePath)) {
    issues.push("Export output cannot overwrite the source media.");
  }

  return issues;
}

export function planExportGeometry(media: MediaRef): { width: number; height: number } {
  const width = clampDisplayWidth(media.displayWidth);
  const height = clampDisplayHeight(media.displayHeight);
  return { width, height };
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

  if (path.extname(outputPath).toLowerCase() !== ".mp4") {
    throw appError("EXPORT_FAILED", "H.264 export must use an .mp4 output path.", outputPath);
  }

  if (path.resolve(outputPath) === path.resolve(media.sourcePath)) {
    throw appError("EXPORT_FAILED", "Export output cannot overwrite the source media.", outputPath);
  }

  const quality = request.quality ?? project.exportSettings.quality ?? "standard";
  const { width, height } = planExportGeometry(media);
  const { fps, totalFrames } = computeExportFps(media);
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
