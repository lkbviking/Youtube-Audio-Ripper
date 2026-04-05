# Bundled Tools

Put the external binaries for local development and packaging in this folder:

- `yt-dlp.exe`
- `ffmpeg.exe`
- `ffprobe.exe`

The Electron main process resolves these from `bin/` in development and from the packaged app resources in production.
