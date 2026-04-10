// Type definitions for the Electron API exposed via preload
export interface ElectronAPI {
  openVideoDialog: () => Promise<string | null>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}