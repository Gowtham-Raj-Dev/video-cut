export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const formattedMins = mins.toString().padStart(2, '0');
  const formattedSecs = secs.toString().padStart(2, '0');

  if (hrs > 0) {
    const formattedHrs = hrs.toString().padStart(2, '0');
    return `${formattedHrs}:${formattedMins}:${formattedSecs}`;
  }
  return `${formattedMins}:${formattedSecs}`;
}

export function formatTimeWithMs(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00.0';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Split by duration interval (e.g. 30 seconds for Shorts).
 */
export function generateSegments(
  totalDuration: number,
  segmentLength: number,
  startOffset = 0,
  endOffset?: number
): { id: string; index: number; title: string; startTime: number; endTime: number; duration: number }[] {
  const effectiveEnd = Math.min(totalDuration, endOffset !== undefined && endOffset > 0 ? endOffset : totalDuration);
  const range = effectiveEnd - startOffset;

  if (range <= 0 || segmentLength <= 0) return [];

  const segments = [];
  let currentTime = startOffset;
  let partIndex = 1;

  while (currentTime < effectiveEnd) {
    const nextTime = Math.min(currentTime + segmentLength, effectiveEnd);
    const duration = nextTime - currentTime;

    // Skip tiny leftover fragments less than 1.5 seconds if there are previous clips
    if (duration < 1.5 && segments.length > 0) {
      segments[segments.length - 1].endTime = nextTime;
      segments[segments.length - 1].duration = segments[segments.length - 1].endTime - segments[segments.length - 1].startTime;
      break;
    }

    segments.push({
      id: `seg-${partIndex}-${Math.round(currentTime)}`,
      index: partIndex,
      title: `Part ${partIndex}`,
      startTime: currentTime,
      endTime: nextTime,
      duration: duration,
    });

    currentTime = nextTime;
    partIndex++;
  }

  return segments;
}

/**
 * Split by parts count (e.g., 20 mins video cut into 2 parts = two 10-minute parts).
 */
export function generateSegmentsByCount(
  totalDuration: number,
  partsCount: number,
  startOffset = 0,
  endOffset?: number
): { id: string; index: number; title: string; startTime: number; endTime: number; duration: number }[] {
  const effectiveEnd = Math.min(totalDuration, endOffset !== undefined && endOffset > 0 ? endOffset : totalDuration);
  const range = effectiveEnd - startOffset;

  if (range <= 0 || partsCount <= 0) return [];

  const safeCount = Math.max(1, Math.min(partsCount, 100));
  const partDuration = range / safeCount;

  const segments = [];
  for (let i = 0; i < safeCount; i++) {
    const startTime = startOffset + i * partDuration;
    const endTime = i === safeCount - 1 ? effectiveEnd : startOffset + (i + 1) * partDuration;
    const duration = endTime - startTime;

    segments.push({
      id: `seg-part-${i + 1}`,
      index: i + 1,
      title: `Part ${i + 1}`,
      startTime,
      endTime,
      duration,
    });
  }

  return segments;
}
