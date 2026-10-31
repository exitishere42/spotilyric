import { SpotifyTrackInfo } from "./types";

declare const Vencord: any;

export interface DiscordSpotifyActivity {
  sync_id?: string;
  name?: string;
  details?: string;
  state?: string;
  timestamps?: {
    start: number;
    end?: number;
  };
  party?: {
    id?: string;
  };
  assets?: {
    large_image?: string;
    large_text?: string;
  };
}

export interface DiscordSpotifyStore {
  getActivity(): DiscordSpotifyActivity | null;
  getTrack?(): { id: string; name: string; artists: Array<{ name: string }>; duration: number } | null;
  hasConnectedAccount?(): boolean;
  isPlaying?(): boolean;
}

let testStore: DiscordSpotifyStore | null = null;
let spotifyStoreCache: DiscordSpotifyStore | null = null;

export function setSpotifyStoreForTesting(store: DiscordSpotifyStore | null): void {
  testStore = store;
}

function getSpotifyStore(): DiscordSpotifyStore | null {
  if (testStore) return testStore;
  if (spotifyStoreCache) return spotifyStoreCache;

  try {
    if (typeof Vencord !== "undefined" && Vencord.Webpack) {
      spotifyStoreCache = Vencord.Webpack.Common?.SpotifyStore ?? Vencord.Webpack.findStore?.("SpotifyStore");
    }
  } catch {
    spotifyStoreCache = null;
  }
  return spotifyStoreCache;
}

/**
 * Extracts current Spotify track info and millisecond playback position from Discord's SpotifyStore.
 */
export function getCurrentSpotifyTrack(): SpotifyTrackInfo | null {
  const store = getSpotifyStore();
  if (!store) return null;

  const activity = store.getActivity();
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
