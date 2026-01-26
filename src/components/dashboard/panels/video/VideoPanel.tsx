// Video Panel - Main Component (New UI Design)

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useVideoState } from './hooks/useVideoState';
import { useVideoPlayer } from './hooks/useVideoPlayer';
import { useLiveMode } from './hooks/useLiveMode';
import { VideoPanelProps } from './types/video';
import { formatTimeLabel } from './utils/timeUtils';
import { TimeRangeSelector } from './modals/TimeRangeSelector';
import { IconButton, Dropdown } from '@/design-system/components';
import { ChartTheme } from '@/type/eChart';
import { ChartThemeTextColor } from '@/utils/constants';
import './VideoPanel.scss';

const VideoPanel = ({ pPanelInfo, pBoardInfo: _pBoardInfo, pBoardTimeMinMax, pParentWidth: _pParentWidth, pIsHeader: _pIsHeader }: VideoPanelProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const seekControlRef = useRef<HTMLDivElement>(null);
    const [seekStep, setSeekStep] = useState(10);
    const [seekUnit, setSeekUnit] = useState<'sec' | 'min' | 'hour' | 'frame'>('sec');
    const [seekControlPos, setSeekControlPos] = useState<{ x: number; y: number } | null>(null);
    const [isSeekControlVisible, setIsSeekControlVisible] = useState(true);
    const [isDraggingSlider, setIsDraggingSlider] = useState(false);
    const [isTimeRangeModalOpen, setIsTimeRangeModalOpen] = useState(false);


    const {
        state,
        fetchCameras,
        setTimeRange,
        setCurrentTime: setStateCurrentTime,
        setIsPlaying: setStateIsPlaying,
        setIsLoading: setStateIsLoading,
    } = useVideoState();

    const videoPlayer = useVideoPlayer(
        videoRef,
        state.camera,
        (time) => setStateCurrentTime(time)
    );

    const liveMode = useLiveMode(videoRef);

    // Calculate time range from dashboard
    const dashboardTimeRange = useMemo(() => {
        if (!pBoardTimeMinMax) return { start: null, end: null };
        const min = typeof pBoardTimeMinMax.min === 'number'
            ? new Date(pBoardTimeMinMax.min)
            : new Date(pBoardTimeMinMax.min);
        const max = typeof pBoardTimeMinMax.max === 'number'
            ? new Date(pBoardTimeMinMax.max)
            : new Date(pBoardTimeMinMax.max);
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
                const cameras = await fetchCameras();
                if (cameras.length > 0 && state.camera && dashboardTimeRange.start && dashboardTimeRange.end) {
                    setTimeRange(dashboardTimeRange.start, dashboardTimeRange.end);
                    setStateCurrentTime(dashboardTimeRange.start);
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

    // Handlers
    const handlePlayToggle = useCallback(() => {
        if (videoPlayer.isPlaying) {
            videoPlayer.pause();
        } else {
            videoPlayer.play();
        }
    }, [videoPlayer]);

    // Calculate seek time based on unit
    const getSeekMs = useCallback(() => {
        switch (seekUnit) {
            case 'frame': return seekStep * (1000 / (videoPlayer.fps || 30));
            case 'sec': return seekStep * 1000;
            case 'min': return seekStep * 60 * 1000;
            case 'hour': return seekStep * 60 * 60 * 1000;
            default: return seekStep * 1000;
        }
    }, [seekStep, seekUnit, videoPlayer.fps]);

    const handlePrevChunk = useCallback(async () => {
        const currentTime = videoPlayer.currentTime || state.currentTime;
        if (!currentTime) return;
        const newTime = new Date(currentTime.getTime() - getSeekMs());
        if (state.start && newTime < state.start) return;
        await videoPlayer.seekToTime(newTime);
    }, [videoPlayer, state.currentTime, state.start, getSeekMs]);

    const handleNextChunk = useCallback(async () => {
        const currentTime = videoPlayer.currentTime || state.currentTime;
        if (!currentTime) return;
        const newTime = new Date(currentTime.getTime() + getSeekMs());
        if (state.end && newTime > state.end) return;
        await videoPlayer.seekToTime(newTime);
    }, [videoPlayer, state.currentTime, state.end, getSeekMs]);

    const handleSliderChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const ms = parseInt(e.target.value, 10);
        if (!Number.isNaN(ms)) {
            await videoPlayer.seekToTime(new Date(ms));
        }
    }, [videoPlayer]);

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

    const handleTimeRangeApply = useCallback(async (start: Date, end: Date) => {
        setTimeRange(start, end);
        // If current time is strictly outside the new range, reset it to start
        if (state.currentTime && (state.currentTime < start || state.currentTime > end)) {
            setStateCurrentTime(start);
        }
        await videoPlayer.loadChunk(start);
    }, [setTimeRange, setStateCurrentTime, state.currentTime, videoPlayer]);

    const handleFullscreen = useCallback(() => {
        const target = containerRef.current;
        if (!target) return;
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            target.requestFullscreen();
        }
    }, []);

    // Computed values
    const displayTime = videoPlayer.currentTime || state.currentTime;
    const sliderMin = state.start?.getTime() ?? 0;
    const sliderMax = state.end?.getTime() ?? 0;
    const sliderValue = displayTime?.getTime() ?? sliderMin;
    const sliderProgress = sliderMax > sliderMin
        ? ((sliderValue - sliderMin) / (sliderMax - sliderMin)) * 100
        : 0;

    // Theme color
    const theme = (pPanelInfo.theme as ChartTheme) || 'dark';
    const textColor = ChartThemeTextColor[theme];

    return (
        <div
            className="video-panel"
            ref={containerRef}
            style={{
                color: textColor,
                '--panel-text-color': textColor,
            } as React.CSSProperties}
        >
            {/* Header */}
            <header className="panel-header">
                <div className="header-left">
                    <span className="material-icons-round panel-icon">videocam</span>
                    <span className="panel-title">{pPanelInfo.title || 'Video 1'}</span>
                </div>
                <div className="header-right">
                    {liveMode.isLive && (
                        <div className="sync-badge">
                            <div className="sync-dot" />
                            <span>SYNC</span>
                        </div>
                    )}
                    <IconButton
                        icon={<span className="material-icons-round">fullscreen</span>}
                        onClick={handleFullscreen}
                        isToolTip={false}
                        aria-label="Fullscreen"
                        variant="secondary"
                    />
                </div>
            </header>

            {/* Video Area */}
            <div className="video-container">
                <video
                    ref={videoRef}
                    playsInline
                    muted
                />

                {/* Draggable Seek Step Control */}
                {isSeekControlVisible && (
                    <div
                        ref={seekControlRef}
                        className="seek-control"
                        style={{
                            ...(seekControlPos === null
                                ? { right: '16px', bottom: '80px' }
                                : { left: `${seekControlPos.x}px`, top: `${seekControlPos.y}px` }
                            ),
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
                            aria-label="이전"
                            variant="ghost"
                            size="xsm"
                            className="seek-btn"
                        />
                        <input
                            type="number"
                            className="seek-input"
                            value={seekStep}
                            onChange={(e) => setSeekStep(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            min={1}
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
                            <Dropdown.Trigger className="seek-unit-dropdown" />
                            <Dropdown.Menu className="seek-unit-menu">
                                <Dropdown.List />
                            </Dropdown.Menu>
                        </Dropdown.Root>
                        <IconButton
                            icon={<span className="material-icons-round">keyboard_double_arrow_right</span>}
                            onClick={handleNextChunk}
                            aria-label="다음"
                            variant="ghost"
                            size="xsm"
                            className="seek-btn"
                        />
                        <IconButton
                            icon={<span className="material-icons-round">close</span>}
                            onClick={() => setIsSeekControlVisible(false)}
                            aria-label="닫기"
                            variant="ghost"
                            size="xsm"
                            className="close-btn seek-btn"
                        />
                    </div>
                )}
            </div>

            {/* Bottom Controls Bar (always visible) */}
            <div className="controls-bar">
                <div className="controls-left">
                    <button className="play-btn" onClick={handlePlayToggle}>
                        <span className="material-icons-round">
                            {videoPlayer.isPlaying ? 'pause' : 'play_arrow'}
                        </span>
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
                            onMouseDown={() => setIsDraggingSlider(true)}
                            onMouseUp={() => setIsDraggingSlider(false)}
                            onMouseLeave={() => setIsDraggingSlider(false)}
                        />
                    </div>
                </div>

                <div className="controls-right">
                    <IconButton
                        icon={<span className="material-icons-outlined">sensors</span>}
                        onClick={handleLiveToggle}
                        active={liveMode.isLive}
                        toolTipContent="실시간"
                        isToolTip
                        aria-label="Toggle Live Mode"
                        variant="secondary"
                    />
                    <IconButton
                        icon={<span className="material-icons-outlined">calendar_month</span>}
                        onClick={() => setIsTimeRangeModalOpen(true)}
                        toolTipContent="시간 범위"
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
};

export default VideoPanel;
