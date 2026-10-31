import definePlugin from "@utils/types";
import { settings } from "./settings";
import { getCurrentSpotifyTrack } from "./spotify";
import { fetchLyrics } from "./lrclib";
import { getActiveLyricLine } from "./parser";
import { updateStatus, restorePreviousStatus, resetStatusManagerState } from "./statusManager";
import { SyncedLyrics } from "./types";

let syncIntervalId: any = null;
let currentTrackId: string | null = null;
let currentLyrics: SyncedLyrics | null = null;

export async function onSyncTick() {
    const track = getCurrentSpotifyTrack();

    // If no track is playing on Spotify
    if (!track || !track.isPlaying) {
        if (currentTrackId !== null) {
            console.log("[Spotilyric] Playback stopped. Restoring status...");
            currentTrackId = null;
            currentLyrics = null;
            if (settings.store.restorePreviousStatus) {
                await restorePreviousStatus();
            }
        }
        return;
    }

    // If song changed, fetch new lyrics
    if (track.trackId !== currentTrackId) {
        currentTrackId = track.trackId;
        console.log(`[Spotilyric] Now playing: ${track.trackName} - ${track.artistName} (Progress: ${Math.round(track.progressMs / 1000)}s)`);
        currentLyrics = await fetchLyrics(
            track.trackName,
            track.artistName,
            track.albumName,
            track.durationMs,
            settings.store.lyricsSource ?? "auto"
        );
    }

    // Apply user-configured timing offset slider
    const offsetMs = settings.store.timingOffsetMs ?? 0;
    const adjustedProgressMs = Math.max(0, track.progressMs + offsetMs);

    // Format and update Discord status
    if (currentLyrics && currentLyrics.isSynced && currentLyrics.lines.length > 0) {
        const activeLine = getActiveLyricLine(currentLyrics.lines, adjustedProgressMs);
        if (activeLine && activeLine.text) {
            const text =
                settings.store.displayFormat === "title_lyric"
                    ? `${track.trackName} - ${activeLine.text}`
                    : activeLine.text;

            await updateStatus(text, settings.store.statusEmoji, settings.store.minUpdateIntervalMs);
            return;
        }
    }

    // Fallback: If no synced lyrics exist or before the first line
    if (settings.store.fallbackToTrackInfo) {
        const fallbackText = `${track.trackName} - ${track.artistName}`;
        await updateStatus(fallbackText, settings.store.statusEmoji, settings.store.minUpdateIntervalMs);
    }
}

export const pluginDefinition = definePlugin({
    name: "Spotilyric",
    description: "Synchronizes your Discord custom status with real-time Spotify lyrics via Musixmatch and LRCLIB.",
    dependencies: ["UserSettingsAPI"],
    authors: [
        {
            name: "exit",
            id: 0n
        }
    ],
    settings,

    start() {
        console.log("[Spotilyric] Plugin started.");
        syncIntervalId = setInterval(() => {
            onSyncTick().catch(err => console.warn("[Spotilyric] Tick error:", err));
        }, 1000);
    },

    stop() {
        console.log("[Spotilyric] Plugin stopped.");
        if (syncIntervalId !== null) {
            clearInterval(syncIntervalId);
            syncIntervalId = null;
        }

        if (settings.store.restorePreviousStatus) {
            restorePreviousStatus().catch(err => console.warn("[Spotilyric] Restore error on stop:", err));
        }

        currentTrackId = null;
        currentLyrics = null;
        resetStatusManagerState();
    }
});

export default pluginDefinition;
