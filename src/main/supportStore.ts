import { app } from "electron";
import { existsSync } from "fs";
import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import {
  type CrashReport,
  type DiagnosticEntry,
  type SupportBundleManifest,
  type FeedbackSubmission,
  type FeedbackSubmissionResult,
  createCrashReport,
  createDiagnosticEntry,
  SUPPORT_SCHEMA_VERSION,
  redactSensitivePath
} from "../shared/support.js";
import { getFfmpegDiagnostics } from "./ffmpeg.js";
import { getCurrentProject } from "./projectFile.js";

const CRASH_REPORTS_DIR = "crash-reports";
const SUPPORT_BUNDLES_DIR = "support-bundles";

function getUserDataPath(): string {
  return app.getPath("userData");
}

function getCrashReportsDir(): string {
  return path.join(getUserDataPath(), CRASH_REPORTS_DIR);
}

function getSupportBundlesDir(): string {
  return path.join(getUserDataPath(), SUPPORT_BUNDLES_DIR);
}

async function ensureDir(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}

export async function captureCrash(data: {
  crashType: string;
  message: string;
  stackTrace?: string;
  projectId?: string;
}): Promise<CrashReport> {
  const crash = createCrashReport({
    crashType: data.crashType,
    message: data.message,
    stackTrace: data.stackTrace,
    appVersion: app.getVersion(),
    osInfo: process.platform,
    projectId: data.projectId
  });

  const dir = getCrashReportsDir();
  await ensureDir(dir);
  const filePath = path.join(dir, `${crash.id}.json`);
  await writeFile(filePath, JSON.stringify(crash, null, 2), "utf8");

  return crash;
}

export async function getDiagnostics(): Promise<DiagnosticEntry[]> {
  const diagnostics: DiagnosticEntry[] = [];
  const project = getCurrentProject();

  diagnostics.push(
    createDiagnosticEntry("app_version", "App Version", app.getVersion(), "app"),
    createDiagnosticEntry("electron_version", "Electron Version", process.versions.electron, "app"),
    createDiagnosticEntry("chrome_version", "Chrome Version", process.versions.chrome, "app"),
    createDiagnosticEntry("node_version", "Node Version", process.versions.node, "app"),
    createDiagnosticEntry("platform", "Platform", process.platform, "system"),
    createDiagnosticEntry("arch", "Architecture", process.arch, "system"),
    createDiagnosticEntry("os_release", "OS Release", process.platform === "darwin" ? "macOS" : process.platform, "system")
  );

  try {
    const ffmpegDiag = await getFfmpegDiagnostics();
    diagnostics.push(
      createDiagnosticEntry("ffmpeg_available", "FFmpeg Available", String(ffmpegDiag.available), "ffmpeg"),
      createDiagnosticEntry("ffmpeg_path", "FFmpeg Path", ffmpegDiag.ffmpegPath || "Not found", "ffmpeg"),
      createDiagnosticEntry("ffmpeg_version", "FFmpeg Version", ffmpegDiag.ffmpegVersion || "Unknown", "ffmpeg"),
      createDiagnosticEntry("h264_encoder", "H.264 Encoder", String(ffmpegDiag.h264EncoderAvailable), "ffmpeg"),
      createDiagnosticEntry("hevc_encoder", "HEVC Encoder", String(ffmpegDiag.hevcEncoderAvailable), "ffmpeg")
    );

    if (ffmpegDiag.errors.length > 0) {
      for (const err of ffmpegDiag.errors) {
        diagnostics.push(
          createDiagnosticEntry("ffmpeg_error", "FFmpeg Error", err.message, "ffmpeg")
        );
      }
    }
  } catch {
    diagnostics.push(
      createDiagnosticEntry("ffmpeg_available", "FFmpeg Available", "false", "ffmpeg")
    );
  }

  if (project) {
    diagnostics.push(
      createDiagnosticEntry("project_name", "Project Name", project.name, "media"),
      createDiagnosticEntry("project_schema", "Schema Version", project.schemaVersion, "media")
    );

    if (project.media) {
      diagnostics.push(
        createDiagnosticEntry("media_width", "Media Width", String(project.media.width), "media"),
        createDiagnosticEntry("media_height", "Media Height", String(project.media.height), "media"),
        createDiagnosticEntry("media_codec", "Media Codec", project.media.codec, "media")
      );
    }
  }

  return diagnostics;
}

export async function createSupportBundle(request: {
  includeLogs?: boolean;
  includeProjectDiagnostics?: boolean;
  includeMediaMetadata?: boolean;
  redactPaths?: boolean;
  contactInfo?: string;
}): Promise<{ path: string; manifest: SupportBundleManifest }> {
  const bundleId = `bundle-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const dir = getSupportBundlesDir();
  await ensureDir(dir);
  const bundleDir = path.join(dir, bundleId);
  await mkdir(bundleDir, { recursive: true });

  const diagnostics = await getDiagnostics();
  const includes: string[] = ["diagnostics"];
  const project = getCurrentProject();

  const manifest: SupportBundleManifest = {
    schemaVersion: SUPPORT_SCHEMA_VERSION,
    bundleId,
    createdAt: Date.now(),
    appVersion: app.getVersion(),
    includes,
    redacted: request.redactPaths ?? true,
    diagnostics,
    contactInfo: request.contactInfo
  };

  if (request.includeProjectDiagnostics && project) {
    manifest.projectSummary = `Project: ${project.name} (${project.projectId})`;
    includes.push("project-summary");
  }

  if (request.includeMediaMetadata && project?.media) {
    manifest.mediaMetadata = {
      sourcePath: request.redactPaths ? "REDACTED" : project.media.sourcePath,
      codec: project.media.codec,
      width: project.media.width,
      height: project.media.height
    };
    includes.push("media-metadata");
  }

  if (request.includeLogs) {
    manifest.logs = await collectApplicationLogs(request.redactPaths ?? true);
    includes.push("logs");
  }

  const manifestPath = path.join(bundleDir, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  return {
    path: bundleDir,
    manifest
  };
}

async function collectApplicationLogs(redactPaths: boolean): Promise<string[]> {
  const logDir = app.getPath("logs");
  if (!existsSync(logDir)) {
    return ["No application log directory was found."];
  }

  const entries = await readdir(logDir, { withFileTypes: true });
  const logFiles = entries
    .filter((entry) => entry.isFile() && /\.(log|txt)$/i.test(entry.name))
    .slice(0, 5);

  if (logFiles.length === 0) {
    return ["No application log files were found."];
  }

  const logs: string[] = [];
  for (const file of logFiles) {
    const filePath = path.join(logDir, file.name);
    const content = await readFile(filePath, "utf8").catch(() => "");
    const boundedContent = content.slice(-32_000);
    logs.push(`${file.name}\n${redactPaths ? redactSensitivePath(boundedContent) : boundedContent}`);
  }

  return logs;
}

export async function submitFeedback(request: FeedbackSubmission): Promise<FeedbackSubmissionResult> {
  const submission: FeedbackSubmission = {
    ...request,
    id: `feedback-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    schemaVersion: SUPPORT_SCHEMA_VERSION,
    createdAt: Date.now()
  };

  const dir = getSupportBundlesDir();
  await ensureDir(dir);
  const filePath = path.join(dir, `feedback-${submission.id}.json`);
  await writeFile(filePath, JSON.stringify(submission, null, 2), "utf8");

  return {
    success: true,
    id: submission.id
  };
}
