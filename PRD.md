# Executive Summary

The proposed MVP is a desktop **DaVinci Resolve–inspired Color Page learning app** enabling a solo developer to import a single video clip and experiment with professional-style color grading workflows. The app provides a simplified node-based color pipeline (up to 3 sequential nodes) with essential color grading tools: primary color wheels (lift/shadows, gamma/midtones, gain/highlights) plus offset, contrast (with pivot), saturation, temperature, and tint sliders【22†L1-L3】【21†L1-L4】. It also includes secondary grading tools: an HSL qualifier (to isolate hues, saturation, or luminance ranges)【24†L1-L4】, and two “Power Window” shapes (ellipse and rectangle masks) to restrict corrections to image regions【24†L12-L16】. Windows can be translation-tracked through the clip【25†L1-L4】. The app shows real-time **video playback** (play/pause, scrub, frame-step, before/after view) and live **video scopes**: a luma waveform and a chrominance vectorscope【27†L329-L334】. Finally, the user can **export** the graded clip as an H.264-encoded MP4.

This MVP targets users who want to understand how color grading systems work internally, so the focus is on transparent, technically-accurate processing. Internally the app uses high-precision (“32-bit”) image pipelines【31†L1-L4】 and straightforward mathematical filters (rather than black-box LUTs) so learners can see how adjustments affect pixel values. The design avoids complexity: there is no full timeline editing, no audio, no LUT import, no parallel node graphs, and no multi-user collaboration (all explicitly excluded).

# Goals and Non-Goals

- **Goals:**
  - Import one short video clip (up to 1080p) and display it in a video viewer with standard controls (play, pause, scrub, frame-step, before/after comparison).
  - Provide up to **3 serial nodes** (ordered stages) in a simple node graph. Nodes are applied in sequence to the image. (For learning simplicity, each node is linear – node chaining is serial, not parallel or branching.)【31†L9-L16】.
  - Each node offers **Primary Correction Controls**: lift (shadows), gamma (midtones), gain (highlights), and offset (whole-image shift) via color wheels【22†L1-L3】; plus sliders for contrast and contrast pivot (fulcrum), saturation, white-balance temperature, and tint【21†L1-L4】【4†L129-L138】. These parameters mimic DaVinci Resolve’s “Primary Palette”【21†L1-L4】.
  - **Secondary Controls:** An HSL (Hue/Sat/Lum) qualifier that creates a mask by selecting pixels based on hue, saturation and/or luminance ranges【24†L1-L4】; and two Power Window mask shapes (one ellipse and one rectangle) to localize corrections【24†L12-L16】. The user can adjust mask size/softness and toggle them on/off per node.
  - **Tracking:** Allow translation-only tracking of masks. The user can track each Power Window forward/backward through the clip (auto-animating the window to follow a moving object)【25†L1-L4】. (Rotation/scale tracking is _excluded_ for MVP simplicity.)
  - **Scopes:** Real-time display of a waveform monitor (luma brightness waveform or RGB parade) and a vectorscope. The vectorscope displays chroma: pixel hue as angular position and saturation as distance from center【27†L329-L334】. This helps users analyze and diagnose their grade.
  - **Export:** Render and save the graded clip to MP4 (H.264).

- **Non-Goals (Excluded Features):** Full editing timeline (no multi-clip timeline, trimming, or audio editing), LUT import/management, complex parallel/serial blend node graphs, advanced color management (e.g. ACES workflows, HDR modes), collaboration features (no network/multi-user). Only **one clip at a time** can be loaded. Performance will aim for smooth previews on typical hardware, but ultra-high frame-rates or 4K are out of scope.

# User Stories

1. **Primary Color Correction:** _As a user_, I want to import a video clip and adjust its overall exposure and color using lift, gamma, gain, and offset wheels, plus contrast, pivot, saturation, temperature, and tint controls【22†L1-L3】【21†L1-L4】. For example, “I move the shadow (lift) wheel to brighten only the dark areas,” or “I adjust temperature to correct white-balance.”

2. **Serial Node Workflow:** _As a user_, I want to work in up to 3 sequential nodes so I can isolate different correction stages (e.g. node1 for neutral balance, node2 for sky color, node3 for skin tone)【31†L9-L16】. I want to toggle each node on/off and reorder nodes to experiment with grading order.

3. **HSL Qualifier (Secondary):** _As a user_, I want to select pixels by color range. For instance, I use an eyedropper to pick a sky-blue, then expand the hue/saturation range to isolate the sky. Then I can, say, desaturate or darken just that selected hue range. The UI highlights the selected areas in the image (as Resolve does)【24†L1-L4】.

