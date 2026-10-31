import { SpotilyricSettings } from "./types";

declare const Vencord: any;

export const defaultSettings: SpotilyricSettings = {
  restorePreviousStatus: true,
  fallbackToTrackInfo: true,
  displayFormat: "title_lyric",
  statusEmoji: "🎵",
  minUpdateIntervalMs: 2000
};

// In-memory settings state with defaults
export const settingsState: SpotilyricSettings = { ...defaultSettings };

export function updateSettings(partial: Partial<SpotilyricSettings>) {
  Object.assign(settingsState, partial);
}

/**
 * Declarative settings definition for Vencord plugin settings UI.
 */
export const pluginSettingsDefinition = {
  restorePreviousStatus: {
    type: 1, // OptionType.BOOLEAN
    description: "Restore previous Discord custom status when music pauses or stops",
    default: true
  },
  fallbackToTrackInfo: {
    type: 1, // OptionType.BOOLEAN
    description: "Display 'Song - Artist' if lyrics are not available on LRCLIB",
    default: true
  },
  displayFormat: {
    type: 4, // OptionType.SELECT
    description: "Format of the status text",
    options: [
      { label: "Song - Lyric (e.g. In The End - It starts with one)", value: "title_lyric", default: true },
      { label: "Lyric only (e.g. It starts with one)", value: "lyric_only" }
    ]
  },
  statusEmoji: {
    type: 2, // OptionType.STRING
    description: "Emoji displayed with the custom status",
    default: "🎵"
  },
  minUpdateIntervalMs: {
    type: 3, // OptionType.NUMBER
    description: "Minimum update interval in milliseconds (anti-spam guard)",
    default: 2000
  }
};
