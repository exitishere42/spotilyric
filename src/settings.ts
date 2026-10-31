import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    lyricsSource: {
        type: OptionType.SELECT,
        description: "Source for song lyrics",
        options: [
            { label: "Auto", value: "auto", default: true },
            { label: "LRCLIB", value: "lrclib" },
            { label: "Netease", value: "netease" }
        ]
    },
    timingOffsetMs: {
        type: OptionType.SLIDER,
        description: "Timing Offset in ms",
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
        description: "Display track info if lyrics are not available",
        default: true
    },
    displayFormat: {
        type: OptionType.SELECT,
        description: "Format of the status text",
        options: [
            { label: "Track & Lyric", value: "title_lyric", default: true },
            { label: "Lyric only", value: "lyric_only" }
        ]
    },
    statusEmoji: {
        type: OptionType.STRING,
        description: "Emoji displayed with the custom status",
        default: "🎵"
    },
    minUpdateIntervalMs: {
        type: OptionType.NUMBER,
        description: "Minimum update interval in milliseconds",
        default: 2000
    }
});