4. **Power Window Masks:** _As a user_, I want to draw an ellipse or rectangle over part of the image (e.g. a face) and apply corrections just inside that shape【24†L12-L16】. I should be able to adjust mask center, size, roundness, and softness (feather) via on-screen controls.

5. **Mask Tracking:** _As a user_, I want the mask to follow a moving subject. After setting a shape around a person, I press “track forward” and the software will automatically move the mask to follow that object frame-by-frame【25†L1-L4】. (This is translation-only tracking, so the mask does not rotate or scale.)

6. **Video Scopes:** _As a user_, I want to see a real-time waveform (displaying luma or RGB parade) and a vectorscope (showing chroma) so I can judge exposure and color balance scientifically. For example, the vectorscope’s trace shows hue angle and saturation magnitude, letting me see if skin tones hit the proper gamut【27†L329-L334】.

7. **Before/After Comparison:** _As a user_, I want a “Before/After” toggle or split-view that compares the graded image to the original, so I can see the effect of my adjustments.

8. **Export:** _As a user_, once satisfied, I want to export the graded clip as an H.264 MP4 at the same resolution, so I can view/share the results. Progress/quality should be comparable to other encoders (using FFmpeg/libx264 internally).

# Functional Requirements

- **Video I/O:**
  - _Import:_ Support opening a single video file (MP4 or MOV container, standard codecs) up to 1080p resolution. Use a robust video decoding library (e.g. FFmpeg) to read frames. Display a progress bar if opening/decoding is lengthy (target <2s for a 10-second clip).
  - _Viewer Controls:_ The UI must allow Play, Pause, frame-step forward/back, and scrubbing via timeline. Playback should refresh at ≥24 fps for 1080p on typical hardware (target 30 fps) to feel real-time. A “Before/After” view toggle or split-screen shows the original vs the current graded frame.
  - _Export:_ Encode the graded output to H.264 in MP4. Provide a simple “Export” button. The app should reuse the original clip’s framerate and resolution. Export speed should be reasonable (ideally ≤2× realtime on modern hardware). Show an encoding progress indicator.

- **Node Editor:**
  - Up to 3 nodes are available in series. The first node is automatically enabled on import (performing initial “balancing”), additional nodes start disabled. The user can **enable/disable** each node and drag to reorder them in the chain【31†L9-L16】. (Limiting to 3 keeps UI simple while still demonstrating a multi-stage pipeline.)
  - Each node processes the entire image sequentially. There is no parallel blending in MVP.

- **Primary Correction Controls (per node):**
  - **Lift/Gamma/Gain Wheels:** Three color wheels corresponding to shadows (lift), midtones (gamma), and highlights (gain)【22†L1-L3】. The user can click-drag within each wheel to add a color tint in that tonal range. Each wheel also has a master slider to adjust overall brightness of that range. This emulates Resolve’s primaries【22†L1-L3】.
  - **Offset Wheel:** An additional “Offset” wheel to shift the entire image’s color/brightness uniformly.
  - **Contrast & Pivot:** A contrast slider that expands/softens the overall tonal range, plus a pivot (fulcrum) control that sets the midpoint around which contrast is applied. (This operates like Resolve’s contrast/pivot: values above the pivot are stretched, below compressed【4†L129-L138】.)
  - **Saturation:** A slider to boost or cut overall saturation.
  - **Temperature & Tint:** Two sliders (or a combined vector) to adjust white balance: “Temperature” shifts towards blue↔orange, and “Tint” shifts green↔magenta.

- **Secondary Controls (per node):**
  - **HSL Qualifier:** The user can activate an HSL keyer. They use an eyedropper tool on the viewer to pick a target hue; the app highlights pixels in that hue range. The user can then refine by adjusting hue range, and optional saturation/luma thresholds (e.g. only bright blues)【24†L1-L4】. These range sliders with “softness”/falloff yield a grayscale mask (white = selected) that gates subsequent corrections in this node.
  - **Power Window Masks:** The user can add up to two mask shapes per node (one ellipse, one rectangle). Each mask has adjustable parameters: center (x,y), size (width/height or radius), rotation (for ellipse), and edge softness (feather). The mask defines where within the node’s adjustments are applied. (Outside the mask, adjustments do not apply.) This replicates DaVinci’s Power Window functionality【24†L12-L16】.
  - **Enable/Bypass:** The user can toggle the HSL qualifier and each mask on/off independently. When off, the node acts on the whole image (subject only to primary controls).

