/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { AudioPlayerInterface, playAudio } from "@api/AudioPlayer";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Divider } from "@components/Divider";
import { Flex } from "@components/Flex";
import { Heading } from "@components/Heading";
import { DeleteIcon } from "@components/Icons";
import { Notice } from "@components/Notice";
import { Paragraph } from "@components/Paragraph";
import { useCspPermission } from "@utils/csp";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { parseUrl } from "@utils/misc";
import { makeRange, OptionType } from "@utils/types";
import { chooseFile } from "@utils/web";
import { React, Select, showToast, SoundboardStore, TextInput } from "@webpack/common";

import { deleteAudioFile, MAX_AUDIO_FILE_SIZE, saveAudioFile } from "./audioStore";
import { getReplacementSource, getSourceType, makeOverride, ReplacementSource, SOUND_ID_REGEX, SoundOverride } from "./types";

const logger = new Logger("QuietSounds");

const AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "m4a", "aac", "flac", "webm", "opus"];

let previewPlayer: AudioPlayerInterface | null = null;

interface OverrideRowProps {
    override: SoundOverride;
    volume: number;
    onChange(override: SoundOverride): void;
    onRemove(): void;
}

function OverrideRow({ override, volume, onChange, onRemove }: OverrideRowProps) {
    const sourceType = getSourceType(override);
    const url = override.url.trim();
    const [isHostAllowed, allowHost] = useCspPermission(
        override.mode === "replace" && sourceType === "url" ? url || undefined : undefined,
        ["media-src"],
        "QuietSounds"
    );
    const sound = SoundboardStore.getSoundById(override.id);
    const replacementSoundId = override.soundboardId?.trim() ?? "";
    const isReplacementSoundIdValid = !replacementSoundId || SOUND_ID_REGEX.test(replacementSoundId);
    const replacementSound = isReplacementSoundIdValid && replacementSoundId ? SoundboardStore.getSoundById(replacementSoundId) : undefined;
    const parsedUrl = parseUrl(url);
    const isUrlValid = parsedUrl?.protocol === "https:" || parsedUrl?.protocol === "http:";

    const patch = (value: Partial<SoundOverride>) => onChange({ ...override, ...value });

    const setSourceType = (type: ReplacementSource) => {
        if (type === sourceType) return;

        const oldFileId = override.fileId;
        patch({ sourceType: type, url: "", fileId: undefined, fileName: undefined, soundboardId: undefined });
        if (oldFileId && type !== "file") {
            deleteAudioFile(oldFileId).catch(error => logger.error("Failed to delete audio file", error));
        }
    };

    const preview = () => {
        previewPlayer?.stop();

        try {
            const source = getReplacementSource(override);

            if (!source) {
                showToast({ text: "No replacement sound is configured.", variant: "critical" });
                return;
            }

            previewPlayer = playAudio(source, {
                volume,
                onError: () => showToast({ text: "Could not play this sound.", variant: "critical" })
            });
        } catch (error) {
            logger.error("Failed to preview replacement sound", error);
            showToast({ text: "Could not play this sound.", variant: "critical" });
        }
    };

    const upload = async () => {
        const file = await chooseFile("audio/*");
        if (!file) return;

        const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
        if (!file.type.startsWith("audio/") && !AUDIO_EXTENSIONS.includes(extension)) {
            showToast({ text: "Choose an audio file.", variant: "critical" });
            return;
        }

        if (file.size > MAX_AUDIO_FILE_SIZE) {
            showToast({ text: "Audio files must be 5 MB or smaller.", variant: "critical" });
            return;
        }

        try {
            const oldFileId = override.fileId;
            const fileId = await saveAudioFile(file);
            patch({ sourceType: "file", fileId, fileName: file.name, url: "", soundboardId: undefined });
            showToast({ text: "Audio file saved.", variant: "success" });
            if (oldFileId) {
                deleteAudioFile(oldFileId).catch(error => logger.error("Failed to delete audio file", error));
            }
        } catch (error) {
            logger.error("Failed to save audio file", error);
            showToast({ text: "Could not save this audio file.", variant: "critical" });
        }
    };

    const removeFile = async () => {
        const { fileId } = override;
        patch({ sourceType: "url", fileId: undefined, fileName: undefined });
        if (!fileId) return;

        try {
            await deleteAudioFile(fileId);
        } catch (error) {
            logger.error("Failed to delete audio file", error);
        }
    };

    return (
        <section>
            <Flex alignItems="center" justifyContent="space-between" className={Margins.bottom16}>
                <div>
                    <Heading>{sound?.name ?? "Unknown sound"}</Heading>
                    <Paragraph>{override.id}</Paragraph>
                </div>
                <Button variant="dangerPrimary" size="small" aria-label="Remove sound" onClick={onRemove}>
                    <DeleteIcon />
                </Button>
            </Flex>

            <div className={Margins.bottom16}>
                <Heading>Mode</Heading>
                <Select
                    options={[
                        { label: "Mute", value: "mute" },
                        { label: "Replace", value: "replace" }
                    ]}
                    isSelected={value => value === override.mode}
                    select={value => patch({ mode: value === "replace" ? "replace" : "mute" })}
                    serialize={value => value}
                />
            </div>

            {override.mode === "replace" && (
                <div className={Margins.bottom16}>
                    <Heading>Replacement</Heading>
                    <Select
                        options={[
                            { label: "URL", value: "url" },
                            { label: "File", value: "file" },
                            { label: "Soundboard sound", value: "soundboard" }
                        ]}
                        isSelected={value => value === sourceType}
                        select={value => setSourceType(value as ReplacementSource)}
                        serialize={value => value}
                    />

                    {sourceType === "url" && (
                        <div className={Margins.top8}>
                            <TextInput
                                value={override.url}
                                onChange={value => patch({ url: value })}
                                placeholder="https://example.com/sound.mp3"
                            />
                            {url && !isUrlValid && (
                                <Paragraph className={Margins.top8}>Enter a valid HTTP or HTTPS URL.</Paragraph>
                            )}
                            {url && isUrlValid && !isHostAllowed && (
                                <Notice
                                    className={Margins.top8}
                                    variant="warning"
                                    action={(
                                        <Button size="small" variant="secondary" onClick={allowHost}>
                                            Allow host
                                        </Button>
                                    )}
                                >
                                    Playing sounds from {parsedUrl?.host} is blocked. Allow this host if you trust it, then restart Discord.
                                </Notice>
                            )}
                        </div>
                    )}

                    {sourceType === "file" && (
                        <>
                            <Paragraph className={Margins.top8}>
                                {override.fileId ? override.fileName ?? "Uploaded file" : "No file uploaded yet."}
                            </Paragraph>
                            <Flex gap="8px" className={Margins.top8}>
                                {override.fileId && (
                                    <Button variant="secondary" size="small" onClick={removeFile}>
                                        Remove file
                                    </Button>
                                )}
                                <Button variant="secondary" size="small" onClick={upload}>
                                    Upload a file
                                </Button>
                            </Flex>
                        </>
                    )}

                    {sourceType === "soundboard" && (
                        <div className={Margins.top8}>
                            <TextInput
                                value={override.soundboardId ?? ""}
                                onChange={value => patch({ soundboardId: value })}
                                placeholder="Sound ID"
                            />
                            {replacementSoundId && !isReplacementSoundIdValid && (
                                <Paragraph className={Margins.top8}>Enter a valid sound ID.</Paragraph>
                            )}
                            {replacementSoundId && isReplacementSoundIdValid && (
                                <Paragraph className={Margins.top8}>
                                    {replacementSound?.name ?? "Unknown sound"}
                                </Paragraph>
                            )}
                        </div>
                    )}

                    <Flex gap="8px" className={Margins.top8}>
                        <Button variant="positive" size="small" onClick={preview}>
                            Preview
                        </Button>
                        <Button variant="dangerPrimary" size="small" onClick={() => previewPlayer?.stop()}>
                            Stop
                        </Button>
                    </Flex>
                </div>
            )}
        </section>
    );
}

