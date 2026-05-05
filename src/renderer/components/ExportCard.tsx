import type { ExportJobResult, ExportProgress, ExportQuality } from "../../shared/ipc";
import { ExportProgressPanel } from "./ExportProgressPanel";
import { ExportSummary } from "./ExportSummary";

interface ExportCardProps {
  quality: ExportQuality;
  exportOperation?: ExportProgress;
  exportResult?: ExportJobResult;
  isExporting: boolean;
  onQualityChange: (quality: ExportQuality) => void;
  onCancel: () => void;
}

export function ExportCard({
  quality,
  exportOperation,
  exportResult,
  isExporting,
  onQualityChange,
  onCancel
}: ExportCardProps) {
  return (
    <section className="export-card export-card-flat" aria-label="H.264 export settings and progress">
      <label className="field-label">
        <span>Quality</span>
        <select
          value={quality}
          onChange={(event) => {
            const q = event.currentTarget.value as ExportQuality;
            onQualityChange(q);
          }}
          disabled={isExporting}
        >
          <option value="draft">Draft</option>
          <option value="standard">Standard</option>
          <option value="high">High</option>
        </select>
      </label>
      {exportOperation && exportOperation.state !== "completed" ? (
        <ExportProgressPanel progress={exportOperation} onCancel={onCancel} />
      ) : exportResult ? (
        <ExportSummary result={exportResult} />
      ) : (
        <p className="muted">No export run yet.</p>
      )}
    </section>
  );
}
