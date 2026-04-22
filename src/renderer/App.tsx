import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppError, DecodedFrame, ExportJobResult, FfmpegDiagnostics, MediaRef } from "../shared/ipc";
import { FrameRenderer } from "./webgl/FrameRenderer";

type Status = "idle" | "busy" | "ready" | "error";

interface UiState {
  status: Status;
  message: string;
  media?: MediaRef;
  frame?: DecodedFrame;
  exportResult?: ExportJobResult;
  error?: AppError;
}

const api = window.chromaNode;

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<FrameRenderer | null>(null);
  const [diagnostics, setDiagnostics] = useState<FfmpegDiagnostics | undefined>();
  const [state, setState] = useState<UiState>({
    status: "idle",
    message: "Import an MP4 or MOV clip to inspect the technical pipeline."
  });

  useEffect(() => {
    if (!api) {
      setState({
        status: "error",
        message: "Electron preload API is unavailable.",
        error: {
          code: "UNKNOWN",
          message: "Renderer could not access the Chroma Node preload bridge."
        }
      });
      return;
    }

    void api.getDiagnostics().then((response) => {
      const result = response.result;
      if (result.ok) {
        setDiagnostics(result.value);
      } else {
        setState((current) => ({
          ...current,
          status: "error",
          error: result.error,
          message: result.error.message
        }));
      }
    });
  }, []);

  useEffect(() => {
    if (!canvasRef.current || rendererRef.current) {
      return;
    }

    try {
      rendererRef.current = new FrameRenderer(canvasRef.current);
    } catch (error) {
      setState((current) => ({
        ...current,
        status: "error",
        message: error instanceof Error ? error.message : "WebGL2 renderer failed to initialize."
      }));
    }

    return () => {
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!state.frame || !rendererRef.current) {
      return;
    }

    void rendererRef.current.setFrame(state.frame);
  }, [state.frame]);

  const diagnosticsLabel = useMemo(() => {
    if (!diagnostics) {
      return "Checking FFmpeg";
    }

    return diagnostics.available ? "FFmpeg ready" : "FFmpeg unavailable";
  }, [diagnostics]);

  const importMedia = useCallback(async () => {
    if (!api) {
      return;
    }

    setState((current) => ({ ...current, status: "busy", message: "Selecting media..." }));
    const selection = await api.selectMedia();
    const selectionResult = selection.result;
    if (!selectionResult.ok) {
      setState((current) => ({
        ...current,
        status: selectionResult.error.code === "USER_CANCELLED" ? "idle" : "error",
        message:
          selectionResult.error.code === "USER_CANCELLED"
            ? "Import an MP4 or MOV clip to inspect the technical pipeline."
            : selectionResult.error.message,
        error: selectionResult.error.code === "USER_CANCELLED" ? undefined : selectionResult.error
      }));
      return;
    }

    setState((current) => ({ ...current, status: "busy", message: "Probing media metadata..." }));
    const probe = await api.probeMedia({ sourcePath: selectionResult.value.sourcePath });
    const probeResult = probe.result;
    if (!probeResult.ok) {
      setState((current) => ({
        ...current,
        status: "error",
        message: probeResult.error.message,
        error: probeResult.error
      }));
      return;
    }

    setState((current) => ({
      ...current,
      status: "busy",
      media: probeResult.value,
      message: "Extracting preview frame..."
    }));
    const frame = await api.extractFrame({ sourcePath: probeResult.value.sourcePath, timeSeconds: 0.25 });
    const frameResult = frame.result;
    if (!frameResult.ok) {
      setState((current) => ({
        ...current,
        status: "error",
        media: probeResult.value,
        message: frameResult.error.message,
        error: frameResult.error
      }));
      return;
    }

    setState({
      status: "ready",
      message: "Frame decoded and rendered through WebGL2.",
      media: probeResult.value,
      frame: frameResult.value
    });
  }, []);

  const runExportSpike = useCallback(async () => {
    if (!api) {
      return;
    }

    setState((current) => ({ ...current, status: "busy", message: "Encoding synthetic H.264 MP4..." }));
    const exportResponse = await api.exportSynthetic();
    const exportResult = exportResponse.result;
    if (!exportResult.ok) {
      setState((current) => ({
        ...current,
        status: "error",
        message: exportResult.error.message,
        error: exportResult.error
      }));
      return;
    }

    setState((current) => ({
      ...current,
      status: "ready",
      message: "Synthetic export completed.",
      exportResult: exportResult.value,
      error: undefined
    }));
  }, []);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Technical foundation</p>
          <h1>Chroma Node</h1>
        </div>
        <div className={`diagnostic ${diagnostics?.available ? "is-ok" : "is-warning"}`}>
          <span className="diagnostic-dot" />
          {diagnosticsLabel}
        </div>
      </header>

      <section className="workspace" aria-label="Chroma Node workspace">
        <aside className="inspector" aria-label="Media diagnostics">
          <div className="panel-title">Media</div>
          {state.media ? <MetadataTable media={state.media} /> : <EmptyMetadata />}

          <div className="panel-title export-title">Export Spike</div>
          {state.exportResult ? <ExportSummary result={state.exportResult} /> : <p className="muted">No export run yet.</p>}
        </aside>

        <section className="viewer-column" aria-label="Viewer">
          <div className="viewer-frame">
            <canvas ref={canvasRef} className="viewer-canvas" aria-label="WebGL frame viewer" />
            {!state.frame ? (
              <div className="empty-state">
                <p className="eyebrow">WebGL2 viewer</p>
                <h2>Import a supported clip</h2>
                <p>Chroma Node will probe it with FFprobe, decode one frame with FFmpeg, and upload it to a neutral shader pass.</p>
                <button className="primary-action" type="button" onClick={importMedia} disabled={state.status === "busy"}>
                  Import Clip
                </button>
              </div>
            ) : null}
          </div>

          <footer className="transport">
            <div>
              <span className={`status-pill status-${state.status}`}>{state.status}</span>
              <span className="status-message">{state.message}</span>
            </div>
            <div className="action-row">
              <button type="button" onClick={importMedia} disabled={state.status === "busy"}>
                Import
              </button>
              <button type="button" onClick={runExportSpike} disabled={state.status === "busy" || diagnostics?.available === false}>
                Export MP4
              </button>
            </div>
          </footer>

          {state.error ? <ErrorBanner error={state.error} /> : null}
        </section>
      </section>
    </main>
  );
}

