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
import {
    registerVideoPanel,
    unregisterVideoPanel,
    updateVideoPanelEvent,
    updateVideoTime,
    emitVideoCommand,
    correctSyncTime,
    getSyncTimeRangeBase,
    setSyncTimeRangeBase,
    hasSyncPanel,
    clearSyncTimeRangeBase,
    backupNormalTimeRange,
    getBackedUpNormalTimeRange,
} from '@/hooks/useVideoSync';
import { PanelIdParser } from '@/utils/dashboardUtil';
import { formatTimeLabel } from './utils/timeUtils';
import { TimeRangeSelector } from './modals/TimeRangeSelector';
import { IconButton, Dropdown, Badge, Input } from '@/design-system/components';
import { ChartTheme } from '@/type/eChart';
import { ChartThemeTextColor, ChartThemeBackgroundColor } from '@/utils/constants';
import './VideoPanel.scss';

const SYNC_CORRECTION_INTERVAL = 1000; // 1 second
const SYNC_CORRECTION_THRESHOLD = 500; // 500ms
const VideoPanel = forwardRef<VideoPanelHandle, VideoPanelProps>(
    ({ pChartVariableId, pPanelInfo, pBoardInfo: _pBoardInfo, pBoardTimeMinMax, pParentWidth: _pParentWidth, pIsHeader: _pIsHeader }, ref) => {
        const videoRef = useRef<HTMLVideoElement>(null);
        const containerRef = useRef<HTMLDivElement>(null);
        const seekControlRef = useRef<HTMLDivElement>(null);
        const [seekStep, setSeekStep] = useState(10);
        const [seekUnit, setSeekUnit] = useState<'sec' | 'min' | 'hour' | 'frame'>('sec');
        const [seekControlPos, setSeekControlPos] = useState<{ x: number; y: number } | null>(null);
        const [isHovering, setIsHovering] = useState(false);
        const [isManuallyClosed, setIsManuallyClosed] = useState(false);
        const isSeekControlVisible = isHovering && !isManuallyClosed;
        const [isDraggingSlider, setIsDraggingSlider] = useState(false);
        const [isTimeRangeModalOpen, setIsTimeRangeModalOpen] = useState(false);
        const [isFullscreenActive, setIsFullscreenActive] = useState(false);
        const fullscreenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

        const { state, fetchCameras, setTimeRange, setCurrentTime: setStateCurrentTime, setIsPlaying: setStateIsPlaying, setIsLoading: setStateIsLoading } = useVideoState();

        const liveMode = useLiveMode(videoRef);

        const videoPlayer = useVideoPlayer(videoRef, state.camera, state.end, liveMode.isLive || liveMode.isConnecting, (time) => setStateCurrentTime(time));

        // Sync settings
        const syncColor = pPanelInfo.chartOptions?.dependent?.color || '#FB9E00';
        const syncEnabled = pPanelInfo.chartOptions?.source?.enableSync ?? false;
        const dependentPanels = pPanelInfo?.chartOptions?.dependent?.panels ?? [];

        // Apply time range without emitting (for sync from other video panels)
        const applyTimeRange = useCallback(
            async (start: Date, end: Date) => {
                videoPlayer.pause();
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
            },
            [setTimeRange, setStateCurrentTime, state.currentTime, videoPlayer]
        );

        // Extended video player with applyTimeRange for sync
        const videoPlayerWithSync = useMemo(
            () => ({
                ...videoPlayer,
                applyTimeRange,
            }),
            [videoPlayer, applyTimeRange]
        );

        // Create event object for sync
        const createSyncEvent = useCallback(() => {
            if (!videoPlayer.currentTime) return null;
            return {
                originPanelId: pPanelInfo.id,
                panelId: pPanelInfo.id,
                chartVariableId: pChartVariableId,
                currentTime: videoPlayer.currentTime,
                duration: (state.end?.getTime() ?? 0) - (state.start?.getTime() ?? 0),
                isPlaying: videoPlayer.isPlaying,
                color: syncColor,
                dependentPanels,
                sync: syncEnabled,
                isLive: liveMode.isLive,
                start: state.start,
                end: state.end,
            };
        }, [pPanelInfo.id, pChartVariableId, videoPlayer.currentTime, videoPlayer.isPlaying, state.start, state.end, syncColor, dependentPanels, syncEnabled, liveMode.isLive]);

        // Calculate time range from dashboard
        const dashboardTimeRange = useMemo(() => {
            if (!pBoardTimeMinMax) return { start: null, end: null };
            const min = typeof pBoardTimeMinMax.min === 'number' ? new Date(pBoardTimeMinMax.min) : new Date(pBoardTimeMinMax.min);
            const max = typeof pBoardTimeMinMax.max === 'number' ? new Date(pBoardTimeMinMax.max) : new Date(pBoardTimeMinMax.max);
            return {
                start: Number.isNaN(min.getTime()) ? null : min,
                end: Number.isNaN(max.getTime()) ? null : max,
            };
        }, [pBoardTimeMinMax]);

        // Initialize on mount - use dashboard time range
        useEffect(() => {
            const init = async () => {
                setStateIsLoading(true);
                try {
                    const isCurrentlyLiveOrConnecting = liveMode.isLive || liveMode.isConnecting;
                    const sLiveModeOnStart = pPanelInfo?.chartOptions?.source?.liveModeOnStart ?? false;

                    // Always initialize time range from dashboard (regardless of mode)
                    if (dashboardTimeRange.start && dashboardTimeRange.end) {
                        setTimeRange(dashboardTimeRange.start, dashboardTimeRange.end);
                        setStateCurrentTime(dashboardTimeRange.start);
                    }

                    // Always fetch cameras (needed for loadChunk to work after live mode ends)
                    const cameras = await fetchCameras();

                    // Then handle mode-specific logic
                    if (sLiveModeOnStart || isCurrentlyLiveOrConnecting) {
                        liveMode.startLive();
                    } else if (cameras.length > 0 && state.camera && dashboardTimeRange.start) {
                        await videoPlayer.loadChunk(dashboardTimeRange.start);
                    }
                } finally {
                    setStateIsLoading(false);
                }
            };
            init();
        }, [state.camera, dashboardTimeRange, pPanelInfo?.chartOptions?.source?.liveModeOnStart]);

        // Sync states
        useEffect(() => {
            setStateIsPlaying(videoPlayer.isPlaying);
        }, [videoPlayer.isPlaying, setStateIsPlaying]);

        useEffect(() => {
            setStateIsLoading(videoPlayer.isLoading);
        }, [videoPlayer.isLoading, setStateIsLoading]);

        // Register/Unregister video panel (minimal dependencies)
        useEffect(() => {
            const event = createSyncEvent() || {
                originPanelId: pPanelInfo.id,
                panelId: pPanelInfo.id,
                chartVariableId: pChartVariableId,
                currentTime: new Date(),
                duration: 0,
                isPlaying: false,
                color: syncColor,
                dependentPanels,
                sync: syncEnabled,
                isLive: liveMode.isLive,
                start: state.start,
                end: state.end,
            };
            registerVideoPanel(_pBoardInfo.id, event, videoPlayerWithSync);
            return () => {
                unregisterVideoPanel(_pBoardInfo.id, pPanelInfo.id);
            };
        }, [_pBoardInfo.id, pPanelInfo.id]);

        // Update video panel event when options change (without re-register)
        useEffect(() => {
            const event = createSyncEvent() || {
                originPanelId: pPanelInfo.id,
                panelId: pPanelInfo.id,
                chartVariableId: pChartVariableId,
                currentTime: new Date(),
                duration: 0,
                isPlaying: false,
                color: syncColor,
                dependentPanels,
                sync: syncEnabled,
                isLive: liveMode.isLive,
                start: state.start,
                end: state.end,
            };
            updateVideoPanelEvent(_pBoardInfo.id, pPanelInfo.id, event, videoPlayerWithSync, liveMode.isLive);
        }, [syncEnabled, pChartVariableId, syncColor, dependentPanels, videoPlayerWithSync, liveMode.isLive, state.start, state.end]);

        // Track previous mode for mode change detection
        const prevModeRef = useRef<{ sync: boolean; isLive: boolean }>({ sync: syncEnabled, isLive: liveMode.isLive });

        // Handle mode changes (sync/normal/live transitions)
        useEffect(() => {
            const prevSync = prevModeRef.current.sync;
            const prevIsLive = prevModeRef.current.isLive;
            const currSync = syncEnabled;
            const currIsLive = liveMode.isLive;

            // Skip if no mode change
            if (prevSync === currSync && prevIsLive === currIsLive) return;

            // Skip if entering live mode (no time range management needed)
            if (currIsLive) {
                prevModeRef.current = { sync: currSync, isLive: currIsLive };
                return;
            }

            const boardId = _pBoardInfo.id;
            const panelId = pPanelInfo.id;

            // Determine mode transition
            const enteringSync = !prevSync && currSync && !currIsLive;
            const exitingSync = prevSync && !currSync && !currIsLive;
            const exitingLive = prevIsLive && !currIsLive;

            // Normal → Sync: backup current time range, apply sync base
            if (enteringSync && state.start && state.end) {
                // Backup current time range
                backupNormalTimeRange(boardId, panelId, state.start, state.end);

                // Check if sync base exists
                const syncBase = getSyncTimeRangeBase(boardId);
                if (syncBase) {
                    // Apply sync base to this panel
                    applyTimeRange(syncBase.start, syncBase.end);
                } else {
                    // First sync panel - set current time range as sync base
                    setSyncTimeRangeBase(boardId, state.start, state.end);
                }
            }

            // Sync → Normal: restore backed up time range
            if (exitingSync) {
                const backup: { start: Date; end: Date } | null = getBackedUpNormalTimeRange(boardId, panelId);
                if (backup) {
                    applyTimeRange(backup.start, backup.end);
                }

                // Check if any sync panel remains (exclude current panel), if not clear sync base
                if (!hasSyncPanel(boardId, panelId)) {
                    clearSyncTimeRangeBase(boardId);
                }
            }

            // Live → Normal (not sync): restore backed up time range
            if (exitingLive && !currSync) {
                const backup = getBackedUpNormalTimeRange(boardId, panelId);
                if (backup) {
                    applyTimeRange(backup.start, backup.end);
                }
            }

            // Live → Sync: apply sync base
            if (exitingLive && currSync) {
                const syncBase = getSyncTimeRangeBase(boardId);
                if (syncBase) {
                    applyTimeRange(syncBase.start, syncBase.end);
                } else if (state.start && state.end) {
                    // First sync panel after live - set as sync base
                    setSyncTimeRangeBase(boardId, state.start, state.end);
                }
            }

            // Update previous mode ref
            prevModeRef.current = { sync: currSync, isLive: currIsLive };
        }, [syncEnabled, liveMode.isLive, _pBoardInfo.id, pPanelInfo.id, state.start, state.end, applyTimeRange]);

        // Update video time for chart line drawing (skip in live mode)
        useEffect(() => {
            if (!videoPlayer.currentTime || liveMode.isLive) return;

            const event = createSyncEvent();
            if (event) {
                updateVideoTime(_pBoardInfo.id, event);
            }
        }, [videoPlayer.currentTime, _pBoardInfo.id, createSyncEvent, liveMode.isLive]);

        // Periodic sync correction (only when playing and is master)
        useEffect(() => {
            if (!syncEnabled || !videoPlayer.isPlaying) return;

            const intervalId = setInterval(() => {
                if (videoPlayer.currentTime) {
                    correctSyncTime(_pBoardInfo.id, pPanelInfo.id, videoPlayer.currentTime, SYNC_CORRECTION_THRESHOLD);
                }
            }, SYNC_CORRECTION_INTERVAL);

            return () => clearInterval(intervalId);
        }, [syncEnabled, videoPlayer.isPlaying, videoPlayer.currentTime, _pBoardInfo.id, pPanelInfo.id]);

        // Handlers with sync command
        const handlePlayToggle = useCallback(() => {
            if (videoPlayer.isPlaying) {
                videoPlayer.pause();
                if (syncEnabled) {
                    emitVideoCommand(_pBoardInfo.id, pPanelInfo.id, 'pause');
                }
            } else {
                videoPlayer.play();
                if (syncEnabled) {
                    emitVideoCommand(_pBoardInfo.id, pPanelInfo.id, 'play');
                }
            }
        }, [videoPlayer, syncEnabled, _pBoardInfo.id, pPanelInfo.id]);

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
            await videoPlayer.seekToTime(newTime);
            if (syncEnabled) {
                emitVideoCommand(_pBoardInfo.id, pPanelInfo.id, 'seek', newTime);
            }
        }, [videoPlayer, state.currentTime, state.start, getSeekMs, syncEnabled, _pBoardInfo.id, pPanelInfo.id]);

        const handleNextChunk = useCallback(async () => {
            const currentTime = videoPlayer.currentTime || state.currentTime;
            if (!currentTime) return;
            const newTime = new Date(currentTime.getTime() + getSeekMs());
            if (state.end && newTime > state.end) return;
            await videoPlayer.seekToTime(newTime);
            if (syncEnabled) {
                emitVideoCommand(_pBoardInfo.id, pPanelInfo.id, 'seek', newTime);
            }
        }, [videoPlayer, state.currentTime, state.end, getSeekMs, syncEnabled, _pBoardInfo.id, pPanelInfo.id]);

        const handleSliderChange = useCallback(
            async (e: React.ChangeEvent<HTMLInputElement>) => {
                if (liveMode.isLive) return;
                const ms = parseInt(e.target.value, 10);
                if (!Number.isNaN(ms)) {
                    const newTime = new Date(ms);
                    await videoPlayer.seekToTime(newTime);
                    if (syncEnabled) {
                        emitVideoCommand(_pBoardInfo.id, pPanelInfo.id, 'seek', newTime);
                    }
                }
            },
            [videoPlayer, syncEnabled, _pBoardInfo.id, pPanelInfo.id, liveMode.isLive]
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
                videoPlayer.pause();
                liveMode.startLive();
            }
        }, [liveMode, videoPlayer, state.currentTime, state.start, pChartVariableId]); //dependentPanels,

        const handleTimeRangeApply = useCallback(
            async (start: Date, end: Date) => {
                // Pause playback when time range changes to prevent UI sync issues
                videoPlayer.pause();

                setTimeRange(start, end);

                const targetTime = start;
                setStateCurrentTime(targetTime);
                await videoPlayer.loadChunk(targetTime);
                await applyTimeRange(start, end);
                // Update sync base if in sync mode (modal apply can change sync base)
                if (syncEnabled && !liveMode.isLive) {
                    setSyncTimeRangeBase(_pBoardInfo.id, start, end);
                }
            },
            [applyTimeRange, syncEnabled, liveMode.isLive, _pBoardInfo.id]
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
                <div
                    className="video-container"
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                    onMouseMove={isFullscreen ? handleFullscreenMouseMove : undefined}
                    onClick={isFullscreen ? handleFullscreenVideoClick : undefined}
                >
                    <video ref={videoRef} playsInline muted />

                    {/* Draggable Seek Step Control */}
                    <div
                        ref={seekControlRef}
                        className={`seek-control${isSeekControlVisible ? '' : ' hidden'}`}
                        style={{
                            ...(seekControlPos === null ? { right: '16px', bottom: '80px' } : { left: `${seekControlPos.x}px`, top: `${seekControlPos.y}px` }),
                        }}
                    >
                        <div
                            className="drag-handle"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                const seekControlEl = seekControlRef.current;
                                const parentEl = seekControlEl?.parentElement;
                                if (!seekControlEl || !parentEl) return;

                                const seekRect = seekControlEl.getBoundingClientRect();
                                const parentRect = parentEl.getBoundingClientRect();

                                // Mouse offset within the seek control
                                const offsetX = e.clientX - seekRect.left;
                                const offsetY = e.clientY - seekRect.top;

                                const handleMouseMove = (ev: MouseEvent) => {
                                    // Calculate position relative to parent container
                                    const newX = ev.clientX - parentRect.left - offsetX;
                                    const newY = ev.clientY - parentRect.top - offsetY;

                                    // Constrain to parent bounds
                                    const maxX = parentRect.width - seekRect.width;
                                    const maxY = parentRect.height - seekRect.height;

                                    setSeekControlPos({
                                        x: Math.max(0, Math.min(newX, maxX)),
                                        y: Math.max(0, Math.min(newY, maxY)),
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
                        >
                            <Dropdown.Trigger className="dropdown-trigger-sm seek-unit-dropdown" />
                            <Dropdown.Menu className="seek-unit-menu">
                                <Dropdown.List />
                            </Dropdown.Menu>
                        </Dropdown.Root>
                        <IconButton icon={<MdKeyboardDoubleArrowRight size={18} />} onClick={handleNextChunk} aria-label="Next" variant="ghost" size="xsm" className="seek-btn" />
                        <IconButton
                            icon={<Close size={18} />}
                            onClick={() => setIsManuallyClosed(true)}
                            aria-label="Close"
                            variant="ghost"
                            size="xsm"
                            className="close-btn seek-btn"
                        />
                    </div>
                </div>

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
