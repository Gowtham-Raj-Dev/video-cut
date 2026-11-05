export interface AudioTrackInfo {
  index: number; // 0, 1, 2... (audio stream index for -map 0:a:N)
  trackNumber: number;
  languageCode: string; // "tam", "hin", "tel", "eng"
  languageName: string; // "Tamil", "Hindi", "Telugu", "English"
  title: string; // Raw title: "Toonworld4all.me - [Tamil]"
  codec: string; // "AAC", "AC3", "MP3", "OPUS"
  isDefault: boolean;
  displayLabel: string; // User-facing clean label
}

export interface MediaMetadataInfo {
  duration: number;
  width: number;
  height: number;
  tracks: AudioTrackInfo[];
}

const LANGUAGE_MAP: Record<string, string> = {
  tam: "Tamil",
  ta: "Tamil",
  tamil: "Tamil",
  hin: "Hindi",
  hi: "Hindi",
  hindi: "Hindi",
  tel: "Telugu",
  te: "Telugu",
  telugu: "Telugu",
  mal: "Malayalam",
  ml: "Malayalam",
  kan: "Kannada",
  kn: "Kannada",
  eng: "English",
  en: "English",
  english: "English",
  jpn: "Japanese",
  ja: "Japanese",
  kor: "Korean",
  ko: "Korean",
  spa: "Spanish",
  es: "Spanish",
  fra: "French",
  fre: "French",
  fr: "French",
  deu: "German",
  ger: "German",
  de: "German",
  rus: "Russian",
  ru: "Russian",
  zho: "Chinese",
  chi: "Chinese",
  zh: "Chinese",
  ara: "Arabic",
  ar: "Arabic",
  und: "Audio",
};

function readEbmlId(buffer: Uint8Array, offset: number): { id: number; length: number } | null {
  if (offset >= buffer.length) return null;
  const b = buffer[offset];
  let length = 1;
  if (b & 0x80) length = 1;
  else if (b & 0x40) length = 2;
  else if (b & 0x20) length = 3;
  else if (b & 0x10) length = 4;
  else return null;

  if (offset + length > buffer.length) return null;
  let id = 0;
  for (let i = 0; i < length; i++) {
    id = (id * 256) + buffer[offset + i];
  }
  return { id, length };
}

function readEbmlSize(buffer: Uint8Array, offset: number): { size: number; length: number } | null {
  if (offset >= buffer.length) return null;
  const b = buffer[offset];
  let length = 1;
  let mask = 0x7f;
  if (b & 0x80) { length = 1; mask = 0x7f; }
  else if (b & 0x40) { length = 2; mask = 0x3f; }
  else if (b & 0x20) { length = 3; mask = 0x1f; }
  else if (b & 0x10) { length = 4; mask = 0x0f; }
  else if (b & 0x08) { length = 5; mask = 0x07; }
  else if (b & 0x04) { length = 6; mask = 0x03; }
  else if (b & 0x02) { length = 7; mask = 0x01; }
  else if (b & 0x01) { length = 8; mask = 0x00; }
  else return null;

  if (offset + length > buffer.length) return null;
  let val = b & mask;
  for (let i = 1; i < length; i++) {
    val = (val * 256) + buffer[offset + i];
  }
  return { size: val, length };
}

function readString(buffer: Uint8Array, start: number, length: number): string {
  try {
    const slice = buffer.slice(start, start + length);
    return new TextDecoder("utf-8").decode(slice).trim();
  } catch {
    return "";
  }
}

function readUint(buffer: Uint8Array, start: number, length: number): number {
  let val = 0;
  for (let i = 0; i < length; i++) {
    val = (val * 256) + buffer[start + i];
  }
  return val;
}

/**
 * Fast pure-JavaScript Matroska (MKV / WebM) Track & Metadata Parser.
 * Properly skips SeekID and parses duration, video dimensions, and all Audio TrackEntries.
 */
