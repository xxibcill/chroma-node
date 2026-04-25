# Video Editing and Color Theory

This guide explains the theory behind the app and immediately connects each concept to the code that implements it.

## 1. A Pixel Is The Smallest Unit Of Work

Every feature in this app eventually transforms pixels.

In Chroma Node, a pixel is modeled as normalized channel values:

```ts
interface Pixel {
  r: number;
  g: number;
  b: number;
  a?: number;
}
```

The important detail is the range. The shared engine mostly works in `0..1` floating-point values, not `0..255` bytes. That makes grading math easier to reason about and keeps CPU and GPU logic aligned.

Why this matters in practice:

- preview shaders naturally operate on normalized floats
- CPU evaluation can use the same conceptual math
- project values stay independent from a specific bit depth

## 1.5. Clips, Containers, Codecs, And Frames

Developers new to video tools often collapse these terms together. The codebase does not.

- a `container` is the file wrapper, such as MP4 or MOV
- a `codec` is the compression method for the video stream, such as H.264
- a `stream` is one track inside the file, such as video or audio
- a `frame` is one decoded image at one moment in time

This distinction explains why import begins with FFprobe:

- `src/main/mediaProbe.ts` inspects the container and streams first
- `src/main/frame.ts` decodes an exact frame only after the file is known to be acceptable

Code example:

```ts
import type { MediaRef } from "../../src/shared/ipc.js";

function describeMedia(media: MediaRef): string {
  return `${media.fileName}: ${media.container}, ${media.codec}, ${media.width}x${media.height}, ${media.frameRate} fps`;
}
```

Implementation note:

- the project persists `MediaRef`, not the raw FFprobe JSON
- the app rejects media above `1920x1080` display size for the current MVP

## 2. Serial Nodes Mean “Do One Grade, Then Feed It Into The Next”

Color grading tools often use node graphs. In this project, the graph is intentionally simple: up to 3 serial nodes.

Theory:

- Node 1 grades the original image.
- Node 2 grades the output of Node 1.
- Node 3 grades the output of Node 2.

That matters because order changes the result. A qualifier after a contrast change behaves differently from the same qualifier before it.

Code example:

```ts
import { createColorNode, evaluateNodeGraph } from "../../src/shared/colorEngine.js";

const balanceNode = createColorNode(1);
balanceNode.primaries.temperature = -0.15;
balanceNode.primaries.gain = { r: 1.05, g: 1.05, b: 1.05 };

const lookNode = createColorNode(2);
lookNode.primaries.contrast = 1.12;
lookNode.primaries.saturation = 1.18;

const output = evaluateNodeGraph(
  { r: 0.42, g: 0.35, b: 0.31, a: 1 },
  [balanceNode, lookNode],
  { x: 0.5, y: 0.5 }
);
```

Implementation note:

- `evaluateNodeGraph()` in `src/shared/colorEngine.ts` reduces over the normalized node list in sequence.
- `normalizeNodeGraph()` ensures the serial graph stays valid even when loaded from messy input.

## 3. Primaries Are Broad Tonal Adjustments

The primary controls are the first grading layer:

- `lift`: pushes shadows
- `gamma`: reshapes midtones
- `gain`: scales highlights
- `offset`: shifts the whole image
- `contrast` and `pivot`: change tonal separation around a midpoint
- `saturation`: expands or compresses chroma relative to luma
- `temperature` and `tint`: approximate white-balance shifts

Theory:

- lift adds to dark regions
- gamma is a power curve
- gain multiplies brighter values
- contrast spreads values away from or toward the pivot
- saturation mixes between grayscale luma and the original color

Approximate order in this codebase:

1. add lift
2. apply gamma power curve
3. apply gain and offset
4. apply contrast around pivot
5. compute luma and mix for saturation
6. apply temperature/tint white-balance scale
7. clamp back into `0..1`

Code example:

```ts
import { applyPrimaryCorrection, createNeutralPrimaries } from "../../src/shared/colorEngine.js";

const primaries = createNeutralPrimaries();
primaries.lift = { r: 0.02, g: 0.02, b: 0.04 };
primaries.gamma = { r: 0.95, g: 0.95, b: 0.98 };
primaries.gain = { r: 1.08, g: 1.05, b: 1.02 };
primaries.contrast = 1.1;
primaries.pivot = 0.45;
primaries.saturation = 1.2;

const corrected = applyPrimaryCorrection(
  { r: 0.20, g: 0.18, b: 0.16, a: 1 },
  primaries
);
```

Implementation note:

- `applyPrimaryCorrection()` applies operations in a fixed order.
- Rec.709 luma coefficients are used when saturation is computed.

Why order matters:

