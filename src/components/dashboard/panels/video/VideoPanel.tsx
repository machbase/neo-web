// Video Panel - Main Component (New UI Design)

import { useRef, useEffect, useCallback, useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useVideoState } from './hooks/useVideoState';
import { useVideoPlayer } from './hooks/useVideoPlayer';
import { useLiveMode } from './hooks/useLiveMode';
import { VideoPanelProps, VideoPanelHandle } from './types/video';
import { registerVideoPanel, unregisterVideoPanel, updateVideoTime, emitVideoCommand, correctSyncTime } from '@/hooks/useVideoSync';
import { formatTimeLabel } from './utils/timeUtils';
import { TimeRangeSelector } from './modals/TimeRangeSelector';
import { IconButton, Dropdown, Badge } from '@/design-system/components';
import { ChartTheme } from '@/type/eChart';
import { ChartThemeTextColor, ChartThemeBackgroundColor } from '@/utils/constants';
import './VideoPanel.scss';

const SYNC_CORRECTION_INTERVAL = 1000; // 1 second
const SYNC_CORRECTION_THRESHOLD = 500; // 500ms
const VideoPanel = forwardRef<VideoPanelHandle, VideoPanelProps>(({ pChartVariableId, pPanelInfo, pBoardInfo: _pBoardInfo, pBoardTimeMinMax, pParentWidth: _pParentWidth, pIsHeader: _pIsHeader }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const seekControlRef = useRef<HTMLDivElement>(null);
    const [seekStep, setSeekStep] = useState(10);
    const [seekUnit, setSeekUnit] = useState<'sec' | 'min' | 'hour' | 'frame'>('sec');
    const [seekControlPos, setSeekControlPos] = useState<{ x: number; y: number } | null>(null);
    const [isSeekControlVisible, setIsSeekControlVisible] = useState(true);
    const [isDraggingSlider, setIsDraggingSlider] = useState(false);
    const [isTimeRangeModalOpen, setIsTimeRangeModalOpen] = useState(false);

    const { state, fetchCameras, setTimeRange, setCurrentTime: setStateCurrentTime, setIsPlaying: setStateIsPlaying, setIsLoading: setStateIsLoading } = useVideoState();

    const videoPlayer = useVideoPlayer(videoRef, state.camera, (time) => setStateCurrentTime(time));

    const liveMode = useLiveMode(videoRef);

    // Sync settings
    const syncColor = pPanelInfo.titleColor || '#ff0000';
    const syncEnabled = pPanelInfo.videoInfo?.enableSync ?? true;
    const dependentPanels = pPanelInfo?.videoInfo?.dependentPanels ?? [];

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
        };
    }, [pPanelInfo.id, pChartVariableId, videoPlayer.currentTime, videoPlayer.isPlaying, state.start, state.end, syncColor, dependentPanels, syncEnabled]);

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
                const sLiveModeOnStart = pPanelInfo?.videoInfo?.realtimeStream ?? false;

                // Always initialize time range from dashboard (regardless of mode)
                if (dashboardTimeRange.start && dashboardTimeRange.end) {
                    setTimeRange(dashboardTimeRange.start, dashboardTimeRange.end);
                    setStateCurrentTime(dashboardTimeRange.start);
                }

                // Always fetch cameras (needed for loadChunk to work after live mode ends)
                const cameras = await fetchCameras();

                // Then handle mode-specific logic
                if (sLiveModeOnStart) {
                    liveMode.startLive();
                } else if (cameras.length > 0 && state.camera && dashboardTimeRange.start) {
                    await videoPlayer.loadChunk(dashboardTimeRange.start);
                }
            } finally {
                setStateIsLoading(false);
            }
        };
        init();
    }, [state.camera, dashboardTimeRange]);

    // Sync states
    useEffect(() => {
        setStateIsPlaying(videoPlayer.isPlaying);
    }, [videoPlayer.isPlaying, setStateIsPlaying]);

    useEffect(() => {
        setStateIsLoading(videoPlayer.isLoading);
    }, [videoPlayer.isLoading, setStateIsLoading]);

    // Register video panel (always register for chart line drawing)
    useEffect(() => {
        // Register with initial event (create dummy event if currentTime not ready)
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
        };
        registerVideoPanel(_pBoardInfo.id, event, videoPlayer);

        return () => {
            unregisterVideoPanel(_pBoardInfo.id, pPanelInfo.id);
        };
    }, [syncEnabled, _pBoardInfo.id, pPanelInfo.id, pChartVariableId, syncColor, dependentPanels, videoPlayer]);

    // Update video time for chart line drawing (always draw regardless of sync)
    useEffect(() => {
        if (!videoPlayer.currentTime) return;

        const event = createSyncEvent();
        if (event) {
            updateVideoTime(_pBoardInfo.id, event);
        }
    }, [videoPlayer.currentTime, _pBoardInfo.id, createSyncEvent]);

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
    }, [liveMode, videoPlayer, state.currentTime, state.start]);

    const handleTimeRangeApply = useCallback(
        async (start: Date, end: Date) => {
            setTimeRange(start, end);
            // If current time is strictly outside the new range, reset it to start
            if (state.currentTime && (state.currentTime < start || state.currentTime > end)) {
                setStateCurrentTime(start);
            }
            await videoPlayer.loadChunk(start);
        },
        [setTimeRange, setStateCurrentTime, state.currentTime, videoPlayer]
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
        toggleFullscreen: handleFullscreen
    }));

    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!(document as any).webkitFullscreenElement);
        };

        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []);

    // Computed values
    const displayTime = videoPlayer.currentTime || state.currentTime;
    const sliderMin = state.start?.getTime() ?? 0;
    const sliderMax = state.end?.getTime() ?? 0;
    const sliderValue = displayTime?.getTime() ?? sliderMin;
    const sliderProgress = sliderMax > sliderMin ? ((sliderValue - sliderMin) / (sliderMax - sliderMin)) * 100 : 0;

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
            className={`video-panel ${isFullscreen ? 'fullscreen' : ''}`}
            ref={containerRef}
            style={{
                color: textColor,
                '--panel-text-color': textColor,
                '--panel-bg-color': bgColor,
            } as React.CSSProperties}
        >
            {/* Header */}
            <header className="panel-header">
                <div className="header-left">
                    <span className="material-icons-round panel-icon">videocam</span>
                    <span className="panel-title">{pPanelInfo.title || 'Video 1'}</span>
                </div>
                <div className="header-right">
                    {syncEnabled ? (
                        <Badge variant="success" showDot dotColor="primary" size="md">
                            SYNC
                        </Badge>
                    ) : null}
                </div>
            </header>

            {/* Video Area */}
            <div className="video-container">
                <video ref={videoRef} playsInline muted />

                {/* Draggable Seek Step Control */}
                {isSeekControlVisible && (
                    <div
                        ref={seekControlRef}
                        className="seek-control"
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
                            <span className="material-icons-round">drag_indicator</span>
                        </div>
                        <IconButton
                            icon={<span className="material-icons-round">keyboard_double_arrow_left</span>}
                            onClick={handlePrevChunk}
                            aria-label="Previous"
                            variant="ghost"
                            size="xsm"
                            className="seek-btn"
                        />
                        <input type="number" className="seek-input" value={seekStep} onChange={(e) => setSeekStep(Math.max(1, parseInt(e.target.value, 10) || 1))} min={1} />
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
                            <Dropdown.Trigger className="seek-unit-dropdown" />
                            <Dropdown.Menu className="seek-unit-menu">
                                <Dropdown.List />
                            </Dropdown.Menu>
                        </Dropdown.Root>
                        <IconButton
                            icon={<span className="material-icons-round">keyboard_double_arrow_right</span>}
                            onClick={handleNextChunk}
                            aria-label="Next"
                            variant="ghost"
                            size="xsm"
                            className="seek-btn"
                        />
                        <IconButton
                            icon={<span className="material-icons-round">close</span>}
                            onClick={() => setIsSeekControlVisible(false)}
                            aria-label="Close"
                            variant="ghost"
                            size="xsm"
                            className="close-btn seek-btn"
                        />
                    </div>
                )}
            </div>

            {/* Center Hover Zone & Button (Fullscreen Only) */}
            {isFullscreen && (
                <>
                    <div className="center-hover-zone" />
                    <div className="centered-play-btn" onClick={handlePlayToggle}>
                        <span className="material-icons-round">
                            {videoPlayer.isPlaying ? 'pause' : 'play_arrow'}
                        </span>
                    </div>
                </>
            )}

            {/* Fullscreen Hover Trigger (Invisible area at bottom to show controls) */}
            <div className="fullscreen-hover-trigger" />

            {/* Bottom Controls Bar (always visible) */}
            <div className="controls-bar">
                <div className="controls-left">
                    <button className="play-btn" onClick={handlePlayToggle}>
                        <span className="material-icons-round">{videoPlayer.isPlaying ? 'pause' : 'play_arrow'}</span>
                    </button>
                    <button className="nav-btn" disabled>
                        <span className="material-icons-round">skip_previous</span>
                    </button>
                    <button className="nav-btn" disabled>
                        <span className="material-icons-round">skip_next</span>
                    </button>
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
                        />
                    </div>
                </div>

                <div className="controls-right">
                    <IconButton
                        icon={<span className="material-icons-outlined">sensors</span>}
                        onClick={handleLiveToggle}
                        active={liveMode.isLive}
                        toolTipContent="Live"
                        isToolTip
                        aria-label="Toggle Live Mode"
                        variant="secondary"
                    />
                    <IconButton
                        icon={<span className="material-icons-outlined">calendar_month</span>}
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
});

export default VideoPanel;
