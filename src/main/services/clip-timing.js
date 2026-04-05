function inferClipTrimStartOffsetSeconds({
  requestedStartSeconds,
  paddedEndSeconds,
  downloadedDurationSeconds,
  trimDurationSeconds
}) {
  if (downloadedDurationSeconds <= 0) {
    throw new Error('Downloaded source clip has no measurable duration.');
  }

  const inferredSourceStartSeconds = paddedEndSeconds - downloadedDurationSeconds;
  const unclampedTrimStartOffsetSeconds = requestedStartSeconds - inferredSourceStartSeconds;
  const maxTrimStartOffsetSeconds = Math.max(
    0,
    downloadedDurationSeconds - trimDurationSeconds
  );
  const actualTrimStartOffsetSeconds = Math.min(
    maxTrimStartOffsetSeconds,
    Math.max(0, unclampedTrimStartOffsetSeconds)
  );

  return {
    inferredSourceStartSeconds,
    actualTrimStartOffsetSeconds
  };
}

module.exports = {
  inferClipTrimStartOffsetSeconds
};