- contrast before saturation is not the same as saturation before contrast
- white-balance scaling after saturation yields a different image than doing it earlier
- changing this order is a functional change, not a refactor

## 4. A Qualifier Is A Soft Color-Based Mask

A qualifier isolates pixels by their color characteristics. In this app that means:

- hue
- saturation
- luminance

Theory:

- the mask is not just on/off
- softness makes the mask partially transparent near boundaries
- a qualifier should usually evaluate against the node input, not the already-corrected output

That last point is important. If you qualify after correction, the correction can change the selection itself in unstable ways.

Code example:

```ts
import { evaluateQualifierMask } from "../../src/shared/colorEngine.js";

const mask = evaluateQualifierMask(
  { r: 0.14, g: 0.42, b: 0.68, a: 1 },
  {
    enabled: true,
    hueCenter: 205,
    hueWidth: 50,
    hueSoftness: 12,
    saturationMin: 0.15,
    saturationMax: 1,
    saturationSoftness: 0.08,
    luminanceMin: 0.05,
    luminanceMax: 0.95,
    luminanceSoftness: 0.1,
    invert: false
  }
);
```

Implementation note:

- `evaluateQualifierMask()` converts RGB to HSL for hue and saturation, but uses Rec.709 luma for luminance.
- hue selection uses circular distance so values near `0` and `360` can belong to the same red range.

Why HSL Is Used Here

HSL is not a perfect grading color space, but it is easy to reason about for an MVP:

- hue is intuitive for color-based isolation
- saturation and luminance thresholds are easy to present in UI controls
- the implementation cost is low enough to keep the logic transparent for learners

That is why the app uses a lightweight “HSL-style qualifier” rather than a more advanced keyed selection model.

## 5. A Power Window Is A Geometric Mask

A qualifier selects by color. A power window selects by position.

This app supports:

- ellipse
- rectangle

Theory:

- the window is defined in normalized image coordinates, not pixels
- softness feathers the edge instead of making a hard cut
- windows can be combined with qualifiers by multiplying their masks

Code example:

```ts
import { evaluatePowerWindowMask } from "../../src/shared/colorEngine.js";

const mask = evaluatePowerWindowMask(
  { x: 0.52, y: 0.41 },
  {
    ellipse: {
      enabled: true,
      centerX: 0.5,
      centerY: 0.45,
      width: 0.35,
      height: 0.42,
      rotationDegrees: 0,
      softness: 0.2,
      invert: false
    },
    rectangle: {
      enabled: false,
      centerX: 0.5,
      centerY: 0.5,
      width: 0.5,
      height: 0.5,
      rotationDegrees: 0,
      softness: 0,
      invert: false
    }
  }
);
```

Implementation note:

- `evaluateNodeMask()` multiplies qualifier and window masks.
- `evaluateNodeGraph()` then blends corrected output back over the original input using that mask.

Why The Point Is Normalized

`evaluatePowerWindowMask()` takes normalized points because the same logical window should work:

- in a small preview frame
- in a large decoded export frame
- in scope analysis

Normalized geometry is one of the simplest ways to keep the feature resolution-independent.

## 6. Tracking Is “Move The Window With The Object”

This project does translation-only tracking. The window can move over time, but it does not scale or rotate.

Theory:

- choose a template region from the selected window
- look for the best matching offset in the next frame
- store that offset as `dx` and `dy`
- stop if confidence gets too low

The tracking implementation uses normalized cross-correlation over a bounded search area.

Code example:

```ts
import { getScaledSearchRadius, matchTranslation } from "../../src/renderer/tracking/templateTracker";

const match = matchTranslation(
  sourceFrame,
  targetFrame,
  trackedWindow,
  24,
  {
    searchRadiusPx: getScaledSearchRadius(sourceFrame.width, sourceFrame.height),
    minTemplateSizePx: 16,
    minTextureStandardDeviation: 8
  }
);

console.log(match.dxPx, match.dyPx, match.confidence);
```

Implementation note:

- tracking works on luma frames, not full RGB frames
- low-texture windows fail early because flat regions are hard to match reliably
- final keyframes are stored in normalized offsets on the node tracking data

Why Luma Tracking Is Good Enough Here

The tracker is solving a narrow problem:

- it only needs translation
- it only tracks one selected window at a time
- it should be understandable to new developers

Using luma simplifies computation and still captures most motion cues needed for this MVP.

### Tracking Data Lifecycle

1. user chooses ellipse or rectangle as the tracking target
2. the current window becomes the template region
3. adjacent frames are fetched through exact frame extraction
4. the matcher finds the best offset inside a bounded radius
5. offsets are written as keyframes
6. later manual window edits can invalidate those keyframes as `stale`

## 7. Scopes Turn Images Into Measurements

