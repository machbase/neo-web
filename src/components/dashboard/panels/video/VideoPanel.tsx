// Video Panel - Main Component (New UI Design)

import { useRef, useEffect, useCallback, useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import {
    MdVideocam,
    MdDragIndicator,
    MdKeyboardDoubleArrowLeft,
    MdKeyboardDoubleArrowRight,
    Close,
    MdPause,
    MdPlayArrow,
    MdSkipPrevious,
    MdSkipNext,
    MdSensors,
    MdCalendarMonth,
} from '@/assets/icons/Icon';
import { useVideoState } from './hooks/useVideoState';
import { useVideoPlayer } from './hooks/useVideoPlayer';
import { useLiveMode } from './hooks/useLiveMode';
import { VideoPanelProps, VideoPanelHandle } from './types/video';
import { useVideoPanelSync, clearTimeLineX, drawTimeLineX } from '@/hooks/useVideoSync';
import { PanelIdParser } from '@/utils/dashboardUtil';
import { formatTimeLabel } from './utils/timeUtils';
import { TimeRangeSelector } from './modals/TimeRangeSelector';
import { IconButton, Dropdown, Badge, Input } from '@/design-system/components';
import { ChartTheme } from '@/type/eChart';
import { ChartThemeTextColor, ChartThemeBackgroundColor } from '@/utils/constants';
import './VideoPanel.scss';

const EMPTY_TIME_RANGE = { start: null, end: null };
const EMPTY_PANELS: string[] = [];

const VideoPanel = forwardRef<VideoPanelHandle, VideoPanelProps>(
    ({ pLoopMode, pChartVariableId, pPanelInfo, pBoardInfo: _pBoardInfo, pBoardTimeMinMax, pParentWidth: _pParentWidth, pIsHeader: _pIsHeader }, ref) => {
        const videoRef = useRef<HTMLVideoElement>(null);
        const containerRef = useRef<HTMLDivElement>(null);
        const seekControlRef = useRef<HTMLDivElement>(null);
        const [seekStep, setSeekStep] = useState(10);
        const [seekUnit, setSeekUnit] = useState<'sec' | 'min' | 'hour' | 'frame'>('sec');
        const [seekControlPos, setSeekControlPos] = useState<{ x: number; y: number } | null>(null);
        const [isManuallyClosed, setIsManuallyClosed] = useState(false);
        const [isDraggingSlider, setIsDraggingSlider] = useState(false);
        const [isTimeRangeModalOpen, setIsTimeRangeModalOpen] = useState(false);
        const [isFullscreenActive, setIsFullscreenActive] = useState(false);
        const [isSeekDropdownOpen, setIsSeekDropdownOpen] = useState(false);
        const fullscreenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

        const { state, fetchCameras, setTimeRange, setCurrentTime: setStateCurrentTime, setIsPlaying: setStateIsPlaying, setIsLoading: setStateIsLoading } = useVideoState();

        const seekControlPosRef = useRef(seekControlPos);
        useEffect(() => {
            seekControlPosRef.current = seekControlPos;
        }, [seekControlPos]);

        const liveMode = useLiveMode(videoRef);

        const videoPlayer = useVideoPlayer(videoRef, state.camera, state.end, liveMode.isLive || liveMode.isConnecting, (time) => setStateCurrentTime(time));

        // Calculate time range from dashboard
        const dashboardTimeRange = useMemo(() => {
            // if (pLoopMode) return EMPTY_TIME_RANGE;
            if (!pBoardTimeMinMax) return EMPTY_TIME_RANGE;
            const min = typeof pBoardTimeMinMax.min === 'number' ? new Date(pBoardTimeMinMax.min) : new Date(pBoardTimeMinMax.min);
            const max = typeof pBoardTimeMinMax.max === 'number' ? new Date(pBoardTimeMinMax.max) : new Date(pBoardTimeMinMax.max);
            return {
                start: Number.isNaN(min.getTime()) ? null : min,
                end: Number.isNaN(max.getTime()) ? null : max,
            };
        }, [pBoardTimeMinMax]); // sync.pause();

        // Sync settings
        const syncColor = pPanelInfo.chartOptions?.dependent?.color || '#FB9E00';
        const syncEnabled = pPanelInfo.chartOptions?.source?.enableSync ?? false;
        const dependentPanels = pPanelInfo?.chartOptions?.dependent?.panels ?? EMPTY_PANELS;

        // Track if applyTimeRange is in progress to prevent race conditions with play
        const isApplyingTimeRangeRef = useRef(false);

        // Extended video player with applyTimeRange for sync
        const videoPlayerWithSync = useMemo(
            () => ({
                ...videoPlayer,
                applyTimeRange: async (start: Date, end: Date) => {
                    isApplyingTimeRangeRef.current = true;
                    try {
                        // Pause and update state explicitly
                        videoPlayer.pause();
                        setStateIsPlaying(false); // ✅ Explicitly update playing state
                        setTimeRange(start, end);

                        let targetTime = start;
                        const current = state.currentTime;

                        if (current) {
                            if (current < start) {
                                targetTime = start;
                            } else if (current > end) {
                                targetTime = end;
                            } else {
                                targetTime = current;
                            }
                        }

                        setStateCurrentTime(targetTime);
                        await videoPlayer.loadChunk(targetTime);
                    } finally {
                        // Clear flag after a short delay to ensure play commands are properly sequenced
                        setTimeout(() => {
                            isApplyingTimeRangeRef.current = false;
                        }, 100);
                    }
                },
            }),
            [videoPlayer, setTimeRange, setStateCurrentTime, setStateIsPlaying, state.currentTime]
        );

        // Memoized getters to prevent unnecessary re-renders
        const getCurrentTime = useCallback(() => videoPlayer.currentTime, [videoPlayer.currentTime]);
        const getIsPlaying = useCallback(() => videoPlayer.isPlaying, [videoPlayer.isPlaying]);
        const getTimeRange = useCallback(() => ({ start: state.start, end: state.end }), [state.start, state.end]);
        const getIsLive = useCallback(() => liveMode.isLive, [liveMode.isLive]);

        // Memoized sync callbacks
        const onSyncSeek = useCallback(
            async (time: Date) => {
                console.log('[VIDEO-PANEL] onSyncSeek called:', { panelId: pPanelInfo.id, time });
                await videoPlayer.seekToTime(time);
            },
            [videoPlayer, pPanelInfo.id]
        );

        const onSyncPlay = useCallback(() => {
            console.log('[VIDEO-PANEL] onSyncPlay called:', { panelId: pPanelInfo.id, isApplyingTimeRange: isApplyingTimeRangeRef.current });

            // If applyTimeRange is in progress, delay play to avoid race condition
            if (isApplyingTimeRangeRef.current) {
                console.log('[VIDEO-PANEL] Delaying play due to ongoing applyTimeRange');
                setTimeout(() => {
                    console.log('[VIDEO-PANEL] Executing delayed play');
                    videoPlayer.play();
                }, 150);
            } else {
                videoPlayer.play();
            }
        }, [videoPlayer, pPanelInfo.id]);

        const onSyncPause = useCallback(() => {
            console.log('[VIDEO-PANEL] onSyncPause called:', { panelId: pPanelInfo.id });
            videoPlayer.pause();
        }, [videoPlayer, pPanelInfo.id]);

        const onSyncTimeRange = useCallback(
            async (start: Date, end: Date) => {
                console.log('[VIDEO-PANEL] onSyncTimeRange called:', { panelId: pPanelInfo.id, start, end });
                await videoPlayerWithSync.applyTimeRange(start, end);
            },
            [videoPlayerWithSync, pPanelInfo.id]
        );

        const onSyncLoop = useCallback(
            async (startTime: Date) => {
                console.log('[VIDEO-PANEL] onSyncLoop called:', { panelId: pPanelInfo.id, startTime });
                await videoPlayer.seekToTime(startTime);
                videoPlayer.play();
            },
            [videoPlayer, pPanelInfo.id]
        );

        // Sync hook - handles all sync logic internally
        const sync = useVideoPanelSync({
            boardId: _pBoardInfo.id,
            panelId: pPanelInfo.id,
            chartVariableId: pChartVariableId,

            // Getters
            getCurrentTime,
            getIsPlaying,
            getTimeRange,
            getIsLive,

            // Callbacks for sync commands from other panels
            onSyncSeek,
            onSyncPlay,
            onSyncPause,
            onSyncTimeRange,
            onSyncLoop,

            // Settings
            syncEnabled,
            dependentPanels,
            color: syncColor,
            videoPlayer: videoPlayerWithSync,
        });

        // Initialize on mount - ONE TIME ONLY (do NOT depend on dashboardTimeRange)
        useEffect(() => {
            const init = async () => {
                setStateIsLoading(true);
                try {
                    const isCurrentlyLiveOrConnecting = liveMode.isLive || liveMode.isConnecting;
                    const sLiveModeOnStart = pPanelInfo?.chartOptions?.source?.liveModeOnStart ?? false;

                    // Always fetch cameras first
                    const cameras = await fetchCameras();

                    // Use pBoardTimeMinMax directly for initial load (not via dashboardTimeRange dep)
                    const initialStart = pBoardTimeMinMax?.min
                        ? typeof pBoardTimeMinMax.min === 'number'
                            ? new Date(pBoardTimeMinMax.min)
                            : new Date(pBoardTimeMinMax.min)
                        : null;
                    const initialEnd = pBoardTimeMinMax?.max
                        ? typeof pBoardTimeMinMax.max === 'number'
                            ? new Date(pBoardTimeMinMax.max)
                            : new Date(pBoardTimeMinMax.max)
                        : null;

                    // Then handle mode-specific logic
                    if (sLiveModeOnStart || isCurrentlyLiveOrConnecting) {
                        if (initialStart && initialEnd) {
                            setTimeRange(initialStart, initialEnd);
                            setStateCurrentTime(initialStart);
                        }
                        liveMode.startLive();
                    } else if (cameras.length > 0 && state.camera && initialStart && initialEnd) {
                        setTimeRange(initialStart, initialEnd);
                        setStateCurrentTime(initialStart);
                        await videoPlayer.loadChunk(initialStart);
                    }
                } finally {
                    setStateIsLoading(false);
                }
            };
            init();
            // ✅ CRITICAL: Do NOT include dashboardTimeRange in deps - init should run ONCE on mount
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [state.camera, pPanelInfo?.chartOptions?.source?.liveModeOnStart]);

        // Sync states
        useEffect(() => {
            setStateIsPlaying(videoPlayer.isPlaying);
        }, [videoPlayer.isPlaying, setStateIsPlaying]);

        useEffect(() => {
            setStateIsLoading(videoPlayer.isLoading);
        }, [videoPlayer.isLoading, setStateIsLoading]);

        // ============================================
        // chartVariableId-based dashboard time change handling
        // ============================================
        const prevChartVariableIdRef = useRef(pChartVariableId);
        const prevBoardTimeRef = useRef<typeof pBoardTimeMinMax | null>(null);

        useEffect(() => {
            // Skip first render
            if (!prevBoardTimeRef.current) {
                prevBoardTimeRef.current = pBoardTimeMinMax || null;
                return;
            }

            const chartVariableIdChanged = prevChartVariableIdRef.current !== pChartVariableId;
            prevChartVariableIdRef.current = pChartVariableId;

            // Check if time actually changed
            const timeChanged =
                prevBoardTimeRef.current?.min !== pBoardTimeMinMax?.min || prevBoardTimeRef.current?.max !== pBoardTimeMinMax?.max;

            prevBoardTimeRef.current = pBoardTimeMinMax || null;

            if (!timeChanged) return;

            const handleTimeRangeChange = async () => {
                const newStart = typeof pBoardTimeMinMax?.min === 'number' ? new Date(pBoardTimeMinMax.min) : pBoardTimeMinMax?.min;
                const newEnd = typeof pBoardTimeMinMax?.max === 'number' ? new Date(pBoardTimeMinMax.max) : pBoardTimeMinMax?.max;

                if (!newStart || !newEnd) return;

                // Case 1: Refresh 버튼 클릭 또는 사용자의 명시적 시간 변경 (chartVariableId 변경됨)
                // → 모든 비디오 재로드
                if (chartVariableIdChanged) {
                    console.log('[VIDEO] Refresh or user time change detected - reloading all videos');
                    if (!liveMode.isLive) {
                        videoPlayer.pause();
                        setTimeRange(newStart, newEnd);
                        setStateCurrentTime(newStart);
                        await videoPlayer.loadChunk(newStart);
                    } else {
                        // Live mode: just update time range
                        setTimeRange(newStart, newEnd);
                    }
                    // Notify dependent charts
                    sync.notifyDependentCharts(newStart, newEnd);
                    return;
                }

                // Case 2: loopMode 자동 갱신 (chartVariableId 동일)
                // → Live 비디오만 재로드, Normal/Sync 비디오는 현재 상태 유지
                if (!chartVariableIdChanged && !liveMode.isLive) {
                    console.log('[VIDEO] LoopMode auto-refresh - Normal/Sync video keeps current state');
                    // Normal/Sync 비디오는 아무것도 하지 않음 (현재 재생 위치 유지)
                    return;
                }

                // Case 3: Live 비디오는 loopMode에서도 재로드
                if (liveMode.isLive) {
                    console.log('[VIDEO] LoopMode auto-refresh - Live video reloads');
                    setTimeRange(newStart, newEnd);
                    // Live 모드는 자동으로 최신 스트림으로 연결됨
                }
            };

            handleTimeRangeChange();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [pBoardTimeMinMax, pChartVariableId, liveMode.isLive]);

        // ============================================
        // Draw and update timeline during playback (throttled)
        // ============================================
        useEffect(() => {
            // Clear timeline when entering live mode
            if (liveMode.isLive && dependentPanels.length > 0) {
                const dependentPanelIdList = dependentPanels.map((depPanelId: string) => PanelIdParser(pChartVariableId + '-' + depPanelId));
                clearTimeLineX(dependentPanelIdList);
                return;
            }

            // Throttle timeline updates to prevent performance issues and flickering
            // Only update timeline when video is paused or at most every 200ms during playback
            if (!liveMode.isLive && dependentPanels.length > 0 && state.currentTime) {
                const dependentPanelIdList = dependentPanels.map((depPanelId: string) => PanelIdParser(pChartVariableId + '-' + depPanelId));
                const currentTime = state.currentTime; // Capture for closure

                // If video is not playing, update immediately (for seek operations)
                if (!videoPlayer.isPlaying) {
                    drawTimeLineX(dependentPanelIdList, syncColor, currentTime, syncEnabled);
                    return;
                }

                // If video is playing, throttle updates to reduce performance impact
                const timeoutId = setTimeout(() => {
                    drawTimeLineX(dependentPanelIdList, syncColor, currentTime, syncEnabled);
                }, 200);

                return () => clearTimeout(timeoutId);
            }
        }, [liveMode.isLive, state.currentTime, dependentPanels, pChartVariableId, syncColor, syncEnabled, videoPlayer.isPlaying]);

        // Handlers with sync command
        const handlePlayToggle = useCallback(() => {
            if (videoPlayer.isPlaying) {
                sync.pause();
            } else {
                sync.play();
            }
        }, [videoPlayer.isPlaying, sync]);

        // Calculate seek time based on unit
        const getSeekMs = useCallback(() => {
            switch (seekUnit) {
                case 'frame':
                    return seekStep * (1000 / (videoPlayer.fps || 30));
                case 'sec':
                    return seekStep * 1000;
                case 'min':
                    return seekStep * 60 * 1000;
                case 'hour':
                    return seekStep * 60 * 60 * 1000;
                default:
                    return seekStep * 1000;
            }
        }, [seekStep, seekUnit, videoPlayer.fps]);

        const handlePrevChunk = useCallback(async () => {
            const currentTime = videoPlayer.currentTime || state.currentTime;
            if (!currentTime) return;
            const newTime = new Date(currentTime.getTime() - getSeekMs());
            if (state.start && newTime < state.start) return;
            await sync.seek(newTime);
        }, [videoPlayer.currentTime, state.currentTime, state.start, getSeekMs, sync]);

        const handleNextChunk = useCallback(async () => {
            const currentTime = videoPlayer.currentTime || state.currentTime;
            if (!currentTime) return;
            const newTime = new Date(currentTime.getTime() + getSeekMs());
            if (state.end && newTime > state.end) return;
            await sync.seek(newTime);
        }, [videoPlayer.currentTime, state.currentTime, state.end, getSeekMs, sync]);

        const handleSliderChange = useCallback(
            async (e: React.ChangeEvent<HTMLInputElement>) => {
                if (liveMode.isLive) return;
                const ms = parseInt(e.target.value, 10);
                if (!Number.isNaN(ms)) {
                    const newTime = new Date(ms);
                    await sync.seek(newTime, { isDragging: true });
                }
            },
            [liveMode.isLive, sync]
        );

        const handleLiveToggle = useCallback(async () => {
            if (liveMode.isLive) {
                liveMode.stopLive();
                // Reload the recorded video after stopping live mode
                const currentTime = state.currentTime || state.start;
                if (currentTime) {
                    await videoPlayer.loadChunk(currentTime);
                }
            } else {
                sync.pause();
                liveMode.startLive();
            }
        }, [liveMode, videoPlayer, state.currentTime, state.start, sync]);

        const handleTimeRangeApply = useCallback(
            async (start: Date, end: Date) => {
                // Use sync-aware time range change
                await sync.setTimeRange(start, end);
            },
            [sync]
        );

        const handleShiftWindow = useCallback(
            async (direction: 'prev' | 'next') => {
                if (!state.start || !state.end) return;

                const duration = state.end.getTime() - state.start.getTime();
                const shiftMs = direction === 'prev' ? -duration : duration;

                let newStartMs = state.start.getTime() + shiftMs;
                let newEndMs = state.end.getTime() + shiftMs;

                // Restrict to available range if minTime/maxTime exist
                if (state.minTime && state.maxTime) {
                    const minMs = state.minTime.getTime();
                    const maxMs = state.maxTime.getTime();

                    if (direction === 'prev' && newStartMs < minMs) {
                        newStartMs = minMs;
                        newEndMs = minMs + duration;
                    } else if (direction === 'next' && newEndMs > maxMs) {
                        newEndMs = maxMs;
                        newStartMs = maxMs - duration;
                    }
                }

                const newStart = new Date(newStartMs);
                const newEnd = new Date(newEndMs);

                // Pause active playback
                videoPlayer.pause();

                // Apply new range
                setTimeRange(newStart, newEnd);

                // Requirement: Always move handle to the beginning of the new range
                const targetTime = newStart;
                setStateCurrentTime(targetTime);
                await videoPlayer.loadChunk(targetTime);
            },
            [state.start, state.end, state.minTime, state.maxTime, setTimeRange, setStateCurrentTime, videoPlayer]
        );

        const handleFullscreen = useCallback(() => {
            const target = containerRef.current as any;
            if (!target) return;
            if ((document as any).webkitFullscreenElement) {
                (document as any).webkitExitFullscreen();
            } else {
                if (target.webkitRequestFullscreen) {
                    target.webkitRequestFullscreen();
                }
            }
        }, []);

        // Expose toggleFullscreen to parent via ref
        useImperativeHandle(ref, () => ({
            toggleFullscreen: handleFullscreen,
        }));

        const [isFullscreen, setIsFullscreen] = useState(false);

        useEffect(() => {
            const handleFullscreenChange = () => {
                const isFs = !!(document as any).webkitFullscreenElement;
                setIsFullscreen(isFs);
                if (!isFs) {
                    setIsFullscreenActive(false);
                    if (fullscreenTimeoutRef.current) {
                        clearTimeout(fullscreenTimeoutRef.current);
                    }
                }
            };

            document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
            return () => {
                document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            };
        }, []);

        // Clamp position when toggling fullscreen or resizing
        useEffect(() => {
            if (!containerRef.current || !seekControlRef.current || !seekControlPos) return;

            // Wait for layout transition
            const timer = setTimeout(() => {
                const container = containerRef.current;
                const control = seekControlRef.current;

                if (!container || !control) return;

                const videoContainer = container.querySelector('.video-container');
                if (!videoContainer) return;

                const parentRect = container.getBoundingClientRect();
                const containerRect = videoContainer.getBoundingClientRect();
                const seekRect = control.getBoundingClientRect();

                // Calculate valid percentage bounds relative to parent panel
                const minX = (containerRect.left - parentRect.left) / parentRect.width;
                const minY = (containerRect.top - parentRect.top) / parentRect.height;
                const maxX = (containerRect.left - parentRect.left + containerRect.width - seekRect.width) / parentRect.width;
                const maxY = (containerRect.top - parentRect.top + containerRect.height - seekRect.height) / parentRect.height;

                // Clamp current position
                setSeekControlPos((current) => {
                    if (!current) return null;
                    const clampedX = Math.max(minX, Math.min(current.x, maxX));
                    const clampedY = Math.max(minY, Math.min(current.y, maxY));

                    // Only update if significantly different to avoid loops
                    if (Math.abs(clampedX - current.x) > 0.001 || Math.abs(clampedY - current.y) > 0.001) {
                        return { x: clampedX, y: clampedY };
                    }
                    return current;
                });
            }, 300); // Allow CSS transitions to complete

            return () => clearTimeout(timer);
        }, [isFullscreen, seekControlPos === null]); // Run when fullscreen changes or initialization
        const handleFullscreenMouseMove = useCallback(() => {
            if (!isFullscreen) return;
            setIsFullscreenActive(true);
            if (fullscreenTimeoutRef.current) {
                clearTimeout(fullscreenTimeoutRef.current);
            }
            fullscreenTimeoutRef.current = setTimeout(() => {
                setIsFullscreenActive(false);
            }, 1000);
        }, [isFullscreen]);

        const handleFullscreenVideoClick = useCallback(() => {
            if (!isFullscreen || liveMode.isLive) return;
            handlePlayToggle();
        }, [isFullscreen, liveMode.isLive, handlePlayToggle]);

        // Computed values
        // In live mode, use state.currentTime to preserve the pre-live position
        const displayTime = liveMode.isLive ? state.currentTime : videoPlayer.currentTime || state.currentTime;
        const sliderMin = state.start?.getTime() ?? 0;
        const sliderMax = state.end?.getTime() ?? 0;
        const sliderValue = displayTime?.getTime() ?? sliderMin;
        const rawProgress = sliderMax > sliderMin ? ((sliderValue - sliderMin) / (sliderMax - sliderMin)) * 100 : 0;
        const sliderProgress = liveMode.isLive ? 100 : Math.min(100, Math.max(0, rawProgress));

        // Theme color
        let theme = (pPanelInfo.theme as ChartTheme) || 'dark';

        const textColor = ChartThemeTextColor[theme] || ChartThemeTextColor['dark'];
        const bgColor = ChartThemeBackgroundColor[theme] || ChartThemeBackgroundColor['dark'];

        const handleSliderInteractionStart = useCallback(() => {
            setIsDraggingSlider(true);
            // Always pause when dragging starts
            if (videoPlayer.isPlaying) {
                videoPlayer.pause();
            }
        }, [videoPlayer]);

        const handleSliderInteractionEnd = useCallback(() => {
            setIsDraggingSlider(false);
        }, []);

        return (
            <div
                id={PanelIdParser(pChartVariableId + '-' + pPanelInfo.id)}
                className={`video-panel ${isFullscreen ? 'fullscreen' : ''}`}
                ref={containerRef}
                style={
                    {
                        color: textColor,
                        '--panel-text-color': textColor,
                        '--panel-bg-color': bgColor,
                    } as React.CSSProperties
                }
                onMouseLeave={() => setIsManuallyClosed(false)}
            >
                {/* Header */}
                <header className="panel-header">
                    <div className="header-left">
                        <MdVideocam className="panel-icon" size={18} />
                        <span className="panel-title">{pPanelInfo.title || 'Video 1'}</span>
                    </div>
                    <div className="header-right">
                        {liveMode.isLive ? (
                            <Badge variant="error" showDot size="md">
                                Live
                            </Badge>
                        ) : syncEnabled ? (
                            <Badge variant="warning" showDot size="md">
                                SYNC
                            </Badge>
                        ) : null}
                    </div>
                </header>

                {/* Video Area */}
                <div className="video-container" onMouseMove={isFullscreen ? handleFullscreenMouseMove : undefined} onClick={isFullscreen ? handleFullscreenVideoClick : undefined}>
                    <video ref={videoRef} playsInline muted />
                </div>

                {/* Draggable Seek Step Control */}
                {!liveMode.isLive && (
                    <div
                        ref={seekControlRef}
                        className={`seek-control${isManuallyClosed ? ' manually-closed' : ''}${isSeekDropdownOpen ? ' force-visible' : ''}`}
                        style={{
                            ...(seekControlPos === null ? { right: '16px', bottom: '80px' } : { left: `${seekControlPos.x * 100}%`, top: `${seekControlPos.y * 100}%` }),
                        }}
                    >
                        <div
                            className="drag-handle"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                const seekControlEl = seekControlRef.current;
                                const parentEl = seekControlEl?.parentElement;
                                if (!seekControlEl || !parentEl) return;

                                const videoContainerEl = parentEl.querySelector('.video-container');
                                if (!videoContainerEl) return;

                                const seekRect = seekControlEl.getBoundingClientRect();
                                const parentRect = parentEl.getBoundingClientRect();
                                const containerRect = videoContainerEl.getBoundingClientRect();

                                // Mouse offset within the seek control
                                const offsetX = e.clientX - seekRect.left;
                                const offsetY = e.clientY - seekRect.top;

                                const handleMouseMove = (ev: MouseEvent) => {
                                    // Calculate position relative to parent container
                                    const newX = ev.clientX - parentRect.left - offsetX;
                                    const newY = ev.clientY - parentRect.top - offsetY;

                                    // Boundaries relative to parent (Panel)
                                    const minX = containerRect.left - parentRect.left;
                                    const minY = containerRect.top - parentRect.top;
                                    const maxX = minX + containerRect.width - seekRect.width;
                                    const maxY = minY + containerRect.height - seekRect.height;

                                    // Convert to percentage
                                    const safeX = Math.max(minX, Math.min(newX, maxX));
                                    const safeY = Math.max(minY, Math.min(newY, maxY));

                                    setSeekControlPos({
                                        x: safeX / parentRect.width,
                                        y: safeY / parentRect.height,
                                    });
                                };
                                const handleMouseUp = () => {
                                    window.removeEventListener('mousemove', handleMouseMove);
                                    window.removeEventListener('mouseup', handleMouseUp);
                                };
                                window.addEventListener('mousemove', handleMouseMove);
                                window.addEventListener('mouseup', handleMouseUp);
                            }}
                        >
                            <MdDragIndicator size={20} />
                        </div>
                        <IconButton
                            icon={<MdKeyboardDoubleArrowLeft size={18} />}
                            onClick={handlePrevChunk}
                            aria-label="Previous"
                            variant="ghost"
                            size="xsm"
                            className="seek-btn"
                        />
                        <Input
                            type="number"
                            className="seek-input"
                            value={seekStep}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSeekStep(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            min={1}
                            size="sm"
                            style={{ height: '24px', minHeight: '24px', padding: '0 8px' }}
                        />
                        <Dropdown.Root
                            options={[
                                { label: 'FRAME', value: 'frame' },
                                { label: 'SEC', value: 'sec' },
                                { label: 'MIN', value: 'min' },
                                { label: 'HOUR', value: 'hour' },
                            ]}
                            value={seekUnit}
                            onChange={(val) => setSeekUnit(val as any)}
                            onOpenChange={setIsSeekDropdownOpen}
                        >
                            <Dropdown.Trigger className="dropdown-trigger-sm seek-unit-dropdown" />
                            <Dropdown.Menu className="seek-unit-menu">
                                <Dropdown.List />
                            </Dropdown.Menu>
                        </Dropdown.Root>
                        <IconButton icon={<MdKeyboardDoubleArrowRight size={18} />} onClick={handleNextChunk} aria-label="Next" variant="ghost" size="xsm" className="seek-btn" />
                        <IconButton icon={<Close size={18} />} onClick={() => setIsManuallyClosed(true)} aria-label="Close" variant="ghost" size="xsm" />
                    </div>
                )}

                {/* Center Play Button (Fullscreen Only) */}
                {isFullscreen && (
                    <div className={`centered-play-btn${isFullscreenActive ? ' visible' : ''}`}>{videoPlayer.isPlaying ? <MdPause size={48} /> : <MdPlayArrow size={48} />}</div>
                )}

                {/* Fullscreen Hover Trigger (Invisible area at bottom to show controls) */}
                <div className="fullscreen-hover-trigger" />

                {/* Bottom Controls Bar (always visible) */}
                <div className="controls-bar">
                    <div className="controls-left">
                        <IconButton
                            icon={videoPlayer.isPlaying ? <MdPause size={24} /> : <MdPlayArrow size={24} />}
                            onClick={handlePlayToggle}
                            disabled={liveMode.isLive}
                            variant="none"
                            className="play-btn"
                            aria-label={videoPlayer.isPlaying ? 'Pause' : 'Play'}
                        />
                        <IconButton
                            icon={<MdSkipPrevious size={24} />}
                            onClick={() => handleShiftWindow('prev')}
                            disabled={liveMode.isLive}
                            variant="none"
                            className="nav-btn"
                            aria-label="Previous window"
                        />
                        <IconButton
                            icon={<MdSkipNext size={24} />}
                            onClick={() => handleShiftWindow('next')}
                            disabled={liveMode.isLive}
                            variant="none"
                            className="nav-btn"
                            aria-label="Next window"
                        />
                    </div>

                    <div className="timeline-section">
                        {isDraggingSlider && (
                            <div className="current-time-badge" style={{ left: `${sliderProgress}%` }}>
                                {displayTime ? formatTimeLabel(displayTime) : '--:--:--'}
                            </div>
                        )}
                        <div className="timeline-track">
                            <div className="timeline-progress" style={{ width: `${sliderProgress}%` }} />
                            <div className="timeline-thumb" style={{ left: `${sliderProgress}%` }} />
                            <input
                                type="range"
                                min={sliderMin}
                                max={sliderMax}
                                value={sliderValue}
                                onChange={handleSliderChange}
                                onMouseDown={handleSliderInteractionStart}
                                onMouseUp={handleSliderInteractionEnd}
                                onMouseLeave={handleSliderInteractionEnd}
                                disabled={liveMode.isLive}
                            />
                        </div>
                    </div>

                    <div className="controls-right">
                        <IconButton
                            icon={<MdSensors size={20} />}
                            onClick={handleLiveToggle}
                            active={liveMode.isLive}
                            toolTipContent="Live"
                            isToolTip
                            aria-label="Toggle Live Mode"
                            variant="secondary"
                        />
                        <IconButton
                            icon={<MdCalendarMonth size={20} />}
                            onClick={() => setIsTimeRangeModalOpen(true)}
                            disabled={liveMode.isLive}
                            toolTipContent="Time Range"
                            isToolTip
                            aria-label="Select Time Range"
                            variant="secondary"
                        />
                    </div>
                </div>
                {isTimeRangeModalOpen && (
                    <TimeRangeSelector
                        isOpen={isTimeRangeModalOpen}
                        onClose={() => setIsTimeRangeModalOpen(false)}
                        onApply={handleTimeRangeApply}
                        initialStartTime={state.start}
                        initialEndTime={state.end}
                        minTime={state.minTime}
                        maxTime={state.maxTime}
                    />
                )}
            </div>
        );
    }
);

export default VideoPanel;
