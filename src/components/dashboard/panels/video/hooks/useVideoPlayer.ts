// Video Player Hook - MSE video playback with chunk management
// Ported from viewer-v3.html logic

import { useRef, useCallback, useEffect, useState } from 'react';
import { ChunkInfo } from '../types/video';
import { getChunkInfo, getChunkData, fetchBinary } from '../utils/api';
import { parseTimestamp, formatIsoWithMs } from '../utils/timeUtils';

interface VideoPlayerState {
    isPlaying: boolean;
    isLoading: boolean;
    isProbing: boolean;
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

interface UseVideoPlayerCallbacks {
    onTimeUpdate?: (time: Date) => void;
    onProbeProgress?: (time: Date) => void;
    onProbeStateChange?: (isProbing: boolean) => void;
}

export function useVideoPlayer(
    videoRef: React.RefObject<HTMLVideoElement>,
    camera: string | null,
    endTime: Date | null,
    isLive: boolean,
    callbacks: UseVideoPlayerCallbacks = {},
    baseUrl?: string
) {
    const PROBE_CANCELLED_ERROR = '__VIDEO_PROBE_CANCELLED__';
    const NEGATIVE_CHUNK_CACHE_TTL_MS = 5000;
    const { onTimeUpdate, onProbeProgress, onProbeStateChange } = callbacks;

    const [state, setState] = useState<VideoPlayerState>({
        isPlaying: false,
        isLoading: false,
        isProbing: false,
        currentTime: null,
        currentChunkInfo: null,
        fps: null,
    });

    // Refs for mutable state
    const mediaSourceRef = useRef<MediaSource | null>(null);
    const sourceBufferRef = useRef<SourceBuffer | null>(null);
    const chunkCacheRef = useRef<Map<string, ArrayBuffer>>(new Map());
    const chunkNegativeCacheRef = useRef<Map<string, number>>(new Map());
    const chunkInfoCacheRef = useRef<Map<string, ChunkInfo>>(new Map());
    const initSegmentRef = useRef<ArrayBuffer | null>(null);
    const bufferedChunksRef = useRef<BufferedChunk[]>([]);
    const currentChunkBaselineRef = useRef<number>(0);
    const currentChunkActualDurationRef = useRef<number>(0);
    const mediaObjectUrlRef = useRef<string | null>(null);
    const mediaSourceTokenRef = useRef<number>(0);
    const loadChunkThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingLoadChunkTimeRef = useRef<Date | null>(null);
    const LOAD_CHUNK_THROTTLE_MS = 300;

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
                const data = await getChunkInfo(cameraId, timeIso, baseUrl);
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
        [parseChunkInfoResponse, baseUrl]
    );

    // Fetch chunk data
    const fetchChunkBuffer = useCallback(
        async (cameraId: string, chunkIso: string): Promise<ArrayBuffer | null> => {
            const cacheKey = `${cameraId}::${chunkIso}`;

            // Check cache first
            const cached = chunkCacheRef.current.get(cacheKey);
            if (cached) return cached;

            // Negative cache: skip re-fetching known-missing chunk for a short TTL window
            const blockedUntil = chunkNegativeCacheRef.current.get(cacheKey);
            if (blockedUntil && blockedUntil > Date.now()) {
                return null;
            }

            const buffer = await getChunkData(cameraId, chunkIso, baseUrl);
            if (buffer) {
                chunkCacheRef.current.set(cacheKey, buffer);
                chunkNegativeCacheRef.current.delete(cacheKey);
            } else {
                chunkNegativeCacheRef.current.set(cacheKey, Date.now() + NEGATIVE_CHUNK_CACHE_TTL_MS);
            }
            return buffer;
        },
        [NEGATIVE_CHUNK_CACHE_TTL_MS, baseUrl]
    );

    // Fetch init segment
    const fetchInitSegment = useCallback(
        async (cameraId: string): Promise<ArrayBuffer | null> => {
            if (initSegmentRef.current) return initSegmentRef.current;

            try {
                const buffer = await fetchBinary(`/api/v_get_chunk?tagname=${encodeURIComponent(cameraId)}&time=0`, baseUrl);
                initSegmentRef.current = buffer;
                return buffer;
            } catch {
                return null;
            }
        },
        [baseUrl]
    );

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
                reject(new Error('SourceBuffer error'));
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
                noMoreChunksAheadRef.current = false;

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