Scopes are not effects. They are measurement tools.

### Waveform

Theory:

- X position represents image position from left to right
- Y position represents luma
- dense areas show where many pixels land

Code example:

```ts
import { createWaveformHistogram } from "../../src/renderer/scopes/scopeAnalysis";

const waveform = createWaveformHistogram(frame, 320, 160);
console.log(waveform.peak, waveform.samples);
```

Implementation note:

- `createWaveformHistogram()` bins each pixel by source X and Rec.709 luma

Why users care:

- clipping risk shows up near the top
- crushed shadows collect near the bottom
- you can see whether tonal structure is evenly distributed or collapsing

### Vectorscope

Theory:

- angle represents hue
- distance from center represents saturation
- center is neutral gray

Code example:

```ts
import { createVectorscopeHistogram } from "../../src/renderer/scopes/scopeAnalysis";

const vectorscope = createVectorscopeHistogram(frame, 220);
console.log(vectorscope.peak, vectorscope.samples);
```

Implementation note:

- `calculateRec709Chroma()` maps RGB into a Rec.709-style `Cb/Cr` space for plotting

Why users care:

- oversaturated colors move farther from center
- hue shifts rotate the trace
- skin tones often cluster along a familiar line, making cast problems easier to spot

## 7.5. Why Scopes Use The Graded Frame

Some tools let scopes inspect the source, the output, or both. In this app, the scopes are intended to help the user judge the current grade.

That is why `createGradedScopeFrame()` runs the node graph first and the histogram builders run afterward.

Code example:

```ts
import { createGradedScopeFrame, createVectorscopeHistogram, createWaveformHistogram } from "../../src/renderer/scopes/scopeAnalysis";

const graded = createGradedScopeFrame(sourceFrame, nodes);
const waveform = createWaveformHistogram(graded, 320, 160);
const vectorscope = createVectorscopeHistogram(graded, 220);
```

## 8. Preview And Export Solve The Same Problem In Different Ways

This is the core engineering idea behind the app.

Theory:

- preview must be interactive, so it uses the GPU
- export must be deterministic and independent from the renderer, so it uses CPU evaluation
- both must still match perceptually

Code example: preview path

```ts
import { generateColorFragmentShader } from "../../src/shared/colorEngine.js";

const fragmentShader = generateColorFragmentShader(3);
```

Code example: export path

```ts
import { evaluateNodeGraph } from "../../src/shared/colorEngine.js";

const graded = evaluateNodeGraph(pixel, nodes, point);
```

Implementation note:

- preview compiles shader source generated from the shared engine model
- export loops over pixels and calls the shared CPU evaluator
- this split is why changes to grading logic should start in `src/shared/colorEngine.ts`

Why Not Export From The Preview Canvas

That approach would be simpler at first, but it would create hard problems:

- browser canvas state is not the most stable export boundary
- long-running renders belong in the main process
- exporting through the renderer would complicate cancellation and diagnostics
- GPU readback would be a poor fit for the current Electron architecture

## 9. Why The Code Uses Normalized Coordinates So Often

You will see `0..1` coordinates across:

- power windows
- tracking offsets
- sampling points passed to `evaluateNodeGraph`
- split-view controls

Theory:

- normalized coordinates are independent from image resolution
- they make project files portable between decoded frame sizes
- they keep the same logical mask behavior in preview, scopes, and export

If you introduce a new image-space feature, prefer normalized coordinates unless there is a strong reason not to.

## 10. Project Theory: Why The App Persists Intent, Not Cached Results

The project file stores:

- parameters
- masks
- tracking keyframes
- viewer/export settings

It does not store:

- decoded frames
- cached scopes
- shader programs
- rendered output frames

That keeps project files:

- smaller
- versionable
- deterministic to re-evaluate
- easier to validate and sanitize

It also means every project load is effectively a re-interpretation of user intent through the current engine.

## 11. Common Theory Mistakes For New Contributors

- confusing luma with luminance
- changing parameter order and assuming it is just cleanup
- treating HSL as a physically correct color science model instead of a usable UI model
- assuming tracking works in pixel coordinates all the way through persistence
- forgetting that scopes are measurements of the graded result, not pre-grade diagnostics
- forgetting that “looks the same in preview” is not sufficient if export semantics changed

## 12. The Short Version

If you remember only five things:

1. A node graph is just an ordered list of pixel transforms.
2. Primaries change color broadly; qualifiers and windows decide where they apply.
3. Tracking only moves a window over time.
4. Scopes measure the graded frame; they do not influence it.
5. Shared color math is the contract that keeps preview and export aligned.

## Learn More

For deeper reading beyond this repo, see [External Resources](./external-resources.md).
