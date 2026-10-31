import { describe, it, expect, beforeEach } from "vitest";
import { getCurrentSpotifyTrack, setSpotifyStoreForTesting } from "../src/spotify";

describe("Spotify Store Adapter", () => {
  beforeEach(() => {
    setSpotifyStoreForTesting(null);
  });

  it("should return null if no store or activity is present", () => {
    expect(getCurrentSpotifyTrack()).toBeNull();
  });

  it("should parse activity and calculate progress timestamp", () => {
    const startTime = Date.now() - 35000; // 35 seconds ago
    const endTime = startTime + 180000;   // 3 minute song

    setSpotifyStoreForTesting({
      getActivity: () => ({
        sync_id: "spotify-track-123",
        details: "In The End",
        state: "Linkin Park",
        assets: {
          large_text: "Hybrid Theory"
        },
        timestamps: {
          start: startTime,
          end: endTime
        }
      })
    });

    const track = getCurrentSpotifyTrack();
    expect(track).not.toBeNull();
    expect(track?.trackName).toBe("In The End");
    expect(track?.artistName).toBe("Linkin Park");
    expect(track?.albumName).toBe("Hybrid Theory");
    expect(track?.durationMs).toBe(180000);
    expect(track?.progressMs).toBeGreaterThanOrEqual(34000);
    expect(track?.isPlaying).toBe(true);
  });
});