function QuietSoundsList() {
    const { overrides = [], replacementVolume } = settings.use(["overrides", "replacementVolume"]);
    const [newId, setNewId] = React.useState("");

    const update = (next: SoundOverride[]) => {
        settings.store.overrides = next;
    };

    const add = () => {
        const id = newId.trim();

        if (!SOUND_ID_REGEX.test(id)) {
            showToast({ text: "Enter a valid sound ID.", variant: "critical" });
            return;
        }

        if (overrides.some(override => override.id === id)) {
            showToast({ text: "That sound is already in the list.", variant: "critical" });
            return;
        }

        update([...overrides, makeOverride(id)]);
        setNewId("");
    };

    const remove = (override: SoundOverride) => {
        update(overrides.filter(o => o.id !== override.id));

        if (override.fileId) {
            deleteAudioFile(override.fileId).catch(error => logger.error("Failed to delete audio file", error));
        }
    };

    return (
        <section>
            <Paragraph className={Margins.bottom16}>
                Mute or replace soundboard sounds by their sound ID. Sounds that are not in this list play normally.
            </Paragraph>

            {overrides.length === 0
                ? <Paragraph className={Margins.bottom16}>No sounds configured yet.</Paragraph>
                : overrides.map(override => (
                    <Card key={override.id} className={Margins.bottom16} defaultPadding>
                        <OverrideRow
                            override={override}
                            volume={replacementVolume}
                            onChange={next => update(overrides.map(o => o.id === override.id ? next : o))}
                            onRemove={() => remove(override)}
                        />
                    </Card>
                ))}

            <Divider className={Margins.bottom16} />
            <Heading>Add a sound</Heading>
            <Flex gap="8px" alignItems="center">
                <TextInput
                    value={newId}
                    onChange={setNewId}
                    placeholder="Sound ID"
                    onKeyDown={event => {
                        if (event.key === "Enter") add();
                    }}
                />
                <Button onClick={add}>Add</Button>
            </Flex>
        </section>
    );
}

export const settings = definePluginSettings({
    overrides: {
        type: OptionType.COMPONENT,
        description: "Sounds to mute or replace.",
        default: [] as SoundOverride[],
        component: QuietSoundsList
    },
    replacementVolume: {
        type: OptionType.SLIDER,
        description: "Volume of replacement sounds.",
        default: 100,
        markers: makeRange(0, 100, 10),
        stickToMarkers: false
    }
});
