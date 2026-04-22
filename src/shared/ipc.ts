export const IPC_CONTRACT_VERSION = 1 as const;

export type IpcContractVersion = typeof IPC_CONTRACT_VERSION;

export const IpcChannel = {
  SelectMedia: "dialog:select-media",
  SaveProject: "project:save",
  OpenProject: "project:open",
  GetDiagnostics: "ffmpeg:get-diagnostics",
  ProbeMedia: "media:probe",
  ExtractFrame: "frame:extract",
  ExportSynthetic: "export:synthetic"
} as const;

export type IpcChannelName = (typeof IpcChannel)[keyof typeof IpcChannel];

export type AppErrorCode =
  | "FFMPEG_MISSING"
  | "FFPROBE_MISSING"
  | "FILE_NOT_FOUND"
  | "UNSUPPORTED_MEDIA"
  | "PROBE_FAILED"
  | "FRAME_EXTRACT_FAILED"
  | "EXPORT_FAILED"
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
  durationSeconds: number;
  frameRate: number;
  totalFrames?: number;
  hasAudio: boolean;
  rotation: number;
  videoStreamIndex: number;
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

export interface ExportJobResult {
  outputPath: string;
  width: number;
  height: number;
  frameCount: number;
  fps: number;
  codec: string;
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
}

export interface ChromaNodeApi {
  selectMedia(): Promise<VersionedResponse<SelectMediaResponse>>;
  saveProject(request: SaveProjectRequest): Promise<VersionedResponse<SaveProjectResult>>;
  openProject(): Promise<VersionedResponse<OpenProjectResult>>;
  getDiagnostics(): Promise<VersionedResponse<FfmpegDiagnostics>>;
  probeMedia(request: ProbeMediaRequest): Promise<VersionedResponse<MediaRef>>;
  extractFrame(request: FrameExtractRequest): Promise<VersionedResponse<DecodedFrame>>;
  exportSynthetic(request?: ExportSyntheticRequest): Promise<VersionedResponse<ExportJobResult>>;
}

declare global {
  interface Window {
    chromaNode?: ChromaNodeApi;
  }
}
