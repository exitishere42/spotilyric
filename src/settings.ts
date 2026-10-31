import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    restorePreviousStatus: {
        type: OptionType.BOOLEAN,
        description: "Restore previous Discord custom status when music pauses or stops",
        default: true
    },
    fallbackToTrackInfo: {
        type: OptionType.BOOLEAN,
        description: "Display 'Song - Artist' if lyrics are not available on LRCLIB",
        default: true
    },
    displayFormat: {
        type: OptionType.SELECT,
        description: "Format of the status text",
        options: [
            { label: "Song - Lyric (e.g. In The End - It starts with one)", value: "title_lyric", default: true },
            { label: "Lyric only (e.g. It starts with one)", value: "lyric_only" }
        ]
    },
    statusEmoji: {
        type: OptionType.STRING,
        description: "Emoji displayed with the custom status",
        default: "🎵"
    },
    minUpdateIntervalMs: {
        type: OptionType.NUMBER,
        description: "Minimum update interval in milliseconds (anti-spam guard)",
        default: 2000
    }
});
