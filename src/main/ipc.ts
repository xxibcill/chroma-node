import { dialog, ipcMain } from "electron";
import type {
  DecodedFrame,
  ExportJobResult,
  ExportSyntheticRequest,
  FfmpegDiagnostics,
  FrameExtractRequest,
  MediaRef,
  ProbeMediaRequest,
  SelectMediaResponse,
  VersionedResponse
} from "../shared/ipc.js";
import { IpcChannel } from "../shared/ipc.js";
import { appError, fail, isAppError, ok } from "./errors.js";
import { exportSynthetic } from "./exportSynthetic.js";
import { extractFrame } from "./frame.js";
import { getFfmpegDiagnostics } from "./ffmpeg.js";
import { probeMedia } from "./mediaProbe.js";

export function registerIpcHandlers(): void {
  ipcMain.handle(IpcChannel.SelectMedia, async (): Promise<VersionedResponse<SelectMediaResponse>> => {
    try {
      const selection = await dialog.showOpenDialog({
        title: "Import media",
        properties: ["openFile"],
        filters: [
          { name: "Video", extensions: ["mp4", "mov", "m4v"] },
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
}

function toAppError(error: unknown) {
  return isAppError(error) ? error : appError("UNKNOWN", "Unexpected application error.", String(error));
}