- **Tracking:**
  - The user can enter “Track” mode for a selected mask (ellipse or rect). A basic translation-only tracking algorithm will move the mask’s center on subsequent frames to follow the underlying image content. Controls: “Track Forward” and “Track Backward” buttons. The node computes mask positions for each frame by analyzing motion (e.g. using frame differencing or point tracking). If tracking fails or drifts, the user should be allowed to fine-adjust mask position at key frames.

- **Scopes:**
  - **Waveform Monitor:** Displays the brightness (luma) distribution of the current frame along a horizontal axis. Optionally an RGB Parade mode (separate red, green, blue waveforms) could be included. The waveform helps ensure legal levels (0–100 IRE).
  - **Vectorscope:** Displays chrominance. As known, hue is shown by angle around the circle and chroma (saturation) by radial distance【27†L329-L334】. The scope should render a live trace of color vectors from the image. Standard color reference points (skin tone line, color targets) may be overlaid for orientation【27†L329-L334】. The scopes update as adjustments change.

- **Data Persistence (Project File):** The app can save/load its state (nodes, parameters, masks) in a JSON-based project file. This allows resuming work without re-importing the video. The schema (see next section) will store all node settings, mask shapes, keyframes for tracking, etc.

# Non-Functional Requirements

- **Performance:**
  - _Real-time Preview:_ With all filters enabled and one node active, the app should target ≥24 fps playback for 1080p content on a moderately-powered modern CPU (e.g. quad-core desktop CPU, no specialized GPU). Ideally 30 fps. Achieving this may require GPU acceleration (e.g. OpenGL shaders for color adjustments) or multithreading.
  - _Latency:_ UI controls (wheel drags, slider moves) should respond instantly (<100 ms) with visible effect. Rendering pipeline should use efficient 32-bit float math to minimize banding【31†L1-L4】.
  - _Startup/Load:_ Opening the app and importing a clip should take ≤2 seconds.
  - _Export:_ Encoding speed should be reasonable: aim for ≤2× realtime (i.e. an 8-minute export in under 16 minutes on target hardware) using a standard encoder (libx264/FFmpeg).
  - _Memory:_ The app should not use excessive memory. Holding one 1080p frame in RAM is ~8MB (float32 RGB). With triple buffering and scope buffers, memory should stay under ~500MB for a typical short clip.
  - _Precision:_ Use 32-bit float per channel processing internally (as Resolve does)【31†L1-L4】 to avoid quantization artifacts. Final output can be converted back to 8-bit per channel for H.264.

- **Reliability:**
  - The app should handle bad inputs gracefully (unsupported codecs, corrupted frames) by showing error messages and not crashing. For example, if the user tries to import an unsupported video, show a clear alert.
  - Trackers should fail safely: if the algorithm loses the mask, it should stop further tracking and allow user recovery.
  - No data loss: saving the project should write atomic files. Auto-save or backup is optional but not required for MVP.

- **Usability:**
  - The UI must be clear and self-explanatory to someone familiar with color tools. All knobs and wheels should be labeled. Use standard color-wheel UI for lift/gamma/gain. Sliders should show numeric values on hover or in an inspector panel.
  - Undo/Redo of last action (adding mask, moving slider) is a plus but can be optional. At minimum, allow reloading a saved project state.

- **Platform:**
  - Desktop app, ideally cross-platform (Windows/Mac/Linux). Technologies like Qt (C++) or cross-platform toolkits are acceptable.
  - **Not a web app:** Real-time video and GPU access are complex in-browser; a native app is more realistic for performance.

# Technical Architecture

The system follows a typical **Model-View-Controller** structure:

