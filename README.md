# Youtube Audio Ripper

Electron desktop app for downloading MP3 audio from YouTube, including short clips from long videos using start and end timestamps.

## Current Scope

- Windows desktop app
- MP3 output only
- Optional clip start and end times
- yt-dlp plus ffmpeg backend

## Project Layout

- `src/main`: Electron main process and download services
- `src/preload`: secure IPC bridge
- `src/renderer`: desktop UI
- `bin`: external executables to bundle with the app

## Required Binaries

Place these files in `bin/` before trying the app:

- `yt-dlp.exe`
- `ffmpeg.exe`
- `ffprobe.exe`

## Scripts

- `npm install`
- `npm run start`
- `npm run dist`
- `npm test`
- `npm run test:watch`
- `npm run smoke`
- `npm run smoke:clip`

## Testing

Use `npm test` for fast automated regression checks. This runs native Node tests against the pure clip-planning and output-validation helpers.

Use `npm run smoke` for quick local smoke coverage. It checks that the bundled tools run and that Electron can launch and exit cleanly.

Use `npm run smoke:clip` for a slower end-to-end clip smoke test against a public YouTube video. This depends on network access and the external video still being available.

The `release` folder does not need to be manually deleted between `npm run dist` runs. electron-builder can rebuild into that output directory.

## Version Check

Packaged builds now check the installed app version against the latest GitHub Release tag on startup and show an in-app error banner if the versions do not match or cannot be verified.

Development builds intentionally show the version-check error banner for now.

## Releases

Installer files should be published through GitHub Releases, not committed into the repository.

See `RELEASING.md` for the minimal release workflow and checklist.

The repository also includes an automatic patch-version bump workflow for pushes to `main` when the incoming commit did not already change the version number.
