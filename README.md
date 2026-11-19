# quietSounds

Locally mute or replace specific Discord soundboard sounds by their sound ID. Replacements can be a direct audio URL, an uploaded file, or another soundboard sound. Sounds you don't configure keep playing normally.

## Features

- Add sounds by their sound ID (right-click a sound in the soundboard picker and choose "Copy Sound ID").
- Per sound: **mute** it, or **replace** it with:
  - a direct audio **URL** (http/https),
  - an uploaded **file** (max 5 MB, stored locally),
  - another **soundboard sound** by ID.
- Global volume slider for replacement sounds.
- Preview/stop buttons for each replacement.
- Sounds that are not configured play normally.

## Install

Requires an Equicord **dev build** (`pnpm inject` from a source clone) so that userplugins are loaded from `src/userplugins`.

1. In Discord: Settings → UserPlugins → paste this repo's URL and click Install, or
2. Manually: `git clone <this repo> src/userplugins/quietSounds` inside your Equicord source clone, then run `pnpm build`.

Restart Discord after installing and after enabling the **QuietSounds** plugin (it patches Discord's sound playback, so a restart is required).

## Notes

- Replacement files are stored as data URIs in Equicord's local DataStore. Settings sync may carry the file reference but not the audio itself, so on other devices a file-based replacement falls back to mute.
- External URLs need their host allowed for `media-src` (the plugin offers a button to allow it); on web builds the page CSP may still block them.
- Only actual playback (sending a sound in voice, receiving one from others, and the picker preview) is intercepted.

## License

GPL-3.0-or-later, like Equicord itself. See [LICENSE](LICENSE).

## Author

AntoF98 (Discord ID 247745121355825154).