- **Video I/O & Core Pipeline (Model):**
  - Use **FFmpeg/libav** for decoding input video frames to raw RGB (or YUV) arrays and for encoding the final H.264 output. This handles all container and codec support. Upon loading a clip, FFmpeg reads frames and gives us a frame buffer per frame.
  - **Color Processing Pipeline:** Each node applies a sequence of image transformations on the frame data. The node’s operations (primary wheels, sliders, mask gating) will be implemented as mathematical pixel-wise operations or small kernels. For example, Lift/Gamma/Gain can be implemented as RGB gain offsets (see eqn. below), contrast/pivot as a pivoted curve, saturation/temperature/tint as linear transforms in YUV or RGB. The pipeline should convert incoming frames to a linear RGB space (float32) for math, then convert to display space (sRGB) for viewing and scopes.
  - **Masks & Qualifiers:** Implement HSL qualifier by converting the frame (or a copy) to a Hue-Saturation-Lightness space (or HSV). Build a mask where each pixel within the chosen HSL range yields a weight (0–1) determined by smooth thresholding. Ellipse/Rect shapes: define geometric masks with soft edges. Combine masks: e.g. final mask = intersection (HSL mask ∧ power window) per node. Only inside-mask pixels get modified by the node’s color corrections.
  - **Tracking:** Use a lightweight tracker. One approach: track the mask center by computing optical flow or template matching between frames. For MVP, we can restrict to integer-pixel translational tracking: e.g. compute cross-correlation of the mask region in successive frames. Store per-frame offsets in the node’s “tracking” data (for project file).
  - **Scopes Calculation:** After grading operations produce the current frame, the app must generate scope data. For waveform: sample each scanline’s luma or RGB values to produce a waveform histogram (fast with downsampling if needed). For vectorscope: convert pixels to chroma (e.g. YUV or directly R-G difference), and bin them into an angular histogram to render the XY plot【27†L329-L334】. This can be done on the CPU (e.g. using SIMD acceleration) or on the GPU (e.g. render a shader that plots all pixels into a polar texture).

- **User Interface (View + Controller):**
  - The UI displays the video (with the effect of active nodes applied), the node graph panel, control panels, and scopes.
  - **Node Graph Panel:** Shows up to 3 box icons (Node1 → Node2 → Node3) that can be clicked to select. Only sequential chaining, but allow reordering by drag/drop. Each node icon shows its name (e.g. “Node 1”) and enabled/disabled state.
  - **Controls Panel:** When a node is selected, show the primary wheels and sliders for that node, as well as HSL qualifier controls and mask controls. Wheels can be implemented as interactive color wheels (like small disc with draggable pointer).
  - **Mask Control Overlay:** When editing a mask, overlay handles on the viewer (circle/rectangle shape adjustable by drag). Show center/size/softness values in a sidebar.
  - **Scopes Panel:** A separate area of the UI shows the waveform and vectorscope views, updated each frame.
  - **Implementation Technology:** For example, using Qt (C++ or PyQt) with Qt’s OpenGL widget for video rendering. Or a lightweight GUI like Dear ImGui with OpenGL/DirectX drawing. The key is ability to render video frames and controls at interactive rates.

- **Data Persistence (JSON):** The project state is a JSON file. It contains an array of nodes; each node’s object includes:
  ```json
  {
    "id": 1,
    "enabled": true,
    "primaries": {
      "lift": [r, g, b],
      "gamma": [r, g, b],
      "gain": [r, g, b],
      "offset": [r, g, b],
      "contrast": c,
      "pivot": p,
      "saturation": s,
      "temperature": t,
      "tint": ti
    },
    "qualifier": {
      "enabled": true,
      "hueMin": h1,
      "hueMax": h2,
      "satMin": s1,
      "satMax": s2,
      "lumMin": l1,
      "lumMax": l2,
      "softness": fs
    },
    "masks": [
      {"shape": "ellipse", "center": [x,y], "radiusX": rx, "radiusY": ry, "soft": sft, "enabled": true},
      {"shape": "rect",    "center": [x,y], "width": w,    "height": h,    "soft": sft, "enabled": true}
    ],
    "tracking": {
      "keyframes": [
        {"frame": 0, "center": [x0,y0]},
        {"frame": 10, "center": [x1,y1]},
        ...
      ]
    }
  }
  ```
  (This schema ensures reproducibility: on load, each node’s settings and mask trajectories are reinstated.)

# UX Workflows

1. **Import and Setup:**
   - User launches the app and clicks “Import” to load a video file.
   - The app opens a file dialog, user selects an MP4/MOV. The clip appears in the video viewer; Node 1 is active by default.

2. **Primary Balancing (Node 1):**
   - The user selects Node 1. In the controls panel, they see Lift/Gamma/Gain wheels, offset wheel, and sliders for contrast/pivot, saturation, temperature, tint.
   - They adjust the wheels to remove any color cast and set exposure: e.g. drag the “lift” wheel toward blue to cool the shadows, move the gamma wheel slightly up to brighten midtones. (These adjustments use linear math on the frame buffer.)
   - They check the waveform/vectorscope to ensure skin tones lie on the skin line and that the image’s luma fits within legal range【27†L329-L334】.
   - They toggle the “Before” view to compare the graded image to the original; seeing the difference validates the balance.

