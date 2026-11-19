/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { get, set } from "@api/DataStore";

const STORAGE_KEY = "QuietSounds_files";

export const MAX_AUDIO_FILE_SIZE = 5 * 1024 * 1024;
export const audioCache = new Map<string, string>();

interface StoredAudioFile {
    name: string;
    dataUri: string;
}

export async function saveAudioFile(file: File): Promise<string> {
    const dataUri = await readAsDataUri(file);
    const id = crypto.randomUUID();
    const files = await getAllAudioFiles();
    files[id] = { name: file.name, dataUri };
    await set(STORAGE_KEY, files);
    audioCache.set(id, dataUri);
    return id;
}

export async function deleteAudioFile(id: string): Promise<void> {
    const files = await getAllAudioFiles();
    audioCache.delete(id);
    if (!(id in files)) return;

    delete files[id];
    await set(STORAGE_KEY, files);
}

export async function preloadAudioFiles(): Promise<void> {
    const files = await getAllAudioFiles();
    for (const [id, file] of Object.entries(files)) {
        audioCache.set(id, file.dataUri);
    }
}

async function getAllAudioFiles(): Promise<Record<string, StoredAudioFile>> {
    return (await get<Record<string, StoredAudioFile>>(STORAGE_KEY)) ?? {};
}

function readAsDataUri(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error ?? new Error("Could not read the file."));
        reader.readAsDataURL(file);
    });
}
