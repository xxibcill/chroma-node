# Delivery Compatibility Matrix

This document describes the supported delivery combinations for Chroma Node export.

## Supported Combinations

### Codec + Container

| Codec | Container | File Extension | Notes |
|-------|-----------|---------------|-------|
| H.264 | MP4 | `.mp4` | Default delivery codec |
| HEVC  | MP4 | `.mp4` | Requires libx265 |
| ProRes | MOV | `.mov` | Requires prores_ks |
| VP9   | WebM | `.webm` | Requires libvpx-vp9 |

### Geometry + Resize Policy

| Policy | Behavior |
|--------|----------|
| Fit (letterbox) | Scales to fit within target, preserves aspect ratio with padding |
| Crop (fill) | Scales to fill target, preserves aspect ratio by cropping |
| Pad (bars) | Uses source at full size, adds padding bars if aspect differs |

### Audio Behavior

| Source Audio | Passthrough | Strip |
|-------------|-------------|-------|
| Has audio | Retained in output (copy stream) | Silent output |
| No audio | Silent output | Silent output |

**Note:** Passthrough uses stream copy (`-c:a copy`) and does not re-encode audio. Audio codec compatibility with container is handled automatically by FFmpeg.

### Preset Dimensions

| Preset | Dimensions | Aspect |
|--------|------------|--------|
| 1080p | 1920 x 1080 | 16:9 |
| 720p | 1280 x 720 | 16:9 |
| 480p | 854 x 480 | 16:9 |
| square-1:1 | 1080 x 1080 | 1:1 |
| square-4:5 | 1080 x 1350 | 4:5 |
| portrait-9:16 | 1080 x 1920 | 9:16 |
| portrait-4:5 | 1080 x 1350 | 4:5 |
| portrait-3:4 | 1080 x 1440 | 3:4 |

## Verification Points

### Pre-Export Validation
1. FFmpeg build must include the required encoder for the selected codec
2. Audio passthrough requires source media to have an audio stream
3. Output path must use the correct file extension for the selected codec
4. Custom dimensions with pad policy require similar source aspect ratio

### Post-Export Validation
1. Output file contains a video stream with the expected codec
2. Resolution matches the requested dimensions (after resize policy applied)
3. Frame count and fps match the source media
4. Audio status matches the selected audio behavior

## Unsupported Combinations

| Combination | Reason |
|-------------|--------|
| VP9 + MP4 container | VP9 requires WebM container |
| ProRes + MP4 container | ProRes requires MOV container |
| H.264 with audio passthrough on no-audio source | Silent output (not an error) |
| Custom dimensions > 7680x4320 | Exceeds maximum supported raster |

## Encoder Availability

FFmpeg diagnostics (`getDiagnostics`) exposes encoder availability:
- `h264EncoderAvailable` - libx264
- `hevcEncoderAvailable` - libx265
- `proresEncoderAvailable` - prores_ks
- `vp9EncoderAvailable` - libvpx-vp9

Export will fail early with a clear error if the selected codec encoder is unavailable.
