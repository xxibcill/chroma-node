export const IPC_CONTRACT_VERSION = 1 as const;

export type IpcContractVersion = typeof IPC_CONTRACT_VERSION;

export const IpcChannel = {
  SelectMedia: "dialog:select-media",
  SaveProject: "project:save",
  OpenProject: "project:open",
  RelinkMedia: "media:relink",
  GetDiagnostics: "ffmpeg:get-diagnostics",
  ProbeMedia: "media:probe",
  ExtractFrame: "frame:extract",
  ExportSynthetic: "export:synthetic",
  StartExport: "export:start",
  CancelExport: "export:cancel",
  ExportProgress: "export:progress"
} as const;

export type IpcChannelName = (typeof IpcChannel)[keyof typeof IpcChannel];

export type AppErrorCode =
  | "FFMPEG_MISSING"
  | "FFPROBE_MISSING"
  | "FILE_NOT_FOUND"
  | "UNSUPPORTED_MEDIA"
  | "PROBE_FAILED"
  | "FRAME_EXTRACT_FAILED"
  | "TRACKING_FAILED"
  | "EXPORT_FAILED"
  | "EXPORT_CANCELLED"
  | "EXPORT_OUTPUT_EXISTS"
  | "PROJECT_SAVE_FAILED"
  | "PROJECT_OPEN_FAILED"
  | "PROJECT_VALIDATION_FAILED"
  | "USER_CANCELLED"
  | "UNKNOWN";

export interface AppError {
  code: AppErrorCode;
  message: string;
  detail?: string;
}

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: AppError };

export interface VersionedRequest<T> {
  version: IpcContractVersion;
  payload: T;
}

export interface VersionedResponse<T> {
  version: IpcContractVersion;
  result: Result<T>;
}

export interface FfmpegDiagnostics {
  ffmpegPath?: string;
  ffprobePath?: string;
  ffmpegVersion?: string;
  ffprobeVersion?: string;
  h264EncoderAvailable: boolean;
  available: boolean;
  errors: AppError[];
}

export interface SelectMediaResponse {
  sourcePath: string;
}

export interface ProbeMediaRequest {
  sourcePath: string;
}

export interface MediaRef {
  id: string;
  sourcePath: string;
  fileName: string;
  container: string;
  codec: string;
  width: number;
  height: number;
  displayWidth: number;
  displayHeight: number;
  durationSeconds: number;
  frameRate: number;
  totalFrames?: number;
  hasAudio: boolean;
  rotation: number;
  videoStreamIndex: number;
}

export { normalizeRotation } from "./mediaGeometry.js";

export function getDisplaySize(media: { width: number; height: number; rotation: number }): { displayWidth: number; displayHeight: number } {
  const rotated = media.rotation === 90 || media.rotation === 270;
  return rotated
    ? { displayWidth: media.height, displayHeight: media.width }
    : { displayWidth: media.width, displayHeight: media.height };
}

export interface FrameExtractRequest {
  sourcePath: string;
  timeSeconds?: number;
  frameIndex?: number;
  maxWidth?: number;
}

export interface DecodedFrame {
  width: number;
  height: number;
  mimeType: "image/png";
  dataUrl: string;
}

export interface ExportSyntheticRequest {
  outputPath?: string;
  width?: number;
  height?: number;
  frameCount?: number;
  fps?: number;
}

export type ExportQuality = "draft" | "standard" | "high";
export type ExportJobState = "pending" | "running" | "canceled" | "failed" | "completed";

export interface ExportProjectRequest {
  project: import("./project.js").ChromaProject;
  outputPath?: string;
  overwriteConfirmed?: boolean;
  quality?: ExportQuality;
}

export interface CancelExportRequest {
  jobId: string;
}

export interface ExportProgress {
  jobId: string;
  state: ExportJobState;
  currentFrame: number;
  totalFrames: number;
  percent: number;
  elapsedMs: number;
  outputPath?: string;
  message: string;
  error?: AppError;
}

export interface ExportJobResult {
  jobId?: string;
  outputPath: string;
  width: number;
  height: number;
  frameCount: number;
  fps: number;
  codec: string;
  container?: string;
  hasAudio?: boolean;
  durationSeconds: number;
}

export interface SaveProjectRequest {
  project: import("./project.js").ChromaProject;
  projectPath?: string;
}

export interface SaveProjectResult {
  projectPath: string;
}

export interface OpenProjectResult {
  project: import("./project.js").ChromaProject;
  projectPath: string;
  missingMedia: boolean;
  missingMediaPath?: string;
}

export interface RelinkMediaRequest {
  originalPath: string;
  replacementPath: string;
}

export type RelinkMediaResult =
  | { ok: true; media: MediaRef }
  | { ok: false; error: AppError };

export interface ChromaNodeApi {
  selectMedia(): Promise<VersionedResponse<SelectMediaResponse>>;
  saveProject(request: SaveProjectRequest): Promise<VersionedResponse<SaveProjectResult>>;
  openProject(): Promise<VersionedResponse<OpenProjectResult>>;
  relinkMedia(request: RelinkMediaRequest): Promise<RelinkMediaResult>;
  getDiagnostics(): Promise<VersionedResponse<FfmpegDiagnostics>>;
  probeMedia(request: ProbeMediaRequest): Promise<VersionedResponse<MediaRef>>;
  extractFrame(request: FrameExtractRequest): Promise<VersionedResponse<DecodedFrame>>;
  exportSynthetic(request?: ExportSyntheticRequest): Promise<VersionedResponse<ExportJobResult>>;
  startExport(request: ExportProjectRequest): Promise<VersionedResponse<ExportJobResult>>;
  cancelExport(request: CancelExportRequest): Promise<VersionedResponse<ExportProgress>>;
  onExportProgress(listener: (progress: ExportProgress) => void): () => void;
}

declare global {
  interface Window {
    chromaNode?: ChromaNodeApi;
  }
}
