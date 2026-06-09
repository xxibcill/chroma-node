import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactElement } from "react";

type GridMode = "thirds" | "golden" | "diagonal" | "center" | "full";
type GridTone = "amber" | "white" | "cyan" | "rose";

interface UploadedImage {
  name: string;
  url: string;
  width: number;
  height: number;
}

const gridTones: Record<GridTone, string> = {
  amber: "#f2cb86",
  white: "#f2f5fb",
  cyan: "#82d0bf",
  rose: "#ef9a8f"
};

const gridModes: { value: GridMode; label: string }[] = [
  { value: "thirds", label: "Thirds" },
  { value: "golden", label: "Golden" },
  { value: "diagonal", label: "Diagonal" },
  { value: "center", label: "Center" },
  { value: "full", label: "Full Kit" }
];

export function CompositionGridPage({ onBack }: { onBack: () => void }) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [gridMode, setGridMode] = useState<GridMode>("thirds");
  const [gridTone, setGridTone] = useState<GridTone>("amber");
  const [opacity, setOpacity] = useState(82);
  const [lineWidth, setLineWidth] = useState(2);
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState("No image loaded");

  useEffect(() => {
    return () => {
      if (image?.url) {
        URL.revokeObjectURL(image.url);
      }
    };
  }, [image?.url]);

  const loadFile = useCallback((file?: File) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Choose an image file");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const preview = new Image();

    preview.onload = () => {
      setImage((current) => {
        if (current?.url) {
          URL.revokeObjectURL(current.url);
        }

        return {
          name: file.name,
          url: objectUrl,
          width: preview.naturalWidth,
          height: preview.naturalHeight
        };
      });
      setMessage(`${file.name} - ${preview.naturalWidth} x ${preview.naturalHeight}`);
    };

    preview.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setMessage("Image could not be loaded");
    };

    preview.src = objectUrl;
  }, []);

  const clearImage = useCallback(() => {
    setImage(null);
    setMessage("No image loaded");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleExport = useCallback(async () => {
    if (!image) {
      return;
    }

    try {
      const source = await loadCanvasImage(image.url);
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;

      const context = canvas.getContext("2d");
      if (!context) {
        setMessage("Canvas export unavailable");
        return;
      }

      context.drawImage(source, 0, 0, image.width, image.height);
      drawGridToCanvas(context, image.width, image.height, gridMode, gridTones[gridTone], opacity / 100, lineWidth);

      const link = document.createElement("a");
      const safeName = image.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "");
      link.download = `${safeName || "composition"}-${gridMode}-grid.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setMessage(`Exported ${link.download}`);
    } catch {
      setMessage("Export failed");
    }
  }, [gridMode, gridTone, image, lineWidth, opacity]);

  return (
    <section className="composition-page" aria-label="Composition grid checker">
      <aside className="composition-tools" aria-label="Composition grid controls">
        <div className="composition-tools-header">
          <p className="eyebrow">Composition</p>
          <h1>Grid Check</h1>
        </div>

        <div className="composition-upload-actions">
          <button className="primary-action" type="button" onClick={() => fileInputRef.current?.click()}>
            Upload Image
          </button>
          <button type="button" onClick={onBack}>
            Grade
          </button>
          <input
            ref={fileInputRef}
            className="composition-file-input"
            type="file"
            accept="image/*"
            onChange={(event) => loadFile(event.currentTarget.files?.[0])}
          />
        </div>

        <section className="composition-control-section">
          <div className="panel-title">Grid</div>
          <div className="composition-mode-grid" role="group" aria-label="Grid type">
            {gridModes.map((mode) => (
              <button
                key={mode.value}
                type="button"
                className={gridMode === mode.value ? "is-active" : ""}
                onClick={() => setGridMode(mode.value)}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </section>

        <section className="composition-control-section">
          <div className="panel-title">Line</div>
          <div className="composition-tone-row" role="group" aria-label="Grid color">
            {(Object.keys(gridTones) as GridTone[]).map((tone) => (
              <button
                key={tone}
                type="button"
                className={`composition-swatch ${gridTone === tone ? "is-active" : ""}`}
                onClick={() => setGridTone(tone)}
                style={{ "--swatch": gridTones[tone] } as CSSProperties}
                aria-label={`${tone} grid`}
                title={`${tone} grid`}
              />
            ))}
          </div>

          <label className="composition-slider">
            <span>Opacity</span>
            <input
              type="range"
              min="20"
              max="100"
              value={opacity}
              onChange={(event) => setOpacity(Number(event.currentTarget.value))}
            />
            <output>{opacity}%</output>
          </label>

          <label className="composition-slider">
            <span>Width</span>
            <input
              type="range"
              min="1"
              max="6"
              value={lineWidth}
              onChange={(event) => setLineWidth(Number(event.currentTarget.value))}
            />
            <output>{lineWidth}px</output>
          </label>
        </section>

        <section className="composition-control-section">
          <div className="panel-title">Image</div>
          <dl className="metadata-table">
            <div>
              <dt>File</dt>
              <dd title={image?.name}>{image?.name ?? "None"}</dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>{image ? `${image.width} x ${image.height}` : "-"}</dd>
            </div>
            <div>
              <dt>Ratio</dt>
              <dd>{image ? formatRatio(image.width, image.height) : "-"}</dd>
            </div>
          </dl>
        </section>

        <div className="composition-footer-actions">
          <button type="button" onClick={handleExport} disabled={!image}>
            Export PNG
          </button>
          <button type="button" onClick={clearImage} disabled={!image}>
            Clear
          </button>
        </div>
      </aside>

      <div
        className={`composition-stage ${isDragging ? "is-dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          loadFile(event.dataTransfer.files[0]);
        }}
      >
        {image ? (
          <div className="composition-image-frame" style={{ aspectRatio: `${image.width} / ${image.height}` }}>
            <img src={image.url} alt={image.name} />
            <CompositionSvgGrid mode={gridMode} color={gridTones[gridTone]} opacity={opacity / 100} lineWidth={lineWidth} />
          </div>
        ) : (
          <button className="composition-drop-zone" type="button" onClick={() => fileInputRef.current?.click()}>
            <span>Drop Image</span>
            <strong>Browse</strong>
          </button>
        )}

        <div className="composition-status" role="status">
          <span className={`status-pill status-${image ? "ready" : "idle"}`}>{image ? "ready" : "idle"}</span>
          <span className="status-message">{message}</span>
        </div>
      </div>
    </section>
  );
}

function CompositionSvgGrid({
  mode,
  color,
  opacity,
  lineWidth
}: {
  mode: GridMode;
  color: string;
  opacity: number;
  lineWidth: number;
}) {
  const strokeWidth = lineWidth / 2;
  return (
    <svg className="composition-grid-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {renderGridLines(mode, color, opacity, strokeWidth)}
    </svg>
  );
}

function renderGridLines(mode: GridMode, color: string, opacity: number, strokeWidth: number) {
  const lines: ReactElement[] = [];
  const addLine = (key: string, x1: number, y1: number, x2: number, y2: number, alpha = opacity) => {
    lines.push(
      <line
        key={key}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeOpacity={alpha}
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
    );
  };

  if (mode === "thirds" || mode === "full") {
    [100 / 3, 200 / 3].forEach((position, index) => {
      addLine(`third-v-${index}`, position, 0, position, 100);
      addLine(`third-h-${index}`, 0, position, 100, position);
    });
  }

  if (mode === "golden" || mode === "full") {
    [38.2, 61.8].forEach((position, index) => {
      addLine(`golden-v-${index}`, position, 0, position, 100, mode === "full" ? opacity * 0.66 : opacity);
      addLine(`golden-h-${index}`, 0, position, 100, position, mode === "full" ? opacity * 0.66 : opacity);
    });
  }

  if (mode === "diagonal" || mode === "full") {
    addLine("diag-a", 0, 0, 100, 100, mode === "full" ? opacity * 0.58 : opacity);
    addLine("diag-b", 100, 0, 0, 100, mode === "full" ? opacity * 0.58 : opacity);
    addLine("diag-c", 50, 0, 100, 50, mode === "full" ? opacity * 0.46 : opacity * 0.78);
    addLine("diag-d", 50, 0, 0, 50, mode === "full" ? opacity * 0.46 : opacity * 0.78);
    addLine("diag-e", 0, 50, 50, 100, mode === "full" ? opacity * 0.46 : opacity * 0.78);
    addLine("diag-f", 100, 50, 50, 100, mode === "full" ? opacity * 0.46 : opacity * 0.78);
  }

  if (mode === "center" || mode === "full") {
    addLine("center-v", 50, 0, 50, 100, mode === "full" ? opacity * 0.72 : opacity);
    addLine("center-h", 0, 50, 100, 50, mode === "full" ? opacity * 0.72 : opacity);
  }

  return lines;
}

function drawGridToCanvas(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  mode: GridMode,
  color: string,
  opacity: number,
  lineWidth: number
) {
  const drawLine = (x1: number, y1: number, x2: number, y2: number, alpha = opacity) => {
    context.save();
    context.globalAlpha = alpha;
    context.strokeStyle = color;
    context.lineWidth = Math.max(lineWidth, Math.min(width, height) * 0.002);
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
    context.restore();
  };

  if (mode === "thirds" || mode === "full") {
    [1 / 3, 2 / 3].forEach((position) => {
      drawLine(width * position, 0, width * position, height);
      drawLine(0, height * position, width, height * position);
    });
  }

  if (mode === "golden" || mode === "full") {
    [0.382, 0.618].forEach((position) => {
      drawLine(width * position, 0, width * position, height, mode === "full" ? opacity * 0.66 : opacity);
      drawLine(0, height * position, width, height * position, mode === "full" ? opacity * 0.66 : opacity);
    });
  }

  if (mode === "diagonal" || mode === "full") {
    drawLine(0, 0, width, height, mode === "full" ? opacity * 0.58 : opacity);
    drawLine(width, 0, 0, height, mode === "full" ? opacity * 0.58 : opacity);
    drawLine(width / 2, 0, width, height / 2, mode === "full" ? opacity * 0.46 : opacity * 0.78);
    drawLine(width / 2, 0, 0, height / 2, mode === "full" ? opacity * 0.46 : opacity * 0.78);
    drawLine(0, height / 2, width / 2, height, mode === "full" ? opacity * 0.46 : opacity * 0.78);
    drawLine(width, height / 2, width / 2, height, mode === "full" ? opacity * 0.46 : opacity * 0.78);
  }

  if (mode === "center" || mode === "full") {
    drawLine(width / 2, 0, width / 2, height, mode === "full" ? opacity * 0.72 : opacity);
    drawLine(0, height / 2, width, height / 2, mode === "full" ? opacity * 0.72 : opacity);
  }
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image export failed"));
    image.src = src;
  });
}

function formatRatio(width: number, height: number) {
  const divisor = greatestCommonDivisor(width, height);
  return `${width / divisor}:${height / divisor}`;
}

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}
