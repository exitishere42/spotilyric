/**
 * Spotilyric Type Definitions
 */

export interface LyricLine {
  /** Timestamp of this lyric line in milliseconds from track start */
  timeMs: number;
  /** The text of this lyric line */
  text: string;
}

export interface SyncedLyrics {
  trackName: string;
  artistName: string;
  durationMs: number;
  /** Sorted list of synchronized lyric lines */
  lines: LyricLine[];
  /** True if synchronized timestamped lyrics are available */
  isSynced: boolean;
}

export interface SpotifyTrackInfo {
  trackId: string;
  trackName: string;
  artistName: string;
  albumName?: string;
  durationMs: number;
  /** Milliseconds elapsed since track start */
  progressMs: number;
  isPlaying: boolean;
  timestamps: {
    start: number;
    end?: number;
  };
}

export interface PreviousUserStatus {
  text: string | null;
  emojiName: string | null;
  emojiId: string | null;
}

export interface SpotilyricSettings {
  /** Restore user's previous status when music stops */
  restorePreviousStatus: boolean;
  /** Fallback to "Song - Artist" if no synced lyrics found */
  fallbackToTrackInfo: boolean;
  /** Format of status: "title_lyric" (Song - Lyric) or "lyric_only" (just Lyric) */
  displayFormat: "title_lyric" | "lyric_only";
  /** Status emoji (default: "🎵") */
  statusEmoji: string;
  /** Minimum delay between status updates in ms to prevent rate limiting (default: 2000) */
  minUpdateIntervalMs: number;
}
