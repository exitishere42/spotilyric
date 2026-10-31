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
let cspChecked = false;

async function ensureCspAllowed(): Promise<void> {
    if (cspChecked) return;
    try {
        if (typeof VencordNative !== "undefined" && VencordNative.csp?.requestAddOverride) {
            const isAllowed = await VencordNative.csp.isDomainAllowed?.("https://lrclib.net", ["connect-src"]);
            if (!isAllowed) {
                await VencordNative.csp.requestAddOverride("https://lrclib.net", ["connect-src"], "Spotilyric");
            }
        }
    } catch {
        // Ignore in environments without VencordNative
    }
    cspChecked = true;
}

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
): Promise<LrcLibResponse | null> {
    await ensureCspAllowed();

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
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
        const response = await fetch(url.toString(), {
            signal: controller.signal,
            headers: {
                "User-Agent": "Spotilyric Vencord Plugin (https://github.com/exitishere42/spotilyric)"
            }
        });
        clearTimeout(timeout);

        if (!response.ok) {
            return null;
        }

        return await response.json();
    } catch (err) {
        clearTimeout(timeout);
        console.warn("[Spotilyric] Network request to LRCLIB failed:", err);
        return null;
    }
}

export async function fetchLyrics(
    trackName: string,
    artistName: string,
    albumName?: string,
    durationMs?: number
): Promise<SyncedLyrics | null> {
    const cacheKey = getCacheKey(trackName, artistName);
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey) ?? null;
    }

    let data = await requestLrcLib(trackName, artistName, albumName, durationMs);

    const cleaned = cleanTrackTitle(trackName);
    if (!data && cleaned && cleaned.toLowerCase() !== trackName.toLowerCase()) {
        data = await requestLrcLib(cleaned, artistName, albumName, durationMs);
    }

    if (!data) {
        cache.set(cacheKey, null);
        return null;
    }

    if (data.instrumental || !data.syncedLyrics) {
        const result: SyncedLyrics = {
            trackName,
            artistName,
            durationMs: durationMs ?? 0,
            lines: [],
            isSynced: false
        };
        cache.set(cacheKey, result);
        return result;
    }

    const lines = parseLrc(data.syncedLyrics);
    const result: SyncedLyrics = {
        trackName,
        artistName,
        durationMs: durationMs ?? 0,
        lines,
        isSynced: lines.length > 0
    };

    cache.set(cacheKey, result);
    return result;
}

export function clearLyricsCache(): void {
    cache.clear();
}
