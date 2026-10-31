import { UserSettings } from "@api/UserSettings";
import { FluxDispatcher } from "@webpack/common";
import { ActivityFlags, ActivityType } from "@vencord/discord-types/enums";
import type { Activity } from "@vencord/discord-types";
import { PreviousUserStatus, SpotilyricSettings } from "./types";

const SOCKET_ID = "Spotilyric";

let savedStatus: PreviousUserStatus | null = null;
let lastUpdatedText = "";
let lastUpdateTime = 0;

let remoteInFlight = false;
let pendingRemoteText: string | null = null;
let nextRemoteAt = 0;
let remoteTimer: any = null;

let testAdapter: {
    getCurrentStatus: () => { text: string; emoji?: { name?: string; id?: string } } | null;
    updateCustomStatus: (status: { text: string; emojiName: string; emojiId?: string }) => Promise<void>;
} | null = null;

export function setStatusAdapterForTesting(adapter: any): void {
    testAdapter = adapter;
}

export function getSavedStatus(): PreviousUserStatus | null {
    return savedStatus;
}

function getStatusSetting(name: string) {
    return Object.values(UserSettings ?? {})
        .find(setting => setting?.userSettingsAPIGroup === "status" && setting.userSettingsAPIName === name);
}

export function getCurrentCustomStatus(): PreviousUserStatus | null {
    if (testAdapter) {
        const res = testAdapter.getCurrentStatus();
        return res ? {
            text: res.text,
            emojiName: res.emoji?.name || null,
            emojiId: res.emoji?.id || null
        } : null;
    }

    try {
        const customStatus = getStatusSetting("customStatus");
        const current = customStatus?.getSetting?.() as any;
        if (current && current.text) {
            return {
                text: current.text,
                emojiName: current.emojiName || null,
                emojiId: current.emojiId || null
            };
        }
    } catch (err) {
        console.warn("[Spotilyric] Failed to get current custom status:", err);
    }
    return null;
}

export function backupCurrentStatus(): void {
    if (savedStatus !== null) return;
    const current = getCurrentCustomStatus();
    savedStatus = current ?? { text: null, emojiName: null, emojiId: null };
}

function scheduleRemoteUpdate(text: string | null) {
    pendingRemoteText = text;
    if (remoteInFlight) return;
    if (remoteTimer) return;

    const delay = Math.max(0, nextRemoteAt - Date.now());
    remoteTimer = setTimeout(() => {
        remoteTimer = null;
        void flushRemote();
    }, delay);
}

async function flushRemote() {
    if (remoteInFlight) return;
    const textToSet = pendingRemoteText;
    remoteInFlight = true;

    try {
        const customStatus = getStatusSetting("customStatus");
        if (customStatus) {
            await customStatus.updateSetting(
                textToSet ? { text: textToSet, emojiName: "🎵", emojiId: "0", expiresAtMs: "0" } : undefined
            );
        }
        nextRemoteAt = Date.now() + 5000;
    } catch (err: any) {
        const retryAfter = Number(err?.retryAfter ?? err?.body?.retry_after ?? 5);
        nextRemoteAt = Date.now() + (retryAfter * 1000);
        console.warn("[Spotilyric] Remote status sync delayed by rate-limit:", err);
    } finally {
        remoteInFlight = false;
        if (pendingRemoteText !== textToSet) {
            scheduleRemoteUpdate(pendingRemoteText);
        }
    }
}

export async function updateStatus(
    text: string,
    emojiOrSettings?: string | SpotilyricSettings,
    minUpdateIntervalMs?: number
): Promise<boolean> {
    const trimmed = text.trim();
    if (!trimmed) return false;

    const now = Date.now();
    if (trimmed === lastUpdatedText) {
        return false;
    }

    let emoji = "🎵";
    let interval = 1000;

    if (typeof emojiOrSettings === "object" && emojiOrSettings !== null) {
        emoji = emojiOrSettings.statusEmoji ?? "🎵";
        interval = emojiOrSettings.minUpdateIntervalMs ?? 1000;
    } else if (typeof emojiOrSettings === "string") {
        emoji = emojiOrSettings;
        interval = minUpdateIntervalMs ?? 1000;
    }

    if (now - lastUpdateTime < interval) {
        return false;
    }

    backupCurrentStatus();

    if (testAdapter) {
        await testAdapter.updateCustomStatus({ text: trimmed, emojiName: emoji, emojiId: "0" });
        lastUpdatedText = trimmed;
        lastUpdateTime = now;
        return true;
    }

    try {
        // 1. Instantly update Discord Gateway Activity (broadcasts live to all friends, servers & mobile)
        FluxDispatcher.dispatch({
            type: "LOCAL_ACTIVITY_UPDATE",
            activity: {
                id: "custom",
                name: "Custom Status",
                state: trimmed,
                type: ActivityType.CUSTOM_STATUS,
                flags: ActivityFlags.INSTANCE,
                created_at: Date.now()
            } satisfies Activity,
            socketId: SOCKET_ID
        });

        // 2. Queue rate-limited sync to server-side UserSettings
        scheduleRemoteUpdate(trimmed);

        lastUpdatedText = trimmed;
        lastUpdateTime = now;
        return true;
    } catch (err) {
        console.warn("[Spotilyric] Failed to broadcast custom status:", err);
        return false;
    }
}

export async function restorePreviousStatus(): Promise<void> {
    if (testAdapter) {
        if (savedStatus) {
            await testAdapter.updateCustomStatus({
                text: savedStatus.text || "",
                emojiName: savedStatus.emojiName || ""
            });
        }
        savedStatus = null;
        lastUpdatedText = "";
        lastUpdateTime = 0;
        return;
    }

    // 1. Immediately clear the Gateway Activity
    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity: null,
        socketId: SOCKET_ID
    });

    if (remoteTimer) {
        clearTimeout(remoteTimer);
        remoteTimer = null;
    }

    // 2. Restore the original UserSettings
    if (savedStatus !== null) {
        const toRestore = savedStatus;
        savedStatus = null;
        pendingRemoteText = toRestore.text ?? null;

        const customStatus = getStatusSetting("customStatus");
        if (customStatus) {
            try {
                if (!toRestore.text) {
                    await customStatus.updateSetting(undefined);
                } else {
                    await customStatus.updateSetting({
                        text: toRestore.text,
                        emojiName: toRestore.emojiName || "",
                        emojiId: toRestore.emojiId || "0",
                        expiresAtMs: "0"
                    });
                }
                console.log("[Spotilyric] Status successfully restored to original.");
            } catch (err) {
                console.warn("[Spotilyric] Failed to restore original remote status:", err);
            }
        }
    }

    lastUpdatedText = "";
    lastUpdateTime = 0;
}

export function resetStatusManagerState(): void {
    savedStatus = null;
    lastUpdatedText = "";
    lastUpdateTime = 0;
    if (remoteTimer) {
        clearTimeout(remoteTimer);
        remoteTimer = null;
    }
    remoteInFlight = false;
    pendingRemoteText = null;
    testAdapter = null;
}
