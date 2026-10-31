import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { cleanTrackTitle, getCacheKey, fetchLyrics, clearLyricsCache } from "../src/lrclib";

describe("LRCLIB Client & Title Cleaning", () => {
  beforeEach(() => {
    clearLyricsCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("cleanTrackTitle", () => {
    it("should strip Remastered suffixes", () => {
      expect(cleanTrackTitle("In The End - 2020 Remastered")).toBe("In The End");
      expect(cleanTrackTitle("Numb - Remastered")).toBe("Numb");
    });

    it("should strip feat. in parentheses or brackets", () => {
      expect(cleanTrackTitle("Empire State of Mind (feat. Alicia Keys)")).toBe("Empire State of Mind");
      expect(cleanTrackTitle("Song Name [feat. Someone]")).toBe("Song Name");
    });

    it("should keep clean titles untouched", () => {
      expect(cleanTrackTitle("Bohemian Rhapsody")).toBe("Bohemian Rhapsody");
    });
  });

  describe("getCacheKey", () => {
    it("should normalize artist and title for consistent caching", () => {
      const key1 = getCacheKey(" Song Title ", " ARTIST ");
      const key2 = getCacheKey("song title", "artist");
      expect(key1).toBe(key2);
    });
  });

  describe("fetchLyrics", () => {
    it("should fetch, parse and cache synced lyrics", async () => {
      const mockLrcResponse = {
        id: 123,
        instrumental: false,
        syncedLyrics: "[00:10.00] Line one\n[00:20.00] Line two"
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockLrcResponse
      } as any);

      const result = await fetchLyrics("Song", "Artist", "Album", 180000, "lrclib");
      expect(result).not.toBeNull();
      expect(result?.isSynced).toBe(true);
      expect(result?.lines).toHaveLength(2);
      expect(result?.lines[0].text).toBe("Line one");
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Second call must be served from cache without extra fetch
      const cachedResult = await fetchLyrics("Song", "Artist", undefined, undefined, "lrclib");
      expect(cachedResult).toEqual(result);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("should handle instrumental tracks correctly", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({
          instrumental: true,
          syncedLyrics: ""
        })
      } as any);

      const result = await fetchLyrics("Orchestra", "Artist", undefined, undefined, "lrclib");
      expect(result).not.toBeNull();
      expect(result?.isSynced).toBe(false);
      expect(result?.lines).toHaveLength(0);
    });

    it("should retry with cleaned title if first attempt fails", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce({ ok: false } as any) // 1st try: "Song (feat. X)" -> not found
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            instrumental: false,
            syncedLyrics: "[00:05.00] Cleaned success"
          })
        } as any); // 2nd try: "Song" -> success

      const result = await fetchLyrics("Song (feat. X)", "Artist", undefined, undefined, "lrclib");
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result?.isSynced).toBe(true);
      expect(result?.lines[0].text).toBe("Cleaned success");
    });

    it("should handle network failure gracefully without throwing", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network offline"));

      const result = await fetchLyrics("ErrorSong", "Artist");
      expect(result).toBeNull();
    });
  });
});
