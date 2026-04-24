import { dialog, ipcMain } from "electron";
import type {
  CancelExportRequest,
  DecodedFrame,
  ExportJobResult,
  ExportProgress,
  ExportProjectRequest,
  ExportSyntheticRequest,
  FfmpegDiagnostics,
  FrameExtractRequest,
  MediaRef,
  OpenProjectResult,
  ProbeMediaRequest,
  SaveProjectRequest,
  SaveProjectResult,
  SelectMediaResponse,
  VersionedResponse
} from "../shared/ipc.js";
import { IpcChannel } from "../shared/ipc.js";
import { appError, fail, isAppError, ok } from "./errors.js";
import { cancelExport, exportProject, outputPathExists } from "./exportProject.js";
import { exportSynthetic } from "./exportSynthetic.js";
import { extractFrame } from "./frame.js";
import { getFfmpegDiagnostics } from "./ffmpeg.js";
import { probeMedia } from "./mediaProbe.js";
import { relinkMedia } from "./mediaRelink.js";
import { openProjectFile, saveProjectFile } from "./projectFile.js";

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
}

async function prepareExportRequest(request: ExportProjectRequest): Promise<ExportProjectRequest> {
  const defaultPath = request.outputPath ?? request.project.exportSettings.outputPath ?? defaultProjectExportName(request);
  const selection = request.outputPath
    ? { canceled: false, filePath: request.outputPath }
    : await dialog.showSaveDialog({
        title: "Export H.264 MP4",
        defaultPath,
        filters: [{ name: "MP4 Video", extensions: ["mp4"] }]
      });

  if (selection.canceled || !selection.filePath) {
    throw appError("USER_CANCELLED", "Export was cancelled before encoding started.");
  }

  const outputPath = selection.filePath.endsWith(".mp4") ? selection.filePath : `${selection.filePath}.mp4`;
  let overwriteConfirmed = request.overwriteConfirmed ?? false;
  if (!overwriteConfirmed && await outputPathExists(outputPath)) {
    const confirmation = await dialog.showMessageBox({
      type: "warning",
      title: "Replace existing export?",
      message: "The selected MP4 already exists.",
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

function defaultProjectExportName(request: ExportProjectRequest): string {
  const media = request.project.media;
  if (!media) {
    return "chroma-node-export.mp4";
  }

  return media.sourcePath.replace(/\.[^.\\/]+$/, "-graded.mp4");
}

function toAppError(error: unknown) {
  return isAppError(error) ? error : appError("UNKNOWN", "Unexpected application error.", String(error));
}
