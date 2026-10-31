import { AuthenticationStore, PresenceStore, UserSettingsActionCreators } from "@webpack/common";
import { PreviousUserStatus } from "./types";

let savedStatus: PreviousUserStatus | null = null;
let lastUpdatedText = "";
let lastUpdateTime = 0;

export function getCurrentCustomStatus(): PreviousUserStatus | null {
    try {
        const myId = AuthenticationStore?.getId?.();
        if (!myId) return null;
        const activities = PresenceStore?.getActivities?.(myId);
        if (!activities) return null;
        const custom = activities.find((a: any) => a.type === 4); // 4 = ActivityType.CUSTOM_STATUS
        if (custom) {
            return {
                text: custom.state || null,
                emojiName: custom.emoji?.name || null,
                emojiId: custom.emoji?.id || null
            };
        }
    } catch (err) {
        console.warn("[Spotilyric] Failed to get current status:", err);
    }
    return null;
}

export function backupCurrentStatus(): void {
    if (savedStatus !== null) return;
    const current = getCurrentCustomStatus();
    savedStatus = current ?? { text: null, emojiName: null, emojiId: null };
}

export async function restorePreviousStatus(): Promise<void> {
    if (savedStatus === null) return;

    try {
        const actionCreators = UserSettingsActionCreators?.PreloadedUserSettingsActionCreators;
        if (actionCreators?.updateAsync) {
            await actionCreators.updateAsync(
                "status",
                (status: any) => {
                    if (!savedStatus?.text) {
                        status.customStatus = undefined;
                    } else {
                        const validEmojiId = savedStatus.emojiId && /^-?[0-9]+$/.test(savedStatus.emojiId)
                            ? savedStatus.emojiId
                            : "0";

                        status.customStatus = {
                            text: savedStatus.text,
                            emojiName: savedStatus.emojiName || "",
                            emojiId: validEmojiId,
                            expiresAtMs: "0"
                        };
                    }
                },
                0
            );
        }
    } catch (err) {
        console.warn("[Spotilyric] Failed to restore previous status:", err);
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

    try {
        const actionCreators = UserSettingsActionCreators?.PreloadedUserSettingsActionCreators;
        if (!actionCreators?.updateAsync) {
            console.warn("[Spotilyric] PreloadedUserSettingsActionCreators not ready");
            return false;
        }

        await actionCreators.updateAsync(
            "status",
            (status: any) => {
                status.customStatus = {
                    text: trimmed,
                    emojiName: statusEmoji || "🎵",
                    emojiId: "0",
                    expiresAtMs: "0"
                };
            },
            0
        );

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
