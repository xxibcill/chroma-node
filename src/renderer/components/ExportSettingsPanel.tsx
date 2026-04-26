import type { ExportPreset, ExportResizePolicy, ExportSizeMode } from "../../shared/project";
import type { MediaRef } from "../../shared/ipc";
import { computeExportPreview, EXPORT_PRESET_LABELS } from "../state/exportPreview";

interface ExportSettingsPanelProps {
  sizeMode: ExportSizeMode;
  preset?: ExportPreset;
  customWidth?: number;
  customHeight?: number;
  resizePolicy: ExportResizePolicy;
  media?: MediaRef;
  onSizeModeChange: (sizeMode: ExportSizeMode) => void;
  onPresetChange: (preset: ExportPreset) => void;
  onCustomWidthChange: (width: number | undefined) => void;
  onCustomHeightChange: (height: number | undefined) => void;
  onResizePolicyChange: (policy: ExportResizePolicy) => void;
}

export function ExportSettingsPanel({
  sizeMode,
  preset,
  customWidth,
  customHeight,
  resizePolicy,
  media,
  onSizeModeChange,
  onPresetChange,
  onCustomWidthChange,
  onCustomHeightChange,
  onResizePolicyChange
}: ExportSettingsPanelProps) {
  const allPresets: ExportPreset[] = ["1080p", "720p", "480p", "square-1:1", "square-4:5", "portrait-9:16", "portrait-4:5", "portrait-3:4"];

  const preview = media
    ? computeExportPreview(sizeMode, preset, customWidth, customHeight, resizePolicy, media)
    : undefined;

  return (
    <div className="export-settings">
      <label className="field-label">
        <span>Output Size</span>
        <select
          value={sizeMode}
          onChange={(e) => onSizeModeChange(e.currentTarget.value as ExportSizeMode)}
        >
          <option value="source">Source</option>
          <option value="preset">Preset</option>
          <option value="custom">Custom</option>
        </select>
      </label>

      {sizeMode === "preset" && (
        <label className="field-label">
          <span>Preset</span>
          <select
            value={preset ?? "1080p"}
            onChange={(e) => onPresetChange(e.currentTarget.value as ExportPreset)}
          >
            {allPresets.map((p) => (
              <option key={p} value={p}>{EXPORT_PRESET_LABELS[p]}</option>
            ))}
          </select>
        </label>
      )}

      {sizeMode === "custom" && (
        <div className="custom-dims">
          <label className="field-label">
            <span>Width</span>
            <input
              type="number"
              min={1}
              max={7680}
              value={customWidth ?? ""}
              onChange={(e) => onCustomWidthChange(e.currentTarget.value ? Number(e.currentTarget.value) : undefined)}
            />
          </label>
          <label className="field-label">
            <span>Height</span>
            <input
              type="number"
              min={1}
              max={4320}
              value={customHeight ?? ""}
              onChange={(e) => onCustomHeightChange(e.currentTarget.value ? Number(e.currentTarget.value) : undefined)}
            />
          </label>
        </div>
      )}

      <label className="field-label">
        <span>Resize Policy</span>
        <select
          value={resizePolicy}
          onChange={(e) => onResizePolicyChange(e.currentTarget.value as ExportResizePolicy)}
        >
          <option value="fit">Fit (letterbox)</option>
          <option value="crop">Crop (fill)</option>
          <option value="pad">Pad (bars)</option>
        </select>
      </label>

      {preview && (
        <div className="export-preview-info">
          <span className="export-preview-dims">{preview.width} x {preview.height}</span>
          {preview.aspectChanged && (
            <span className="export-preview-warning">Aspect ratio changed</span>
          )}
        </div>
      )}
    </div>
  );
}
