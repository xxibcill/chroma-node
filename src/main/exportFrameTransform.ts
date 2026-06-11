import { getPaddedContentRect } from "../shared/mediaGeometry.js";

export function transformRgbaFrame(
  source: Buffer,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  policy: "fit" | "crop" | "pad"
): Buffer {
  const output = Buffer.alloc(targetWidth * targetHeight * 4);
  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = targetWidth / targetHeight;

  let srcX = 0;
  let srcY = 0;
  let srcVisibleWidth = sourceWidth;
  let srcVisibleHeight = sourceHeight;

  if (policy === "fit") {
    if (sourceAspect > targetAspect) {
      srcVisibleHeight = Math.round(sourceWidth / targetAspect);
      srcY = Math.round((sourceHeight - srcVisibleHeight) / 2);
    } else if (sourceAspect < targetAspect) {
      srcVisibleWidth = Math.round(sourceHeight * targetAspect);
      srcX = Math.round((sourceWidth - srcVisibleWidth) / 2);
    }
  } else if (policy === "crop") {
    if (sourceAspect > targetAspect) {
      srcVisibleWidth = Math.round(sourceHeight * targetAspect);
      srcX = Math.round((sourceWidth - srcVisibleWidth) / 2);
    } else if (sourceAspect < targetAspect) {
      srcVisibleHeight = Math.round(sourceWidth / targetAspect);
      srcY = Math.round((sourceHeight - srcVisibleHeight) / 2);
    }
  }

  const paddedContent = policy === "pad"
    ? getPaddedContentRect(sourceWidth, sourceHeight, targetWidth, targetHeight)
    : undefined;

  const sx = srcVisibleWidth / targetWidth;
  const sy = srcVisibleHeight / targetHeight;

  for (let ty = 0; ty < targetHeight; ty += 1) {
    for (let tx = 0; tx < targetWidth; tx += 1) {
      let r: number, g: number, b: number, a: number;

      if (paddedContent) {
        const insideContent = tx >= paddedContent.left &&
          tx < paddedContent.left + paddedContent.width &&
          ty >= paddedContent.top &&
          ty < paddedContent.top + paddedContent.height;
        if (insideContent) {
          const sourcePixelX = Math.floor(((tx - paddedContent.left) + 0.5) * sourceWidth / paddedContent.width);
          const sourcePixelY = Math.floor(((ty - paddedContent.top) + 0.5) * sourceHeight / paddedContent.height);
          const idx = (Math.max(0, Math.min(sourceHeight - 1, sourcePixelY)) * sourceWidth + Math.max(0, Math.min(sourceWidth - 1, sourcePixelX))) * 4;
          r = source[idx];
          g = source[idx + 1];
          b = source[idx + 2];
          a = source[idx + 3];
        } else {
          r = 0;
          g = 0;
          b = 0;
          a = 255;
        }
      } else {
        const px = Math.round(srcX + tx * sx);
        const py = Math.round(srcY + ty * sy);
        const idx = (Math.max(0, Math.min(sourceHeight - 1, py)) * sourceWidth + Math.max(0, Math.min(sourceWidth - 1, px))) * 4;
        r = source[idx];
        g = source[idx + 1];
        b = source[idx + 2];
        a = source[idx + 3];
      }

      const outOffset = (ty * targetWidth + tx) * 4;
      output[outOffset] = r;
      output[outOffset + 1] = g;
      output[outOffset + 2] = b;
      output[outOffset + 3] = a;
    }
  }

  return output;
}
