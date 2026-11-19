/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { parseUrl } from "@utils/misc";

import { audioCache } from "./audioStore";

export type ReplacementSource = "url" | "file" | "soundboard";

export interface SoundOverride {
    id: string;
    mode: "mute" | "replace";
    sourceType?: ReplacementSource;
    url: string;
    fileId?: string;
    fileName?: string;
    soundboardId?: string;
}

export const SOUND_ID_REGEX = /^\d{17,20}$/;

export function makeOverride(id: string): SoundOverride {
    return { id, mode: "mute", url: "" };
}

export function getSourceType(override: SoundOverride): ReplacementSource {
    if (override.sourceType) return override.sourceType;
    if (override.fileId) return "file";
    if (override.soundboardId?.trim()) return "soundboard";
    return "url";
}

export function getReplacementSource(override: SoundOverride): string | null {
    switch (getSourceType(override)) {
        case "file":
            return override.fileId ? audioCache.get(override.fileId) ?? null : null;
        case "soundboard": {
            const soundboardId = override.soundboardId?.trim();
            return soundboardId && SOUND_ID_REGEX.test(soundboardId)
                ? `https://${window.GLOBAL_ENV.CDN_HOST}/soundboard-sounds/${soundboardId}`
                : null;
        }
        default: {
            const url = parseUrl(override.url.trim());
            return url?.protocol === "https:" || url?.protocol === "http:" ? url.href : null;
        }
    }
}
