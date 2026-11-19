/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { AudioPlayerInterface, playAudio } from "@api/AudioPlayer";
import { EquicordDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";

import { preloadAudioFiles } from "./audioStore";
import { settings } from "./settings";
import { getReplacementSource } from "./types";

const logger = new Logger("QuietSounds");
const activePlayers = new Set<AudioPlayerInterface>();
let loggedFirstInterception = false;

type SoundboardSoundInput = string | { soundId?: string; } | undefined;

export default definePlugin({
    name: "QuietSounds",
    description: "Locally mute or replace specific soundboard sounds by their sound ID.",
    tags: ["Voice", "Utility"],
    authors: [EquicordDevs.nobody],
    dependencies: ["AudioPlayerAPI"],
    settings,

    patches: [
        {
            find: '"SoundboardManager"',
            replacement: {
                match: /try\s*\{(?=let \i=\{soundKey:)/,
                replace: "$&if($self.handleSoundboardSound(arguments[0]))return;"
            }
        },
        {
            find: /previewSound:\i\.useCallback\(async\(\)=>\{/,
            replacement: {
                match: /previewSound:\i\.useCallback\(async\(\)=>\{(?=let \i=\(0,\i\.A\)\((\i)\.soundId\))/,
                replace: "$&if($self.handleSoundboardSound($1.soundId))return;"
            }
        }
    ],

    handleSoundboardSound(input: SoundboardSoundInput): boolean {
        try {
            const soundId = typeof input === "string" ? input : input?.soundId;
            if (!soundId) return false;

            if (!loggedFirstInterception) {
                loggedFirstInterception = true;
                logger.info("Soundboard hook active, intercepted a sound");
            }

            const { overrides } = settings.store;
            if (!Array.isArray(overrides)) return false;

            const override = overrides.find(o => o.id === soundId);
            if (!override) return false;

            if (override.mode === "replace") {
                const source = getReplacementSource(override);

                if (source) {
                    const player = playAudio(source, {
                        volume: settings.store.replacementVolume,
                        onEnded: () => activePlayers.delete(player),
                        onError: error => logger.warn("Could not play replacement sound", error)
                    });
                    activePlayers.add(player);
                } else {
                    logger.debug(`No replacement source for sound ${soundId}, muting it instead`);
                }
            }

            return true;
        } catch (error) {
            logger.error("Failed to handle soundboard sound", error);
            return false;
        }
    },

    async start() {
        try {
            await preloadAudioFiles();
        } catch (error) {
            logger.error("Failed to load replacement audio files", error);
        }
    },

    stop() {
        for (const player of activePlayers) player.stop();
        activePlayers.clear();
    }
});
