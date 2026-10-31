import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  backupCurrentStatus,
  restorePreviousStatus,
  updateStatus,
  resetStatusManagerState,
  setStatusAdapterForTesting,
  getSavedStatus
} from "../src/statusManager";
import { SpotilyricSettings } from "../src/types";

describe("StatusManager & Lifecycle", () => {
  let currentMockStatus: { text: string; emojiName: string; emojiId: string } | null = null;
  const testSettings: SpotilyricSettings = {
    restorePreviousStatus: true,
    fallbackToTrackInfo: true,
    displayFormat: "title_lyric",
    statusEmoji: "🎵",
    minUpdateIntervalMs: 1000
  };

  beforeEach(() => {
    resetStatusManagerState();
    currentMockStatus = {
      text: "Original Playing CS:GO",
      emojiName: "🎮",
      emojiId: "12345"
    };

    setStatusAdapterForTesting({
      getCurrentStatus: () => currentMockStatus ? {
        text: currentMockStatus.text,
        emoji: { name: currentMockStatus.emojiName, id: currentMockStatus.emojiId }
      } : null,
      updateCustomStatus: async (status) => {
        currentMockStatus = {
          text: status.text,
          emojiName: status.emojiName,
          emojiId: status.emojiId
        };
      }
    });
  });

  it("should backup the user's initial status before modifying it", async () => {
    backupCurrentStatus();
    expect(getSavedStatus()).toEqual({
      text: "Original Playing CS:GO",
      emojiName: "🎮",
      emojiId: "12345"
    });
  });

  it("should update status and apply the configured emoji", async () => {
    const updated = await updateStatus("Song - First Line", testSettings);
    expect(updated).toBe(true);
    expect(currentMockStatus?.text).toBe("Song - First Line");
    expect(currentMockStatus?.emojiName).toBe("🎵");
  });

  it("should prevent duplicate updates with the same text", async () => {
    await updateStatus("Song - Same Line", testSettings);
    const secondCall = await updateStatus("Song - Same Line", testSettings);
    expect(secondCall).toBe(false);
  });

  it("should enforce the minimum update interval (rate-limit guard)", async () => {
    await updateStatus("Song - Line 1", testSettings);
    // Immediate next call with different text within 1000ms should be rejected
    const quickCall = await updateStatus("Song - Line 2", testSettings);
    expect(quickCall).toBe(false);
    expect(currentMockStatus?.text).toBe("Song - Line 1");
  });

  it("should faithfully restore original user status on demand", async () => {
    // 1. Initial state backed up on update
    await updateStatus("Song - Line 1", testSettings);
    expect(currentMockStatus?.text).toBe("Song - Line 1");

    // 2. Playback ends -> restore
    await restorePreviousStatus();
    expect(currentMockStatus?.text).toBe("Original Playing CS:GO");
    expect(currentMockStatus?.emojiName).toBe("🎮");
    expect(getSavedStatus()).toBeNull();
  });
});
