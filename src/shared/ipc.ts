export const IPC_CONTRACT_VERSION = 1 as const;

export type IpcContractVersion = typeof IPC_CONTRACT_VERSION;

import type { LibraryItem, LibraryItemType } from "./library.js";
import type { PackDuplicateStrategy, PackImportResult } from "./pack.js";
export type { LibraryItem, LibraryItemType, PackImportResult, PackDuplicateStrategy };

export const IpcChannel = {
  SelectMedia: "dialog:select-media",
  SaveProject: "project:save",
  OpenProject: "project:open",
  LoadProgress: "progress:load",
  SaveProgress: "progress:save",
  ResetProgress: "progress:reset",
  RelinkMedia: "media:relink",
  GetDiagnostics: "ffmpeg:get-diagnostics",
  ProbeMedia: "media:probe",
  ExtractFrame: "frame:extract",
  ExportSynthetic: "export:synthetic",
  StartExport: "export:start",
  CancelExport: "export:cancel",
  ExportProgress: "export:progress",
  ExportStill: "export:still",
  ExportSequence: "export:sequence",
  LibraryLoad: "library:load",
  LibrarySave: "library:save",
  LibraryAdd: "library:add",
  LibraryUpdate: "library:update",
  LibraryDelete: "library:delete",
  LibraryGet: "library:get",
  LibraryDuplicate: "library:duplicate",
  LibraryToggleFavorite: "library:toggle-favorite",
  PackExport: "pack:export",
  PackImport: "pack:import",
  PackList: "pack:list",
  PackUninstall: "pack:uninstall",
  // Phase 21: Review and Collaboration
  VersionCreate: "review:version-create",
  VersionList: "review:version-list",
  VersionSwitch: "review:version-switch",
  VersionDelete: "review:version-delete",
  VersionUpdate: "review:version-update",
  AnnotationCreate: "review:annotation-create",
  AnnotationUpdate: "review:annotation-update",
  AnnotationDelete: "review:annotation-delete",
  AnnotationList: "review:annotation-list",
  ReviewPackageExport: "review:package-export",
  ReviewPackageImport: "review:package-import",
  FeedbackImport: "review:feedback-import",
  FeedbackResolve: "review:feedback-resolve",
  HandoffExport: "review:handoff-export",
  HandoffImport: "review:handoff-import",
  HandoffValidate: "review:handoff-validate"
} as const;

export type IpcChannelName = (typeof IpcChannel)[keyof typeof IpcChannel];

export interface LearningProgressPayload {
  schemaVersion: string;
  lessonsCompleted: string[];
  lessonAttempts: Array<{
    lessonId: string;
    startedAt: number;
    completedAt?: number;
    stepResults: Array<{ stepId: string; passed: boolean; actualValue?: number }>;
    completed: boolean;
  }>;
  practiceAttempts: Array<{
    targetId: string;
    projectId: string;
    startedAt: number;
    completedAt?: number;
    lumaScore?: number;
    contrastScore?: number;
    saturationScore?: number;
    skinToneScore?: number;
    overallScore?: number;
    completed: boolean;
  }>;
  savedLooks: Array<{ id: string; name: string; nodes: unknown[]; createdAt: number }>;
  lastActiveLesson?: string;
  createdAt: number;
  updatedAt: number;
}

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
  hevcEncoderAvailable: boolean;
  proresEncoderAvailable: boolean;
  vp9EncoderAvailable: boolean;
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
  audioStreamIndex?: number;
  rotation: number;
  videoStreamIndex: number;
  colorMetadata?: import("./colorEngine.js").ColorMetadata;
  detectedColorProfile?: string;
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

export interface ExportStillRequest {
  sourcePath: string;
  outputPath?: string;
  frameIndex?: number;
  timeSeconds?: number;
  nodes: import("./colorEngine.js").ColorNode[];
  width: number;
  height: number;
  colorManagement?: import("./colorEngine.js").ColorManagementSettings;
  sourceTransfer?: import("./colorEngine.js").TransferFunctionType;
  sourcePrimaries?: import("./colorEngine.js").ColorPrimariesType;
  isHdr?: boolean;
}

