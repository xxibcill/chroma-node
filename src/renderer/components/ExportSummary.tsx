import type { ExportJobResult } from "../../shared/ipc";

interface ExportSummaryProps {
  result: ExportJobResult;
}

export function ExportSummary({ result }: ExportSummaryProps) {
  return (
    <dl className="metadata-table">
      <MetadataRow label="Codec" value={result.codec} />
      <MetadataRow label="Raster" value={`${result.width} x ${result.height}`} />
      <MetadataRow label="Frames" value={String(result.frameCount)} />
      <MetadataRow label="Audio" value={result.hasAudio ? "Present" : "None"} />
      <MetadataRow label="Path" value={result.outputPath} />
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
