import { findByProps, findStore } from "@webpack";
import { PreviousUserStatus } from "./types";

let savedStatus: PreviousUserStatus | null = null;
let lastUpdatedText = "";
let lastUpdateTime = 0;

function getUserSettingsProtoUtils(): any {
    try {
        return findByProps("updateCustomStatus");
    } catch {
        return null;
    }
}

function getCustomStatusStore(): any {
    try {
        return findStore("CustomStatusStore");
    } catch {
        return null;
    }
}

export function backupCurrentStatus(): void {
    if (savedStatus !== null) return;

    const store = getCustomStatusStore();
    if (store) {
        const current = store.getCustomStatus?.();
        if (current) {
            savedStatus = {
                text: current.text || null,
                emojiName: current.emoji?.name || null,
                emojiId: current.emoji?.id || null
            };
            return;
        }
    }

    savedStatus = { text: null, emojiName: null, emojiId: null };
}

export async function restorePreviousStatus(): Promise<void> {
    if (savedStatus === null) return;

    const protoUtils = getUserSettingsProtoUtils();
    if (protoUtils?.updateCustomStatus) {
        try {
            await protoUtils.updateCustomStatus({
                text: savedStatus.text || "",
                emojiName: savedStatus.emojiName || "",
                emojiId: savedStatus.emojiId || ""
            });
        } catch (err) {
            console.warn("[Spotilyric] Failed to restore previous status:", err);
        }
    }

    savedStatus = null;
    lastUpdatedText = "";
}

export async function updateStatus(
    text: string,
    statusEmoji: string,
    minUpdateIntervalMs: number
): Promise<boolean> {
    const trimmed = text.trim();
    if (!trimmed) return false;

    const now = Date.now();
    if (trimmed === lastUpdatedText) {
        return false;
    }

    const interval = minUpdateIntervalMs ?? 2000;
    if (now - lastUpdateTime < interval) {
        return false;
    }

    backupCurrentStatus();

    const protoUtils = getUserSettingsProtoUtils();
    if (!protoUtils?.updateCustomStatus) {
        return false;
    }

    try {
        await protoUtils.updateCustomStatus({
            text: trimmed,
            emojiName: statusEmoji || "🎵",
            emojiId: ""
        });

        lastUpdatedText = trimmed;
        lastUpdateTime = now;
        return true;
    } catch (err) {
        console.warn("[Spotilyric] Failed to update Discord status:", err);
        return false;
    }
}

export function resetStatusManagerState(): void {
    savedStatus = null;
    lastUpdatedText = "";
    lastUpdateTime = 0;
}
