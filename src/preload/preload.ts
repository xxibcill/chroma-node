import { contextBridge, ipcRenderer } from "electron";
import type {
  ChromaNodeApi,
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
  exportSynthetic: (request?: ExportSyntheticRequest) => ipcRenderer.invoke(IpcChannel.ExportSynthetic, request)
};

contextBridge.exposeInMainWorld("chromaNode", api);
