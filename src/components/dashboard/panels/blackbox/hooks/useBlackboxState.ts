// Blackbox State Management Hook

import { useState, useCallback } from 'react';
import { BlackboxState, ChunkInfo, TimelineEntry, EventBucket, SensorSample } from '../types/blackbox';
import { loadCameras, loadSensors, getTimeRange } from '../utils/api';

const initialState: BlackboxState = {
    cameras: [],
    camera: null,
    timeline: [],
    timelineFull: [],
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
    sensors: [],
    selectedSensors: new Set(),
    sensorLabelMap: {},
    sensorSamples: [],
    sensorWindowStart: null,
    sensorWindowEnd: null,
    sensorCursorTime: null,
    isLoading: false,
    isPlaying: false,
    fps: null,
    currentSegmentKey: null,
    currentChunkInfo: null,
    currentChunkBaseline: 0,
    currentChunkActualDuration: null,
    eventBuckets: [],
    rollupMinutes: 1,
};

export function useBlackboxState() {
    const [state, setState] = useState<BlackboxState>(initialState);

    // Camera management
    const fetchCameras = useCallback(async () => {
        const cameras = await loadCameras();
        const initialCamera = cameras.length > 0 ? cameras[0].id : null;

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

    // Sensor management
    const fetchSensors = useCallback(async (camera: string) => {
        const sensors = await loadSensors(camera);
        const labelMap: Record<string, string> = {};
        sensors.forEach(s => {
            labelMap[s.id] = s.label || s.id;
        });
        setState(prev => ({
            ...prev,
            sensors,
            sensorLabelMap: labelMap,
            selectedSensors: new Set(sensors.slice(0, 2).map(s => s.id)),
        }));
        return sensors;
    }, []);

    const toggleSensor = useCallback((sensorId: string) => {
        setState(prev => {
            const newSelected = new Set(prev.selectedSensors);
            if (newSelected.has(sensorId)) {
                newSelected.delete(sensorId);
            } else {
                newSelected.add(sensorId);
            }
            return { ...prev, selectedSensors: newSelected };
        });
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

    // Sensor data
    const setSensorSamples = useCallback((samples: SensorSample[]) => {
        setState(prev => ({ ...prev, sensorSamples: samples }));
    }, []);

    const setSensorCursorTime = useCallback((time: Date | null) => {
        setState(prev => ({ ...prev, sensorCursorTime: time }));
    }, []);

    const setSensorWindow = useCallback((start: Date | null, end: Date | null) => {
        setState(prev => ({
            ...prev,
            sensorWindowStart: start,
            sensorWindowEnd: end,
        }));
    }, []);

    // Event buckets
    const setEventBuckets = useCallback((buckets: EventBucket[]) => {
        setState(prev => ({ ...prev, eventBuckets: buckets }));
    }, []);

    // Timeline entries
    const setTimeline = useCallback((timeline: TimelineEntry[]) => {
        setState(prev => ({ ...prev, timeline }));
    }, []);

    const setTimelineFull = useCallback((timelineFull: TimelineEntry[]) => {
        setState(prev => ({ ...prev, timelineFull }));
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
        // Sensors
        fetchSensors,
        toggleSensor,
        // Timeline
        setTimeRange,
        setCurrentTime,
        setCurrentIndex,
        setTimeline,
        setTimelineFull,
        // Playback
        setIsPlaying,
        setIsLoading,
        // Chunk
        setChunkInfo,
        setChunkBaseline,
        setChunkActualDuration,
        // Sensor data
        setSensorSamples,
        setSensorCursorTime,
        setSensorWindow,
        // Events
        setEventBuckets,
        // Reset
        reset,
    };
}

export type BlackboxStateHook = ReturnType<typeof useBlackboxState>;
