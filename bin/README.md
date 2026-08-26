# Bundled Tools

Put the external binaries for local development and packaging in this folder:

- `yt-dlp.exe`
- `ffmpeg.exe`
- `ffprobe.exe`
- `deno.exe`

The Electron main process resolves these from `bin/` in development and from the packaged app resources in production. Deno is required by current yt-dlp releases to solve YouTube JavaScript challenges.

Current bundled versions:

- yt-dlp 2026.08.19
- Deno 2.9.5 (Windows x64)
