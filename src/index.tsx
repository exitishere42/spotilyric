import { getCurrentSpotifyTrack } from "./spotify";
import { fetchLyrics } from "./lrclib";
import { getActiveLyricLine } from "./parser";
import { updateStatus, restorePreviousStatus, resetStatusManagerState } from "./statusManager";
import { settingsState, pluginSettingsDefinition } from "./settings";
import { SyncedLyrics, SpotilyricSettings } from "./types";

declare function definePlugin(options: any): any;

let syncIntervalId: ReturnType<typeof setInterval> | null = null;
let currentTrackId: string | null = null;
let currentLyrics: SyncedLyrics | null = null;

function getActiveSettings(pluginInstance?: any): SpotilyricSettings {
  if (pluginInstance && pluginInstance.settings) {
    return {
      restorePreviousStatus: pluginInstance.settings.restorePreviousStatus ?? settingsState.restorePreviousStatus,
      fallbackToTrackInfo: pluginInstance.settings.fallbackToTrackInfo ?? settingsState.fallbackToTrackInfo,
      displayFormat: pluginInstance.settings.displayFormat ?? settingsState.displayFormat,
      statusEmoji: pluginInstance.settings.statusEmoji ?? settingsState.statusEmoji,
      minUpdateIntervalMs: pluginInstance.settings.minUpdateIntervalMs ?? settingsState.minUpdateIntervalMs
    };
  }
  return settingsState;
}

export async function onSyncTick(pluginInstance?: any) {
  const settings = getActiveSettings(pluginInstance);
  const track = getCurrentSpotifyTrack();

  // If no track is playing on Spotify
  if (!track || !track.isPlaying) {
    if (currentTrackId !== null) {
      currentTrackId = null;
      currentLyrics = null;
      if (settings.restorePreviousStatus) {
        await restorePreviousStatus();
      }
    }
    return;
  }

  // If song changed, fetch new lyrics from LRCLIB
  if (track.trackId !== currentTrackId) {
    currentTrackId = track.trackId;
    currentLyrics = await fetchLyrics(
      track.trackName,
      track.artistName,
      track.albumName,
      track.durationMs
    );
  }

  // Format and update Discord status
  if (currentLyrics && currentLyrics.isSynced && currentLyrics.lines.length > 0) {
    const activeLine = getActiveLyricLine(currentLyrics.lines, track.progressMs);
    if (activeLine && activeLine.text) {
      const text =
        settings.displayFormat === "title_lyric"
          ? `${track.trackName} - ${activeLine.text}`
          : activeLine.text;

      await updateStatus(text, settings);
      return;
    }
  }

  // Fallback: If no synced lyrics exist or before the first line
  if (settings.fallbackToTrackInfo) {
    const fallbackText = `${track.trackName} - ${track.artistName}`;
    await updateStatus(fallbackText, settings);
  }
}

export const pluginDefinition = {
  name: "Spotilyric",
  description: "Synchronizes your Discord custom status with real-time Spotify lyrics via LRCLIB.",
  authors: [
    {
      name: "exit",
      id: 0n
    }
  ],
  settings: pluginSettingsDefinition,

  start() {
    console.log("[Spotilyric] Plugin started.");
    // Run sync check every 1000ms
    syncIntervalId = setInterval(() => {
      onSyncTick(this).catch(err => console.warn("[Spotilyric] Tick error:", err));
    }, 1000);
  },

  stop() {
    console.log("[Spotilyric] Plugin stopped.");
    if (syncIntervalId !== null) {
      clearInterval(syncIntervalId);
      syncIntervalId = null;
    }

    const settings = getActiveSettings(this);
    if (settings.restorePreviousStatus) {
      restorePreviousStatus().catch(err => console.warn("[Spotilyric] Restore error on stop:", err));
    }

    currentTrackId = null;
    currentLyrics = null;
    resetStatusManagerState();
  }
};

// Support both Vencord definePlugin wrapper and standard export
export default typeof definePlugin === "function" ? definePlugin(pluginDefinition) : pluginDefinition;
