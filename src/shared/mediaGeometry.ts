export const MAX_DISPLAY_WIDTH = 3840;
export const MAX_DISPLAY_HEIGHT = 2160;
export const MAX_SUPPORTED_DISPLAY_EDGE = 3840;
export const MAX_SUPPORTED_DISPLAY_PIXELS = MAX_DISPLAY_WIDTH * MAX_DISPLAY_HEIGHT;

export function normalizeRotation(rotation: number): number {
  const normalized = rotation % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function isRotated(rotation: number): boolean {
  const normalized = normalizeRotation(rotation);
  return normalized === 90 || normalized === 270;
}

export function getDisplaySize(
  codedWidth: number,
  codedHeight: number,
  rotation: number
): { displayWidth: number; displayHeight: number } {
  if (isRotated(rotation)) {
    return { displayWidth: codedHeight, displayHeight: codedWidth };
  }
  return { displayWidth: codedWidth, displayHeight: codedHeight };
}

export function getAspectRatio(width: number, height: number): number {
  if (height <= 0) {
    return 0;
  }
  return width / height;
}

export function isSupportedDisplayRaster(width: number, height: number): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return false;
  }

  const displayWidth = Math.round(width);
  const displayHeight = Math.round(height);
  if (displayWidth < 1 || displayHeight < 1) {
    return false;
  }

  return Math.max(displayWidth, displayHeight) <= MAX_SUPPORTED_DISPLAY_EDGE
    && displayWidth * displayHeight <= MAX_SUPPORTED_DISPLAY_PIXELS;
}

export function clampDisplaySize(
  width: number,
  height: number
): { displayWidth: number; displayHeight: number } {
  let displayWidth = toPositiveInteger(width);
  let displayHeight = toPositiveInteger(height);

  if (isSupportedDisplayRaster(displayWidth, displayHeight)) {
    return { displayWidth, displayHeight };
  }

  const edgeScale = MAX_SUPPORTED_DISPLAY_EDGE / Math.max(displayWidth, displayHeight);
  const pixelScale = Math.sqrt(MAX_SUPPORTED_DISPLAY_PIXELS / (displayWidth * displayHeight));
  const scale = Math.min(1, edgeScale, pixelScale);
  displayWidth = Math.max(1, Math.floor(displayWidth * scale));
  displayHeight = Math.max(1, Math.floor(displayHeight * scale));

  while (!isSupportedDisplayRaster(displayWidth, displayHeight)) {
    if (displayWidth >= displayHeight && displayWidth > 1) {
      displayWidth -= 1;
      continue;
    }
    if (displayHeight > 1) {
      displayHeight -= 1;
      continue;
    }
    break;
  }

  return { displayWidth, displayHeight };
}

function toPositiveInteger(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.max(1, Math.round(value));
}
