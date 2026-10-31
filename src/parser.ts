import { LyricLine } from "./types";

/**
 * Parses raw LRC string into a sorted list of LyricLine objects.
 * Supports standard timestamp tags [mm:ss.xx] and global [offset:+/-ms] tag.
 */
export function parseLrc(lrcContent: string): LyricLine[] {
  if (!lrcContent || typeof lrcContent !== "string") {
    return [];
  }

  const lines = lrcContent.split(/\r?\n/);
  const result: LyricLine[] = [];

  // Matches metadata offset tag: [offset:+/-1000]
  const offsetRegex = /^\[offset:\s*([+-]?\d+)\s*\]/i;
  let offsetMs = 0;

  // First pass: extract any global offset tag if present
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    const offsetMatch = trimmed.match(offsetRegex);
    if (offsetMatch) {
      offsetMs = parseInt(offsetMatch[1], 10) || 0;
      break;
    }
  }

  // Matches timestamp tags like [01:23.45] or [00:04.120] or [1:02.3]
  const tagRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Skip metadata lines like [ar:Artist], [ti:Title], [offset:100]
    if (/^\[[a-zA-Z]+:.*\]$/.test(trimmed)) {
      continue;
    }

    const matches = Array.from(trimmed.matchAll(tagRegex));
    if (matches.length === 0) continue;

    // Remove all timestamp tags to extract the lyric text
    const text = trimmed.replace(tagRegex, "").trim();

    for (const match of matches) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const fractionStr = match[3] || "0";
      // Normalize fraction to milliseconds (e.g. "45" -> 450ms, "450" -> 450ms, "4" -> 400ms)
      const fraction = parseInt(fractionStr.padEnd(3, "0").slice(0, 3), 10);

      const timeMs = Math.max(0, minutes * 60 * 1000 + seconds * 1000 + fraction + offsetMs);
      result.push({ timeMs, text });
    }
  }

  // Sort ascending by time
  result.sort((a, b) => a.timeMs - b.timeMs);
  return result;
}

/**
 * Finds the currently active lyric line for the given playback position in milliseconds.
 * Returns null if playback is before the first timestamp.
 */
export function getActiveLyricLine(lines: LyricLine[], currentProgressMs: number): LyricLine | null {
  if (!lines || lines.length === 0 || currentProgressMs < 0) {
    return null;
  }

  // If before the first line
  if (currentProgressMs < lines[0].timeMs) {
    return null;
  }

  // Binary search for the active line
  let low = 0;
  let high = lines.length - 1;
  let activeIndex = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lines[mid].timeMs <= currentProgressMs) {
      activeIndex = mid;
      low = mid + 1; // look for a closer one later in the song
    } else {
      high = mid - 1;
    }
  }

  return lines[activeIndex];
}
