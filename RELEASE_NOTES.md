# Chroma Node MVP Release Notes

**Version:** 0.1.0
**Date:** 2026-04-24

## About Chroma Node

Chroma Node is a DaVinci Resolve-inspired color grading learning tool. It provides a focused environment for understanding primary corrections, HSL qualifiers, power windows, and translation tracking.

## Supported Media

### Import
- **Container formats:** MP4, MOV
- **Video codec:** H.264 (avc1)
- **Maximum resolution:** 1920 x 1080
- **Audio:** Present but ignored (not used in MVP)

### Export
- **Container:** MP4
- **Video codec:** H.264 (libx264)
- **Quality presets:** Draft, Standard, High
- **Maximum resolution:** 1920 x 1080

## Supported Controls

### Primary Corrections
- **Lift** (R, G, B) - Adjusts dark tones
- **Gamma** (R, G, B) - Adjusts midtones
- **Gain** (R, G, B) - Adjusts highlights
- **Offset** (R, G, B) - Applies uniform offset
- **Contrast** - Adjusts contrast around pivot point
- **Pivot** - Sets contrast center point
- **Saturation** - Adjusts color intensity
- **Temperature** - Shifts color temperature
- **Tint** - Adjusts green-magenta balance

### HSL Qualifier
- Hue center and width with softness
- Saturation min/max with softness
- Luminance min/max with softness
- Invert mask option

### Power Windows
- Ellipse and rectangle shapes
- Center position (X, Y)
- Size (width, height)
- Rotation
- Softness
- Invert mask option
- Translation tracking (forward and backward)

### Node Graph
- Up to 3 serial nodes
- Individual node bypass
- Node add/delete
- Node rename

### Viewer Modes
- Original (ungraded)
- Graded (with corrections)
- Split (before/after comparison)

## Known Limitations

1. **Single clip workflow** - Only one media clip per project
2. **No audio processing** - Audio is present in imported files but is not used or preserved in export
3. **Translation-only tracking** - Only tracks position, not scale, rotation, or perspective
4. **No color space management** - Assumes Rec. 709 throughout pipeline
5. **No reference stills** - Cannot compare to saved still images
6. **No cache management** - Frame cache grows unbounded during session
7. **No project version history** - Only one autosave slot
8. **No batch export** - Export is single clip only

## System Requirements

- **Operating System:** macOS (for MVP)
- **Processor:** Apple M1 or later (reference target)
- **Memory:** 4 GB minimum
- **Display:** 1280 x 720 minimum resolution
- **FFmpeg:** Required for export (see below)

## FFmpeg Requirement

Chroma Node uses FFmpeg for media probing and H.264 export. FFmpeg must be available on your system:

- **macOS:** `brew install ffmpeg`
- **Verify:** Run `ffmpeg -version` in Terminal

Chroma Node will show a diagnostic indicator if FFmpeg is unavailable.

## Installation

1. Download the latest release from GitHub
2. Open the DMG file
3. Drag Chroma Node to Applications
4. On first launch, macOS may ask you to confirm opening an app from an unidentified developer

## Keyboard Shortcuts

- **Cmd+Z** - Undo
- **Cmd+Shift+Z** - Redo
- Arrow keys - Step frame forward/backward
- Spacebar - Toggle playback

## Credit

This project is inspired by DaVinci Resolve's color page and is intended as a learning tool for color grading fundamentals.