export async function parseMkvMetadata(file: File): Promise<MediaMetadataInfo> {
  try {
    const sliceSize = Math.min(file.size, 25 * 1024 * 1024);
    const sliceBuffer = new Uint8Array(await file.slice(0, sliceSize).arrayBuffer());
    const len = sliceBuffer.length;

    // 1. Detect duration from Info element (tag 0x4489)
    let duration = 0;
    for (let i = 0; i < Math.min(len - 4, 20000); i++) {
      if (sliceBuffer[i] === 0x44 && sliceBuffer[i + 1] === 0x89) {
        const sizeByte = sliceBuffer[i + 2];
        if (sizeByte === 0x84 && i + 7 <= len) {
          const view = new DataView(sliceBuffer.buffer, sliceBuffer.byteOffset + i + 3, 4);
          duration = view.getFloat32(0, false) / 1000;
        } else if (sizeByte === 0x88 && i + 11 <= len) {
          const view = new DataView(sliceBuffer.buffer, sliceBuffer.byteOffset + i + 3, 8);
          duration = view.getFloat64(0, false) / 1000;
        }
        break;
      }
    }

    let tracksOffset = -1;
    let tracksSize = -1;

    // Search for Tracks container ID (0x1654AE6B)
    for (let i = 0; i < len - 4; i++) {
      if (
        sliceBuffer[i] === 0x16 &&
        sliceBuffer[i + 1] === 0x54 &&
        sliceBuffer[i + 2] === 0xae &&
        sliceBuffer[i + 3] === 0x6b
      ) {
        const sizeInfo = readEbmlSize(sliceBuffer, i + 4);
        if (!sizeInfo) continue;
        const childOffset = i + 4 + sizeInfo.length;
        if (childOffset >= len) continue;

        let isTracks = false;
        // Check if direct child is TrackEntry (0xAE)
        if (sliceBuffer[childOffset] === 0xae) {
          isTracks = true;
        } else if (sliceBuffer[childOffset] === 0xbf) {
          // Check if child is CRC-32 (0xBF) followed by TrackEntry (0xAE)
          const crcSize = readEbmlSize(sliceBuffer, childOffset + 1);
          const afterCrc = childOffset + 1 + (crcSize ? crcSize.length + crcSize.size : 5);
          if (afterCrc < len && sliceBuffer[afterCrc] === 0xae) {
            isTracks = true;
          }
        }

        if (isTracks) {
          tracksOffset = childOffset;
          tracksSize = sizeInfo.size;
          break;
        }
      }
    }

    let width = 0;
    let height = 0;
    const audioTracks: AudioTrackInfo[] = [];

    if (tracksOffset !== -1) {
      const tracksEnd = Math.min(len, tracksOffset + tracksSize);
      let offset = tracksOffset;
      let audioIndexCounter = 0;

      // Parse each TrackEntry (0xAE)
      while (offset < tracksEnd) {
        const idInfo = readEbmlId(sliceBuffer, offset);
        if (!idInfo) break;
        offset += idInfo.length;

        const sizeInfo = readEbmlSize(sliceBuffer, offset);
        if (!sizeInfo) break;
        offset += sizeInfo.length;

        const elementEnd = offset + sizeInfo.size;

        // Skip CRC-32 element (0xBF)
        if (idInfo.id === 0xbf) {
          offset = elementEnd;
          continue;
        }

        if (idInfo.id === 0xae) {
          let trackType = 0; // 1 = video, 2 = audio
          let trackNumber = 0;
          let isDefault = false;
          let language = "";
          let title = "";
          let codec = "AAC";

          let subOffset = offset;
          while (subOffset < elementEnd && subOffset < len) {
            const subIdInfo = readEbmlId(sliceBuffer, subOffset);
            if (!subIdInfo) break;
            subOffset += subIdInfo.length;

            const subSizeInfo = readEbmlSize(sliceBuffer, subOffset);
            if (!subSizeInfo) break;
            subOffset += subSizeInfo.length;

            const subDataEnd = subOffset + subSizeInfo.size;
            if (subDataEnd > len) break;

            switch (subIdInfo.id) {
              case 0x83: // TrackType
                trackType = readUint(sliceBuffer, subOffset, subSizeInfo.size);
                break;
              case 0xd7: // TrackNumber
                trackNumber = readUint(sliceBuffer, subOffset, subSizeInfo.size);
                break;
              case 0x88: // FlagDefault
                isDefault = readUint(sliceBuffer, subOffset, subSizeInfo.size) === 1;
                break;
              case 0x86: // CodecID
                codec = readString(sliceBuffer, subOffset, subSizeInfo.size).replace(/^A_/, "");
                break;
              case 0x536e: // Name / Title
                title = readString(sliceBuffer, subOffset, subSizeInfo.size);
                break;
              case 0x22b59c: // Language
                language = readString(sliceBuffer, subOffset, subSizeInfo.size).toLowerCase();
                break;
              case 0x22b59d: // LanguageBCP47
                if (!language) {
                  language = readString(sliceBuffer, subOffset, subSizeInfo.size).toLowerCase();
                }
                break;
              case 0xe0: // VideoSettings container
                {
                  let vOff = subOffset;
                  while (vOff < subDataEnd) {
                    const vId = readEbmlId(sliceBuffer, vOff);
                    if (!vId) break;
                    vOff += vId.length;
                    const vSize = readEbmlSize(sliceBuffer, vOff);
                    if (!vSize) break;
                    vOff += vSize.length;
                    if (vId.id === 0xb0) width = readUint(sliceBuffer, vOff, vSize.size);
                    if (vId.id === 0xba) height = readUint(sliceBuffer, vOff, vSize.size);
                    vOff += vSize.size;
                  }
                }
                break;
            }

            subOffset = subDataEnd;
          }

          // Found audio track!
          if (trackType === 2) {
            const lowerTitle = title.toLowerCase();
            if (!language || language === "und") {
              if (lowerTitle.includes("tamil") || lowerTitle.includes("[tam]")) language = "tam";
              else if (lowerTitle.includes("hindi") || lowerTitle.includes("[hin]")) language = "hin";
              else if (lowerTitle.includes("telugu") || lowerTitle.includes("[tel]")) language = "tel";
              else if (lowerTitle.includes("malayalam") || lowerTitle.includes("[mal]")) language = "mal";
              else if (lowerTitle.includes("kannada") || lowerTitle.includes("[kan]")) language = "kan";
              else if (lowerTitle.includes("english") || lowerTitle.includes("[eng]")) language = "eng";
            }

            const langName = LANGUAGE_MAP[language] || (language && language !== "und" ? language.toUpperCase() : `Audio Track ${audioIndexCounter + 1}`);

            let displayLabel = langName;
            if (title) {
              displayLabel = `${langName}: ${title}`;
            } else {
              displayLabel = `${langName} (Track ${audioIndexCounter + 1})`;
            }

            if (isDefault && audioIndexCounter === 0) {
              displayLabel += " [Default]";
            }

            audioTracks.push({
              index: audioIndexCounter++,
              trackNumber: trackNumber || audioIndexCounter,
              languageCode: language || "und",
              languageName: langName,
              title: title || `${langName} Audio`,
              codec: codec || "AAC",
              isDefault,
              displayLabel,
            });
          }
        }

        offset = elementEnd;
      }
    }

    return {
      duration: duration || 0,
      width: width || 0,
      height: height || 0,
      tracks: audioTracks,
    };
  } catch (err) {
    console.warn("MKV metadata parse error:", err);
    return { duration: 0, width: 0, height: 0, tracks: [] };
  }
}

