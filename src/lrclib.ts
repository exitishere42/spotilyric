import { SyncedLyrics } from "./types";
import { parseLrc } from "./parser";

declare const VencordNative: any;

interface LrcLibResponse {
    id?: number;
    name?: string;
    trackName?: string;
    artistName?: string;
    albumName?: string;
    duration?: number;
    instrumental?: boolean;
    plainLyrics?: string;
    syncedLyrics?: string;
}

const cache = new Map<string, SyncedLyrics | null>();
let mxmToken: string | null = null;

export function cleanTrackTitle(title: string): string {
    if (!title) return "";
    return title
        .replace(/\s*-\s*(?:(?:\d{4}|\b)\s*)?(Remastered|Remaster|Live|Radio Edit|Acoustic|Bonus Track).*$/i, "")
        .replace(/\s*\((feat\.|with|remastered|remaster|live|acoustic)[^)]*\)/i, "")
        .replace(/\s*\[(feat\.|with|remastered|remaster|live|acoustic)[^\]]*\]/i, "")
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

async function getMusixmatchToken(): Promise<string | null> {
    if (mxmToken) return mxmToken;
    try {
        const res = await fetch("https://apic-desktop.musixmatch.com/ws/1.1/token.get?app_id=web-desktop-app-v1.0");
        if (res.ok) {
            const data = await res.json();
            mxmToken = data.message?.body?.user_token ?? null;
        }
    } catch {
        mxmToken = null;
    }
    return mxmToken;
}

export async function requestMusixmatch(trackName: string, artistName: string): Promise<string | null> {
    try {
        const token = await getMusixmatchToken();
        const url = new URL("https://apic-desktop.musixmatch.com/ws/1.1/macro.subtitles.get");
        url.searchParams.set("format", "json");
        url.searchParams.set("q_track", trackName);
        url.searchParams.set("q_artist", artistName);
        url.searchParams.set("subtitle_format", "lrc");
        url.searchParams.set("app_id", "web-desktop-app-v1.0");
        if (token) {
            url.searchParams.set("usertoken", token);
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(url.toString(), { signal: controller.signal });
        clearTimeout(timeout);

        if (!res.ok) return null;
        const data = await res.json();
        const subtitleList = data.message?.body?.macro_calls?.["track.subtitles.get"]?.message?.body?.subtitle_list;
        if (subtitleList && subtitleList.length > 0) {
            const lrcBody = subtitleList[0].subtitle?.subtitle_body;
            if (lrcBody && lrcBody.length > 10) {
                return lrcBody;
            }
        }
    } catch (err) {
        console.warn("[Spotilyric] Musixmatch query error:", err);
    }
    return null;
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

    // 1. If Musixmatch requested or Auto: try Musixmatch first for best accuracy
    if (sourcePreference === "musixmatch" || sourcePreference === "auto") {
        lrcContent = await requestMusixmatch(trackName, artistName);
        if (!lrcContent && cleaned !== trackName) {
            lrcContent = await requestMusixmatch(cleaned, artistName);
        }
        if (lrcContent) providerName = "Musixmatch";
    }

    // 2. If LRCLIB requested or Fallback
    if (!lrcContent && (sourcePreference === "lrclib" || sourcePreference === "auto")) {
        lrcContent = await requestLrcLib(trackName, artistName, albumName, durationMs);
        if (!lrcContent && cleaned !== trackName) {
            lrcContent = await requestLrcLib(cleaned, artistName, albumName, durationMs);
        }
        if (lrcContent) providerName = "LRCLIB";
    }

    // 3. Fallback to Netease
    if (!lrcContent && (sourcePreference === "netease" || sourcePreference === "auto")) {
        lrcContent = await requestNetease(trackName, artistName);
        if (!lrcContent && cleaned !== trackName) {
            lrcContent = await requestNetease(cleaned, artistName);
        }
        if (lrcContent) providerName = "Netease";
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
