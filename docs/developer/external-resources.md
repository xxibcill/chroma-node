# External Resources

This reading list is intentionally curated for developers working on Chroma Node.

The emphasis is:

- official documentation where possible
- theory references that explain why the code works the way it does
- links that help a new contributor move from “I can follow the code” to “I understand the underlying media concepts”

## How To Use This Page

- start with the official docs for APIs and standards
- use the theory links to understand the rationale behind the math
- use the product/training links to understand the user mental model this app is mimicking

## 1. Color Grading And Resolve-Style Workflow

- [DaVinci Resolve Training](https://www.blackmagicdesign.com/products/davinciresolve/training)
  Best starting point for understanding the workflow language this app borrows: nodes, qualifiers, windows, scopes, and tracking.
- [DaVinci Resolve Color Page Overview](https://www.blackmagicdesign.com/products/davinciresolve/color)
  High-level product explanation of the grading concepts this project is simplifying.

## 2. Scopes, Exposure, And Signal Analysis

- [Blackmagic Scopes Overview](https://www.blackmagicdesign.com/products/blackmagicvideoassist/scopes)
  Clear product-level explanation of waveform and vectorscope behavior.
- [Recommendation ITU-R BT.709](https://www.itu.int/rec/R-REC-BT.709)
  The HDTV recommendation behind the Rec.709 assumptions used throughout the codebase.
- [Recommendation ITU-R BT.709-6 PDF](https://www.itu.int/dms_pubrec/itu-r/rec/bt/R-REC-BT.709-6-201506-I%21%21PDF-E.pdf)
  Formal reference if you want the actual standard document.

## 3. Color Science And Gamma

- [Poynton's Gamma and Colour FAQs](https://poynton.ca/notes/colour_and_gamma/)
  A classic and still-useful explanation of gamma, color terminology, and common misunderstandings.
- [Gamma FAQ](https://poynton.ca/notes/colour_and_gamma/GammaFAQ.html)
  More detailed reading if you want the underlying tone-response theory.
- [Luminance, Luma, and the Migration to DTV](https://poynton.ca/papers/SMPTE_98_YYZ_Luma/index.html)
  Helpful for understanding why video engineers distinguish `Y` from `Y'`, and why the code talks about luma.
- [Constant Luminance](https://poynton.ca/notes/video/Constant_luminance.html)
  Explains the engineering tradeoffs behind luma/chroma video systems.

## 4. FFmpeg And FFprobe

- [FFmpeg Documentation Portal](https://ffmpeg.org/documentation.html)
  Main entry point for FFmpeg manuals.
- [ffmpeg Manual](https://ffmpeg.org/ffmpeg.html)
  Core command-line behavior used by the app for decode and encode work.
- [ffmpeg-all Manual](https://ffmpeg.org/ffmpeg-all.html)
  Full reference when you need filters, codecs, formats, or muxers in one place.
- [ffprobe Manual](https://ffmpeg.org/ffprobe.html)
  Relevant to `mediaProbe.ts` and metadata inspection.

## 5. WebGL And GPU Rendering

- [WebGL 2.0 Specification](https://registry.khronos.org/webgl/specs/latest/2.0/)
  The authoritative spec behind the preview renderer.
- [WebGL 2.0 Quick Reference Guide](https://www.khronos.org/files/webgl20-reference-guide.pdf)
  Faster to scan than the full spec when you just need API reminders.
- [MDN WebGL Tutorial](https://developer.mozilla.org/docs/Web/API/WebGL_API/Tutorial)
  Good conceptual bridge from web development to shader-driven rendering.
- [MDN WebGL Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
  Useful when tuning the preview renderer or debugging GPU usage.
- [MDN ImageData](https://developer.mozilla.org/en-US/docs/Web/API/ImageData)
  Helpful for understanding the 2D canvas/frame-analysis side of the renderer.

## 6. Electron App Boundaries And Security

- [Electron Process Model](https://www.electronjs.org/docs/latest/tutorial/process-model)
  Explains why this repo splits responsibilities between renderer, preload, and main.
- [Electron IPC Tutorial](https://www.electronjs.org/docs/latest/tutorial/ipc)
  Best reference when adding new cross-process actions.
- [Electron Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
  Relevant to `src/preload/preload.cts` and secure API exposure.
- [Electron contextBridge API](https://www.electronjs.org/docs/latest/api/context-bridge/)
  Lower-level API reference for the preload bridge.
- [Electron ipcMain API](https://www.electronjs.org/docs/latest/api/ipc-main)
  Useful while extending main-process IPC handlers.
- [Electron Security Tutorial](https://www.electronjs.org/docs/latest/tutorial/security)
  Good reference when deciding whether a new capability should be exposed to the renderer.

## 7. Computer Vision And Template Matching

- [OpenCV Template Matching Tutorial](https://docs.opencv.org/4.x/de/da9/tutorial_template_matching.html)
  Good conceptual background for the translation tracker in this project.
- [OpenCV Template Matching (Python tutorial)](https://docs.opencv.org/3.4/d4/dc6/tutorial_py_template_matching.html)
  Sometimes easier to read for the basic intuition even if you are not using Python.

## 8. Project-Level Reading Strategy

If you want to learn:

- Electron boundaries: read the Electron links first, then `docs/developer/architecture.md`
- grading theory: read the Blackmagic links, then `docs/developer/video-editing-and-color-theory.md`
- FFmpeg integration: read the FFmpeg links, then inspect `src/main/mediaProbe.ts`, `src/main/frame.ts`, and `src/main/exportProject.ts`
- tracking theory: read the OpenCV links, then inspect `src/renderer/tracking/templateTracker.ts`
- WebGL preview internals: read the MDN and Khronos links, then inspect `src/renderer/webgl/FrameRenderer.ts`

## 9. Notes On Authority And Scope

- The official docs are the best source for API behavior and standards.
- The Blackmagic links are useful because the product vocabulary strongly influences this app’s UX.
- The Poynton references are older, but they remain valuable for the conceptual distinctions between gamma, luminance, luma, and related video terminology.

Use this page alongside the local docs, not instead of them.
