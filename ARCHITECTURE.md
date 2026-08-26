# Youtube Audio Ripper Architecture Plan

## Stack Decision

- Desktop app: Electron
- Language: JavaScript
- Packaging: electron-builder
- Windows installer: NSIS
- Download engine: yt-dlp executable
- Media tools: ffmpeg and ffprobe executables
- JavaScript challenge runtime: Deno executable
- Persistence: local JSON config stored in the user's AppData directory

This is a good fit for the project because Electron handles Windows packaging and future auto-updates well, while yt-dlp and ffmpeg solve the hard media problems that should not be reimplemented in the app.

## Why Electron Still Makes Sense

yt-dlp is implemented in Python, but that does not mean the main app should be written in Python.

The cleanest architecture is:

UI app -> app service layer -> spawned yt-dlp process -> ffmpeg

That keeps responsibilities separate:

- Electron handles windows, settings, dialogs, progress UI, installer, and updates.
- yt-dlp handles extraction and downloading.
- ffmpeg handles conversion, trimming, and metadata-related post-processing.

This boundary is stable and language-agnostic. Electron works well with yt-dlp because it only needs to launch the executable, pass arguments, and parse structured progress output.

## Non-Negotiable Download Rule

The app architecture must not assume this pipeline for clip extraction:

full video download -> convert to audio -> trim to short clip

For long videos, especially multi-hour videos, that would be the wrong design.

The intended pipeline for clip extraction is:

select audio-only source -> request only a nearby time range -> perform exact local trim -> write final MP3

In practice, that means:

- prefer audio-only formats from yt-dlp instead of downloading video+audio when the user wants audio output
- use yt-dlp section downloading to fetch only a padded nearby clip region
- use ffmpeg to do the final exact trim locally before writing the finished MP3

Exact network efficiency depends on the source format and protocol, but the architecture should be built to avoid full-media downloads by default.

## Core Product Goal

Given a YouTube URL, the app should download audio to a user-selected folder on Windows with a simple desktop UI.

## First Milestone Scope

The first build should support only the core flow:

1. Paste a YouTube URL.
2. Choose an output folder.
3. Optionally enter a start and end time for a clip.
4. Download MP3 output only.
5. Start the download.
6. Show progress and completion state.
7. Save the downloaded file to disk.

The following features are intentionally deferred until after the core flow works:

- Auto-update for the app
- Automatic dependency update checks
- Remembered default save path
- Installer polish beyond a basic working Windows installer

Start and end segment support is part of milestone one because short clips from long videos are a primary use case.

## High-Level Architecture

### 1. Renderer Process

The renderer is the desktop UI.

Responsibilities:

- URL input
- Output folder picker
- Start time input
- End time input
- Download button
- Cancel button
- Status and progress display
- Error messages

The renderer must not directly spawn external processes.

### 2. Main Process

The main process is the application backend.

Responsibilities:

- Window lifecycle
- IPC endpoints exposed to the renderer
- Locating bundled tools
- Starting and stopping download jobs
- Parsing yt-dlp output
- Writing config files
- Handling file dialogs

This is where the download orchestration should live.

### 3. Tooling Layer

This layer wraps the external executables.

Components:

- `ytDlpService`
- `ffmpegService`
- `downloadJob`
- bundled Deno runtime for yt-dlp YouTube challenges

Responsibilities:

- Check whether required binaries exist
- Build safe command arguments
- Spawn child processes
- Stream stdout and stderr events
- Normalize progress events for the UI
- Return success, failure, and cancellation states

### 4. Persistence Layer

For the first milestone, persistence should stay minimal.

Store:

- Default download directory later
- App version and tool version metadata later if needed

Recommended storage file:

- `%APPDATA%/<app-name>/config.json`

## Recommended Project Structure

```text
youtube-audio-ripper/
  package.json
  electron-builder.yml
  src/
    main/
      main.js
      ipc.js
      services/
        config-service.js
        tool-path-service.js
        yt-dlp-service.js
        ffmpeg-service.js
        download-job.js
    preload/
      preload.js
    renderer/
      index.html
      styles.css
      app.js
  assets/
    icons/
  bin/
    yt-dlp.exe
    ffmpeg.exe
    ffprobe.exe
    deno.exe
  dist/
```

## Binary Strategy

### Bundle the executables with the app

Pros:

- Simplest user experience
- No separate dependency install step
- Most reliable first-run behavior

Cons:

- Larger installer
- Must manage binary updates in releases
- Must verify license obligations before shipping

## Core Download Flow

The main process should execute a flow like this:

1. Validate the YouTube URL.
2. Validate that the output directory exists and is writable.
3. Verify `yt-dlp.exe`, `ffmpeg.exe`, `ffprobe.exe`, and `deno.exe` are present.
4. Build yt-dlp arguments.
5. Spawn yt-dlp as a child process.
6. Parse progress output and forward normalized events to the renderer.
7. Detect completion or failure.
8. Return the final file path or an actionable error.

## yt-dlp Integration Strategy

Use yt-dlp as an external executable, not as a JavaScript library wrapper.

For reliability, prefer structured or predictable output instead of scraping human-friendly log lines wherever possible. The app should control command construction and normalize events before they reach the UI.

