import { contextBridge, ipcRenderer } from "electron";
import type {
  CancelExportRequest,
  ChromaNodeApi,
  ExportProgress,
  ExportProjectRequest,
  ExportSequenceRequest,
  ExportStillRequest,
  ExportSyntheticRequest,
  FrameExtractRequest,
  InstalledPack,
  LearningProgressPayload,
  LibraryAddRequest,
  LibraryDeleteRequest,
  LibraryDuplicateRequest,
  LibraryItem,
  LibraryToggleFavoriteRequest,
  LibraryUpdateRequest,
  PackExportRequest,
  PackImportRequest,
  ProbeMediaRequest,
  RelinkMediaRequest,
  SaveProjectRequest
} from "../shared/ipc.js";
import type { PackImportResult } from "../shared/pack.js";

const IpcChannel = {
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
  ExportStill: "export:still",
  ExportSequence: "export:sequence",
  StartExport: "export:start",
  CancelExport: "export:cancel",
  ExportProgress: "export:progress",
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
  PackUninstall: "pack:uninstall"
} as const;

const api: ChromaNodeApi = {
  selectMedia: () => ipcRenderer.invoke(IpcChannel.SelectMedia),
  saveProject: (request: SaveProjectRequest) => ipcRenderer.invoke(IpcChannel.SaveProject, request),
  openProject: () => ipcRenderer.invoke(IpcChannel.OpenProject),
  loadProgress: () => ipcRenderer.invoke(IpcChannel.LoadProgress),
  saveProgress: (progress: LearningProgressPayload) => ipcRenderer.invoke(IpcChannel.SaveProgress, progress),
  resetProgress: () => ipcRenderer.invoke(IpcChannel.ResetProgress),
  relinkMedia: (request: RelinkMediaRequest) => ipcRenderer.invoke(IpcChannel.RelinkMedia, request),
  getDiagnostics: () => ipcRenderer.invoke(IpcChannel.GetDiagnostics),
  probeMedia: (request: ProbeMediaRequest) => ipcRenderer.invoke(IpcChannel.ProbeMedia, request),
  extractFrame: (request: FrameExtractRequest) => ipcRenderer.invoke(IpcChannel.ExtractFrame, request),
  exportSynthetic: (request?: ExportSyntheticRequest) => ipcRenderer.invoke(IpcChannel.ExportSynthetic, request),
  exportStill: (request: ExportStillRequest) => ipcRenderer.invoke(IpcChannel.ExportStill, request),
  exportSequence: (request: ExportSequenceRequest) => ipcRenderer.invoke(IpcChannel.ExportSequence, request),
  startExport: (request: ExportProjectRequest) => ipcRenderer.invoke(IpcChannel.StartExport, request),
  cancelExport: (request: CancelExportRequest) => ipcRenderer.invoke(IpcChannel.CancelExport, request),
  onExportProgress: (listener: (progress: ExportProgress) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: ExportProgress) => listener(progress);
    ipcRenderer.on(IpcChannel.ExportProgress, handler);
    return () => ipcRenderer.off(IpcChannel.ExportProgress, handler);
  },
  loadLibrary: () => ipcRenderer.invoke(IpcChannel.LibraryLoad),
  addLibraryItem: (request: LibraryAddRequest) => ipcRenderer.invoke(IpcChannel.LibraryAdd, request),
  updateLibraryItem: (request: LibraryUpdateRequest) => ipcRenderer.invoke(IpcChannel.LibraryUpdate, request),
  deleteLibraryItem: (request: LibraryDeleteRequest) => ipcRenderer.invoke(IpcChannel.LibraryDelete, request),
  getLibraryItem: (request: { id: string }) => ipcRenderer.invoke(IpcChannel.LibraryGet, request),
  duplicateLibraryItem: (request: LibraryDuplicateRequest) => ipcRenderer.invoke(IpcChannel.LibraryDuplicate, request),
  toggleLibraryItemFavorite: (request: LibraryToggleFavoriteRequest) => ipcRenderer.invoke(IpcChannel.LibraryToggleFavorite, request),
  exportPack: (request: PackExportRequest) => ipcRenderer.invoke(IpcChannel.PackExport, request),
  importPack: (request?: PackImportRequest) => ipcRenderer.invoke(IpcChannel.PackImport, request),
  getInstalledPacks: () => ipcRenderer.invoke(IpcChannel.PackList),
  uninstallPack: (request: { path: string }) => ipcRenderer.invoke(IpcChannel.PackUninstall, request)
};

contextBridge.exposeInMainWorld("chromaNode", api);
