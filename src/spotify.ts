import { findStore } from "@webpack";
import { SpotifyTrackInfo } from "./types";

let spotifyStoreCache: any = null;

function getSpotifyStore(): any {
    if (spotifyStoreCache) return spotifyStoreCache;
    try {
        spotifyStoreCache = findStore("SpotifyStore");
    } catch {
        spotifyStoreCache = null;
    }
    return spotifyStoreCache;
}

export function getCurrentSpotifyTrack(): SpotifyTrackInfo | null {
    const store = getSpotifyStore();
    if (!store) return null;

    const activity = store.getActivity?.();
    if (!activity || !activity.timestamps?.start || !activity.details) {
        return null;
    }

    const trackName = activity.details;
    const artistName = activity.state ?? "Unknown Artist";
    const albumName = activity.assets?.large_text;
    const startTime = activity.timestamps.start;
    const endTime = activity.timestamps.end;
    const now = Date.now();

    const progressMs = Math.max(0, now - startTime);
    const durationMs = endTime ? Math.max(0, endTime - startTime) : 0;
    const isPlaying = endTime ? now < endTime : true;

    return {
        trackId: activity.sync_id || `${trackName}-${artistName}`,
        trackName,
        artistName,
        albumName,
        durationMs,
        progressMs,
        isPlaying,
        timestamps: {
            start: startTime,
            end: endTime
        }
    };
}
