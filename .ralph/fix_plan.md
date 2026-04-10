# Ralph Fix Plan

## High Priority
- [x] **Primary Color Correction:** _As a user_, I want to import a video clip and adjust its overall exposure and color using lift, gamma, gain, and offset wheels, plus contrast, pivot, saturation, temperature, and tint controls. IMPLEMENTED: Basic sliders in App.tsx
- [x] **Serial Node Workflow:** _As a user_, I want to work in up to 3 sequential nodes. IMPLEMENTED: Node panel with up to 3 nodes, enable/disable toggle
- [x] **HSL Qualifier (Secondary):** _As a user_, I want to select pixels by color range. IMPLEMENTED: Qualifier section with hue center/range, sat min/max, lum min/max, softness sliders
- [x] **Power Window Masks:** _As a user_, I want to draw an ellipse or rectangle over part of the image. IMPLEMENTED: Ellipse and rectangle masks with center, size, and softness controls
- [ ] **Mask Tracking:** _As a user_, I want the mask to follow a moving subject.
- [ ] **Video Scopes:** _As a user_, I want to see a real-time waveform and vectorscope.
- [ ] **Before/After Comparison:** _As a user_, I want a "Before/After" toggle.
- [ ] **Export:** _As a user_, once satisfied, I want to export the graded clip as an H.264 MP4.
- [x] **M1 - Core Playback & UI:** IMPLEMENTED: Electron app with React, video import
- [x] **M2 - Single Node, Primary Controls:** IMPLEMENTED: Node structure with primary controls
- [ ] **M3 - Node Graph + JSON:** Save/load project state
- [ ] **M4 - Secondary Tools: HSL Qualifier & Masks** IMPLEMENTED in App.tsx
- [ ] **M5 - Tracking**
- [ ] **M6 - Scopes & Polish**

## Medium Priority

## Low Priority

## Completed
- [x] Project enabled for Ralph
- [x] Basic Electron + React project structure
- [x] Video import and playback UI
- [x] Node panel with 3 nodes max
- [x] Primary color controls (lift, gamma, gain, offset, contrast, pivot, saturation, temperature, tint)
- [x] HSL Qualifier controls (hue center/range, sat min/max, lum min/max, softness)
- [x] Power Window Masks (ellipse and rectangle with center, size, softness)

## Notes
- Focus on MVP functionality first
- Ensure each feature is properly tested
- Update this file after each major milestone