3. **Secondary Correction (Node 2):**
   - The user adds or enables Node 2, intending to refine a specific element (e.g. the sky).
   - They click the HSL qualifier eyedropper and click on the blue sky in the viewer. The app highlights the sky pixels. In the controls, sliders allow expanding/narrowing the hue range and adjusting saturation/luma limits【24†L1-L4】.
   - For instance, they widen the hue range to include all blues, and maybe exclude very low-sat or very dark pixels. The mask shown on-screen turns white in the selected area.
   - Now any further wheel/slider moves in Node 2 only affect those masked areas (the sky). The user might boost the gain or saturation to make the sky pop. The rest of the image is unchanged in this node.

4. **Power Window (Node 3):**
   - They enable Node 3, intending to work on a subject’s face. They select the Rectangle mask tool and draw a box around the face. They adjust the box’s softness to feather the edges.
   - They adjust Node 3’s parameters (e.g. slightly warm the tint and increase gamma) to brighten the face region.
   - They click “Track Forward” to track the box: the mask should automatically follow the face if it moves. If the person moved right, the rect moves right frame-by-frame.
   - They can step through frames to confirm tracking accuracy. If needed, they can stop tracking, tweak the box, and resume.

5. **Inspect and Refine:**
   - At any time, the user watches the scopes. For example, the vectorscope shows that the overall hue has shifted slightly (maybe skin tone line is too far off). They might return to Node 1 and adjust tint.
   - The user toggles “Before” to see the original clip, then “After” to see the fully graded output.

6. **Export:**
   - Satisfied with the look, the user clicks “Export” and chooses output location. The app renders the clip using H.264. A progress bar shows encoding percentage. When done, the user reviews the exported MP4.

# Edge Cases and Failure Handling

- **Unsupported File:** If the user attempts to open a file that is not a valid video or uses an unsupported codec, show an error dialog (“Cannot open file: unsupported format.”) and do not crash. Log the FFmpeg error for debugging.
- **Exceeding Node Limit:** If the user tries to add more than 3 nodes, disable the add button and show a tooltip “Maximum of 3 nodes supported in this version.”
- **Value Saturation:** Controls (e.g. wheel drag) should clamp to a safe range. For instance, saturating wheels beyond their limits should not cause NaNs; limit numeric values or wrap appropriately.
- **Tracking Failure:** If the tracking algorithm fails to find good matches (e.g. object leaves frame, heavy motion blur), it should pause and notify (“Tracking lost at frame X. Please adjust mask manually or re-track.”). The user can then set a new keyframe.
- **Performance Drop:** If the frame rate drops too low (e.g. <10 fps), optionally disable live scopes updating or lower preview resolution until user stops interacting, indicating heavy load.
- **High Memory:** If a very long clip causes excessive memory use, consider streaming from disk instead of preloading all frames; but since clip length is short (per spec), this is unlikely. If needed, flush decoded frames not immediately needed.

# Milestone Roadmap

A possible 4–6 month timeline (assuming a solo developer):

1. **M1 – Core Playback & UI (2-4 weeks):**
   - Set up project structure and dependency on FFmpeg and GUI toolkit.
   - Implement basic video import and frame decoding. Display the first frame in a viewer widget.
   - Add playback controls: Play/Pause/Scrub/Frame-step. Ensure frames render in sequence.
   - Implement a simple “Before/After” toggle (show original vs current buffer, which is same initially).
   - Design the UI layout (viewer, placeholder for node list, control panels, scopes panels).
   - **Validation:** Can load a video and play it back.

2. **M2 – Single Node, Primary Controls (3-4 weeks):**
   - Implement Node 1 with primary wheels/sliders: lift, gamma, gain, offset, contrast, pivot, saturation, temp, tint. Build the UI for these.
   - Program the mathematical operations: e.g. Lift/Gamma/Gain as per standard formulas (e.g. multiply RGB by gains and add offsets). Contrast/Pivot as a luminance curve【4†L129-L138】.
   - Apply these filters to each frame before display. Test numeric accuracy (e.g. 0→255 range, clamp or normalize).
   - Add Node control panel to enable/disable node 1. (Node 1 starts enabled by default.)
   - Implement 32-bit processing internally【31†L1-L4】 so adjustments have smooth gradations. Convert to 8-bit only for display.
   - **Validation:** User can adjust wheels and see live effect on image. Scopes display baseline (but empty until we add actual scope code).

