import { useCallback, useEffect, useState } from "react";
import type { ChromaProject } from "../../shared/project";
import type { ExportJobResult, ExportProgress, MediaRef } from "../../shared/ipc";

interface UseExportOptions {
  project: ChromaProject;
  media: MediaRef | undefined;
}

interface UseExportResult {
  exportOperation: ExportProgress | undefined;
  isExporting: boolean;
  exportResult: ExportJobResult | undefined;
  runExport: () => Promise<void>;
  cancelExport: () => Promise<void>;
}

const api = window.chromaNode;

export function useExport({
  project,
  media
}: UseExportOptions): UseExportResult {
  const [exportOperation, setExportOperation] = useState<ExportProgress | undefined>();
  const [exportResult, setExportResult] = useState<ExportJobResult | undefined>();

  const isExporting = exportOperation?.state === "pending" || exportOperation?.state === "running";

  useEffect(() => {
    if (!api) {
      return;
    }

    const unsubscribe = api.onExportProgress((progress) => {
      setExportOperation(progress);
    });

    return unsubscribe;
  }, []);

  const runExport = useCallback(async () => {
    if (!api || !media || isExporting) {
      return;
    }

    const snapshot: ChromaProject = {
      ...project,
      media: project.media ?? media
    };

    setExportOperation(undefined);
    setExportResult(undefined);
    const response = await api.startExport({
      project: snapshot,
      quality: snapshot.exportSettings.quality
    });
    const result = response.result;

    if (!result.ok) {
      const wasCancelled = result.error.code === "EXPORT_CANCELLED" || result.error.code === "USER_CANCELLED";
      setExportOperation({
        jobId: "",
        state: wasCancelled ? "canceled" : "failed",
        currentFrame: 0,
        totalFrames: 0,
        percent: 0,
        elapsedMs: 0,
        message: wasCancelled ? "Export cancelled." : result.error.message,
        error: result.error
      });
      return;
    }

    setExportResult(result.value);
  }, [isExporting, media, project]);

  const cancelExport = useCallback(async () => {
    if (!api || !exportOperation) {
      return;
    }

    setExportOperation((current) => current ? { ...current, message: "Cancelling export..." } : current);
    const response = await api.cancelExport({ jobId: exportOperation.jobId });
    const result = response.result;
    if (!result.ok) {
      setExportOperation((current) => current ? {
        ...current,
        state: "failed",
        message: result.error.message,
        error: result.error
      } : current);
      return;
    }

    setExportOperation(result.value);
  }, [exportOperation]);

  return {
    exportOperation,
    isExporting,
    exportResult,
    runExport,
    cancelExport
  };
}