Example baseline arguments for core audio download:

```text
yt-dlp \
  -f ba/bestaudio \
  --extract-audio \
  --audio-format mp3 \
  --ffmpeg-location <bin-folder> \
  --paths home:<output-folder> \
  --windows-filenames \
  <youtube-url>
```

For a better first implementation, the app should also set:

- `--newline` so progress arrives line by line
- `--progress`
- `--no-playlist` for the first milestone

For clip downloads, the command builder should add a section constraint instead of downloading the full source:

```text
yt-dlp \
  -f ba/bestaudio \
  --extract-audio \
  --audio-format mp3 \
  --download-sections "*00:01:32-00:01:37" \
  --ffmpeg-location <bin-folder> \
  --paths home:<output-folder> \
  --windows-filenames \
  --newline \
  --progress \
  --no-playlist \
  <youtube-url>
```

`--download-sections` requires ffmpeg. yt-dlp documents this as partial downloading by timestamps or chapters. For YouTube and similar fragmented streams, this is the correct feature to build around for short audio clips.

Important nuance: some formats and protocols allow cleaner section downloading than others. In some cases the downloader may need nearby fragments or less precise boundaries. That is still far better than architecting around full-length video downloads.

## ffmpeg Role

ffmpeg is needed for:

- Extracting audio from downloaded media
- Converting to the selected output format
- Supporting yt-dlp section downloads and final clip preparation

ffprobe is useful for future validation and media inspection, even if the first build does not use it heavily.

## Clip Download Strategy

For short sound bites from long videos, the backend should follow this policy order:

1. Request an audio-only format with `-f ba/bestaudio`.
2. If the user supplied start and end times, add `--download-sections` for a padded nearby range.
3. Perform a final exact local trim with ffmpeg.
4. Convert to MP3 as the only supported output format.
5. Avoid downloading video streams unless there is no usable audio-only format.
6. If the source cannot support efficient section downloading, surface that clearly in the UI instead of silently pretending it was efficient.

This keeps bandwidth, disk usage, and waiting time as low as possible for the clip-heavy use case.

## IPC Contract

Keep IPC small and explicit.

Initial channels:

- `dialog:pickOutputFolder`
- `download:start`
- `download:cancel`
- `config:get`
- `config:set`

Initial download event payload from main process to renderer:

```json
{
  "jobId": "string",
  "status": "queued|running|postprocessing|completed|failed|cancelled",
  "percent": 42.5,
  "speed": "1.2 MiB/s",
  "eta": "00:12",
  "outputPath": "C:\\Users\\Example\\Music\\file.mp3",
  "error": null
}
```

## Security Rules

Use Electron with a stricter default setup.

- Enable context isolation
- Disable node integration in the renderer
- Use a preload bridge with a narrow API surface
- Never pass raw shell command strings from renderer to main
- Build process arguments as arrays
- Validate all renderer-supplied file paths and URLs in the main process

## Installer Plan

Use `electron-builder` with NSIS for Windows packaging.

Why:

- Mature Electron packaging workflow
- Good Windows installer support
- Easy path to future auto-update integration

First installer goal:

- Install the Electron app
- Include the bundled `yt-dlp.exe`, `ffmpeg.exe`, `ffprobe.exe`, and `deno.exe`
- Create desktop and Start menu shortcuts

## Error Model

Design errors around categories the UI can explain clearly.

Error categories:

- Invalid URL
- Unsupported or unavailable media
- Missing dependency
- Permission denied for output folder
- Download failed
- Conversion failed
- Unknown process error

## Development Phases

### Phase 1: Skeleton App

- Create Electron app shell
- Create main, preload, and renderer split
- Add a basic window and form UI with start and end time fields

### Phase 2: Local Tool Execution

- Add bundled `bin/` layout
- Implement tool path resolution
- Implement MP3 command building with optional `--download-sections`

### Phase 3: Download Job Pipeline

- Implement `download:start`
- Parse progress output
- Show status updates in UI
- Return final output path
- Support cancellation during active downloads

### Phase 4: Packaging

- Configure electron-builder
- Produce a Windows installer
- Verify that bundled executables resolve correctly after packaging

### Phase 5: Polishing Core UX

- Better validation
- Better error copy
- Download cancellation
- Persist last-used output folder

## Decisions Locked In For Now

- Use Electron, not Python, for the desktop app shell.
- Use yt-dlp and ffmpeg as external bundled executables.
- Use electron-builder and NSIS for Windows packaging.
- Build the first milestone around a single-video, MP3-only workflow.
- Treat start and end segment selection as a core milestone-one feature.

## Open Decisions For Next Step

These should be decided before implementation starts:

1. UI style: plain HTML/CSS/JS or a frontend framework inside Electron.
2. Binary packaging: commit binaries into the repo or fetch them during release packaging.

## Recommended Next Build Step

Start with a plain Electron app using vanilla HTML, CSS, and JavaScript.

That keeps the first milestone small:

- fewer dependencies
- simpler packaging
- easier debugging of child-process behavior

Once the core download path works end to end, more UI structure can be added if needed.