export interface ExportSequenceRequest {
  project: import("./project.js").ChromaProject;
  outputPath?: string;
  startFrame?: number;
  endFrame?: number;
  overwriteConfirmed?: boolean;
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
  audioBehavior?: string;
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

export interface LibraryAddRequest {
  type: LibraryItemType;
  name: string;
  description?: string;
  author?: string;
  authorId?: string;
  tags: string[];
  thumbnail?: { dataUrl?: string; width?: number; height?: number };
  favorite?: boolean;
  compatibility: {
    appVersionMin?: string;
    appVersionMax?: string;
    schemaVersionMin?: string;
    schemaVersionMax?: string;
    colorProfiles: string[];
    lutFormats?: string[];
  };
  trust?: "first-party" | "verified-creator" | "local";
  source?: { projectId?: string; projectName?: string; nodeIndex?: number; frameTime?: number };
  data: {
    kind: "look" | "recipe";
    nodes: unknown[];
    compatibleProfiles: string[];
    tags?: string[];
  } | {
    kind: "lut";
    lutType?: "creative" | "technical";
    cubeContent?: string;
    size?: number;
    fileName?: string;
  } | {
    kind: "still";
    imageData: string;
    width: number;
    height: number;
    sourceMediaId?: string;
  } | {
    kind: "sample-project";
    projectJson: string;
    mediaPaths: string[];
  } | {
    kind: "lesson-pack";
    lessonIds: string[];
    customLessons?: unknown[];
  };
}

export interface LibraryUpdateRequest {
  id: string;
  updates: Partial<Omit<LibraryItem, "id" | "createdAt" | "updatedAt">>;
}

export interface LibraryDeleteRequest {
  id: string;
}

export interface LibraryDuplicateRequest {
  id: string;
  newName?: string;
}

export interface LibraryToggleFavoriteRequest {
  id: string;
}

export interface PackExportRequest {
  itemIds: string[];
  name: string;
  description?: string;
  author?: string;
  options?: {
    includeThumbnails?: boolean;
    includeSourceReferences?: boolean;
  };
}

export interface PackImportRequest {
  duplicateStrategy?: "skip" | "replace" | "rename";
  trustOverride?: "first-party" | "verified-creator" | "local";
}

export interface InstalledPack {
  name: string;
  path: string;
  manifest: {
    packId: string;
    name: string;
    version: string;
    author?: string;
    trust: "first-party" | "verified-creator" | "local";
    items: { id: string; type: string; name: string }[];
  };
}

// Phase 21: Review and Collaboration IPC types
import type { Annotation, AnnotationStatus, ApprovalEntry, FeedbackFile, FeedbackNote, GradeVersion, HandoffPackageManifest, ReviewPackageManifest, ReviewPackageType, ReviewStatus } from "./project.js";

export type { Annotation, AnnotationStatus, ApprovalEntry, FeedbackFile, FeedbackNote, GradeVersion, HandoffPackageManifest, ReviewPackageManifest, ReviewPackageType, ReviewStatus };

export interface VersionCreateRequest {
  name: string;
  authorLabel?: string;
  notes?: string;
  duplicateFromCurrent?: boolean;
}

export interface VersionUpdateRequest {
  versionId: string;
  updates: Partial<Pick<GradeVersion, "name" | "status" | "notes" | "authorLabel" | "exportPath">>;
  approvalEntry?: ApprovalEntry;
}

export interface VersionDeleteRequest {
  versionId: string;
}

export interface VersionSwitchRequest {
  versionId: string;
}

export interface VersionListResult {
  versions: GradeVersion[];
  activeVersionId?: string;
}

export interface AnnotationCreateRequest {
  frameIndex: number;
  timecode: string;
  text: string;
  geometry?: Annotation["geometry"];
  versionId?: string;
  authorLabel?: string;
}

export interface AnnotationUpdateRequest {
  annotationId: string;
  updates: Partial<Pick<Annotation, "text" | "status" | "geometry">>;
}

export interface AnnotationDeleteRequest {
  annotationId: string;
}

export interface AnnotationListRequest {
  versionId?: string;
  frameStart?: number;
  frameEnd?: number;
  status?: AnnotationStatus;
}

export interface ReviewPackageExportRequest {
  versionIds: string[];
  stillIds: string[];
  scopeSnapshotIds: string[];
  packageType: ReviewPackageType;
  packageName: string;
  includeMedia: boolean;
  redactPaths: boolean;
}

export interface ReviewPackageImportRequest {
  packagePath: string;
  duplicateStrategy?: "skip" | "replace";
}

export interface ReviewPackageValidateRequest {
  packagePath: string;
}

export interface FeedbackImportRequest {
  feedbackPath: string;
  duplicateStrategy?: "skip" | "replace" | "rename";
}

export interface FeedbackResolveRequest {
  feedbackNoteId: string;
  resolved: boolean;
  resolvedBy?: string;
}

export interface HandoffPackageExportRequest {
  packageMode: import("./project.js").HandoffPackageMode;
  packageName: string;
  includeMedia: boolean;
  includeCache: boolean;
  includeExports: boolean;
  includeLogs: boolean;
  redactPaths: boolean;
}

export interface HandoffPackageImportRequest {
  packagePath: string;
}

export interface HandoffPackageValidateRequest {
  packagePath: string;
}

export interface ChromaNodeApi {
  selectMedia(): Promise<VersionedResponse<SelectMediaResponse>>;
  saveProject(request: SaveProjectRequest): Promise<VersionedResponse<SaveProjectResult>>;
  openProject(): Promise<VersionedResponse<OpenProjectResult>>;
  loadProgress(): Promise<VersionedResponse<LearningProgressPayload>>;
  saveProgress(progress: LearningProgressPayload): Promise<VersionedResponse<void>>;
  resetProgress(): Promise<VersionedResponse<void>>;
  relinkMedia(request: RelinkMediaRequest): Promise<RelinkMediaResult>;
  getDiagnostics(): Promise<VersionedResponse<FfmpegDiagnostics>>;
  probeMedia(request: ProbeMediaRequest): Promise<VersionedResponse<MediaRef>>;
  extractFrame(request: FrameExtractRequest): Promise<VersionedResponse<DecodedFrame>>;
  exportSynthetic(request?: ExportSyntheticRequest): Promise<VersionedResponse<ExportJobResult>>;
  exportStill(request: ExportStillRequest): Promise<VersionedResponse<ExportJobResult>>;
  exportSequence(request: ExportSequenceRequest): Promise<VersionedResponse<ExportJobResult>>;
  startExport(request: ExportProjectRequest): Promise<VersionedResponse<ExportJobResult>>;
  cancelExport(request: CancelExportRequest): Promise<VersionedResponse<ExportProgress>>;
  onExportProgress(listener: (progress: ExportProgress) => void): () => void;
  loadLibrary(): Promise<VersionedResponse<LibraryItem[]>>;
  addLibraryItem(request: LibraryAddRequest): Promise<VersionedResponse<LibraryItem>>;
  updateLibraryItem(request: LibraryUpdateRequest): Promise<VersionedResponse<LibraryItem>>;
  deleteLibraryItem(request: LibraryDeleteRequest): Promise<VersionedResponse<void>>;
  getLibraryItem(request: { id: string }): Promise<VersionedResponse<LibraryItem | undefined>>;
  duplicateLibraryItem(request: LibraryDuplicateRequest): Promise<VersionedResponse<LibraryItem | undefined>>;
  toggleLibraryItemFavorite(request: LibraryToggleFavoriteRequest): Promise<VersionedResponse<LibraryItem>>;
  exportPack(request: PackExportRequest): Promise<VersionedResponse<{ path: string }>>;
  importPack(request?: PackImportRequest): Promise<VersionedResponse<import("./pack.js").PackImportResult>>;
  getInstalledPacks(): Promise<VersionedResponse<InstalledPack[]>>;
  uninstallPack(request: { path: string }): Promise<VersionedResponse<void>>;
  // Phase 21: Grade Versions
  createVersion(request: VersionCreateRequest): Promise<VersionedResponse<GradeVersion>>;
  listVersions(): Promise<VersionedResponse<VersionListResult>>;
  switchVersion(request: VersionSwitchRequest): Promise<VersionedResponse<GradeVersion>>;
  deleteVersion(request: VersionDeleteRequest): Promise<VersionedResponse<void>>;
  updateVersion(request: VersionUpdateRequest): Promise<VersionedResponse<GradeVersion>>;
  // Phase 21: Annotations
  createAnnotation(request: AnnotationCreateRequest): Promise<VersionedResponse<Annotation>>;
  updateAnnotation(request: AnnotationUpdateRequest): Promise<VersionedResponse<Annotation>>;
  deleteAnnotation(request: AnnotationDeleteRequest): Promise<VersionedResponse<void>>;
  listAnnotations(request: AnnotationListRequest): Promise<VersionedResponse<Annotation[]>>;
  // Phase 21: Review Package
  exportReviewPackage(request: ReviewPackageExportRequest): Promise<VersionedResponse<{ path: string; manifest: ReviewPackageManifest }>>;
  importReviewPackage(request: ReviewPackageImportRequest): Promise<VersionedResponse<ReviewPackageManifest>>;
  // Phase 21: Feedback
  importFeedback(request: FeedbackImportRequest): Promise<VersionedResponse<FeedbackFile>>;
  resolveFeedback(request: FeedbackResolveRequest): Promise<VersionedResponse<void>>;
  // Phase 21: Handoff
  exportHandoffPackage(request: HandoffPackageExportRequest): Promise<VersionedResponse<{ path: string; manifest: HandoffPackageManifest }>>;
  importHandoffPackage(request: HandoffPackageImportRequest): Promise<VersionedResponse<void>>;
  validateHandoffPackage(request: HandoffPackageValidateRequest): Promise<VersionedResponse<HandoffPackageManifest>>;
}

declare global {
  interface Window {
    chromaNode?: ChromaNodeApi;
  }
}
