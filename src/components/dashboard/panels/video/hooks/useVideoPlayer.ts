// Video Player Hook - MSE video playback with chunk management
// Ported from viewer-v3.html logic

import { useRef, useCallback, useEffect, useState } from 'react';
import { ChunkInfo } from '../types/video';
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

export function useVideoPlayer(videoRef: React.RefObject<HTMLVideoElement>, camera: string | null, endTime: Date | null, isLive: boolean, onTimeUpdate?: (time: Date) => void) {
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
    const fetchChunkInfo = useCallback(
        async (cameraId: string, targetTime: Date): Promise<ChunkInfo | null> => {
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
        },
        [parseChunkInfoResponse]
    );

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
            } catch {}
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
    const loadChunk = useCallback(
        async (targetTime: Date): Promise<boolean> => {
            if (!camera || !videoRef.current) return false;

            // Cancel any previous request by incrementing token
            const token = ++mediaSourceTokenRef.current;

            // Set loading state and sync time immediately to avoid UI jumps during range changes
            setState((prev) => ({ ...prev, isLoading: true, currentTime: targetTime }));

            try {
                // Reset media pipeline completely
                resetMediaPipeline();

                // Wait for video to reset
                await new Promise((resolve) => setTimeout(resolve, 10));

                // Check if this request was superseded
                if (token !== mediaSourceTokenRef.current) {
                    return false;
                }

                // Get chunk info
                // console.log('[VIDEO] Fetching chunk info for:', formatIsoWithMs(targetTime));
                const chunkInfo = await fetchChunkInfo(camera, targetTime);
                if (!chunkInfo) {
                    // console.warn('[VIDEO] No chunk found for:', formatIsoWithMs(targetTime));
                    if (token === mediaSourceTokenRef.current) {
                        setState((prev) => ({ ...prev, isLoading: false, currentChunkInfo: null }));
                    }
                    return false;
                }

                if (token !== mediaSourceTokenRef.current) {
                    return false;
                }

                // console.log('[VIDEO] Got chunk:', chunkInfo.startIso);

                // Get init segment and chunk data in parallel
                const [initSegment, chunkData] = await Promise.all([fetchInitSegment(camera), fetchChunkBuffer(camera, chunkInfo.startIso)]);

                if (!initSegment || !chunkData) {
                    // console.error('[VIDEO] Failed to load init/chunk data');
                    if (token === mediaSourceTokenRef.current) {
                        setState((prev) => ({ ...prev, isLoading: false }));
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
                    mediaSource.addEventListener(
                        'sourceopen',
                        () => {
                            clearTimeout(timeout);
                            resolve();
                        },
                        { once: true }
                    );
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
                    // console.log('[VIDEO] SourceBuffer mode set to sequence');
                } catch {
                    sourceBuffer.timestampOffset = 0;
                    // console.log('[VIDEO] Sequence mode not supported, using timestampOffset');
                }

                // Append init segment
                // console.log('[VIDEO] Appending init segment, size:', initSegment.byteLength);
                await appendBuffer(sourceBuffer, initSegment.slice(0));

                // Append chunk data
                // console.log('[VIDEO] Appending chunk data, size:', chunkData.byteLength);
                await appendBuffer(sourceBuffer, chunkData.slice(0));

                // Get buffer range
                const startBuffered = sourceBuffer.buffered.length > 0 ? sourceBuffer.buffered.start(0) : 0;
                const endBuffered = sourceBuffer.buffered.length > 0 ? sourceBuffer.buffered.end(0) : 0;
                const actualDuration = endBuffered - startBuffered;

                // console.log('[VIDEO] Buffer: start=', startBuffered, 'end=', endBuffered, 'duration=', actualDuration);

                currentChunkBaselineRef.current = startBuffered;
                currentChunkActualDurationRef.current = actualDuration;

                // Calculate seek position within chunk
                let seekTarget = startBuffered;
                const offsetSeconds = Math.max(0, (targetTime.getTime() - chunkInfo.start.getTime()) / 1000);
                seekTarget = startBuffered + offsetSeconds;

                // Safety margin - don't seek past buffer end
                const safeEnd = Math.max(startBuffered, endBuffered - 0.05);
                seekTarget = Math.min(safeEnd, Math.max(startBuffered, seekTarget));

                // console.log('[VIDEO] Seeking to:', seekTarget.toFixed(3), 'offset:', offsetSeconds, 'targetTime:', formatIsoWithMs(targetTime));

                if (Number.isFinite(seekTarget) && videoRef.current) {
                    videoRef.current.currentTime = seekTarget;
                }

                // Always end stream for single chunk loading
                try {
                    mediaSource.endOfStream();
                } catch {}

                // Track buffered chunk
                bufferedChunksRef.current = [
                    {
                        startIso: chunkInfo.startIso,
                        chunkInfo,
                        bufferStart: startBuffered,
                        bufferEnd: endBuffered,
                    },
                ];

                if (token === mediaSourceTokenRef.current) {
                    setState((prev) => ({
                        ...prev,
                        currentChunkInfo: chunkInfo,
                        currentTime: targetTime,
                        isLoading: false,
                    }));
                }

                onTimeUpdate?.(targetTime);
                // console.log('[VIDEO] Chunk loaded successfully:', chunkInfo.startIso);

                return true;
            } catch (err) {
                // console.error('[VIDEO] Failed to load chunk:', err);
                if (token === mediaSourceTokenRef.current) {
                    setState((prev) => ({ ...prev, isLoading: false }));
                }
                return false;
            }
        },
        [camera, videoRef, fetchChunkInfo, fetchInitSegment, fetchChunkBuffer, appendBuffer, resetMediaPipeline, onTimeUpdate]
    );

    // Play
    const play = useCallback(async () => {
        if (!videoRef.current) return;
        try {
            await videoRef.current.play();
            setState((prev) => ({ ...prev, isPlaying: true }));
        } catch (err) {
            // console.warn('[VIDEO] Play failed:', err);
        }
    }, [videoRef]);

    // Pause
    const pause = useCallback(() => {
        if (!videoRef.current) return;
        videoRef.current.pause();
        setState((prev) => (prev.isPlaying ? { ...prev, isPlaying: false } : prev));
    }, [videoRef]);

    // Seek to time (from viewer-v3.html setCurrentTimeInternal)
    // triggerPlayback: false = UI only update (no video load)
    // triggerPlayback: true = load video at target time
    const seekToTime = useCallback(
        async (targetTime: Date, options: { triggerPlayback?: boolean } = {}) => {
            const { triggerPlayback = true } = options;

            // Always update state time
            setState((prev) => ({ ...prev, currentTime: targetTime }));
            onTimeUpdate?.(targetTime);

            // If not triggering playback, just return (UI only update)
            if (!triggerPlayback) {
                // console.log('[VIDEO] UI only update (no video load):', formatIsoWithMs(targetTime));
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
                        // console.log('[VIDEO] Seeking within chunk to:', clampedTarget.toFixed(3));
                    }
                    return;
                }

                // Target outside current chunk - invalidate
                setState((prev) => ({ ...prev, currentChunkInfo: null }));
            }

            // Load new chunk
            await loadChunk(targetTime);
        },
        [camera, state.currentChunkInfo, videoRef, loadChunk, onTimeUpdate]
    );

    const prefetchIssuedRef = useRef<boolean>(false);
    const isPlayingRef = useRef<boolean>(false);

    // Keep isPlayingRef in sync with state.isPlaying
    useEffect(() => {
        isPlayingRef.current = state.isPlaying;
    }, [state.isPlaying]);

    // Append next chunk
    const appendNextChunk = useCallback(
        async (nextChunkInfo: ChunkInfo) => {
            if (!camera || !videoRef.current || !sourceBufferRef.current || !mediaSourceRef.current) return false;

            // console.log('[VIDEO] Seamlessly appending next chunk:', nextChunkInfo.startIso);
            setState((prev) => ({ ...prev, isLoading: true }));

            try {
                const chunkData = await fetchChunkBuffer(camera, nextChunkInfo.startIso);
                if (!chunkData) {
                    // console.error('[VIDEO] Failed to fetch next chunk data');
                    setState((prev) => ({ ...prev, isLoading: false }));
                    return false;
                }

                // Append to existing SourceBuffer
                await appendBuffer(sourceBufferRef.current, chunkData);

                // Update buffered chunks
                const buffered = sourceBufferRef.current.buffered;
                const newBufferEnd = buffered.length > 0 ? buffered.end(buffered.length - 1) : 0;

                // Get previous chunk's buffer end to calculate start of this one
                const prevChunk = bufferedChunksRef.current[bufferedChunksRef.current.length - 1];
                const thisBufferStart = prevChunk ? prevChunk.bufferEnd : 0;
                const thisBufferEnd = newBufferEnd;

                const newBufferedChunk: BufferedChunk = {
                    startIso: nextChunkInfo.startIso,
                    chunkInfo: nextChunkInfo,
                    bufferStart: thisBufferStart,
                    bufferEnd: thisBufferEnd,
                };

                bufferedChunksRef.current.push(newBufferedChunk);

                // Update current chunk info to the new one (as we are extending playback)
                // Note: effectively we are playing the timeline, so currentChunkInfo might strictly be "what is playing now",
                // but here we just added it. We'll update currentChunkInfo in timeUpdate based on playback position.

                setState((prev) => ({ ...prev, isLoading: false }));
                // console.log('[VIDEO] Appended successfully. Buffer now:', thisBufferStart, '->', thisBufferEnd);
                return true;
            } catch (err) {
                // console.error('[VIDEO] Failed to append next chunk:', err);
                setState((prev) => ({ ...prev, isLoading: false }));
                return false;
            }
        },
        [camera, videoRef, fetchChunkBuffer, appendBuffer]
    );

    // Handle video time update + prefetch/append trigger
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const PREFETCH_THRESHOLD_SECONDS = 3;

        const handleTimeUpdate = () => {
            // Skip all time updates during live mode to protect currentTime
            if (isLive) return;
            if (state.isLoading) return;

            const currentTime = video.currentTime;

            // Find which chunk we are currently playing
            const playingChunk = bufferedChunksRef.current.find((chunk) => currentTime >= chunk.bufferStart - 0.1 && currentTime < chunk.bufferEnd + 0.1);

            if (playingChunk) {
                const elapsedInChunk = Math.max(0, currentTime - playingChunk.bufferStart);
                const currentVideoTime = new Date(playingChunk.chunkInfo.start.getTime() + elapsedInChunk * 1000);

                setState((prev) => ({
                    ...prev,
                    currentTime: currentVideoTime,
                    currentChunkInfo: playingChunk.chunkInfo,
                }));
                onTimeUpdate?.(currentVideoTime);

                // Check if we reached the end time
                if (endTime && currentVideoTime >= endTime) {
                    console.log('[VIDEO] Reached end of time range (in timeUpdate) - stopping playback');
                    if (state.isPlaying) {
                        video.pause();
                        setState((prev) => ({ ...prev, isPlaying: false }));
                    }
                    return;
                }

                // Seamless prefetch logic
                if (state.isPlaying) {
                    const remainingInChunk = playingChunk.bufferEnd - currentTime;

                    // If we are near the end of the *last* buffered chunk, trigger append
                    const lastChunk = bufferedChunksRef.current[bufferedChunksRef.current.length - 1];
                    const isLastChunk = playingChunk.startIso === lastChunk.startIso;

                    if (isLastChunk && remainingInChunk <= PREFETCH_THRESHOLD_SECONDS && !prefetchIssuedRef.current) {
                        prefetchNextChunk();
                    }
                }
            }
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        return () => video.removeEventListener('timeupdate', handleTimeUpdate);
    }, [videoRef, state.isLoading, state.isPlaying, onTimeUpdate]); // Removed prefetchNextChunk from dependency to avoid cycle, used ref

    // Prefetch next chunk and append
    const prefetchNextChunk = useCallback(async () => {
        if (!camera || prefetchIssuedRef.current || bufferedChunksRef.current.length === 0) return;

        const lastChunk = bufferedChunksRef.current[bufferedChunksRef.current.length - 1];
        let serverDuration = lastChunk.chunkInfo.duration;

        // Fallback for missing/invalid duration to prevent getting stuck in same chunk
        if (!Number.isFinite(serverDuration) || serverDuration < 1) {
            serverDuration = 5;
        }

        // console.log('[VIDEO] Initiating prefetch search. Last chunk end:', lastChunk.chunkInfo.end.toISOString());
        prefetchIssuedRef.current = true;

        try {
            let searchOffsetSeconds = serverDuration + 1; // Start search 1s after the reported end
            let info: ChunkInfo | null = null;
            let searchDepth = 0;
            const MAX_SEARCH_DEPTH = 10; // Try up to 10 probes
            const PROBE_INCREMENT = 5; // Jump 5 seconds if we hit the same chunk

            while (searchDepth < MAX_SEARCH_DEPTH) {
                const chunkStartMs = lastChunk.chunkInfo.start.getTime();
                const nextSearchTime = new Date(chunkStartMs + searchOffsetSeconds * 1000);

                // Don't prefetch if next time exceeds end time
                if (endTime && nextSearchTime > endTime) {
                    // console.log('[VIDEO] Search reached end of time range');
                    break;
                }

                // console.log(`[VIDEO] Prefetch probe ${searchDepth + 1} at offset +${searchOffsetSeconds}s:`, formatIsoWithMs(nextSearchTime));
                info = await fetchChunkInfo(camera, nextSearchTime);

                if (!info) {
                    // console.warn('[VIDEO] No chunk found at this offset, probing further...');
                    searchOffsetSeconds += PROBE_INCREMENT;
                    searchDepth++;
                    continue;
                }

                // Check if we already have this chunk (avoid dupes)
                const isDuplicate = bufferedChunksRef.current.some((c) => c.startIso === info?.startIso);
                if (isDuplicate) {
                    // console.log('[VIDEO] Found duplicate chunk, skipping forward...');
                    searchOffsetSeconds += PROBE_INCREMENT;
                    searchDepth++;
                    continue;
                }

                // Found a NEW chunk!
                // console.log('[VIDEO] Found NEW chunk at:', info.startIso);
                break;
            }

            if (info && !bufferedChunksRef.current.some((c) => c.startIso === info?.startIso)) {
                // Append it
                await appendNextChunk(info);
            } else {
                // console.warn('[VIDEO] Prefetch failed to find a new chunk within search depth');
            }

            // Reset flag
            prefetchIssuedRef.current = false;
        } catch (err) {
            // console.warn('[VIDEO] Prefetch/Append failed:', err);
            prefetchIssuedRef.current = false;
        }
    }, [camera, fetchChunkInfo, endTime, appendNextChunk]);

    // Handle video ended - fallback for gaps or end of stream
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleEnded = async () => {
            const wasPlaying = isPlayingRef.current;
            // console.log('[VIDEO] Ended event (Fallback) - wasPlaying:', wasPlaying);

            // If we ended but we have more chunks buffered, it might be a gap.
            // In sequence mode, gaps might just stop playback.
            // Try to seek slightly forward if there is a gap?
            // For now, if we really ended, it means we ran out of buffer.

            // Check if we are at the end time
            const lastChunk = bufferedChunksRef.current[bufferedChunksRef.current.length - 1];
            if (lastChunk && endTime) {
                const chunkEndMs = lastChunk.chunkInfo.start.getTime() + lastChunk.chunkInfo.duration * 1000;
                if (chunkEndMs >= endTime.getTime()) {
                    // console.log('[VIDEO] Really reached end of time range');
                    setState((prev) => ({ ...prev, isPlaying: false }));
                    return;
                }
            }

            // If not at end time, maybe fetch took too long. Try prefetch again directly
            if (wasPlaying) {
                // console.log('[VIDEO] Buffering stall? Trying to fetch next chunk...');
                prefetchNextChunk();
            }
        };

        video.addEventListener('ended', handleEnded);
        return () => video.removeEventListener('ended', handleEnded);
    }, [videoRef, endTime, prefetchNextChunk]);

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
