import type { ExportProgress } from "../../shared/ipc";

interface ExportProgressPanelProps {
  progress: ExportProgress;
  onCancel: () => void;
}

export function ExportProgressPanel({ progress, onCancel }: ExportProgressPanelProps) {
  const elapsedSeconds = Math.max(0, progress.elapsedMs / 1000);
  return (
    <div className="export-progress" role="status" aria-live="polite">
      <div className="export-progress-header">
        <span className={`tracking-state tracking-state-${progress.state}`}>{progress.state}</span>
        <span>{progress.percent.toFixed(1)}%</span>
      </div>
      <progress value={progress.percent} max="100" />
      <p>{progress.currentFrame} / {progress.totalFrames} frames, {elapsedSeconds.toFixed(1)}s elapsed.</p>
      <p title={progress.outputPath}>{progress.message}</p>
      <button type="button" onClick={onCancel} disabled={progress.state !== "pending" && progress.state !== "running"}>
        Cancel
      </button>
    </div>
  );
}
