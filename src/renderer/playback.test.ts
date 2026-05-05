import { describe, expect, it } from "vitest";
import type { MediaRef } from "../shared/ipc";
import {
  clampFrameIndex,
  formatTimecode,
  frameToTimeSeconds,
  getLastFrameIndex,
  getTotalFrameCount,
  timeToFrameIndex
} from "./playback";

const media: MediaRef = {
  id: "sample",
  sourcePath: "/clips/sample.mp4",
  fileName: "sample.mp4",
  container: "mov,mp4,m4a,3gp,3g2,mj2",
  codec: "h264",
  width: 1920,
  height: 1080,
  displayWidth: 1920,
  displayHeight: 1080,
  durationSeconds: 10,
  frameRate: 24,
  totalFrames: 240,
  hasAudio: false,
  rotation: 0,
  videoStreamIndex: 0
};

describe("playback helpers", () => {
  it("derives deterministic frame bounds", () => {
    expect(getTotalFrameCount(media)).toBe(240);
    expect(getLastFrameIndex(media)).toBe(239);
    expect(clampFrameIndex(-12, media)).toBe(0);
    expect(clampFrameIndex(999, media)).toBe(239);
  });

  it("converts between frame indices and timeline seconds", () => {
    expect(frameToTimeSeconds(48, media)).toBe(2);
    expect(timeToFrameIndex(2.04, media)).toBe(48);
    expect(timeToFrameIndex(99, media)).toBe(239);
  });

  it("formats non-drop-frame timecode from the media frame rate", () => {
    expect(formatTimecode(0, media)).toBe("00:00:00:00");
    expect(formatTimecode(25, media)).toBe("00:00:01:01");
  });

  it("estimates frame count when ffprobe does not report nb_frames", () => {
    expect(getTotalFrameCount({ ...media, totalFrames: undefined, durationSeconds: 2.5, frameRate: 30 })).toBe(75);
  });
});
