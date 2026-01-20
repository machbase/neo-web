// Blackbox Panel Types

export interface Camera {
    id: string;
    label?: string;
}

export interface Sensor {
    id: string;
    label?: string;
}

export interface ChunkInfo {
    camera: string;
    start: Date;
    startIso: string;
    duration: number;
    end: Date;
    lengthMicroseconds: number | null;
    sign: number | string | null;
    cacheToken: string;
}

export interface TimelineEntry {
    time: string;
}

export interface EventBucket {
    start: Date;
    end: Date;
    value: number;
    intensity: number;
}

export interface SensorSample {
    time: Date;
    values: Record<string, number>;
}

export interface BlackboxState {
    // Camera
    cameras: Camera[];
    camera: string | null;

    // Timeline
    timeline: TimelineEntry[];
    timelineFull: TimelineEntry[];
    chunkDuration: number;
    start: Date | null;
    startDisplay: string | null;
    end: Date | null;
    endDisplay: string | null;
    minTime: Date | null;
    maxTime: Date | null;
    currentTime: Date | null;
    currentDisplayTime: string | null;
    currentIndex: number;

    // Sensors
    sensors: Sensor[];
    selectedSensors: Set<string>;
    sensorLabelMap: Record<string, string>;
    sensorSamples: SensorSample[];
    sensorWindowStart: Date | null;
    sensorWindowEnd: Date | null;
    sensorCursorTime: Date | null;

    // Playback
    isLoading: boolean;
    isPlaying: boolean;
    fps: number | null;

    // Chunk management
    currentSegmentKey: string | null;
    currentChunkInfo: ChunkInfo | null;
    currentChunkBaseline: number;
    currentChunkActualDuration: number | null;

    // Events
    eventBuckets: EventBucket[];
    rollupMinutes: number;
}

export interface BoardTimeMinMax {
    min: number | string;
    max: number | string;
    refresh?: boolean;
}

export interface BlackboxPanelProps {
    pPanelInfo: any;
    pBoardInfo: any;
    pBoardTimeMinMax?: BoardTimeMinMax;
    pParentWidth: number;
    pIsHeader: boolean;
}
