// Video Panel Types

export interface Camera {
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

export interface VideoState {
    // Camera
    cameras: Camera[];
    camera: string | null;

    // Timeline
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

    // Playback
    isLoading: boolean;
    isPlaying: boolean;
    fps: number | null;

    // Chunk management
    currentSegmentKey: string | null;
    currentChunkInfo: ChunkInfo | null;
    currentChunkBaseline: number;
    currentChunkActualDuration: number | null;
}

export interface BoardTimeMinMax {
    min: number | string;
    max: number | string;
    refresh?: boolean;
}

export interface VideoPanelProps {
    pChartVariableId: string;
    pPanelInfo: any;
    pBoardInfo: any;
    pBoardTimeMinMax?: BoardTimeMinMax;
    pParentWidth: number;
    pIsHeader: boolean;
}

export interface VideoPanelHandle {
    toggleFullscreen: () => void;
}
