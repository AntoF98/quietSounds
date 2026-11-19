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
    if (override.fileId) return "file";
    if (override.soundboardId?.trim()) return "soundboard";
    return "url";
}

export function getReplacementSource(override: SoundOverride): string | null {
    if (override.fileId) return audioCache.get(override.fileId) ?? null;

    const soundboardId = override.soundboardId?.trim();
    if (soundboardId && SOUND_ID_REGEX.test(soundboardId)) {
        return `https://${window.GLOBAL_ENV.CDN_HOST}/soundboard-sounds/${soundboardId}`;
    }

    const url = parseUrl(override.url.trim());
    if (url?.protocol === "https:" || url?.protocol === "http:") return url.href;

    return null;
}
