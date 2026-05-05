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

export function getContainedRect(
  containerWidth: number,
  containerHeight: number,
  sourceWidth: number,
  sourceHeight: number
): SourceRect {
  if (containerWidth <= 0 || containerHeight <= 0 || sourceWidth <= 0 || sourceHeight <= 0) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }

  const containerAspect = containerWidth / containerHeight;
  const sourceAspect = sourceWidth / sourceHeight;
  if (containerAspect > sourceAspect) {
    const width = containerHeight * sourceAspect;
    return {
      left: (containerWidth - width) / 2,
      top: 0,
      width,
      height: containerHeight
    };
  }

  const height = containerWidth / sourceAspect;
  return {
    left: 0,
    top: (containerHeight - height) / 2,
    width: containerWidth,
    height
  };
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