3. **M3 – Node Graph + JSON (2-3 weeks):**
   - Extend to support up to 3 nodes: Node 1, Node 2, Node 3. UI shows Node list.
   - Allow enabling/disabling each node and reordering. Chaining: if Node 2 is enabled, feed Node1→Node2→output.
   - Implement project JSON save/load: store all node parameters, mask settings (empty for now) in a file.
   - **Validation:** Reloading JSON reproduces node states.

4. **M4 – Secondary Tools: HSL Qualifier & Masks (4-6 weeks):**
   - **HSL Qualifier:** Add eyedropper in UI; clicking viewer picks a hue target. Convert frame to HSL (or HSV) for selection. Create a mask using user-adjustable hue/sat/lum ranges. UI: show sliders for hueMin, hueMax, satMin, satMax, lumMin, lumMax, softness.
   - **Masks:** Add tools to draw ellipse/rect in viewer. UI handles (drag corners) for size/position. Compute a binary/soft mask for inside vs outside.
   - Combine HSL mask and shape masks: e.g. finalMask = ellipseMask ∧ (if qualifier enabled then qualifierMask).
   - Apply primary corrections only to pixels where finalMask is true. (Outside, pass-through).
   - **Validation:** User can isolate a color or draw a window and see adjustments only in masked area.

5. **M5 – Tracking (2-3 weeks):**
   - Implement translation-only tracking for masks. Likely use a simple template matcher or Lucas-Kanade tracker on the masked region.
   - UI: “Track Forward/Backward” buttons. When clicked, compute and store new positions for each subsequent frame until the end (or to a break point).
   - Update JSON schema to record keyframes of mask positions.
   - **Validation:** A moving object under a mask is followed by the mask over time.

6. **M6 – Scopes & Polish (3-4 weeks):**
   - **Scopes:** Implement waveform (e.g. an Y or RGB parade display) and vectorscope. For performance, downsample the frame by some factor. Draw graphs as custom widgets or OpenGL textures. Ensure real-time updates (perhaps throttle to 10 fps if needed).
   - Add UI controls to show/hide scopes, and toggle which waveform (luma vs RGB).
   - **UI Polish:** Label all controls, add tooltips. Ensure color wheels and sliders use standard UI behavior.
   - **Export:** Integrate FFmpeg encoding. The user clicks “Export”, the app encodes frames with current grade applied. Show a progress bar.
   - **Testing:** Extensive manual testing of all flows; fix any stability issues.
   - **Validation:** End-to-end scenario: load, grade with 3 nodes, track, view scopes, export H.264 file that plays externally with the adjustments applied.

# Engineering Risks

- **Performance Risk:** Achieving smooth real-time playback with multiple color passes and scopes may strain a CPU-only implementation. Mitigation: design pipeline to optionally use GPU shaders. If CPU-only is too slow, fall back to lower-resolution previews or only update scopes when idle.
- **Tracking Accuracy:** Simple translation tracking can fail on low-contrast or fast motion. Mitigation: allow manual override keyframes; keep UI to disable/re-run tracking on subsets of frames.
- **Color Precision:** Incorrect math (e.g. performing gamma in non-linear space) can introduce artifacts. Mitigation: use float32 pipeline【31†L1-L4】 and convert color spaces properly. Validate vs reference images or known formulas.
- **UI Complexity:** Building a responsive node editor and mask overlay is non-trivial. Time risk for polishing drag-and-drop and interaction. Mitigation: iterate UI early and gather feedback (even personal testing) to refine. Use existing UI libraries for wheels/masks if available.
- **FFmpeg Licensing/Integration:** If using FFmpeg, ensure LGPL/GPL licensing is compatible. Mitigation: link dynamically or advise users of requirements. For MVP, this is probably acceptable.
- **Single-Developer Scope Creep:** Many color features exist; risk is in adding too much. Strictly stick to MVP list to avoid overrun. Prioritize core path (import→grade→export) and postpone any extra (e.g. curves, node presets) beyond spec.

# Citations

Key features and design choices reference industry sources. For example, DaVinci’s Color page uses lift/gamma/gain wheels and offset【22†L1-L3】, a primary adjustments palette including contrast, saturation, temperature, tint【21†L1-L4】, HSL qualifiers【24†L1-L4】 and drawn power windows【24†L12-L16】. Nodes are described as “building blocks” in Resolve’s color pipeline【31†L9-L16】. The vectorscope’s function (hue = angle, saturation = radius) is well-known【27†L329-L334】. These guide the MVP’s requirements and UX.
