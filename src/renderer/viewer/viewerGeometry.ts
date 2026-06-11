import { getContainedRect as getSharedContainedRect, type ContainedRect } from "../../shared/mediaGeometry";
import type { Annotation } from "../../shared/project";

export interface SourceRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PixelPoint {
  x: number;
  y: number;
}

export interface AnnotationOverlayGeometry {
  center: PixelPoint;
  width: number;
  height: number;
}

export function getContainedRect(
  containerWidth: number,
  containerHeight: number,
  sourceWidth: number,
  sourceHeight: number
): ContainedRect {
  return getSharedContainedRect(containerWidth, containerHeight, sourceWidth, sourceHeight);
}

export function readSvgPoint(
  clientX: number,
  clientY: number,
  boundingRect: DOMRect
): PixelPoint {
  return {
    x: clientX - boundingRect.left,
    y: clientY - boundingRect.top
  };
}

export function getWindowGeometry(
  windowCenterX: number,
  windowCenterY: number,
  windowWidth: number,
  windowHeight: number,
  sourceRect: SourceRect
): {
  center: PixelPoint;
  width: number;
  height: number;
} {
  return {
    center: {
      x: windowCenterX * sourceRect.width,
      y: windowCenterY * sourceRect.height
    },
    width: windowWidth * sourceRect.width,
    height: windowHeight * sourceRect.height
  };
}

export function rotatePixelPoint(point: PixelPoint, degrees: number): PixelPoint {
  const radians = degrees * Math.PI / 180;
  const sin = Math.sin(radians);
  const cos = Math.cos(radians);

  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos
  };
}

export function normalizeSignedDegrees(value: number): number {
  const degrees = ((value + 180) % 360 + 360) % 360 - 180;
  return degrees === -180 ? 180 : degrees;
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function getAnnotationOverlayGeometry(
  geometry: Annotation["geometry"] | undefined,
  sourceRect: SourceRect
): AnnotationOverlayGeometry {
  const x = clamp01(geometry?.x ?? 0.5);
  const y = clamp01(geometry?.y ?? 0.5);
  const normalizedWidth = readAnnotationSize(geometry?.width, geometry?.x2, x);
  const normalizedHeight = readAnnotationSize(geometry?.height, geometry?.y2, y);

  return {
    center: {
      x: x * sourceRect.width,
      y: y * sourceRect.height
    },
    width: Math.max(12, normalizedWidth * sourceRect.width),
    height: Math.max(12, normalizedHeight * sourceRect.height)
  };
}

function readAnnotationSize(size: number | undefined, secondPoint: number | undefined, center: number): number {
  if (typeof size === "number" && Number.isFinite(size) && size > 0) {
    return clamp01(size);
  }

  if (typeof secondPoint === "number" && Number.isFinite(secondPoint)) {
    return Math.max(0.02, Math.abs(clamp01(secondPoint) - center));
  }

  return 0.12;
}
