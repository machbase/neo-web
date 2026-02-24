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
    MdNotifications,
} from '@/assets/icons/Icon';
import { useVideoState } from './hooks/useVideoState';
import { useVideoPlayer } from './hooks/useVideoPlayer';
import { useLiveMode } from './hooks/useLiveMode';
import { useCameraRollupGaps } from './hooks/useCameraRollupGaps';
import { VideoPanelProps, VideoPanelHandle } from './types/video';
import { useVideoPanelSync, clearTimeLineX, drawTimeLineX } from '@/hooks/useVideoSync';
import { PanelIdParser } from '@/utils/dashboardUtil';
import { formatTimeLabel } from './utils/timeUtils';
import { TimeRangeSelector } from './modals/TimeRangeSelector';
import { useCameraEvents } from './hooks/useCameraEvents';
import { EventListModal } from './modals/EventListModal';
import { IconButton, Dropdown, Badge, Input } from '@/design-system/components';
import { ChartTheme } from '@/type/eChart';
import { ChartThemeTextColor, ChartThemeBackgroundColor } from '@/utils/constants';
import './VideoPanel.scss';

const EMPTY_PANELS: string[] = [];
const DEFAULT_EVENT_WINDOW_MS = 60 * 60 * 1000;

const VideoPanel = forwardRef<VideoPanelHandle, VideoPanelProps>(
    (
        { pLoopMode: _pLoopMode, pType, pIsActiveTab = true, pChartVariableId, pPanelInfo, pBoardInfo: _pBoardInfo, pBoardTimeMinMax, pParentWidth: _pParentWidth, pIsHeader: _pIsHeader },
        ref
    ) => {
        const videoRef = useRef<HTMLVideoElement>(null);
        const containerRef = useRef<HTMLDivElement>(null);
        const videoContainerRef = useRef<HTMLDivElement>(null);
        const seekControlRef = useRef<HTMLDivElement>(null);
        const timelineTrackRef = useRef<HTMLDivElement>(null);
        const currentTooltipRef = useRef<HTMLDivElement>(null);
        const hoverTooltipRef = useRef<HTMLDivElement>(null);
        const [seekStep, setSeekStep] = useState(10);
        const [seekUnit, setSeekUnit] = useState<'sec' | 'min' | 'hour' | 'frame'>('sec');
        const [seekControlPos, setSeekControlPos] = useState<{ x: number; y: number } | null>(null);
        const [isManuallyClosed, setIsManuallyClosed] = useState(false);
        const [isDraggingSlider, setIsDraggingSlider] = useState(false);
        const [isTimeRangeModalOpen, setIsTimeRangeModalOpen] = useState(false);
        const [isFullscreenActive, setIsFullscreenActive] = useState(false);
        const [isSeekDropdownOpen, setIsSeekDropdownOpen] = useState(false);
        const [isEventModalOpen, setIsEventModalOpen] = useState(false);
        const [probePreviewTime, setProbePreviewTime] = useState<Date | null>(null);
        const [hoverTime, setHoverTime] = useState<Date | null>(null);
        const [hoverPercent, setHoverPercent] = useState<number | null>(null);
        const [isTimelineHovered, setIsTimelineHovered] = useState(false);
        const [timelineTrackWidth, setTimelineTrackWidth] = useState(0);
        const [currentTooltipLeftPx, setCurrentTooltipLeftPx] = useState(0);
        const [hoverTooltipLeftPx, setHoverTooltipLeftPx] = useState(0);
        const [liveNow, setLiveNow] = useState<Date | null>(null);
        const fullscreenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
        const showEventControl = pType !== 'create' && pType !== 'edit';
        const isPlaybackLocked = !pIsActiveTab || pType === 'create' || pType === 'edit';

        const { state, fetchCameras, setTimeRange, setCurrentTime: setStateCurrentTime, setIsPlaying: setStateIsPlaying, setIsLoading: setStateIsLoading } = useVideoState();

        const liveMode = useLiveMode(videoRef, state.camera);

        const handleProbeProgress = useCallback(
            (time: Date) => {
                // Probe preview is visual-only. Do not seek or mutate canonical currentTime here.
                if (liveMode.isLive || isDraggingSlider) return;
                setProbePreviewTime(time);
            },
            [liveMode.isLive, isDraggingSlider]
        );

        const handleProbeStateChange = useCallback((isProbing: boolean) => {
            if (!isProbing) {
                setProbePreviewTime(null);
            }
        }, []);

        const videoPlayer = useVideoPlayer(videoRef, state.camera, state.end, liveMode.isLive || liveMode.isConnecting, {
            onTimeUpdate: (time) => setStateCurrentTime(time),
            onProbeProgress: handleProbeProgress,
            onProbeStateChange: handleProbeStateChange,
        });

        const events = useCameraEvents(state.camera, state.start, state.end, liveMode.isLive, !isEventModalOpen);
        const missingSegments = useCameraRollupGaps(state.camera, state.start, state.end, !liveMode.isLive && !liveMode.isConnecting);
        const missingSegmentAlpha = useMemo(() => {
            const configuredAlpha = Number(pPanelInfo?.chartOptions?.source?.missingDataAlpha);
            if (Number.isFinite(configuredAlpha)) {
                return Math.max(0.05, Math.min(1, configuredAlpha));
            }
            return 0.4;
        }, [pPanelInfo?.chartOptions?.source?.missingDataAlpha]);

        // Sync settings
        const syncColor = pPanelInfo.chartOptions?.dependent?.color || '#FB9E00';
        const syncEnabled = pPanelInfo.chartOptions?.source?.enableSync ?? false;
        const dependentPanels = pPanelInfo?.chartOptions?.dependent?.panels ?? EMPTY_PANELS;

        // Track if applyTimeRange is in progress to prevent race conditions with play
        const isApplyingTimeRangeRef = useRef(false);
        const shouldRestoreLiveRef = useRef(false);

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

                        // Requirement: whenever time range changes, handle must reset to range start.
                        setStateCurrentTime(start);
                        await videoPlayer.loadChunk(start);
                    } finally {
                        // Clear flag after a short delay to ensure play commands are properly sequenced
                        setTimeout(() => {
                            isApplyingTimeRangeRef.current = false;
                        }, 100);
                    }
                },
            }),
            [videoPlayer, setTimeRange, setStateCurrentTime, setStateIsPlaying]
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
            if (isPlaybackLocked) return;
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
        }, [videoPlayer, pPanelInfo.id, isPlaybackLocked]);

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
                if (isPlaybackLocked) return;
                console.log('[VIDEO-PANEL] onSyncLoop called:', { panelId: pPanelInfo.id, startTime });
                await videoPlayer.seekToTime(startTime);
                videoPlayer.play();
            },
            [videoPlayer, pPanelInfo.id, isPlaybackLocked]
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
                    const cameras = await fetchCameras(pPanelInfo?.chartOptions?.source?.camera ?? null);

                    // Use pBoardTimeMinMax directly for initial load (not via dashboardTimeRange dep)
                    const initialStart = pBoardTimeMinMax?.min
                        ? typeof pBoardTimeMinMax.min === 'number'
                            ? new Date(pBoardTimeMinMax.min)
                            : new Date(pBoardTimeMinMax.min)
                        : null;
                    const initialEnd = pBoardTimeMinMax?.max ? (typeof pBoardTimeMinMax.max === 'number' ? new Date(pBoardTimeMinMax.max) : new Date(pBoardTimeMinMax.max)) : null;

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

        // Playback lock guard:
        // - Lock condition: inactive tab or panel editor(create/edit) open
        // - On lock: stop recorded playback and live mode
        // - On unlock: only restore live mode if it was live before lock
        useEffect(() => {
            if (isPlaybackLocked) {
                if (videoPlayer.isPlaying) {
                    sync.pause();
                }

                if (liveMode.isLive || liveMode.isConnecting) {
                    shouldRestoreLiveRef.current = true;
                    liveMode.stopLive();
                }
                return;
            }

            if (shouldRestoreLiveRef.current && !liveMode.isLive && !liveMode.isConnecting) {
                shouldRestoreLiveRef.current = false;
                liveMode.startLive();
            }
        }, [isPlaybackLocked, videoPlayer.isPlaying, sync.pause, liveMode.isLive, liveMode.isConnecting, liveMode.stopLive, liveMode.startLive]);

        // Keep SyncMaster's panelTimes updated during playback (for drift correction)
        useEffect(() => {
            if (videoPlayer.currentTime) {
                sync.handleTimeUpdate(videoPlayer.currentTime);
            }
        }, [videoPlayer.currentTime, sync.handleTimeUpdate]);

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
            const timeChanged = prevBoardTimeRef.current?.min !== pBoardTimeMinMax?.min || prevBoardTimeRef.current?.max !== pBoardTimeMinMax?.max;

            prevBoardTimeRef.current = pBoardTimeMinMax || null;

            if (!timeChanged) return;

            const handleTimeRangeChange = async () => {
                const startRaw = pBoardTimeMinMax?.min;
                const endRaw = pBoardTimeMinMax?.max;
                const newStart = startRaw !== undefined && startRaw !== null ? new Date(startRaw) : null;
                const newEnd = endRaw !== undefined && endRaw !== null ? new Date(endRaw) : null;

                if (!newStart || !newEnd || Number.isNaN(newStart.getTime()) || Number.isNaN(newEnd.getTime())) return;

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
                // → Requirement: range changed means always reset handle to new start
                if (!chartVariableIdChanged && !liveMode.isLive) {
                    console.log('[VIDEO] LoopMode auto-refresh - resetting to new start');
                    videoPlayer.pause();
                    setTimeRange(newStart, newEnd);
                    setStateCurrentTime(newStart);
                    await videoPlayer.loadChunk(newStart);
                    sync.notifyDependentCharts(newStart, newEnd);
                    return;
                }

                // Case 3: Live 비디오는 loopMode에서도 재로드
                if (liveMode.isLive) {
                    console.log('[VIDEO] LoopMode auto-refresh - Live video reloads');
                    setTimeRange(newStart, newEnd);
                    // Live 모드는 자동으로 최신 스트림으로 연결됨
                }

                // Notify dependent charts
                sync.notifyDependentCharts(newStart, newEnd);
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
            if (isPlaybackLocked) return;
            if (videoPlayer.isProbing) return;
            if (videoPlayer.isPlaying) {
                sync.pause();
            } else {
                sync.play();
            }
        }, [videoPlayer.isPlaying, videoPlayer.isProbing, sync, isPlaybackLocked]);

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
            if (isPlaybackLocked) return;
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
        }, [liveMode, videoPlayer, state.currentTime, state.start, sync, isPlaybackLocked]);

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
            if (!videoContainerRef.current || !seekControlRef.current || !seekControlPos) return;

            // Wait for layout transition
            const timer = setTimeout(() => {
                const container = videoContainerRef.current;
                const control = seekControlRef.current;

                if (!container || !control) return;

                const containerRect = container.getBoundingClientRect();
                const seekRect = control.getBoundingClientRect();

                if (containerRect.width <= 0 || containerRect.height <= 0) return;
                const maxX = Math.max(0, containerRect.width - seekRect.width);
                const maxY = Math.max(0, containerRect.height - seekRect.height);

                setSeekControlPos((current) => {
                    if (!current) return null;
                    const currentX = current.x * containerRect.width;
                    const currentY = current.y * containerRect.height;
                    const clampedX = Math.max(0, Math.min(currentX, maxX));
                    const clampedY = Math.max(0, Math.min(currentY, maxY));

                    const normalizedX = clampedX / containerRect.width;
                    const normalizedY = clampedY / containerRect.height;
                    if (Math.abs(normalizedX - current.x) > 0.001 || Math.abs(normalizedY - current.y) > 0.001) {
                        return { x: normalizedX, y: normalizedY };
                    }
                    return current;
                });
            }, 300); // Allow CSS transitions to complete

            return () => clearTimeout(timer);
        }, [isFullscreen, seekControlPos]); // Run when fullscreen changes or initialization
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

        useEffect(() => {
            if (!liveMode.isLive) {
                setLiveNow(null);
                return;
            }

            setLiveNow(new Date());
            const timer = window.setInterval(() => {
                setLiveNow(new Date());
            }, 1000);

            return () => {
                window.clearInterval(timer);
            };
        }, [liveMode.isLive]);

        // Computed values
        // In live mode, use state.currentTime to preserve the pre-live position.
        // During probe search, temporarily show probePreviewTime to make search progress visible.
        const liveDisplayTime = liveNow ?? state.currentTime ?? state.end ?? new Date();
        const baseDisplayTime = liveMode.isLive ? liveDisplayTime : videoPlayer.currentTime || state.currentTime;
        const displayTime = !liveMode.isLive && !isDraggingSlider && probePreviewTime ? probePreviewTime : baseDisplayTime;
        const sliderMin = state.start?.getTime() ?? 0;
        const sliderMax = state.end?.getTime() ?? 0;
        const sliderValue = displayTime?.getTime() ?? sliderMin;
        const boundedSliderValue = Math.min(sliderMax, Math.max(sliderMin, sliderValue));
        const rawProgress = sliderMax > sliderMin ? ((sliderValue - sliderMin) / (sliderMax - sliderMin)) * 100 : 0;
        const sliderProgress = liveMode.isLive ? 100 : Math.min(100, Math.max(0, rawProgress));

        // Theme color
        const theme = (pPanelInfo.theme as ChartTheme) || 'dark';

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

        const hasValidTimelineRange = sliderMax > sliderMin;
        const isTooltipReady = timelineTrackWidth > 0;
        const overlapThresholdPct = 4;
        const showHoverTooltip =
            !liveMode.isLive && !isDraggingSlider && isTimelineHovered && hoverPercent !== null && hoverTime !== null && hasValidTimelineRange && isTooltipReady;
        const hideCurrentTooltip = showHoverTooltip && Math.abs((hoverPercent ?? 0) - sliderProgress) < overlapThresholdPct;
        const showCurrentTooltip = isTooltipReady && !hideCurrentTooltip;
        const currentTooltipLabel = formatTimeLabel(displayTime);
        const hoverTooltipLabel = hoverTime ? formatTimeLabel(hoverTime) : '';
        const timelineEndTime = liveMode.isLive ? liveDisplayTime : state.end;
        const timelineStartLabel = formatTimeLabel(state.start);
        const timelineEndLabel = formatTimeLabel(timelineEndTime);
        const thumbSizePx = 12;
        const thumbLeftPx = timelineTrackWidth > 0 ? Math.max(0, Math.min(timelineTrackWidth - thumbSizePx, (timelineTrackWidth * sliderProgress) / 100 - thumbSizePx / 2)) : 0;

        const handleTimelineMouseMove = useCallback(
            (e: React.MouseEvent<HTMLDivElement>) => {
                if (liveMode.isLive || !hasValidTimelineRange) return;
                const rect = e.currentTarget.getBoundingClientRect();
                if (rect.width <= 0) return;
                const ratio = (e.clientX - rect.left) / rect.width;
                const clampedRatio = Math.min(1, Math.max(0, ratio));
                const hoverMs = sliderMin + clampedRatio * (sliderMax - sliderMin);
                setHoverTime(new Date(hoverMs));
                setHoverPercent(clampedRatio * 100);
                setIsTimelineHovered(true);
            },
            [liveMode.isLive, hasValidTimelineRange, sliderMin, sliderMax]
        );

        const handleTimelineMouseLeave = useCallback(() => {
            setHoverTime(null);
            setHoverPercent(null);
            setIsTimelineHovered(false);
        }, []);

        useEffect(() => {
            if (liveMode.isLive) {
                handleTimelineMouseLeave();
            }
        }, [liveMode.isLive, handleTimelineMouseLeave]);

        useEffect(() => {
            const track = timelineTrackRef.current;
            if (!track) return;

            const updateTrackWidth = () => {
                setTimelineTrackWidth(track.getBoundingClientRect().width);
            };

            updateTrackWidth();

            if (typeof ResizeObserver !== 'undefined') {
                const observer = new ResizeObserver(() => updateTrackWidth());
                observer.observe(track);
                return () => {
                    observer.disconnect();
                };
            }

            window.addEventListener('resize', updateTrackWidth);
            return () => {
                window.removeEventListener('resize', updateTrackWidth);
            };
        }, [isFullscreen]);

        useEffect(() => {
            if (timelineTrackWidth > 0 && Number.isFinite(sliderProgress)) {
                setCurrentTooltipLeftPx((timelineTrackWidth * sliderProgress) / 100);
            } else {
                setCurrentTooltipLeftPx(0);
            }

            if (showHoverTooltip && hoverPercent !== null) {
                setHoverTooltipLeftPx((timelineTrackWidth * hoverPercent) / 100);
            }
        }, [sliderProgress, showHoverTooltip, hoverPercent, hoverTooltipLabel, timelineTrackWidth]);

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
                        {showEventControl && (
                            <div className="notification-icon-wrapper">
                                <IconButton
                                    icon={<MdNotifications size={24} />}
                                    onClick={() => setIsEventModalOpen(!isEventModalOpen)}
                                    aria-label="Events"
                                    variant="ghost"
                                    size="sm"
                                    active={isEventModalOpen}
                                />
                                {events.length > 0 && !isEventModalOpen && <span className="notification-badge" />}
                            </div>
                        )}
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

                {showEventControl && isEventModalOpen && (
                    <EventListModal
                        events={events}
                        onClose={() => setIsEventModalOpen(false)}
                        onSeek={async (time) => {
                            if (liveMode.isLive || liveMode.isConnecting) {
                                liveMode.stopLive();

                                const hasValidRange = !!state.start && !!state.end && state.end.getTime() > state.start.getTime();
                                const windowMs = hasValidRange ? state.end!.getTime() - state.start!.getTime() : DEFAULT_EVENT_WINDOW_MS;

                                let newStartMs = time.getTime() - Math.floor(windowMs / 2);
                                let newEndMs = newStartMs + windowMs;

                                if (state.minTime && state.maxTime) {
                                    const minMs = state.minTime.getTime();
                                    const maxMs = state.maxTime.getTime();
                                    const availableMs = maxMs - minMs;

                                    if (availableMs <= windowMs) {
                                        newStartMs = minMs;
                                        newEndMs = maxMs;
                                    } else {
                                        if (newStartMs < minMs) {
                                            newStartMs = minMs;
                                            newEndMs = minMs + windowMs;
                                        }
                                        if (newEndMs > maxMs) {
                                            newEndMs = maxMs;
                                            newStartMs = maxMs - windowMs;
                                        }
                                    }
                                }

                                await sync.setTimeRange(new Date(newStartMs), new Date(newEndMs));
                            }
                            if (syncEnabled) {
                                sync.pause();
                                await sync.seek(time);
                            } else {
                                await videoPlayer.seekToTime(time);
                            }
                        }}
                    />
                )}

                {/* Video Area */}
                <div
                    ref={videoContainerRef}
                    className="video-container"
                    onMouseMove={isFullscreen ? handleFullscreenMouseMove : undefined}
                    onClick={isFullscreen ? handleFullscreenVideoClick : undefined}
                >
                    <video ref={videoRef} playsInline muted />
                    {/* Draggable Seek Step Control */}
                    {!liveMode.isLive && (
                        <div
                            ref={seekControlRef}
                            className={`seek-control${isManuallyClosed ? ' manually-closed' : ''}${isSeekDropdownOpen ? ' force-visible' : ''}`}
                            style={{
                                ...(seekControlPos === null ? { right: '16px', bottom: '16px' } : { left: `${seekControlPos.x * 100}%`, top: `${seekControlPos.y * 100}%` }),
                            }}
                        >
                            <div
                                className="drag-handle"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    const seekControlEl = seekControlRef.current;
                                    const videoContainerEl = videoContainerRef.current;
                                    if (!seekControlEl || !videoContainerEl) return;

                                    const seekRect = seekControlEl.getBoundingClientRect();
                                    const containerRect = videoContainerEl.getBoundingClientRect();

                                    // Mouse offset within the seek control
                                    const offsetX = e.clientX - seekRect.left;
                                    const offsetY = e.clientY - seekRect.top;

                                    const handleMouseMove = (ev: MouseEvent) => {
                                        const newX = ev.clientX - containerRect.left - offsetX;
                                        const newY = ev.clientY - containerRect.top - offsetY;
                                        const maxX = Math.max(0, containerRect.width - seekRect.width);
                                        const maxY = Math.max(0, containerRect.height - seekRect.height);

                                        const safeX = Math.max(0, Math.min(newX, maxX));
                                        const safeY = Math.max(0, Math.min(newY, maxY));

                                        setSeekControlPos({
                                            x: safeX / containerRect.width,
                                            y: safeY / containerRect.height,
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
                            <IconButton
                                icon={<MdKeyboardDoubleArrowRight size={18} />}
                                onClick={handleNextChunk}
                                aria-label="Next"
                                variant="ghost"
                                size="xsm"
                                className="seek-btn"
                            />
                            <IconButton icon={<Close size={18} />} onClick={() => setIsManuallyClosed(true)} aria-label="Close" variant="ghost" size="xsm" />
                        </div>
                    )}
                </div>

                {/* Center Play Button (Fullscreen Only) */}
                {isFullscreen && (
                    <div className={`centered-play-btn${isFullscreenActive ? ' visible' : ''}`}>{videoPlayer.isPlaying ? <MdPause size={48} /> : <MdPlayArrow size={48} />}</div>
                )}

                {/* Fullscreen Hover Trigger (Invisible area at bottom to show controls) */}
                <div className="fullscreen-hover-trigger" />

                {/* Bottom Controls Bar (always visible) */}
                <div className="controls-bar">
                    <div className="timeline-section">
                        <div className="timeline-top">
                            <div className="timeline-track-row">
                                <span className="timeline-edge-label">{timelineStartLabel}</span>
                                <div className="timeline-track-shell">
                                    <div className="tooltip-lane">
                                        {showCurrentTooltip && (
                                            <div ref={currentTooltipRef} className="current-time-badge" style={{ left: `${currentTooltipLeftPx}px` }}>
                                                {currentTooltipLabel}
                                            </div>
                                        )}
                                        {showHoverTooltip && hoverPercent !== null && (
                                            <div ref={hoverTooltipRef} className="hover-time-badge" style={{ left: `${hoverTooltipLeftPx}px` }}>
                                                {hoverTooltipLabel}
                                            </div>
                                        )}
                                    </div>
                                    <div
                                        ref={timelineTrackRef}
                                        className={`timeline-track ${liveMode.isLive ? 'is-disabled' : ''}`}
                                        onMouseMove={handleTimelineMouseMove}
                                        onMouseLeave={handleTimelineMouseLeave}
                                    >
                                        <div className="timeline-missing-overlay" aria-hidden>
                                            {missingSegments.map((segment, index) => (
                                                <span
                                                    key={`${segment.left.toFixed(3)}-${segment.width.toFixed(3)}-${index}`}
                                                    className="timeline-missing-segment"
                                                    style={{
                                                        left: `${segment.left}%`,
                                                        width: `${segment.width}%`,
                                                        backgroundColor: `rgba(248, 113, 113, ${missingSegmentAlpha})`,
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <div className="timeline-progress" style={{ width: `${liveMode.isLive ? 0 : sliderProgress}%` }} />
                                        <div className="timeline-thumb" style={{ left: `${thumbLeftPx}px` }} />
                                        <input
                                            type="range"
                                            min={sliderMin}
                                            max={sliderMax}
                                            value={boundedSliderValue}
                                            onChange={handleSliderChange}
                                            onMouseDown={handleSliderInteractionStart}
                                            onMouseUp={handleSliderInteractionEnd}
                                            onMouseLeave={handleSliderInteractionEnd}
                                            disabled={liveMode.isLive}
                                        />
                                    </div>
                                </div>
                                <span className="timeline-edge-label">{timelineEndLabel}</span>
                            </div>
                        </div>

                        <div className="timeline-controls-row">
                            <div className="timeline-left-controls">
                                <IconButton
                                    icon={videoPlayer.isPlaying ? <MdPause size={24} /> : <MdPlayArrow size={24} />}
                                    onClick={handlePlayToggle}
                                    disabled={liveMode.isLive || videoPlayer.isProbing}
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
                            <div className="timeline-right-controls">
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
                    </div>
                </div>
                {isTimeRangeModalOpen && (
                    <TimeRangeSelector
                        isOpen={isTimeRangeModalOpen}
                        onClose={() => setIsTimeRangeModalOpen(false)}
                        onApply={handleTimeRangeApply}
                        cameraId={state.camera}
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
