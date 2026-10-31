# Spotilyric 🎵

A lightweight Vencord plugin that synchronizes your Discord custom status with real-time Spotify song lyrics using the free and open [LRCLIB](https://lrclib.net) API.

---

## Features

- 🎧 **Native Vencord Plugin:** Runs directly inside Discord via Vencord, Equicord, or Vesktop.
- ⚡ **Zero Tokens / Bots Required:** Uses Discord's built-in Spotify tracking and internal stores — no user token leaking, no self-bot bans, no Spotify developer apps required.
- ⏱️ **Real-Time Synchronization:** Accurately tracks playback progress and updates your custom status line-by-line as the music plays.
- 🔄 **Smart State Restoration:** Automatically backs up your current Discord custom status and restores it when music is paused or stopped.
- 🛡️ **Anti-Spam & Rate-Limit Guard:** Built-in throttling and deduplication prevents Discord 429 rate limits during fast lyric passages.
- 🎶 **Graceful Fallbacks:** If a track has no synced lyrics (e.g. instrumentals), gracefully shows `🎵 Song - Artist`.

---

## Installation

### Option 1: Vencord UserPlugins (Recommended)

1. Clone or copy this repository into your Vencord `src/userplugins` folder:
   ```bash
   cd Vencord/src/userplugins
   git clone https://github.com/exitishere42/spotilyric.git spotilyric
   ```
2. Build / restart Vencord:
   ```bash
   pnpm build
   ```
3. In Discord, navigate to **User Settings** ➔ **Vencord** ➔ **Plugins**.
4. Enable **Spotilyric** and enjoy!

---

## Settings

In **Vencord Settings ➔ Plugins ➔ Spotilyric (Gear Icon)**:
- **Restore Previous Status:** Restores your old status when playback stops (Enabled by default).
- **Fallback to Track Info:** Displays `Song - Artist` if lyrics are not available.
- **Display Format:** Choose between `Song - Lyric` or `Lyric only`.
- **Status Emoji:** Custom emoji prefix (default: `🎵`).

---

## Development & Testing

```bash
# Install dependencies
npm install

# Run unit tests
npm test

# Type-check TypeScript
npm run typecheck
```

---

## License

MIT License. See [LICENSE](LICENSE) for details.
