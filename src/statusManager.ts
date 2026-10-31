import { PreviousUserStatus, SpotilyricSettings } from "./types";

declare const Vencord: any;

export interface DiscordCustomStatus {
  text?: string;
  emoji?: {
    name?: string;
    id?: string;
  };
}

export interface DiscordStatusAdapter {
  getCurrentStatus(): DiscordCustomStatus | null;
  updateCustomStatus(status: { text: string; emojiName: string; emojiId: string }): Promise<void>;
}

let testAdapter: DiscordStatusAdapter | null = null;
let savedStatus: PreviousUserStatus | null = null;
let lastUpdatedText = "";
let lastUpdateTime = 0;
let isSettingOwnStatus = false;

export function setStatusAdapterForTesting(adapter: DiscordStatusAdapter | null): void {
  testAdapter = adapter;
}

export function getSavedStatus(): PreviousUserStatus | null {
  return savedStatus;
}

function getUserSettingsProtoUtils(): any {
  if (testAdapter) {
    return {
      updateCustomStatus: (s: any) => testAdapter!.updateCustomStatus(s)
    };
  }

  try {
    if (typeof Vencord !== "undefined" && Vencord.Webpack) {
      return (
        Vencord.Webpack.Common?.UserSettingsProtoUtils ??
        Vencord.Webpack.findByProps?.("updateCustomStatus")
      );
    }
  } catch {
    return null;
  }
  return null;
}

function getCustomStatusStore(): any {
  if (testAdapter) {
    return {
      getCustomStatus: () => testAdapter!.getCurrentStatus()
    };
  }

  try {
    if (typeof Vencord !== "undefined" && Vencord.Webpack) {
      return (
        Vencord.Webpack.Common?.CustomStatusStore ??
        Vencord.Webpack.findStore?.("CustomStatusStore")
      );
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Saves the user's current Discord status if not already saved.
 */
export function backupCurrentStatus(): void {
  if (savedStatus !== null) return; // already backed up

  const store = getCustomStatusStore();
  if (store) {
    const current: DiscordCustomStatus | null = store.getCustomStatus?.();
    if (current) {
      savedStatus = {
        text: current.text || null,
        emojiName: current.emoji?.name || null,
        emojiId: current.emoji?.id || null
      };
      return;
    }
  }

  // Fallback: previous was empty
  savedStatus = { text: null, emojiName: null, emojiId: null };
}

/**
 * Restores the user's previous Discord status and clears the backup state.
 */
export async function restorePreviousStatus(): Promise<void> {
  if (savedStatus === null) return;

  const protoUtils = getUserSettingsProtoUtils();
  if (protoUtils?.updateCustomStatus) {
    try {
      isSettingOwnStatus = true;
      await protoUtils.updateCustomStatus({
        text: savedStatus.text || "",
        emojiName: savedStatus.emojiName || "",
        emojiId: savedStatus.emojiId || ""
      });
    } catch (err) {
      console.warn("[Spotilyric] Failed to restore previous status:", err);
    } finally {
      isSettingOwnStatus = false;
    }
  }

  savedStatus = null;
  lastUpdatedText = "";
}

/**
 * Updates the Discord Custom Status with rate-limiting and deduplication.
 */
export async function updateStatus(
  text: string,
  settings: SpotilyricSettings
): Promise<boolean> {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const now = Date.now();
  // Check if text changed
  if (trimmed === lastUpdatedText) {
    return false;
  }

  // Rate-limiting guard
  const interval = settings.minUpdateIntervalMs ?? 2000;
  if (now - lastUpdateTime < interval) {
    return false;
  }

  // Backup previous status before our first lyric write
  backupCurrentStatus();

  const protoUtils = getUserSettingsProtoUtils();
  if (!protoUtils?.updateCustomStatus) {
    return false;
  }

  try {
    isSettingOwnStatus = true;
    await protoUtils.updateCustomStatus({
      text: trimmed,
      emojiName: settings.statusEmoji || "🎵",
      emojiId: ""
    });

    lastUpdatedText = trimmed;
    lastUpdateTime = now;
    return true;
  } catch (err) {
    console.warn("[Spotilyric] Failed to update Discord status:", err);
    return false;
  } finally {
    isSettingOwnStatus = false;
  }
}

/**
 * Resets the internal state (e.g. on plugin disable).
 */
export function resetStatusManagerState(): void {
  savedStatus = null;
  lastUpdatedText = "";
  lastUpdateTime = 0;
  isSettingOwnStatus = false;
}
