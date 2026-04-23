import { contextBridge, ipcRenderer } from "electron";
import type {
  ChromaNodeApi,
  CancelExportRequest,
  ExportProgress,
  ExportProjectRequest,
  ExportSyntheticRequest,
  FrameExtractRequest,
  ProbeMediaRequest,
  SaveProjectRequest
} from "../shared/ipc.js";
import { IpcChannel } from "../shared/ipc.js";

const api: ChromaNodeApi = {
  selectMedia: () => ipcRenderer.invoke(IpcChannel.SelectMedia),
  saveProject: (request: SaveProjectRequest) => ipcRenderer.invoke(IpcChannel.SaveProject, request),
  openProject: () => ipcRenderer.invoke(IpcChannel.OpenProject),
  getDiagnostics: () => ipcRenderer.invoke(IpcChannel.GetDiagnostics),
  probeMedia: (request: ProbeMediaRequest) => ipcRenderer.invoke(IpcChannel.ProbeMedia, request),
  extractFrame: (request: FrameExtractRequest) => ipcRenderer.invoke(IpcChannel.ExtractFrame, request),
  exportSynthetic: (request?: ExportSyntheticRequest) => ipcRenderer.invoke(IpcChannel.ExportSynthetic, request),
  startExport: (request: ExportProjectRequest) => ipcRenderer.invoke(IpcChannel.StartExport, request),
  cancelExport: (request: CancelExportRequest) => ipcRenderer.invoke(IpcChannel.CancelExport, request),
  onExportProgress: (listener: (progress: ExportProgress) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: ExportProgress) => listener(progress);
    ipcRenderer.on(IpcChannel.ExportProgress, handler);
    return () => ipcRenderer.off(IpcChannel.ExportProgress, handler);
  }
};

contextBridge.exposeInMainWorld("chromaNode", api);