export async function parseMkvAudioTracks(file: File): Promise<AudioTrackInfo[]> {
  const meta = await parseMkvMetadata(file);
  return meta.tracks;
}

function parseIso639Language(code: number): string {
  const c1 = String.fromCharCode(((code >> 10) & 0x1f) + 0x60);
  const c2 = String.fromCharCode(((code >> 5) & 0x1f) + 0x60);
  const c3 = String.fromCharCode((code & 0x1f) + 0x60);
  const lang = `${c1}${c2}${c3}`.toLowerCase();
  return lang === "und" ? "" : lang;
}

/**
 * Fast pure-JavaScript MP4/MOV Track Parser.
 */
export async function parseMp4AudioTracks(file: File): Promise<AudioTrackInfo[]> {
  try {
    const sliceSize = Math.min(file.size, 25 * 1024 * 1024);
    const buf = new Uint8Array(await file.slice(0, sliceSize).arrayBuffer());
    const len = buf.length;

    const audioTracks: AudioTrackInfo[] = [];
    let audioCounter = 0;

    for (let i = 0; i < len - 8; i++) {
      if (
        buf[i + 4] === 0x74 &&
        buf[i + 5] === 0x72 &&
        buf[i + 6] === 0x61 &&
        buf[i + 7] === 0x6b // 'trak'
      ) {
        const boxSize = (buf[i] << 24) | (buf[i + 1] << 16) | (buf[i + 2] << 8) | buf[i + 3];
        const trakEnd = Math.min(len, i + (boxSize > 0 ? boxSize : 100000));

        let isAudio = false;
        let langCode = "";
        let trackName = "";
        const trackNumber = audioCounter + 1;

        for (let j = i + 8; j < trakEnd - 8; j++) {
          if (
            buf[j + 4] === 0x68 &&
            buf[j + 5] === 0x64 &&
            buf[j + 6] === 0x6c &&
            buf[j + 7] === 0x72 // 'hdlr'
          ) {
            if (
              buf[j + 16] === 0x73 &&
              buf[j + 17] === 0x6f &&
              buf[j + 18] === 0x75 &&
              buf[j + 19] === 0x6e // 'soun'
            ) {
              isAudio = true;
            }
          }

          if (
            buf[j + 4] === 0x6d &&
            buf[j + 5] === 0x64 &&
            buf[j + 6] === 0x68 &&
            buf[j + 7] === 0x64 // 'mdhd'
          ) {
            const version = buf[j + 8];
            const langOffset = version === 1 ? j + 8 + 28 : j + 8 + 16;
            if (langOffset + 2 <= len) {
              const packed = (buf[langOffset] << 8) | buf[langOffset + 1];
              langCode = parseIso639Language(packed);
            }
          }

          if (
            buf[j + 4] === 0x6e &&
            buf[j + 5] === 0x61 &&
            buf[j + 6] === 0x6d &&
            buf[j + 7] === 0x65 // 'name'
          ) {
            const nameLen = Math.min(64, trakEnd - (j + 8));
            trackName = new TextDecoder("utf-8").decode(buf.subarray(j + 8, j + 8 + nameLen)).replace(/\0/g, "").trim();
          }
        }

        if (isAudio) {
          const lowerName = trackName.toLowerCase();
          if (!langCode || langCode === "und") {
            if (lowerName.includes("tamil") || lowerName.includes("[tam]")) langCode = "tam";
            else if (lowerName.includes("hindi") || lowerName.includes("[hin]")) langCode = "hin";
            else if (lowerName.includes("telugu") || lowerName.includes("[tel]")) langCode = "tel";
            else if (lowerName.includes("english") || lowerName.includes("[eng]")) langCode = "eng";
          }

          const langName = LANGUAGE_MAP[langCode] || (langCode ? langCode.toUpperCase() : `Audio Track ${audioCounter + 1}`);
          const displayLabel = trackName
            ? `${langName}: ${trackName}`
            : `${langName} (Track ${audioCounter + 1})`;

          audioTracks.push({
            index: audioCounter++,
            trackNumber,
            languageCode: langCode || "und",
            languageName: langName,
            title: trackName || `${langName} Audio`,
            codec: "AAC",
            isDefault: audioCounter === 1,
            displayLabel: audioCounter === 1 ? `${displayLabel} [Default]` : displayLabel,
          });
        }
      }
    }

    return audioTracks;
  } catch {
    return [];
  }
}

