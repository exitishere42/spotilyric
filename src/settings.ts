import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    lyricsSource: {
        type: OptionType.SELECT,
        description: "Source for song lyrics",
        options: [
            { label: "Auto (Musixmatch + LRCLIB + Netease)", value: "auto", default: true },
            { label: "Musixmatch (Official lyrics)", value: "musixmatch" },
            { label: "LRCLIB (Open-source lyrics)", value: "lrclib" },
            { label: "Netease (Cloud lyrics)", value: "netease" }
        ]
    },
    timingOffsetMs: {
        type: OptionType.SLIDER,
        description: "Timing Offset in ms (adjust if lyrics appear too early or too late)",
        markers: [-2000, -1500, -1000, -500, 0, 500, 1000, 1500, 2000],
        default: -300
    },
    restorePreviousStatus: {
        type: OptionType.BOOLEAN,
        description: "Restore previous Discord custom status when music pauses or stops",
        default: true
    },
    fallbackToTrackInfo: {
        type: OptionType.BOOLEAN,
        description: "Display 'Song - Artist' if lyrics are not available",
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
