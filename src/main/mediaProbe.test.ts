import { describe, expect, it } from "vitest";
import { mapProbeOutput, parseRationalFrameRate } from "./mediaProbe";

describe("parseRationalFrameRate", () => {
  it("normalizes ffprobe rational strings", () => {
    expect(parseRationalFrameRate("30000/1001")).toBeCloseTo(29.97002997);
    expect(parseRationalFrameRate("24/1")).toBe(24);
    expect(parseRationalFrameRate("60")).toBe(60);
  });

  it("returns zero for invalid frame rates", () => {
    expect(parseRationalFrameRate("0/0")).toBe(0);
    expect(parseRationalFrameRate("bad")).toBe(0);
    expect(parseRationalFrameRate(undefined)).toBe(0);
  });
});

describe("mapProbeOutput", () => {
  it("maps ffprobe JSON into the MediaRef shape with display geometry", () => {
    const media = mapProbeOutput("/clips/sample.mp4", {
      streams: [
        {
          index: 0,
          codec_type: "video",
          codec_name: "h264",
          width: 1080,
          height: 1920,
          duration: "10.0",
          avg_frame_rate: "30000/1001",
          nb_frames: "300",
          tags: { rotate: "-90" }
        },
        {
          index: 1,
          codec_type: "audio",
          codec_name: "aac"
        }
      ],
      format: {
        format_name: "mov,mp4,m4a,3gp,3g2,mj2",
        duration: "10.0"
      }
    });

    expect(media).toMatchObject({
      sourcePath: "/clips/sample.mp4",
      fileName: "sample.mp4",
      container: "mov,mp4,m4a,3gp,3g2,mj2",
      codec: "h264",
      width: 1080,
      height: 1920,
      displayWidth: 1920,
      displayHeight: 1080,
      durationSeconds: 10,
      totalFrames: 300,
      hasAudio: true,
      rotation: 270,
      videoStreamIndex: 0
    });
    expect(media.frameRate).toBeCloseTo(29.97002997);
    expect(media.id).toHaveLength(40);
  });

  it("rejects files with no video stream", () => {
    expect(() =>
      mapProbeOutput("/clips/audio.mp4", {
        streams: [{ index: 0, codec_type: "audio", codec_name: "aac" }],
        format: { format_name: "mp4", duration: "2.0" }
      })
    ).toThrow("No supported video stream");
  });

  it("rejects video streams exceeding display raster limit of 3840x2160", () => {
    expect(() =>
      mapProbeOutput("/clips/uhd.mp4", {
        streams: [
          {
            index: 0,
            codec_type: "video",
            codec_name: "h264",
            width: 7680,
            height: 4320,
            duration: "4.0",
            avg_frame_rate: "24/1"
          }
        ],
        format: { format_name: "mp4", duration: "4.0" }
      })
    ).toThrow("3840 x 2160");
  });

  it("allows portrait media within display raster limit", () => {
    const media = mapProbeOutput("/clips/portrait.mp4", {
      streams: [
        {
          index: 0,
          codec_type: "video",
          codec_name: "h264",
          width: 1080,
          height: 1920,
          duration: "5.0",
          avg_frame_rate: "24/1"
        }
      ],
      format: { format_name: "mp4", duration: "5.0" }
    });
    expect(media.displayWidth).toBe(1080);
    expect(media.displayHeight).toBe(1920);
  });

  it("allows square media within display raster limit", () => {
    const media = mapProbeOutput("/clips/square.mp4", {
      streams: [
        {
          index: 0,
          codec_type: "video",
          codec_name: "h264",
          width: 1080,
          height: 1080,
          duration: "3.0",
          avg_frame_rate: "24/1"
        }
      ],
      format: { format_name: "mp4", duration: "3.0" }
    });
    expect(media.displayWidth).toBe(1080);
    expect(media.displayHeight).toBe(1080);
  });

  it("allows rotated portrait media within display raster limit", () => {
    const media = mapProbeOutput("/clips/rotated.mp4", {
      streams: [
        {
          index: 0,
          codec_type: "video",
          codec_name: "h264",
          width: 1920,
          height: 1080,
          duration: "6.0",
          avg_frame_rate: "24/1",
          tags: { rotate: "90" }
        }
      ],
      format: { format_name: "mp4", duration: "6.0" }
    });
    expect(media.width).toBe(1920);
    expect(media.height).toBe(1080);
    expect(media.displayWidth).toBe(1080);
    expect(media.displayHeight).toBe(1920);
    expect(media.rotation).toBe(90);
  });
});
