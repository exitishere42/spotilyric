import { describe, it, expect } from "vitest";
import { parseLrc, getActiveLyricLine } from "../src/parser";

describe("LRC Parser & Active Line Search", () => {
  const sampleLrc = `
[ar: Test Artist]
[ti: Test Title]
[length: 03:00]
[00:05.10] First line of the song
[00:12.50] Second line
[00:20.00] Third line of the song
[00:25.00]
[01:05.30] Chorus line
  `;

  it("should parse LRC timestamps correctly and skip metadata tags", () => {
    const lines = parseLrc(sampleLrc);
    expect(lines).toHaveLength(5);
    expect(lines[0].timeMs).toBe(5100);
    expect(lines[0].text).toBe("First line of the song");
    expect(lines[1].timeMs).toBe(12500);
    expect(lines[2].timeMs).toBe(20000);
    expect(lines[3].timeMs).toBe(25000);
    expect(lines[3].text).toBe(""); // instrumental pause
    expect(lines[4].timeMs).toBe(65300);
    expect(lines[4].text).toBe("Chorus line");
  });

  it("should handle empty or invalid strings gracefully", () => {
    expect(parseLrc("")).toEqual([]);
    expect(parseLrc("Some text without tags")).toEqual([]);
    expect(parseLrc("[ar:Only Metadata]")).toEqual([]);
  });

  it("should correctly handle offset tags", () => {
    const lrcWithOffset = `
[offset: 500]
[00:01.00] Offset line
    `;
    const lines = parseLrc(lrcWithOffset);
    expect(lines).toHaveLength(1);
    expect(lines[0].timeMs).toBe(1500);
  });

  it("should return the correct active line for a given playback timestamp", () => {
    const lines = parseLrc(sampleLrc);

    // Before first line
    expect(getActiveLyricLine(lines, 2000)).toBeNull();

    // Exactly at first line
    expect(getActiveLyricLine(lines, 5100)?.text).toBe("First line of the song");

    // Between line 1 and line 2
    expect(getActiveLyricLine(lines, 8000)?.text).toBe("First line of the song");

    // At pause line (25s)
    expect(getActiveLyricLine(lines, 26000)?.text).toBe("");

    // Far into the chorus
    expect(getActiveLyricLine(lines, 70000)?.text).toBe("Chorus line");
  });

  it("should handle single-digit and 3-digit millisecond fractions", () => {
    const lrc = "[00:01.2] Single digit\n[00:02.345] Triple digit";
    const lines = parseLrc(lrc);
    expect(lines).toHaveLength(2);
    expect(lines[0].timeMs).toBe(1200);
    expect(lines[1].timeMs).toBe(2345);
  });
});
