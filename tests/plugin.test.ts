import { describe, it, expect, beforeEach, vi } from "vitest";
import { onSyncTick, pluginDefinition } from "../src/index";
import { setSpotifyStoreForTesting } from "../src/spotify";
import { setStatusAdapterForTesting, getSavedStatus, resetStatusManagerState } from "../src/statusManager";
import { clearLyricsCache } from "../src/lrclib";

describe("Spotilyric Plugin Lifecycle & Tick", () => {
  let mockStatus: { text: string; emojiName: string } | null = null;

  beforeEach(() => {
    resetStatusManagerState();
    clearLyricsCache();
    mockStatus = { text: "Previous Status", emojiName: "🎮" };

    setStatusAdapterForTesting({
      getCurrentStatus: () => mockStatus ? { text: mockStatus.text, emoji: { name: mockStatus.emojiName } } : null,
      updateCustomStatus: async (s) => {
        mockStatus = { text: s.text, emojiName: s.emojiName };
      }
    });

    vi.restoreAllMocks();
  });

  it("should update status with lyrics when a song is playing", async () => {
    // Mock Spotify playing at 15s into the track
    const startTime = Date.now() - 15000;
    setSpotifyStoreForTesting({
      getActivity: () => ({
        sync_id: "test-track-1",
        details: "Test Song",
        state: "Test Artist",
        timestamps: { start: startTime, end: startTime + 180000 }
      })
    });

    // Mock LRCLIB returning synced lyrics
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        instrumental: false,
        syncedLyrics: "[00:10.00] Line at ten seconds\n[00:20.00] Line at twenty seconds"
      })
    } as any);

    await onSyncTick();

    // At 15s, active line is "Line at ten seconds"
    expect(mockStatus?.text).toBe("Test Song - Line at ten seconds");
    expect(mockStatus?.emojiName).toBe("🎵");
  });

  it("should restore previous status when Spotify playback stops", async () => {
    // First, play a song
    const startTime = Date.now() - 10000;
    setSpotifyStoreForTesting({
      getActivity: () => ({
        sync_id: "test-track-2",
        details: "Another Song",
        state: "Artist",
        timestamps: { start: startTime, end: startTime + 180000 }
      })
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        instrumental: false,
        syncedLyrics: "[00:05.00] First Line"
      })
    } as any);

    await onSyncTick();
    expect(mockStatus?.text).toBe("Another Song - First Line");

    // Now playback stops
    setSpotifyStoreForTesting({
      getActivity: () => null
    });

    await onSyncTick();

    // Status should be restored to initial
    expect(mockStatus?.text).toBe("Previous Status");
    expect(mockStatus?.emojiName).toBe("🎮");
  });

  it("should have start and stop lifecycle methods", () => {
    expect(typeof pluginDefinition.start).toBe("function");
    expect(typeof pluginDefinition.stop).toBe("function");
    expect(pluginDefinition.name).toBe("Spotilyric");
  });
});
