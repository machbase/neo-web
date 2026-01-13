// Video Player Hook - MSE video playback with chunk management
// Ported from viewer-v3.html logic

import { useRef, useCallback, useEffect, useState } from 'react';
import { ChunkInfo } from '../types/blackbox';
import { getChunkInfo, getChunkData, fetchBinary } from '../utils/api';
import { parseTimestamp, formatIsoWithMs } from '../utils/timeUtils';

interface VideoPlayerState {
    isPlaying: boolean;
    isLoading: boolean;
    currentTime: Date | null;
    currentChunkInfo: ChunkInfo | null;
    fps: number | null;
}

interface BufferedChunk {
    startIso: string;
    chunkInfo: ChunkInfo;
    bufferStart: number;
    bufferEnd: number;
}

export function useVideoPlayer(
    videoRef: React.RefObject<HTMLVideoElement>,
    camera: string | null,
    onTimeUpdate?: (time: Date) => void
) {
    const [state, setState] = useState<VideoPlayerState>({
        isPlaying: false,
        isLoading: false,
        currentTime: null,
        currentChunkInfo: null,
        fps: null,
    });

    // Refs for mutable state
    const mediaSourceRef = useRef<MediaSource | null>(null);
    const sourceBufferRef = useRef<SourceBuffer | null>(null);
    const chunkCacheRef = useRef<Map<string, ArrayBuffer>>(new Map());
    const chunkInfoCacheRef = useRef<Map<string, ChunkInfo>>(new Map());
    const initSegmentRef = useRef<ArrayBuffer | null>(null);
    const bufferedChunksRef = useRef<BufferedChunk[]>([]);
    const currentChunkBaselineRef = useRef<number>(0);
    const currentChunkActualDurationRef = useRef<number>(0);
    const mediaObjectUrlRef = useRef<string | null>(null);
    const mediaSourceTokenRef = useRef<number>(0);

    // Parse chunk info response
    const parseChunkInfoResponse = useCallback((cameraId: string, payload: any): ChunkInfo | null => {
        if (!payload || !payload.time) return null;

        const start = parseTimestamp(payload.time);
        if (!start) return null;

        let durationSeconds = Number(payload.duration) || 0;
        let lengthMicroseconds = Number(payload.length) || 0;

        if (lengthMicroseconds > 1000) {
            durationSeconds = lengthMicroseconds / 1_000_000;
        } else if (durationSeconds <= 0 && lengthMicroseconds > 0) {
            durationSeconds = lengthMicroseconds;
            lengthMicroseconds = Math.round(lengthMicroseconds * 1_000_000);
        }

        const startIso = formatIsoWithMs(start);
        const end = new Date(start.getTime() + Math.max(durationSeconds, 0) * 1000);

        return {
            camera: cameraId,
            start,
            startIso,
            duration: durationSeconds,
            end,
            lengthMicroseconds,
            sign: payload.sign ?? null,
            cacheToken: startIso,
        };
    }, []);

    // Fetch chunk info
    const fetchChunkInfo = useCallback(async (cameraId: string, targetTime: Date): Promise<ChunkInfo | null> => {
        const timeIso = formatIsoWithMs(targetTime);
        const cacheKey = `${cameraId}::${timeIso}`;

        // Check cache first
        const cached = chunkInfoCacheRef.current.get(cacheKey);
        if (cached) return cached;

        try {
            const data = await getChunkInfo(cameraId, timeIso);
            const info = parseChunkInfoResponse(cameraId, data);
            if (info) {
                chunkInfoCacheRef.current.set(cacheKey, info);
                chunkInfoCacheRef.current.set(`${cameraId}::${info.startIso}`, info);
            }
            return info;
        } catch (err: any) {
            if (err.message?.includes('404')) {
                return null;
            }
            throw err;
        }
    }, [parseChunkInfoResponse]);

    // Fetch chunk data
    const fetchChunkBuffer = useCallback(async (cameraId: string, chunkIso: string): Promise<ArrayBuffer | null> => {
        const cacheKey = `${cameraId}::${chunkIso}`;

        // Check cache first
        const cached = chunkCacheRef.current.get(cacheKey);
        if (cached) return cached;

        const buffer = await getChunkData(cameraId, chunkIso);
        if (buffer) {
            chunkCacheRef.current.set(cacheKey, buffer);
        }
        return buffer;
    }, []);

    // Fetch init segment
    const fetchInitSegment = useCallback(async (cameraId: string): Promise<ArrayBuffer | null> => {
        if (initSegmentRef.current) return initSegmentRef.current;

        try {
            const buffer = await fetchBinary(`/api/v_get_chunk?tagname=${encodeURIComponent(cameraId)}&time=0`);
            initSegmentRef.current = buffer;
            return buffer;
        } catch {
            return null;
        }
    }, []);

    // Append buffer helper
    const appendBuffer = useCallback((sourceBuffer: SourceBuffer, data: ArrayBuffer): Promise<void> => {
        return new Promise((resolve, reject) => {
            const onUpdate = () => {
                sourceBuffer.removeEventListener('updateend', onUpdate);
                sourceBuffer.removeEventListener('error', onError);
                resolve();
            };
            const onError = () => {
                sourceBuffer.removeEventListener('updateend', onUpdate);
                sourceBuffer.removeEventListener('error', onError);
                reject(new Error('SourceBuffer 오류'));
            };

            sourceBuffer.addEventListener('updateend', onUpdate);
            sourceBuffer.addEventListener('error', onError);

            try {
                sourceBuffer.appendBuffer(data);
            } catch (err) {
                sourceBuffer.removeEventListener('updateend', onUpdate);
                sourceBuffer.removeEventListener('error', onError);
                reject(err);
            }
        });
    }, []);

    // Reset media pipeline (from viewer-v3.html)
    // Note: Do NOT increment token here - it's handled in loadChunk
    const resetMediaPipeline = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        if (mediaObjectUrlRef.current) {
            try {
                URL.revokeObjectURL(mediaObjectUrlRef.current);
            } catch { }
            mediaObjectUrlRef.current = null;
        }

        video.pause();
        video.removeAttribute('src');
        video.src = '';
        video.load();

        mediaSourceRef.current = null;
        sourceBufferRef.current = null;
        bufferedChunksRef.current = [];
    }, [videoRef]);

    // Load chunk at specific time (from viewer-v3.html loadCurrentFrame)
    const loadChunk = useCallback(async (targetTime: Date): Promise<boolean> => {
        if (!camera || !videoRef.current) return false;

        // Cancel any previous request by incrementing token
        const token = ++mediaSourceTokenRef.current;

        // Set loading state (but allow new requests to proceed)
        setState(prev => ({ ...prev, isLoading: true }));

        try {
            // Reset media pipeline completely
            resetMediaPipeline();

            // Wait for video to reset
            await new Promise(resolve => setTimeout(resolve, 10));

            // Check if this request was superseded
            if (token !== mediaSourceTokenRef.current) {
                return false;
            }

            // Get chunk info
            console.log('[VIDEO] Fetching chunk info for:', formatIsoWithMs(targetTime));
            const chunkInfo = await fetchChunkInfo(camera, targetTime);
            if (!chunkInfo) {
                console.warn('[VIDEO] No chunk found for:', formatIsoWithMs(targetTime));
                if (token === mediaSourceTokenRef.current) {
                    setState(prev => ({ ...prev, isLoading: false, currentChunkInfo: null }));
                }
                return false;
            }

            if (token !== mediaSourceTokenRef.current) {
                return false;
            }

            console.log('[VIDEO] Got chunk:', chunkInfo.startIso);

            // Get init segment and chunk data in parallel
            const [initSegment, chunkData] = await Promise.all([
                fetchInitSegment(camera),
                fetchChunkBuffer(camera, chunkInfo.startIso),
            ]);

            if (!initSegment || !chunkData) {
                console.error('[VIDEO] Failed to load init/chunk data');
                if (token === mediaSourceTokenRef.current) {
                    setState(prev => ({ ...prev, isLoading: false }));
                }
                return false;
            }

            if (token !== mediaSourceTokenRef.current) {
                return false;
            }

            // Create new MediaSource
            const mediaSource = new MediaSource();
            const objectUrl = URL.createObjectURL(mediaSource);
            mediaObjectUrlRef.current = objectUrl;
            mediaSourceRef.current = mediaSource;

            // Set video source
            videoRef.current.src = objectUrl;

            // Wait for sourceopen
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('MediaSource timeout')), 5000);
                mediaSource.addEventListener('sourceopen', () => {
                    clearTimeout(timeout);
                    resolve();
                }, { once: true });
            });

            if (token !== mediaSourceTokenRef.current) {
                return false;
            }

            // Create source buffer with sequence mode (critical for chunk-based playback)
            const mimeType = 'video/mp4; codecs="avc1.4d401f"';
            if (!MediaSource.isTypeSupported(mimeType)) {
                throw new Error('Unsupported video codec');
            }

            const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
            sourceBufferRef.current = sourceBuffer;

            // Set sequence mode to ignore embedded timestamps
            try {
                sourceBuffer.mode = 'sequence';
                console.log('[VIDEO] SourceBuffer mode set to sequence');
            } catch {
                sourceBuffer.timestampOffset = 0;
                console.log('[VIDEO] Sequence mode not supported, using timestampOffset');
            }

            // Append init segment
            console.log('[VIDEO] Appending init segment, size:', initSegment.byteLength);
            await appendBuffer(sourceBuffer, initSegment.slice(0));

            // Append chunk data
            console.log('[VIDEO] Appending chunk data, size:', chunkData.byteLength);
            await appendBuffer(sourceBuffer, chunkData.slice(0));

            // Get buffer range
            const startBuffered = sourceBuffer.buffered.length > 0 ? sourceBuffer.buffered.start(0) : 0;
            const endBuffered = sourceBuffer.buffered.length > 0 ? sourceBuffer.buffered.end(0) : 0;
            const actualDuration = endBuffered - startBuffered;

            console.log('[VIDEO] Buffer: start=', startBuffered, 'end=', endBuffered, 'duration=', actualDuration);

            currentChunkBaselineRef.current = startBuffered;
            currentChunkActualDurationRef.current = actualDuration;

            // Calculate seek position within chunk
            let seekTarget = startBuffered;
            const offsetSeconds = Math.max(0, (targetTime.getTime() - chunkInfo.start.getTime()) / 1000);
            seekTarget = startBuffered + offsetSeconds;

            // Safety margin - don't seek past buffer end
            const safeEnd = Math.max(startBuffered, endBuffered - 0.05);
            seekTarget = Math.min(safeEnd, Math.max(startBuffered, seekTarget));

            console.log('[VIDEO] Seeking to:', seekTarget.toFixed(3));

            if (Number.isFinite(seekTarget) && videoRef.current) {
                videoRef.current.currentTime = seekTarget;
            }

            // Always end stream for single chunk loading
            try {
                mediaSource.endOfStream();
            } catch { }

            // Track buffered chunk
            bufferedChunksRef.current = [{
                startIso: chunkInfo.startIso,
                chunkInfo,
                bufferStart: startBuffered,
                bufferEnd: endBuffered,
            }];

            if (token === mediaSourceTokenRef.current) {
                setState(prev => ({
                    ...prev,
                    currentChunkInfo: chunkInfo,
                    currentTime: targetTime,
                    isLoading: false,
                }));
            }

            onTimeUpdate?.(targetTime);
            console.log('[VIDEO] Chunk loaded successfully:', chunkInfo.startIso);

            return true;

        } catch (err) {
            console.error('[VIDEO] Failed to load chunk:', err);
            if (token === mediaSourceTokenRef.current) {
                setState(prev => ({ ...prev, isLoading: false }));
            }
            return false;
        }
    }, [camera, videoRef, fetchChunkInfo, fetchInitSegment, fetchChunkBuffer, appendBuffer, resetMediaPipeline, onTimeUpdate]);

    // Play
    const play = useCallback(async () => {
        if (!videoRef.current) return;

        try {
            await videoRef.current.play();
            setState(prev => ({ ...prev, isPlaying: true }));
        } catch (err) {
            console.warn('[VIDEO] Play failed:', err);
        }
    }, [videoRef]);

    // Pause
    const pause = useCallback(() => {
        if (!videoRef.current) return;
        videoRef.current.pause();
        setState(prev => ({ ...prev, isPlaying: false }));
    }, [videoRef]);

    // Seek to time (from viewer-v3.html setCurrentTimeInternal)
    // triggerPlayback: false = UI only update (no video load)
    // triggerPlayback: true = load video at target time
    const seekToTime = useCallback(async (targetTime: Date, options: { triggerPlayback?: boolean } = {}) => {
        const { triggerPlayback = true } = options;

        // Always update state time
        setState(prev => ({ ...prev, currentTime: targetTime }));
        onTimeUpdate?.(targetTime);

        // If not triggering playback, just return (UI only update)
        if (!triggerPlayback) {
            console.log('[VIDEO] UI only update (no video load):', formatIsoWithMs(targetTime));
            return;
        }

        if (!camera || !videoRef.current) return;

        const currentChunk = state.currentChunkInfo;

        // Check if target is within current chunk
        if (currentChunk && sourceBufferRef.current?.buffered.length && videoRef.current.readyState >= 2) {
            const targetMs = targetTime.getTime();
            const startMs = currentChunk.start.getTime();
            const endMs = currentChunk.end.getTime();

            if (targetMs >= startMs && targetMs < endMs) {
                // Same chunk - just seek within the video
                const offsetSeconds = (targetMs - startMs) / 1000;
                const seekTarget = currentChunkBaselineRef.current + offsetSeconds;

                const bufferedEnd = sourceBufferRef.current.buffered.end(0);
                const safeEnd = Math.max(currentChunkBaselineRef.current, bufferedEnd - 0.05);
                const clampedTarget = Math.min(safeEnd, Math.max(currentChunkBaselineRef.current, seekTarget));

                if (Number.isFinite(clampedTarget)) {
                    videoRef.current.currentTime = clampedTarget;
                    console.log('[VIDEO] Seeking within chunk to:', clampedTarget.toFixed(3));
                }
                return;
            }

            // Target outside current chunk - invalidate
            setState(prev => ({ ...prev, currentChunkInfo: null }));
        }

        // Load new chunk
        await loadChunk(targetTime);
    }, [camera, state.currentChunkInfo, videoRef, loadChunk, onTimeUpdate]);

    // Prefetch state refs
    const prefetchedChunkInfoRef = useRef<ChunkInfo | null>(null);
    const prefetchIssuedRef = useRef<boolean>(false);
    const isPlayingRef = useRef<boolean>(false);

    // Keep isPlayingRef in sync with state.isPlaying
    useEffect(() => {
        isPlayingRef.current = state.isPlaying;
    }, [state.isPlaying]);

    // Prefetch next chunk
    const prefetchNextChunk = useCallback(async () => {
        if (!camera || !state.currentChunkInfo || prefetchIssuedRef.current) return;

        const serverDuration = state.currentChunkInfo.duration;
        if (!Number.isFinite(serverDuration) || serverDuration <= 0) return;

        const chunkStartMs = state.currentChunkInfo.start.getTime();
        const chunkEndMs = chunkStartMs + (serverDuration * 1000);
        const nextSearchTime = new Date(chunkEndMs + 1000);

        console.log('[VIDEO] Prefetching next chunk at:', formatIsoWithMs(nextSearchTime));

        prefetchIssuedRef.current = true;

        try {
            const info = await fetchChunkInfo(camera, nextSearchTime);
            if (info) {
                console.log('[VIDEO] Prefetched chunk info:', info.startIso);
                await fetchChunkBuffer(camera, info.startIso);
                prefetchedChunkInfoRef.current = info;
            }
        } catch (err) {
            console.warn('[VIDEO] Prefetch failed:', err);
            prefetchIssuedRef.current = false;
        }
    }, [camera, state.currentChunkInfo, fetchChunkInfo, fetchChunkBuffer]);

    // Handle video time update + prefetch trigger
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const PREFETCH_THRESHOLD_SECONDS = 3;

        const handleTimeUpdate = () => {
            if (!state.currentChunkInfo || state.isLoading) return;

            const elapsed = video.currentTime - currentChunkBaselineRef.current;
            const currentVideoTime = new Date(state.currentChunkInfo.start.getTime() + elapsed * 1000);

            setState(prev => ({ ...prev, currentTime: currentVideoTime }));
            onTimeUpdate?.(currentVideoTime);

            // Trigger prefetch when approaching chunk end (only when playing)
            if (state.isPlaying && currentChunkActualDurationRef.current > 0) {
                const remaining = currentChunkActualDurationRef.current - elapsed;
                if (remaining <= PREFETCH_THRESHOLD_SECONDS && !prefetchIssuedRef.current) {
                    console.log('[VIDEO] Remaining:', remaining.toFixed(2), 's - triggering prefetch');
                    prefetchNextChunk();
                }
            }
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        return () => video.removeEventListener('timeupdate', handleTimeUpdate);
    }, [videoRef, state.currentChunkInfo, state.isLoading, state.isPlaying, onTimeUpdate, prefetchNextChunk]);

    // Handle video ended - load next chunk (seamlessly if prefetched)
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleEnded = async () => {
            // Use ref to avoid stale closure
            const wasPlaying = isPlayingRef.current;
            const currentChunk = state.currentChunkInfo;

            console.log('[VIDEO] Ended event - wasPlaying:', wasPlaying);

            if (!currentChunk || !camera) {
                console.log('[VIDEO] No current chunk, stopping');
                return;
            }

            // Save current chunk startIso BEFORE loading next (like viewer-v3.html)
            const currentChunkStartIso = currentChunk.startIso;

            // Calculate next search time based on actual video duration
            const chunkStartMs = currentChunk.start.getTime();
            const videoElapsedMs = (video.duration || video.currentTime || 0) * 1000;
            const actualEndTime = new Date(chunkStartMs + videoElapsedMs);
            const nextSearchTime = new Date(actualEndTime.getTime() + 2000);

            console.log('[VIDEO] Current chunk:', currentChunkStartIso);
            console.log('[VIDEO] Searching for next chunk at:', formatIsoWithMs(nextSearchTime));

            // Reset prefetch state
            prefetchIssuedRef.current = false;
            prefetchedChunkInfoRef.current = null;

            try {
                // Fetch next chunk info first (like viewer-v3.html)
                const nextChunkInfo = await fetchChunkInfo(camera, nextSearchTime);

                // No next chunk found
                if (!nextChunkInfo) {
                    console.log('[VIDEO] No next chunk found (404) - stopping playback');
                    setState(prev => ({ ...prev, isPlaying: false }));
                    return;
                }

                // Check if next chunk is same as current chunk
                if (nextChunkInfo.startIso === currentChunkStartIso) {
                    console.log('[VIDEO] Next chunk is same as current chunk - no more chunks');
                    setState(prev => ({ ...prev, isPlaying: false }));
                    return;
                }

                console.log('[VIDEO] Loading next chunk:', nextChunkInfo.startIso);

                // Load the next chunk
                const success = await loadChunk(new Date(nextChunkInfo.start.getTime()));
                if (success && wasPlaying) {
                    play();
                }
            } catch (err) {
                console.error('[VIDEO] Failed to load next chunk:', err);
                setState(prev => ({ ...prev, isPlaying: false }));
            }
        };

        video.addEventListener('ended', handleEnded);
        return () => video.removeEventListener('ended', handleEnded);
    }, [videoRef, state.currentChunkInfo, camera, fetchChunkInfo, loadChunk, play]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            resetMediaPipeline();
        };
    }, [resetMediaPipeline]);

    // Reset when camera changes
    useEffect(() => {
        // Clear caches
        chunkCacheRef.current.clear();
        chunkInfoCacheRef.current.clear();
        initSegmentRef.current = null;

        resetMediaPipeline();

        setState({
            isPlaying: false,
            isLoading: false,
            currentTime: null,
            currentChunkInfo: null,
            fps: null,
        });
    }, [camera, resetMediaPipeline]);

    return {
        ...state,
        play,
        pause,
        loadChunk,
        seekToTime,
    };
}