/**
 * Universal Multi-Track Audio Detector.
 * Automatically tries MKV/WebM and MP4/MOV container parsers.
 */
export async function detectVideoAudioTracks(file: File): Promise<AudioTrackInfo[]> {
  try {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";

    if (ext === "mkv" || ext === "webm") {
      const mkvTracks = await parseMkvAudioTracks(file);
      if (mkvTracks.length > 0) return mkvTracks;
    }

    if (ext === "mp4" || ext === "m4v" || ext === "mov") {
      const mp4Tracks = await parseMp4AudioTracks(file);
      if (mp4Tracks.length > 0) return mp4Tracks;
    }

    // Fallback: try both parsers regardless of extension
    const mkvTracks = await parseMkvAudioTracks(file);
    if (mkvTracks.length > 0) return mkvTracks;

    const mp4Tracks = await parseMp4AudioTracks(file);
    if (mp4Tracks.length > 0) return mp4Tracks;

    return [];
  } catch {
    return [];
  }
}

export async function parseMediaMetadata(file: File): Promise<MediaMetadataInfo> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (ext === "mkv" || ext === "webm") {
    return parseMkvMetadata(file);
  }
  const tracks = await detectVideoAudioTracks(file);
  return { duration: 0, width: 0, height: 0, tracks };
}
