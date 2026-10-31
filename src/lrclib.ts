import { parseLrc } from "./parser";
import { SyncedLyrics } from "./types";

interface LrcLibResponse {
    id: number;
    name: string;
    trackName: string;
    artistName: string;
    albumName: string;
    duration: number;
    instrumental: boolean;
    plainLyrics: string;
    syncedLyrics: string;
}

const cache = new Map<string, SyncedLyrics | null>();

export function cleanTrackTitle(title: string): string {
    return title
        .replace(/\s*-\s*\d{4}\s+Remaster(ed)?/gi, "")
        .replace(/\s*-\s*Remaster(ed)?(\s*\d{4})?/gi, "")
        .replace(/\s*-\s*Live(\s+at\s+.*)?/gi, "")
        .replace(/\s*\(feat\..*?\)/gi, "")
        .replace(/\s*\[feat\..*?\]/gi, "")
        .replace(/\s*\(with\s+.*?\)/gi, "")
        .replace(/\s*\[with\s+.*?\]/gi, "")
        .replace(/\s*-\s*Single(\s+Version)?/gi, "")
        .replace(/\s*-\s*Radio(\s+Edit)?/gi, "")
        .trim();
}

export function getCacheKey(trackName: string, artistName: string): string {
    return `${artistName.toLowerCase().trim()}:::${trackName.toLowerCase().trim()}`;
}

async function requestLrcLib(
    trackName: string,
    artistName: string,
    albumName?: string,
    durationMs?: number
): Promise<string | null> {
    const url = new URL("https://lrclib.net/api/get");
    url.searchParams.set("track_name", trackName);
    url.searchParams.set("artist_name", artistName);
    if (albumName) {
        url.searchParams.set("album_name", albumName);
    }
    if (durationMs && durationMs > 0) {
        url.searchParams.set("duration", Math.round(durationMs / 1000).toString());
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
        const response = await fetch(url.toString(), {
            signal: controller.signal,
            headers: {
                "User-Agent": "Spotilyric Vencord Plugin (https://github.com/exitishere42/spotilyric)"
            }
        });
        clearTimeout(timeout);

        if (!response.ok) return null;
        const data: LrcLibResponse = await response.json();
        if (data.instrumental) return "";
        return data.syncedLyrics ?? null;
    } catch {
        clearTimeout(timeout);
        return null;
    }
}

export async function requestNetease(trackName: string, artistName: string): Promise<string | null> {
    try {
        const searchUrl = `https://music.163.com/api/search/get/web?csrf_token=&type=1&offset=0&limit=1&s=${encodeURIComponent(trackName + " " + artistName)}`;
        const res = await fetch(searchUrl);
        if (!res.ok) return null;
        const data = await res.json();
        const songId = data.result?.songs?.[0]?.id;
        if (!songId) return null;

        const lyricUrl = `https://music.163.com/api/song/lyric?os=pc&id=${songId}&lv=-1&kv=-1&tv=-1`;
        const lrcRes = await fetch(lyricUrl);
        if (!lrcRes.ok) return null;
        const lrcData = await lrcRes.json();
        return lrcData.lrc?.lyric ?? null;
    } catch {
        return null;
    }
}

export async function fetchLyrics(
    trackName: string,
    artistName: string,
    albumName?: string,
    durationMs?: number,
    sourcePreference: string = "auto"
): Promise<SyncedLyrics | null> {
    const cacheKey = getCacheKey(trackName, artistName);
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey) ?? null;
    }

    const cleaned = cleanTrackTitle(trackName);
    let lrcContent: string | null = null;
    let providerName = "";

    // 1. Primary: LRCLIB (Direct open-source synced lyrics database)
    if (sourcePreference === "lrclib" || sourcePreference === "auto") {
        lrcContent = await requestLrcLib(trackName, artistName, albumName, durationMs);
        if (!lrcContent && cleaned !== trackName) {
            lrcContent = await requestLrcLib(cleaned, artistName, albumName, durationMs);
        }
        if (lrcContent !== null) providerName = "LRCLIB";
    }

    // 2. Fallback: Netease Cloud Music
    if (lrcContent === null && (sourcePreference === "netease" || sourcePreference === "auto")) {
        lrcContent = await requestNetease(trackName, artistName);
        if (!lrcContent && cleaned !== trackName) {
            lrcContent = await requestNetease(cleaned, artistName);
        }
        if (lrcContent !== null) providerName = "Netease";
    }

    if (lrcContent === null) {
        cache.set(cacheKey, null);
        return null;
    }

    const lines = parseLrc(lrcContent);
    const result: SyncedLyrics = {
        trackName,
        artistName,
        durationMs: durationMs ?? 0,
        lines,
        isSynced: lines.length > 0
    };

    console.log(`[Spotilyric] Successfully loaded lyrics from [${providerName}] (${lines.length} lines)`);
    cache.set(cacheKey, result);
    return result;
}

export function clearLyricsCache(): void {
    cache.clear();
}
