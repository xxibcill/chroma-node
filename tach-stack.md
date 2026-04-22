## Best stack for the MVP

### Core app

- **Language:** **C++**
- **UI framework:** **Qt 6**
- **Rendering:** **OpenGL**
- **Shader language:** **GLSL**
- **Video decode/export:** **FFmpeg**
- **Tracking / image ops:** **OpenCV** only where it saves time
- **Project persistence:** **JSON** via `nlohmann/json`
- **Build system:** **CMake**
- **Packaging:** `windeployqt` / `macdeployqt` / Linux AppImage or distro package

## Why this is the right choice

### 1) Your PRD is GPU-work disguised as a product app

You need:

- real-time playback
- float32 internal processing
- serial node graph
- masks and qualifiers
- waveform/vectorscope
- export rendering

That is a graphics pipeline problem. Qt gives you the desktop shell; OpenGL/GLSL does the actual heavy lifting; FFmpeg handles media I/O. That architecture fits the PRD directly

### 2) C++ is the practical choice here

For this type of app, C++ gives you:

- predictable performance
- direct access to FFmpeg/OpenGL
- easier control over memory/layout
- simpler packaging for a desktop binary than trying to stitch together Electron + native video/GPU modules

Python is faster to prototype, but not the best foundation for the actual shipped MVP if you care about responsive 1080p grading. Rust is viable, but ecosystem friction is higher for Qt/media/graphics integration unless you already know Rust well.

### 3) Qt is the least bad UI option

You need:

- desktop file dialogs
- dockable panels
- timeline/scrubber
- node list
- custom scopes widgets
- overlay mask editing

Qt is built for exactly this class of app. The PRD even points to Qt as a reasonable implementation option for a cross-platform desktop UI

## Recommended architecture

### UI layer

- **Qt Widgets**, not QML, for the MVP
- Use:
  - `QMainWindow`
  - dock panels for controls/scopes
  - custom widgets for wheels/scopes
  - `QOpenGLWidget` for viewer rendering

Why Widgets instead of QML:

- less architectural churn
- easier C++ integration
- better for a tool-style desktop layout
- fewer moving parts for a solo developer

QML is fine for prettier UI later, but it is not where your risk is.

### Video pipeline

- **FFmpeg** for decode and encode
- Decode frames into CPU memory
- Upload frame textures to GPU
- Apply node stack as fragment shaders
- Render final preview to screen
- Reuse same pipeline for export, either:
  - GPU render to buffer → readback → FFmpeg encode
  - or CPU fallback path for export if needed

This fits the PRD’s import/playback/export requirements almost one-to-one

### Color processing

Implement these in **GLSL fragment shaders**:

- lift / gamma / gain / offset
- contrast / pivot
- saturation
- temperature / tint
- qualifier mask blending
- ellipse / rectangle masks
- before/after split

Do **not** start with CPU pixel loops for live preview unless you want a sluggish app. CPU is fine for proof-of-concept, but the real MVP should push grading onto the GPU.

### Scopes

- Start with **CPU scopes** using downsampled frames
- Later optimize if needed

Reason:

- waveform and vectorscope are secondary to preview responsiveness
- downsampling makes them manageable
- you can ship MVP with scopes updating at a lower rate than playback if necessary, which the PRD itself allows as a mitigation under heavy load

### Tracking

Use **OpenCV** for MVP tracking:

- template matching, Lucas-Kanade optical flow, or simple point tracking
- translation-only as specified in the PRD

Do not build custom tracking from scratch for MVP. That is wasted time. The PRD only needs basic translation tracking, not robust studio-grade tracking

### Project file

- JSON
- exactly as the PRD suggests
- save node params, masks, keyframes, clip path, app version

That part is straightforward and already well-defined in the PRD

---

## Concrete library choices

### Must-have

- **Qt 6**
- **FFmpeg**
- **OpenGL 4.x**
- **CMake**
- **nlohmann/json**

### Strongly recommended

- **OpenCV** for tracking and small utility image operations
- **spdlog** for logging
- **fmt** if not already covered
- **doctest** or **Catch2** for small tests

### Optional

- **ImGui** for internal debug panels only
  Not for the main app UI. Mixing a full tool UI into ImGui is a shortcut that usually looks like a toy.

---

## What I would not use

### Not Electron / React / Tauri for this MVP

Bad fit. The app is fundamentally a media-processing workstation, not a browser UI product. You would spend too much time fighting:

- GPU interop
- video decode/render plumbing
- native packaging edge cases
- performance/debug complexity

### Not Python as the main stack

PySide + FFmpeg + OpenCV can prototype the workflow, but for a real shipping MVP with real-time grading and scopes, it is the wrong long-term center of gravity.

### Not Unity / Unreal

You are not building a game. They add a lot of irrelevant complexity and weirdness around desktop tool UX, media workflows, and packaging.

### Not Vulkan/Metal first

Too much complexity for MVP. OpenGL is good enough here unless you have a strong reason otherwise.

---

## Two realistic paths

## Path A — safest for a real product

**C++ / Qt Widgets / FFmpeg / OpenGL / GLSL / OpenCV**

Choose this if your goal is to actually ship the MVP.

## Path B — fastest prototype, then rewrite risk later

**Python / PySide6 / FFmpeg / OpenCV**

- good for proving UI flow and tracker behavior
- bad if you expect to keep the codebase

I would only choose Path B if you explicitly want a throwaway prototype in 3–6 weeks.

---

## Suggested repo structure

```text
/app
  /ui
    main_window.*
    viewer_widget.*
    node_panel.*
    controls_panel.*
    scopes_panel.*
  /core
    video_decoder.*
    video_encoder.*
    playback_controller.*
    project_model.*
  /grading
    node_graph.*
    color_ops.*
    qualifier.*
    masks.*
    tracker.*
  /render
    gl_renderer.*
    shader_program.*
    framebuffer.*
    textures.*
  /scopes
    waveform.*
    vectorscope.*
  /io
    project_io.*
  /third_party
/tests
/resources
/shaders
```

---

## What I’d optimize for first

Order matters more than stack debates.

1. **Playback + viewer**
2. **Single-node GPU grading**
3. **3-node serial pipeline**
4. **Export**
5. **Qualifier + masks**
6. **Tracking**
7. **Scopes polish**

That order aligns with the milestone logic in the PRD, though I’d move export earlier than some teams would because it validates the pipeline end-to-end sooner

---

## Final recommendation

If you want one answer:

**Use C++ + Qt 6 + FFmpeg + OpenGL/GLSL + OpenCV + JSON + CMake.**

That is the most defensible stack for this PRD.

If you want, I can turn this into:

- a **full technical stack decision doc**
- or a **repo bootstrap plan with modules, dependencies, and first 4 milestones** based on this PRD.
