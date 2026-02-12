// Video State Management Hook

import { useState, useCallback } from 'react';
import { VideoState, ChunkInfo } from '../types/video';
import { loadCameras, getTimeRange } from '../utils/api';

const initialState: VideoState = {
    cameras: [],
    camera: null,

    chunkDuration: 5,
    start: null,
    startDisplay: null,
    end: null,
    endDisplay: null,
    minTime: null, // Available data range start
    maxTime: null, // Available data range end
    currentTime: null,
    currentDisplayTime: null,
    currentIndex: 0,
    isLoading: false,
    isPlaying: false,
    fps: null,
    currentSegmentKey: null,
    currentChunkInfo: null,
    currentChunkBaseline: 0,
    currentChunkActualDuration: null,
};

export function useVideoState() {
    const [state, setState] = useState<VideoState>(initialState);

    // Camera management
    const fetchCameras = useCallback(async (preferredCameraId?: string | null) => {
        const cameras = await loadCameras();
        const preferredExists = !!preferredCameraId && cameras.some((cam) => cam.id === preferredCameraId);
        const initialCamera = preferredExists ? preferredCameraId! : cameras.length > 0 ? cameras[0].id : null;

        let minTime: Date | null = null;
        let maxTime: Date | null = null;

        if (initialCamera) {
            const range = await getTimeRange(initialCamera);
            if (range) {
                minTime = new Date(range.start);
                maxTime = new Date(range.end);
            }
        }

        setState(prev => ({
            ...prev,
            cameras,
            camera: initialCamera,
            minTime,
            maxTime,
        }));
        return cameras;
    }, []);

    const setCamera = useCallback(async (cameraId: string) => {
        const range = await getTimeRange(cameraId);
        setState(prev => ({
            ...prev,
            camera: cameraId,
            minTime: range ? new Date(range.start) : null,
            maxTime: range ? new Date(range.end) : null,
        }));
    }, []);

    // Timeline management
    const setTimeRange = useCallback((start: Date | null, end: Date | null) => {
        setState(prev => ({ ...prev, start, end }));
    }, []);

    const setCurrentTime = useCallback((time: Date) => {
        setState(prev => ({
            ...prev,
            currentTime: time,
            currentDisplayTime: time.toISOString(),
        }));
    }, []);

    const setCurrentIndex = useCallback((index: number) => {
        setState(prev => ({ ...prev, currentIndex: index }));
    }, []);

    // Playback control
    const setIsPlaying = useCallback((isPlaying: boolean) => {
        setState(prev => ({ ...prev, isPlaying }));
    }, []);

    const setIsLoading = useCallback((isLoading: boolean) => {
        setState(prev => ({ ...prev, isLoading }));
    }, []);

    // Chunk management
    const setChunkInfo = useCallback((chunkInfo: ChunkInfo | null) => {
        setState(prev => ({
            ...prev,
            currentChunkInfo: chunkInfo,
            currentSegmentKey: chunkInfo?.startIso || null,
        }));
    }, []);

    const setChunkBaseline = useCallback((baseline: number) => {
        setState(prev => ({ ...prev, currentChunkBaseline: baseline }));
    }, []);

    const setChunkActualDuration = useCallback((duration: number | null) => {
        setState(prev => ({ ...prev, currentChunkActualDuration: duration }));
    }, []);

    // Reset state
    const reset = useCallback(() => {
        setState(initialState);
    }, []);

    return {
        state,
        // Camera
        fetchCameras,
        setCamera,
        // Timeline
        setTimeRange,
        setCurrentTime,
        setCurrentIndex,
        // Playback
        setIsPlaying,
        setIsLoading,
        // Chunk
        setChunkInfo,
        setChunkBaseline,
        setChunkActualDuration,
        // Reset
        reset,
    };
}

export type VideoStateHook = ReturnType<typeof useVideoState>;