            // User seek during probe must interrupt in-flight probe loop.
            if (state.isProbing && !state.isPlaying) {
                probeCancelTokenRef.current += 1;
                activeProbeCountRef.current = 0;
                prefetchIssuedRef.current = false;
                noMoreChunksAheadRef.current = false;
                setState((prev) => ({ ...prev, isProbing: false }));
                onProbeStateChange?.(false);
            }

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

            // Throttle cross-chunk loadChunk to prevent rapid network requests during drag
            pendingLoadChunkTimeRef.current = targetTime;
            if (!loadChunkThrottleRef.current) {
                // No cooldown active → fire immediately and start cooldown
                pendingLoadChunkTimeRef.current = null;
                loadChunk(targetTime);
                loadChunkThrottleRef.current = setTimeout(() => {
                    const pending = pendingLoadChunkTimeRef.current;
                    loadChunkThrottleRef.current = null;
                    pendingLoadChunkTimeRef.current = null;
                    if (pending) {
                        loadChunk(pending);
                    }
                }, LOAD_CHUNK_THROTTLE_MS);
            }
        },
        [camera, state.currentChunkInfo, state.isProbing, state.isPlaying, videoRef, loadChunk, onTimeUpdate, onProbeStateChange]
    );

    const prefetchIssuedRef = useRef<boolean>(false);
    const isPlayingRef = useRef<boolean>(false);
    const activeProbeCountRef = useRef<number>(0);
    const playRequestInFlightRef = useRef<boolean>(false);
    const noMoreChunksAheadRef = useRef<boolean>(false);
    const probeCancelTokenRef = useRef<number>(0);

    const isProbeCancelledError = useCallback((err: unknown) => {
        return err instanceof Error && err.message === PROBE_CANCELLED_ERROR;
    }, []);

    const cancelActiveProbeSearch = useCallback(() => {
        probeCancelTokenRef.current += 1;
        activeProbeCountRef.current = 0;
        setState((prev) => ({ ...prev, isProbing: false }));
        onProbeStateChange?.(false);
    }, [onProbeStateChange]);

    const beginProbe = useCallback(() => {
        activeProbeCountRef.current += 1;
        if (activeProbeCountRef.current === 1) {
            const shouldSwitchToPlayButton = !videoRef.current || videoRef.current.paused || videoRef.current.ended;
            setState((prev) => ({
                ...prev,
                isProbing: true,
                isPlaying: shouldSwitchToPlayButton ? false : prev.isPlaying,
            }));
            onProbeStateChange?.(true);
        }
    }, [onProbeStateChange, videoRef]);

    const endProbe = useCallback(() => {
        activeProbeCountRef.current = Math.max(0, activeProbeCountRef.current - 1);
        if (activeProbeCountRef.current === 0) {
            setState((prev) => ({ ...prev, isProbing: false }));
            onProbeStateChange?.(false);
        }
    }, [onProbeStateChange]);

    const moveToEndAndStop = useCallback(() => {
        noMoreChunksAheadRef.current = true;
        if (endTime) {
            setState((prev) => ({
                ...prev,
                currentTime: endTime,
                isPlaying: false,
                currentChunkInfo: null,
            }));
            onTimeUpdate?.(endTime);
        } else {
            setState((prev) => ({ ...prev, isPlaying: false }));
        }

        if (videoRef.current) {
            videoRef.current.pause();
        }
    }, [endTime, onTimeUpdate, videoRef]);

    const finalizeStreamAtBufferEnd = useCallback(() => {
        const mediaSource = mediaSourceRef.current;
        const sourceBuffer = sourceBufferRef.current;
        if (!mediaSource || mediaSource.readyState !== 'open') return;

        const closeStream = () => {
            try {
                if (mediaSource.readyState === 'open') {
                    mediaSource.endOfStream();
                }
            } catch {
                // Ignore endOfStream timing/race errors.
            }
        };

        if (sourceBuffer?.updating) {
            sourceBuffer.addEventListener('updateend', closeStream, { once: true });
            return;
        }

        closeStream();
    }, []);

    const findNextPlayableChunkBySecondProbe = useCallback(
        async (fromTime: Date, options?: { excludeStartIsos?: Set<string> }): Promise<ChunkInfo | null> => {
            if (!camera) return null;

            const probeToken = probeCancelTokenRef.current;
            beginProbe();
            let probeMs = fromTime.getTime() + 1000;
            // Provide a 1-hour fallback search window when endTime is temporarily unavailable.
            const endMs = endTime ? endTime.getTime() : probeMs + 60 * 60 * 1000;
            const excludeStartIsos = options?.excludeStartIsos;

            try {
                while (probeMs <= endMs) {
                    if (probeToken !== probeCancelTokenRef.current) {
                        throw new Error(PROBE_CANCELLED_ERROR);
                    }
                    onProbeProgress?.(new Date(probeMs));

                    const info = await fetchChunkInfo(camera, new Date(probeMs));
                    if (probeToken !== probeCancelTokenRef.current) {
                        throw new Error(PROBE_CANCELLED_ERROR);
                    }
                    if (!info) {
                        probeMs += 1000;
                        continue;
                    }

                    const infoStartMs = info.start.getTime();
                    const infoEndMs = info.end.getTime();
                    const nextFromInfoMs = Math.max(infoStartMs + 1000, infoEndMs + 1000);

                    // Treat a chunk as unavailable if get_chunk_info succeeds but v_get_chunk fails.
                    // If this chunk was already marked as failed, skip re-requesting v_get_chunk and move on.
                    if (!excludeStartIsos?.has(info.startIso)) {
                        const chunkData = await fetchChunkBuffer(camera, info.startIso);
                        if (probeToken !== probeCancelTokenRef.current) {
                            throw new Error(PROBE_CANCELLED_ERROR);
                        }
                        if (chunkData) {
                            return info;
                        }
                        excludeStartIsos?.add(info.startIso);
                    }

                    // When get_chunk_info succeeds but the chunk is unusable (known-failed or v_get_chunk failed),
                    // continue probing from 1 second after the returned chunk end.
                    probeMs = Math.max(probeMs + 1000, nextFromInfoMs);
                    continue;
                }

                return null;
            } finally {
                endProbe();
            }
        },
        [camera, endTime, fetchChunkInfo, fetchChunkBuffer, onProbeProgress, beginProbe, endProbe, PROBE_CANCELLED_ERROR]
    );

    // Play
    const play = useCallback(async () => {
        if (!videoRef.current || !camera) return;
        if (playRequestInFlightRef.current) return;

        playRequestInFlightRef.current = true;

        try {
            const targetTime = state.currentTime ?? endTime;
            if (!targetTime) return;

            const currentChunk = state.currentChunkInfo;
            const isInCurrentChunk = !!currentChunk && targetTime.getTime() >= currentChunk.start.getTime() && targetTime.getTime() < currentChunk.end.getTime();

            if (!isInCurrentChunk) {
                const loadedCurrent = await loadChunk(targetTime);
                if (!loadedCurrent) {
                    const excluded = new Set<string>();
                    if (currentChunk?.startIso) excluded.add(currentChunk.startIso);
                    let nextChunk: ChunkInfo | null = null;
                    try {
                        nextChunk = await findNextPlayableChunkBySecondProbe(targetTime, { excludeStartIsos: excluded });
                    } catch (err) {
                        if (isProbeCancelledError(err)) return;
                        throw err;
                    }
                    if (!nextChunk) {
                        moveToEndAndStop();
                        return;
                    }

                    // The candidate chunk is already validated by a successful get_chunk_info/v_get_chunk pair in the finder.
                    // Even if loadChunk fails here, do not continue with chained candidate scans in this path.
                    const loadedNext = await loadChunk(nextChunk.start);
                    if (!loadedNext) return;
                }
            }

            await videoRef.current.play();
            setState((prev) => ({ ...prev, isPlaying: true }));
        } catch (err) {
            // console.warn('[VIDEO] Play failed:', err);
        } finally {
            playRequestInFlightRef.current = false;
        }
    }, [videoRef, camera, state.currentTime, state.currentChunkInfo, endTime, loadChunk, findNextPlayableChunkBySecondProbe, moveToEndAndStop, isProbeCancelledError]);

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
                noMoreChunksAheadRef.current = false;

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

                    // If prefetch already exhausted and we reached the buffered tail, force-finish at endTime.
                    if (isLastChunk && noMoreChunksAheadRef.current && remainingInChunk <= 0.05) {
                        moveToEndAndStop();
                        return;
                    }

                    if (isLastChunk && remainingInChunk <= PREFETCH_THRESHOLD_SECONDS && !prefetchIssuedRef.current) {
                        prefetchNextChunk();
                    }
                }
            }
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        return () => video.removeEventListener('timeupdate', handleTimeUpdate);
    }, [videoRef, state.isLoading, state.isPlaying, onTimeUpdate, moveToEndAndStop]); // Removed prefetchNextChunk from dependency to avoid cycle, used ref

    // Prefetch next chunk and append
    const prefetchNextChunk = useCallback(async () => {
        if (!camera || prefetchIssuedRef.current || bufferedChunksRef.current.length === 0) return;

        const lastChunk = bufferedChunksRef.current[bufferedChunksRef.current.length - 1];
        // console.log('[VIDEO] Initiating prefetch search. Last chunk end:', lastChunk.chunkInfo.end.toISOString());
        prefetchIssuedRef.current = true;

        try {
            let info: ChunkInfo | null = null;

            const excluded = new Set(bufferedChunksRef.current.map((c) => c.startIso));

            info = await findNextPlayableChunkBySecondProbe(lastChunk.chunkInfo.end, { excludeStartIsos: excluded });

            if (info && !bufferedChunksRef.current.some((c) => c.startIso === info.startIso)) {
                noMoreChunksAheadRef.current = false;
                // Append it
                await appendNextChunk(info);
            } else {
                // console.warn('[VIDEO] Prefetch failed to find a new chunk within search depth');
                noMoreChunksAheadRef.current = true;
                // UX requirement: once "no next chunk" is confirmed, snap handle to timeline end immediately.
                moveToEndAndStop();
                finalizeStreamAtBufferEnd();
            }

            // Reset flag
            prefetchIssuedRef.current = false;
        } catch (err) {
            if (isProbeCancelledError(err)) {
                prefetchIssuedRef.current = false;
                return;
            }
            // console.warn('[VIDEO] Prefetch/Append failed:', err);
            prefetchIssuedRef.current = false;
        }
    }, [camera, appendNextChunk, findNextPlayableChunkBySecondProbe, finalizeStreamAtBufferEnd, moveToEndAndStop, isProbeCancelledError]);

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
                    moveToEndAndStop();
                    return;
                }
            }

            // If not at end time, probe +1s until end to find the next chunk and continue playback.
            if (wasPlaying && lastChunk) {
                const excluded = new Set(bufferedChunksRef.current.map((c) => c.startIso));
                let nextChunk: ChunkInfo | null = null;
                try {
                    nextChunk = await findNextPlayableChunkBySecondProbe(lastChunk.chunkInfo.end, { excludeStartIsos: excluded });
                } catch (err) {
                    if (isProbeCancelledError(err)) return;
                    return;
                }
                if (nextChunk) {
                    const loaded = await loadChunk(nextChunk.start);
                    if (loaded && videoRef.current) {
                        try {
                            await videoRef.current.play();
                            setState((prev) => ({ ...prev, isPlaying: true }));
                        } catch {
                            setState((prev) => ({ ...prev, isPlaying: false }));
                        }
                        return;
                    }
                    return;
                }
            }

            moveToEndAndStop();
        };

        video.addEventListener('ended', handleEnded);
        return () => video.removeEventListener('ended', handleEnded);
    }, [videoRef, endTime, findNextPlayableChunkBySecondProbe, loadChunk, moveToEndAndStop, isProbeCancelledError]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (loadChunkThrottleRef.current) {
                clearTimeout(loadChunkThrottleRef.current);
                loadChunkThrottleRef.current = null;
            }
            pendingLoadChunkTimeRef.current = null;
            cancelActiveProbeSearch();
            resetMediaPipeline();
            onProbeStateChange?.(false);
        };
    }, [resetMediaPipeline, onProbeStateChange, cancelActiveProbeSearch]);

    // Reset when camera changes
    useEffect(() => {
        // Clear caches
        chunkCacheRef.current.clear();
        chunkNegativeCacheRef.current.clear();
        chunkInfoCacheRef.current.clear();
        initSegmentRef.current = null;
        noMoreChunksAheadRef.current = false;

        cancelActiveProbeSearch();
        resetMediaPipeline();

        setState({
            isPlaying: false,
            isLoading: false,
            isProbing: false,
            currentTime: null,
            currentChunkInfo: null,
            fps: null,
        });
    }, [camera, resetMediaPipeline, cancelActiveProbeSearch]);

    return {
        ...state,
        play,
        pause,
        loadChunk,
        seekToTime,
    };
}
