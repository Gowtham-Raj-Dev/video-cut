export type AspectRatio = '9:16' | '1:1' | '4:5' | '16:9' | 'original';

export type FramingMode = 'blur' | 'letterbox' | 'crop_fill' | 'original';

export interface VideoSegment {
  id: string;
  index: number;
  title: string;
  startTime: number;
  endTime: number;
  duration: number;
  selected: boolean;
  status: 'idle' | 'rendering' | 'ready' | 'error';
  blob?: Blob;
  blobUrl?: string;
  thumbnailUrl?: string;
  fileSize?: number;
  error?: string;
}

export interface VideoMetadata {
  name: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  aspectRatio: number;
  fps?: number;
}

export interface ProcessingOptions {
  aspectRatio: AspectRatio;
  framingMode: FramingMode;
  segmentDuration: number;
  blurIntensity: number; // e.g. 15 to 40 px
  letterboxColor: string; // '#000000'
  cropPanOffset: number; // -50 to 50 (percentage shift for horizontal centering)
  addPartWatermark: boolean; // overlay "PART 1" text banner
  partBannerText: string; // custom template: "PART {n}"
  bannerPosition: 'top' | 'bottom';
  resolution: '1080p' | '720p' | 'source';
}

export interface BatchProgress {
  active: boolean;
  currentSegmentIndex: number;
  totalSegments: number;
  segmentPercent: number;
  totalPercent: number;
  statusText: string;
}

