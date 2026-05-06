import { dialog, ipcMain } from "electron";
import type {
  CancelExportRequest,
  DecodedFrame,
  ExportJobResult,
  ExportProgress,
  ExportProjectRequest,
  ExportSequenceRequest,
  ExportStillRequest,
  ExportSyntheticRequest,
  FfmpegDiagnostics,
  FrameExtractRequest,
  InstalledPack,
  LearningProgressPayload,
  LibraryAddRequest,
  LibraryDeleteRequest,
  LibraryDuplicateRequest,
  LibraryItem,
  LibraryToggleFavoriteRequest,
  LibraryUpdateRequest,
  MediaRef,
  OpenProjectResult,
  PackExportRequest,
  PackImportRequest,
  PackImportResult,
  ProbeMediaRequest,
  SaveProjectRequest,
  SaveProjectResult,
  SelectMediaResponse,
  VersionedResponse
} from "../shared/ipc.js";
import type {
  AnnotationCreateRequest,
  AnnotationDeleteRequest,
  AnnotationListRequest,
  AnnotationUpdateRequest,
  FeedbackImportRequest,
  FeedbackResolveRequest,
  HandoffPackageExportRequest,
  HandoffPackageImportRequest,
  HandoffPackageValidateRequest,
  ReviewPackageExportRequest,
  ReviewPackageImportRequest,
  VersionCreateRequest,
  VersionDeleteRequest,
  VersionListResult,
  VersionSwitchRequest,
  VersionUpdateRequest
} from "../shared/ipc.js";
import { IpcChannel } from "../shared/ipc.js";
import { appError, fail, isAppError, ok } from "./errors.js";
import { cancelExport, exportProject, outputPathExists } from "./exportProject.js";
import { exportSequence, findExistingSequenceOutput } from "./exportSequence.js";
import { computeExportFps } from "./exportPlanning.js";
import { exportStill } from "./exportStill.js";
import { exportSynthetic } from "./exportSynthetic.js";
import { extractFrame } from "./frame.js";
import { getFfmpegDiagnostics } from "./ffmpeg.js";
import { probeMedia } from "./mediaProbe.js";
import { relinkMedia } from "./mediaRelink.js";
import {
  addLibraryItem,
  deleteLibraryItem,
  duplicateLibraryItem,
  getLibraryItem,
  loadLibrary,
  toggleLibraryItemFavorite,
  updateLibraryItem
} from "./libraryStore.js";
import {
  exportPack,
  getInstalledPacks,
  importPack,
  uninstallPack
} from "./packStore.js";
import {
  createVersion,
  deleteVersion,
  listVersions,
  switchVersion,
  updateVersion
} from "./reviewVersionStore.js";
import {
  createAnnotation,
  deleteAnnotation,
  listAnnotations,
  updateAnnotation
} from "./annotationStore.js";
import {
  exportReviewPackage,
  importReviewPackage
} from "./reviewPackageStore.js";
import {
  importFeedback,
  resolveFeedback
} from "./feedbackStore.js";
import {
  exportHandoffPackage,
  importHandoffPackage,
  validateHandoffPackage
} from "./handoffStore.js";
import { loadProgress, resetProgress, saveProgress } from "./progressStore.js";
import { openProjectFile, saveProjectFile } from "./projectFile.js";
import {
  validateLicense,
  checkFeatureEntitlement as checkFeatureEntitlementFn,
  startTrial,
  activateLicense,
  deactivateLicense,
  getEntitlementState,
  clearLicense
} from "./licenseStore.js";
import {
  getConsent,
  setConsent,
  trackEvent,
  flushQueue,
  deleteAllTelemetryData,
  getQueueSize
} from "./telemetryStore.js";
import {
  captureCrash,
  getDiagnostics,
  createSupportBundle,
  submitFeedback
} from "./supportStore.js";
import {
  checkForUpdate as checkForUpdateFn,
  getUpdateStatus,
  loadUpdateConfig,
  setUpdateChannel,
  setAutoCheck,
  getAvailableChannels,
  type UpdateStoreConfig
} from "./updateStore.js";
import type { LicenseActivationRequest, EntitlementFlags, TelemetryConsent } from "../shared/ipc.js";
import type { EntitlementState } from "../shared/entitlement.js";
import type { LicenseValidationResult, EntitlementCheckResult } from "../shared/entitlement.js";
import type { CrashReport, DiagnosticEntry, SupportBundleManifest, FeedbackSubmission, FeedbackSubmissionResult } from "../shared/support.js";
import type { UpdateChannel } from "../shared/update.js";
import type { UpdateCheckResult, UpdateStatus, ReleaseChannelConfig } from "../shared/update.js";
import type { PricingTier, OnboardingExperiment, LaunchMetrics } from "../shared/launchConfig.js";