function EmptyMetadata() {
  return (
    <dl className="metadata-table">
      <div>
        <dt>Source</dt>
        <dd>Waiting for import</dd>
      </div>
      <div>
        <dt>Probe</dt>
        <dd>Not run</dd>
      </div>
    </dl>
  );
}

function MetadataTable({ media }: { media: MediaRef }) {
  return (
    <dl className="metadata-table">
      <MetadataRow label="File" value={media.fileName} />
      <MetadataRow label="Codec" value={media.codec} />
      <MetadataRow label="Raster" value={`${media.width} x ${media.height}`} />
      <MetadataRow label="Duration" value={`${media.durationSeconds.toFixed(2)}s`} />
      <MetadataRow label="Frame Rate" value={`${media.frameRate.toFixed(3)} fps`} />
      <MetadataRow label="Frames" value={String(media.totalFrames ?? "Unknown")} />
      <MetadataRow label="Audio" value={media.hasAudio ? "Present" : "None"} />
      <MetadataRow label="Rotation" value={`${media.rotation} deg`} />
    </dl>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd title={value}>{value}</dd>
    </div>
  );
}

function ExportSummary({ result }: { result: ExportJobResult }) {
  return (
    <dl className="metadata-table">
      <MetadataRow label="Codec" value={result.codec} />
      <MetadataRow label="Raster" value={`${result.width} x ${result.height}`} />
      <MetadataRow label="Frames" value={String(result.frameCount)} />
      <MetadataRow label="Path" value={result.outputPath} />
    </dl>
  );
}

function ErrorBanner({ error }: { error: AppError }) {
  return (
    <div className="error-banner" role="alert">
      <strong>{error.code}</strong>
      <span>{error.message}</span>
      {error.detail ? <code>{error.detail}</code> : null}
    </div>
  );
}