export function registerIpcHandlers(): void {
  ipcMain.handle(IpcChannel.SelectMedia, async (): Promise<VersionedResponse<SelectMediaResponse>> => {
    try {
      const selection = await dialog.showOpenDialog({
        title: "Import media",
        properties: ["openFile"],
        filters: [
          { name: "Video", extensions: ["mp4", "mov"] },
          { name: "All Files", extensions: ["*"] }
        ]
      });

      if (selection.canceled || !selection.filePaths[0]) {
        return fail(appError("USER_CANCELLED", "No media file was selected."));
      }

      return ok({ sourcePath: selection.filePaths[0] });
    } catch (error) {
      return fail(toAppError(error));
    }
  });

  ipcMain.handle(IpcChannel.GetDiagnostics, async (): Promise<VersionedResponse<FfmpegDiagnostics>> => {
    try {
      return ok(await getFfmpegDiagnostics());
    } catch (error) {
      return fail(toAppError(error));
    }
  });

  ipcMain.handle(
    IpcChannel.SaveProject,
    async (_event, request: SaveProjectRequest): Promise<VersionedResponse<SaveProjectResult>> => {
      try {
        return ok(await saveProjectFile(request));
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(IpcChannel.OpenProject, async (): Promise<VersionedResponse<OpenProjectResult>> => {
    try {
      return ok(await openProjectFile());
    } catch (error) {
      return fail(toAppError(error));
    }
  });

  ipcMain.handle(IpcChannel.LoadProgress, async (): Promise<VersionedResponse<LearningProgressPayload>> => {
    try {
      return ok(await loadProgress());
    } catch (error) {
      return fail(toAppError(error));
    }
  });

  ipcMain.handle(
    IpcChannel.SaveProgress,
    async (_event, progress: LearningProgressPayload): Promise<VersionedResponse<void>> => {
      try {
        await saveProgress(progress);
        return ok(undefined);
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(IpcChannel.ResetProgress, async (): Promise<VersionedResponse<void>> => {
    try {
      await resetProgress();
      return ok(undefined);
    } catch (error) {
      return fail(toAppError(error));
    }
  });

  ipcMain.handle(IpcChannel.RelinkMedia, async (_event, request: { originalPath: string; replacementPath: string }) => {
    try {
      return await relinkMedia(request.originalPath, request.replacementPath);
    } catch (error) {
      return fail(toAppError(error));
    }
  });

  ipcMain.handle(
    IpcChannel.ProbeMedia,
    async (_event, request: ProbeMediaRequest): Promise<VersionedResponse<MediaRef>> => {
      try {
        return ok(await probeMedia(request.sourcePath));
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.ExtractFrame,
    async (_event, request: FrameExtractRequest): Promise<VersionedResponse<DecodedFrame>> => {
      try {
        return ok(await extractFrame(request));
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.ExportSynthetic,
    async (_event, request?: ExportSyntheticRequest): Promise<VersionedResponse<ExportJobResult>> => {
      try {
        return ok(await exportSynthetic(request));
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.StartExport,
    async (event, request: ExportProjectRequest): Promise<VersionedResponse<ExportJobResult>> => {
      try {
        const preparedRequest = await prepareExportRequest(request);
        return ok(await exportProject(preparedRequest, (progress) => {
          event.sender.send(IpcChannel.ExportProgress, progress);
        }));
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.CancelExport,
    async (_event, request: CancelExportRequest): Promise<VersionedResponse<ExportProgress>> => {
      try {
        return ok(cancelExport(request.jobId));
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.ExportStill,
    async (_event, request: ExportStillRequest): Promise<VersionedResponse<ExportJobResult>> => {
      try {
        return ok(await exportStill(request));
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.ExportSequence,
    async (_event, request: ExportSequenceRequest): Promise<VersionedResponse<ExportJobResult>> => {
      try {
        const preparedRequest = await prepareSequenceRequest(request);
        return ok(await exportSequence(preparedRequest));
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(IpcChannel.LibraryLoad, async (): Promise<VersionedResponse<LibraryItem[]>> => {
    try {
      return ok(await loadLibrary());
    } catch (error) {
      return fail(toAppError(error));
    }
  });

  ipcMain.handle(
    IpcChannel.LibraryAdd,
    async (_event, request: LibraryAddRequest): Promise<VersionedResponse<LibraryItem>> => {
      try {
        const result = await addLibraryItem(request);
        if (!result.ok) {
          return fail(appError("UNKNOWN", result.errors.map(e => e.message).join("; ")));
        }
        return ok(result.item);
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.LibraryUpdate,
    async (_event, request: LibraryUpdateRequest): Promise<VersionedResponse<LibraryItem>> => {
      try {
        const result = await updateLibraryItem(request.id, request.updates);
        if (!result.ok) {
          return fail(appError("UNKNOWN", result.errors.map(e => e.message).join("; ")));
        }
        return ok(result.item);
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.LibraryDelete,
    async (_event, request: LibraryDeleteRequest): Promise<VersionedResponse<void>> => {
      try {
        await deleteLibraryItem(request.id);
        return ok(undefined);
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.LibraryGet,
    async (_event, request: { id: string }): Promise<VersionedResponse<LibraryItem | undefined>> => {
      try {
        return ok(await getLibraryItem(request.id));
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.LibraryDuplicate,
    async (_event, request: LibraryDuplicateRequest): Promise<VersionedResponse<LibraryItem | undefined>> => {
      try {
        return ok(await duplicateLibraryItem(request.id, request.newName));
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.LibraryToggleFavorite,
    async (_event, request: LibraryToggleFavoriteRequest): Promise<VersionedResponse<LibraryItem>> => {
      try {
        const result = await toggleLibraryItemFavorite(request.id);
        if (!result) {
          return fail(appError("UNKNOWN", `Library item ${request.id} not found`));
        }
        return ok(result);
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.PackExport,
    async (_event, request: PackExportRequest): Promise<VersionedResponse<{ path: string }>> => {
      try {
        const items = await loadLibrary();
        const itemsToExport = items.filter(item => request.itemIds.includes(item.id));
        if (itemsToExport.length === 0) {
          return fail(appError("UNKNOWN", "No valid items found to export"));
        }
        const result = await exportPack(itemsToExport, request.name);
        if ("error" in result) {
          return fail(appError("UNKNOWN", result.error));
        }
        return ok(result);
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.PackImport,
    async (_event, request: PackImportRequest): Promise<VersionedResponse<PackImportResult>> => {
      try {
        const options = {
          duplicateStrategy: request?.duplicateStrategy ?? "skip",
          trustOverride: request?.trustOverride
        };
        const result = await importPack(options);
        return ok(result);
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(IpcChannel.PackList, async (): Promise<VersionedResponse<InstalledPack[]>> => {
    try {
      return ok(await getInstalledPacks());
    } catch (error) {
      return fail(toAppError(error));
    }
  });

  ipcMain.handle(
    IpcChannel.PackUninstall,
    async (_event, request: { path: string }): Promise<VersionedResponse<void>> => {
      try {
        const removed = await uninstallPack(request.path);
        if (!removed) {
          return fail(appError("UNKNOWN", "Pack was not found or is outside the installed pack directory."));
        }
        return ok(undefined);
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  // Phase 21: Grade Versions
  ipcMain.handle(
    IpcChannel.VersionCreate,
    async (_event, request: VersionCreateRequest): Promise<VersionedResponse<import("../shared/project.js").GradeVersion>> => {
      try {
        return ok(await createVersion(request));
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.VersionList,
    async (): Promise<VersionedResponse<VersionListResult>> => {
      try {
        return ok(await listVersions());
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.VersionSwitch,
    async (_event, request: VersionSwitchRequest): Promise<VersionedResponse<import("../shared/project.js").GradeVersion>> => {
      try {
        return ok(await switchVersion(request.versionId));
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.VersionDelete,
    async (_event, request: VersionDeleteRequest): Promise<VersionedResponse<void>> => {
      try {
        await deleteVersion(request.versionId);
        return ok(undefined);
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.VersionUpdate,
    async (_event, request: VersionUpdateRequest): Promise<VersionedResponse<import("../shared/project.js").GradeVersion>> => {
      try {
        return ok(await updateVersion(request));
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  // Phase 21: Annotations
  ipcMain.handle(
    IpcChannel.AnnotationCreate,
    async (_event, request: AnnotationCreateRequest): Promise<VersionedResponse<import("../shared/project.js").Annotation>> => {
      try {
        return ok(await createAnnotation(request));
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.AnnotationUpdate,
    async (_event, request: AnnotationUpdateRequest): Promise<VersionedResponse<import("../shared/project.js").Annotation>> => {
      try {
        return ok(await updateAnnotation(request));
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.AnnotationDelete,
    async (_event, request: AnnotationDeleteRequest): Promise<VersionedResponse<void>> => {
      try {
        await deleteAnnotation(request.annotationId);
        return ok(undefined);
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.AnnotationList,
    async (_event, request: AnnotationListRequest): Promise<VersionedResponse<import("../shared/project.js").Annotation[]>> => {
      try {
        return ok(await listAnnotations(request));
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  // Phase 21: Review Package
  ipcMain.handle(
    IpcChannel.ReviewPackageExport,
    async (_event, request: ReviewPackageExportRequest): Promise<VersionedResponse<{ path: string; manifest: import("../shared/project.js").ReviewPackageManifest }>> => {
      try {
        return ok(await exportReviewPackage(request));
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.ReviewPackageImport,
    async (_event, request: ReviewPackageImportRequest): Promise<VersionedResponse<import("../shared/project.js").ReviewPackageManifest>> => {
      try {
        return ok(await importReviewPackage(request));
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  // Phase 21: Feedback
  ipcMain.handle(
    IpcChannel.FeedbackImport,
    async (_event, request: FeedbackImportRequest): Promise<VersionedResponse<import("../shared/project.js").FeedbackFile>> => {
      try {
        return ok(await importFeedback(request));
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.FeedbackResolve,
    async (_event, request: FeedbackResolveRequest): Promise<VersionedResponse<void>> => {
      try {
        await resolveFeedback(request);
        return ok(undefined);
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  // Phase 21: Handoff
  ipcMain.handle(
    IpcChannel.HandoffExport,
    async (_event, request: HandoffPackageExportRequest): Promise<VersionedResponse<{ path: string; manifest: import("../shared/project.js").HandoffPackageManifest }>> => {
      try {
        return ok(await exportHandoffPackage(request));
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.HandoffImport,
    async (_event, request: HandoffPackageImportRequest): Promise<VersionedResponse<void>> => {
      try {
        await importHandoffPackage(request);
        return ok(undefined);
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.HandoffValidate,
    async (_event, request: HandoffPackageValidateRequest): Promise<VersionedResponse<import("../shared/project.js").HandoffPackageManifest>> => {
      try {
        return ok(await validateHandoffPackage(request));
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  // Phase 22: Licensing and Entitlements
  ipcMain.handle(
    IpcChannel.LicenseValidate,
    async (): Promise<VersionedResponse<LicenseValidationResult>> => {
      try {
        return ok(await validateLicense());
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.LicenseCheckFeature,
    async (_event, feature: keyof EntitlementFlags): Promise<VersionedResponse<EntitlementCheckResult>> => {
      try {
        return ok(await checkFeatureEntitlementFn(feature));
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.LicenseStartTrial,
    async (): Promise<VersionedResponse<EntitlementState>> => {
      try {
        return ok(await startTrial());
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.LicenseActivate,
    async (_event, request: LicenseActivationRequest): Promise<VersionedResponse<{ success: boolean; activationId?: string; tier?: string; expiresAt?: number; errorMessage?: string }>> => {
      try {
        // In a real implementation, this would validate with a license server
        // For now, we create a local activation with a placeholder activationId
        if (!request.licenseKey.trim()) {
          return ok({ success: false, errorMessage: "License key is required." });
        }

        const activationId = `activation-${Date.now().toString(36)}`;
        const tier = "paid";
        const state = await activateLicense(activationId, tier);
        return ok({
          success: true,
          activationId: state.activationId,
          tier: state.tier,
          expiresAt: state.expiresAt
        });
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.LicenseDeactivate,
    async (): Promise<VersionedResponse<void>> => {
      try {
        await deactivateLicense();
        return ok(undefined);
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.LicenseGetState,
    async (): Promise<VersionedResponse<EntitlementState>> => {
      try {
        return ok(await getEntitlementState());
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.LicenseClear,
    async (): Promise<VersionedResponse<void>> => {
      try {
        await clearLicense();
        return ok(undefined);
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  // Phase 22: Telemetry
  ipcMain.handle(
    IpcChannel.TelemetryGetConsent,
    async (): Promise<VersionedResponse<import("../shared/telemetry.js").TelemetryConsentState>> => {
      try {
        return ok(await getConsent());
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.TelemetrySetConsent,
    async (_event, consent: TelemetryConsent): Promise<VersionedResponse<import("../shared/telemetry.js").TelemetryConsentState>> => {
      try {
        return ok(await setConsent(consent));
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.TelemetryTrack,
    async (_event, request: { type: string; payload: Record<string, unknown> }): Promise<VersionedResponse<void>> => {
      try {
        trackEvent(request.type as import("../shared/telemetry.js").TelemetryEvent["type"], request.payload);
        return ok(undefined);
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.TelemetryFlush,
    async (): Promise<VersionedResponse<{ sent: number; failed: number }>> => {
      try {
        return ok(await flushQueue());
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.TelemetryDeleteAll,
    async (): Promise<VersionedResponse<void>> => {
      try {
        await deleteAllTelemetryData();
        return ok(undefined);
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.TelemetryGetQueueSize,
    async (): Promise<VersionedResponse<number>> => {
      try {
        return ok(await getQueueSize());
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  // Phase 22: Support and Diagnostics
  ipcMain.handle(
    IpcChannel.CrashCapture,
    async (_event, request: { crashType: string; message: string; stackTrace?: string; projectId?: string }): Promise<VersionedResponse<CrashReport>> => {
      try {
        return ok(await captureCrash(request));
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.GetAppDiagnostics,
    async (): Promise<VersionedResponse<DiagnosticEntry[]>> => {
      try {
        return ok(await getDiagnostics());
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.CreateSupportBundle,
    async (_event, request: { includeLogs?: boolean; includeProjectDiagnostics?: boolean; includeMediaMetadata?: boolean; redactPaths?: boolean; contactInfo?: string }): Promise<VersionedResponse<{ path: string; manifest: SupportBundleManifest }>> => {
      try {
        return ok(await createSupportBundle(request));
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.SubmitFeedback,
    async (_event, request: FeedbackSubmission): Promise<VersionedResponse<FeedbackSubmissionResult>> => {
      try {
        return ok(await submitFeedback(request));
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  // Phase 22: Updates
  ipcMain.handle(
    IpcChannel.UpdateCheck,
    async (): Promise<VersionedResponse<UpdateCheckResult>> => {
      try {
        return ok(await checkForUpdateFn());
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.UpdateGetStatus,
    async (): Promise<VersionedResponse<UpdateStatus>> => {
      try {
        return ok(getUpdateStatus());
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.UpdateGetConfig,
    async (): Promise<VersionedResponse<UpdateStoreConfig>> => {
      try {
        return ok(await loadUpdateConfig());
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.UpdateSetChannel,
    async (_event, channel: UpdateChannel): Promise<VersionedResponse<void>> => {
      try {
        await setUpdateChannel(channel);
        return ok(undefined);
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.UpdateSetAutoCheck,
    async (_event, autoCheck: boolean): Promise<VersionedResponse<void>> => {
      try {
        await setAutoCheck(autoCheck);
        return ok(undefined);
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.UpdateGetChannels,
    async (): Promise<VersionedResponse<ReleaseChannelConfig[]>> => {
      try {
        return ok(await getAvailableChannels());
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  // Phase 22: Launch
  ipcMain.handle(
    IpcChannel.LaunchGetPricingTiers,
    async (): Promise<VersionedResponse<PricingTier[]>> => {
      try {
        const { PRICING_TIERS } = await import("../shared/launchConfig.js");
        return ok(PRICING_TIERS);
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.LaunchGetExperiments,
    async (): Promise<VersionedResponse<OnboardingExperiment[]>> => {
      try {
        const { ONBOARDING_EXPERIMENTS } = await import("../shared/launchConfig.js");
        return ok(ONBOARDING_EXPERIMENTS);
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.LaunchGetMetrics,
    async (): Promise<VersionedResponse<LaunchMetrics>> => {
      try {
        const { DEFAULT_LAUNCH_METRICS } = await import("../shared/launchConfig.js");
        return ok(DEFAULT_LAUNCH_METRICS);
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );

  ipcMain.handle(
    IpcChannel.LaunchSetExperiment,
    async (_event, request: { id: string; enabled: boolean }): Promise<VersionedResponse<void>> => {
      try {
        // Experiments are read-only for now - stored in launchConfig
        // In a full implementation, this would persist user experiment assignments
        trackEvent("feature:use", {
          feature: "launch:set-experiment",
          experimentId: request.id,
          enabled: request.enabled
        });
        return ok(undefined);
      } catch (error) {
        return fail(toAppError(error));
      }
    }
  );
}

async function prepareExportRequest(request: ExportProjectRequest): Promise<ExportProjectRequest> {
  const codec = request.project.exportSettings.codec;
  const { ext, filterName, filterExt } = codecDialogInfo(codec);
  const defaultPath = request.outputPath ?? request.project.exportSettings.outputPath ?? defaultProjectExportName(request, ext);
  const selection = request.outputPath
    ? { canceled: false, filePath: request.outputPath }
    : await dialog.showSaveDialog({
        title: `Export ${codec.toUpperCase()} ${filterName}`,
        defaultPath,
        filters: [{ name: filterName, extensions: [filterExt] }]
      });

  if (selection.canceled || !selection.filePath) {
    throw appError("USER_CANCELLED", "Export was cancelled before encoding started.");
  }

  const outputPath = selection.filePath.toLowerCase().endsWith(ext) ? selection.filePath : `${selection.filePath}${ext}`;
  let overwriteConfirmed = request.overwriteConfirmed ?? false;
  if (!overwriteConfirmed && await outputPathExists(outputPath)) {
    const confirmation = await dialog.showMessageBox({
      type: "warning",
      title: "Replace existing export?",
      message: `The selected ${filterName} already exists.`,
      detail: outputPath,
      buttons: ["Replace", "Cancel"],
      defaultId: 1,
      cancelId: 1
    });
    overwriteConfirmed = confirmation.response === 0;
  }

  if (!overwriteConfirmed && await outputPathExists(outputPath)) {
    throw appError("EXPORT_OUTPUT_EXISTS", "Export output already exists and needs confirmation.", outputPath);
  }

  return {
    ...request,
    outputPath,
    overwriteConfirmed
  };
}

function codecDialogInfo(codec: string): { ext: string; filterName: string; filterExt: string } {
  switch (codec) {
    case "hevc":
      return { ext: ".mp4", filterName: "HEVC MP4", filterExt: "mp4" };
    case "prores":
      return { ext: ".mov", filterName: "ProRes MOV", filterExt: "mov" };
    case "vp9":
      return { ext: ".webm", filterName: "VP9 WebM", filterExt: "webm" };
    default:
      return { ext: ".mp4", filterName: "H.264 MP4", filterExt: "mp4" };
  }
}

function defaultProjectExportName(request: ExportProjectRequest, ext: string): string {
  const media = request.project.media;
  if (!media) {
    return `chroma-node-export${ext}`;
  }

  return media.sourcePath.replace(/\.[^.\\/]+$/, `-graded${ext}`);
}

async function prepareSequenceRequest(request: ExportSequenceRequest): Promise<ExportSequenceRequest> {
  const media = request.project.media;
  if (!media) {
    throw appError("EXPORT_FAILED", "Export sequence requires imported media.");
  }

  const defaultPath = request.outputPath ?? media.sourcePath.replace(/\.[^.\\/]+$/, `-seq-%04d.png`);
  const selection = request.outputPath
    ? { canceled: false, filePath: request.outputPath }
    : await dialog.showSaveDialog({
        title: "Export Image Sequence",
        defaultPath,
        filters: [{ name: "PNG Sequence", extensions: ["png"] }]
      });

  if (selection.canceled || !selection.filePath) {
    throw appError("USER_CANCELLED", "Export sequence was cancelled.");
  }

  let outputPath = selection.filePath;
  if (!outputPath.toLowerCase().endsWith(".png")) {
    outputPath = `${outputPath}.png`;
  }

  let overwriteConfirmed = request.overwriteConfirmed ?? false;
  if (!overwriteConfirmed) {
    const { totalFrames } = computeExportFps(media);
    const startFrame = Math.max(0, Math.floor(request.startFrame ?? 0));
    const endFrame = Math.floor(request.endFrame ?? totalFrames - 1);
    const existingPath = await findExistingSequenceOutput(outputPath, startFrame, endFrame, outputPathExists);
    if (existingPath) {
      const confirmation = await dialog.showMessageBox({
        type: "warning",
        title: "Replace existing sequence?",
        message: "Some files in this sequence already exist.",
        detail: existingPath,
        buttons: ["Replace", "Cancel"],
        defaultId: 1,
        cancelId: 1
      });
      overwriteConfirmed = confirmation.response === 0;
    }
    if (existingPath && !overwriteConfirmed) {
      throw appError("EXPORT_OUTPUT_EXISTS", "Export sequence output already exists and needs confirmation.", outputPath);
    }
  }

  return { ...request, outputPath, overwriteConfirmed };
}

function toAppError(error: unknown) {
  return isAppError(error) ? error : appError("UNKNOWN", "Unexpected application error.", String(error));
}
