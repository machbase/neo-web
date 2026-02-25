import { useRef, useEffect, useState, useCallback } from 'react';
import { IconButton, Modal, Input, Dropdown, TextHighlight, Badge } from '@/design-system/components';
import { MdPause, MdPlayArrow, MdSkipPrevious, MdSkipNext, MdDragIndicator, MdKeyboardDoubleArrowLeft, MdKeyboardDoubleArrowRight, Close } from '@/assets/icons/Icon';
import { MdFullscreen, MdFullscreenExit, MdShowChart } from 'react-icons/md';
import { VideoEvent } from '@/components/dashboard/panels/video/hooks/useCameraEvents';
import { useVideoPlayer } from '@/components/dashboard/panels/video/hooks/useVideoPlayer';
import { formatTimeLabel } from '@/components/dashboard/panels/video/utils/timeUtils';
import { useCameraRollupGaps } from '@/components/dashboard/panels/video/hooks/useCameraRollupGaps';
import { getCamera, type CameraInfo } from '@/api/repository/mediaSvr';
import { EventSyncChart } from './EventSyncChart';
import '@/components/dashboard/panels/video/VideoPanel.scss';

export type EventDetailModalProps = {
    isOpen: boolean;
    onClose: () => void;
    event: VideoEvent | null;
    baseUrl?: string;
};

const MISSING_SEGMENT_ALPHA = 0.4;

const EventMediaSection = ({
    cameraId,
    timestamp,
    cameraDetail,
    event,
    rangeMs,
    onChartToggle,
    chartSlot,
}: {
    cameraId: string;
    timestamp: Date;
    cameraDetail: CameraInfo | null;
    event: VideoEvent | null;
    rangeMs: number;
    onChartToggle?: (show: boolean) => void;
    chartSlot?: React.ReactNode;
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const seekControlRef = useRef<HTMLDivElement>(null);
    const timelineTrackRef = useRef<HTMLDivElement>(null);
    const currentTooltipRef = useRef<HTMLDivElement>(null);
    const hoverTooltipRef = useRef<HTMLDivElement>(null);
    const fullscreenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [currentTime, setCurrentTime] = useState<Date | null>(null);
    const [isDraggingSlider, setIsDraggingSlider] = useState(false);
    const [timelineTrackWidth, setTimelineTrackWidth] = useState(0);

    // Shift Window: mutable time range
    const [rangeStart, setRangeStart] = useState(() => new Date(timestamp.getTime() - rangeMs));
    const [rangeEnd, setRangeEnd] = useState(() => new Date(timestamp.getTime() + rangeMs));

    // Seek Step Control
    const [seekStep, setSeekStep] = useState(10);
    const [seekUnit, setSeekUnit] = useState<'sec' | 'min' | 'hour' | 'frame'>('sec');
    const [seekControlPos, setSeekControlPos] = useState<{ x: number; y: number } | null>(null);
    const [isManuallyClosed, setIsManuallyClosed] = useState(false);
    const [isSeekDropdownOpen, setIsSeekDropdownOpen] = useState(false);

    // Hover Tooltip
    const [hoverTime, setHoverTime] = useState<Date | null>(null);
    const [hoverPercent, setHoverPercent] = useState<number | null>(null);
    const [isTimelineHovered, setIsTimelineHovered] = useState(false);
    const [currentTooltipLeftPx, setCurrentTooltipLeftPx] = useState(0);
    const [hoverTooltipLeftPx, setHoverTooltipLeftPx] = useState(0);

    // Probe Preview
    const [probePreviewTime, setProbePreviewTime] = useState<Date | null>(null);

    // Synthetic timer for gap regions (advances at 1x real-time speed when probing with no video)
    const syntheticTimeRef = useRef<Date | null>(null);
    const [syntheticTime, setSyntheticTime] = useState<Date | null>(null);

    // Chart Panel - delay mount until CSS transition completes
    const [showChart, setShowChart] = useState(false);
    const [chartMounted, setChartMounted] = useState(false);

    useEffect(() => {
        if (showChart) {
            const timer = setTimeout(() => setChartMounted(true), 350);
            return () => clearTimeout(timer);
        }
        setChartMounted(false);
    }, [showChart]);

    // Fullscreen
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isFullscreenActive, setIsFullscreenActive] = useState(false);

    const hasChartData = !isFullscreen && !!cameraDetail?.save_objects;

    // Probe callbacks
    const handleProbeProgress = useCallback(
        (time: Date) => {
            if (isDraggingSlider) return;
            setProbePreviewTime(time);
        },
        [isDraggingSlider]
    );

    const handleProbeStateChange = useCallback((isProbing: boolean) => {
        if (!isProbing) {
            setProbePreviewTime(null);
        }
    }, []);

    const handleTimeUpdate = useCallback((time: Date) => {
        setCurrentTime(time);
    }, []);

    const videoPlayer = useVideoPlayer(videoRef, cameraId, rangeEnd, false, {
        onTimeUpdate: handleTimeUpdate,
        onProbeProgress: handleProbeProgress,
        onProbeStateChange: handleProbeStateChange,
    });

    // Gap region synthetic timer: advance displayed time at 1x speed while probing (no video data)
    useEffect(() => {
        if (!videoPlayer.isProbing || videoPlayer.isPlaying) {
            syntheticTimeRef.current = null;
            setSyntheticTime(null);
            return;
        }

        const startTime = probePreviewTime || videoPlayer.currentTime || currentTime || rangeStart;
        syntheticTimeRef.current = startTime;
        setSyntheticTime(startTime);

        const interval = setInterval(() => {
            if (!syntheticTimeRef.current) return;
            const next = new Date(syntheticTimeRef.current.getTime() + 1000);
            if (next.getTime() > rangeEnd.getTime()) {
                clearInterval(interval);
                return;
            }
            syntheticTimeRef.current = next;
            setSyntheticTime(next);
        }, 1000);

        return () => clearInterval(interval);
    }, [videoPlayer.isProbing, videoPlayer.isPlaying]);

    // Missing Data Segments
    const missingSegments = useCameraRollupGaps(cameraId, rangeStart, rangeEnd, true);

    useEffect(() => {
        videoPlayer.loadChunk(timestamp);
    }, [cameraId, timestamp]);

    // Update range when timestamp/rangeMs changes
    useEffect(() => {
        setRangeStart(new Date(timestamp.getTime() - rangeMs));
        setRangeEnd(new Date(timestamp.getTime() + rangeMs));
    }, [timestamp, rangeMs]);

    const handleChartSeek = useCallback(
        (time: Date) => {
            videoPlayer.seekToTime(time);
        },
        [videoPlayer.seekToTime]
    );

    const handlePlayToggle = useCallback(() => {
        if (videoPlayer.isProbing || videoPlayer.isLoading) return;
        if (videoPlayer.isPlaying) {
            videoPlayer.pause();
        } else {
            videoPlayer.play();
        }
    }, [videoPlayer.isPlaying, videoPlayer.isProbing, videoPlayer.isLoading]);

    // Seek Step: getSeekMs
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
        const ct = videoPlayer.currentTime || currentTime;
        if (!ct) return;
        const newTime = new Date(Math.max(rangeStart.getTime(), ct.getTime() - getSeekMs()));
        await videoPlayer.seekToTime(newTime);
    }, [videoPlayer, currentTime, rangeStart, getSeekMs]);

    const handleNextChunk = useCallback(async () => {
        const ct = videoPlayer.currentTime || currentTime;
        if (!ct) return;
        const newTime = new Date(Math.min(rangeEnd.getTime(), ct.getTime() + getSeekMs()));
        await videoPlayer.seekToTime(newTime);
    }, [videoPlayer, currentTime, rangeEnd, getSeekMs]);

    // Shift Window
    const handleShiftWindow = useCallback(
        async (direction: 'prev' | 'next') => {
            const duration = rangeEnd.getTime() - rangeStart.getTime();
            const shiftMs = direction === 'prev' ? -duration : duration;

            const newStart = new Date(rangeStart.getTime() + shiftMs);
            const newEnd = new Date(rangeEnd.getTime() + shiftMs);

            videoPlayer.pause();
            setRangeStart(newStart);
            setRangeEnd(newEnd);
            setCurrentTime(newStart);
            await videoPlayer.loadChunk(newStart);
        },
        [rangeStart, rangeEnd, videoPlayer]
    );

    const handleSliderChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const ms = parseInt(e.target.value, 10);
            if (!Number.isNaN(ms)) {
                await videoPlayer.seekToTime(new Date(ms));
            }
        },
        [videoPlayer]
    );

    const handleSliderInteractionStart = useCallback(() => {
        setIsDraggingSlider(true);
        if (videoPlayer.isPlaying) videoPlayer.pause();
    }, [videoPlayer]);

    const handleSliderInteractionEnd = useCallback(() => {
        setIsDraggingSlider(false);
    }, []);

    // Fullscreen
    const handleFullscreen = useCallback(() => {
        const target = containerRef.current as any;
        if (!target) return;
        if ((document as any).webkitFullscreenElement) {
            (document as any).webkitExitFullscreen();
        } else {
            if (target.webkitRequestFullscreen) {
                target.webkitRequestFullscreen();
            } else if (target.requestFullscreen) {
                target.requestFullscreen();
            }
        }
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFs = !!((document as any).webkitFullscreenElement || document.fullscreenElement);
            setIsFullscreen(isFs);
            if (!isFs) {
                setIsFullscreenActive(false);
                if (fullscreenTimeoutRef.current) clearTimeout(fullscreenTimeoutRef.current);
            }
        };
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    const handleFullscreenMouseMove = useCallback(() => {
        if (!isFullscreen) return;
        setIsFullscreenActive(true);
        if (fullscreenTimeoutRef.current) clearTimeout(fullscreenTimeoutRef.current);
        fullscreenTimeoutRef.current = setTimeout(() => {
            setIsFullscreenActive(false);
        }, 1000);
    }, [isFullscreen]);

    const handleFullscreenVideoClick = useCallback(() => {
        if (!isFullscreen) return;
        handlePlayToggle();
    }, [isFullscreen, handlePlayToggle]);

    // Timeline track width observer
    useEffect(() => {
        const track = timelineTrackRef.current;
        if (!track) return;
        const updateWidth = () => setTimelineTrackWidth(track.getBoundingClientRect().width);
        updateWidth();
        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(updateWidth);
            observer.observe(track);
            return () => observer.disconnect();
        }
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, [isFullscreen]);

    // Hover Tooltip handlers
    const sliderMin = rangeStart.getTime();
    const sliderMax = rangeEnd.getTime();
    const hasValidTimelineRange = sliderMax > sliderMin;

    const handleTimelineMouseMove = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (!hasValidTimelineRange) return;
            const rect = e.currentTarget.getBoundingClientRect();
            if (rect.width <= 0) return;
            const ratio = (e.clientX - rect.left) / rect.width;
            const clampedRatio = Math.min(1, Math.max(0, ratio));
            const hoverMs = sliderMin + clampedRatio * (sliderMax - sliderMin);
            setHoverTime(new Date(hoverMs));
            setHoverPercent(clampedRatio * 100);
            setIsTimelineHovered(true);
        },
        [hasValidTimelineRange, sliderMin, sliderMax]
    );

    const handleTimelineMouseLeave = useCallback(() => {
        setHoverTime(null);
        setHoverPercent(null);
        setIsTimelineHovered(false);
    }, []);

    // Computed slider values
    const baseDisplayTime = videoPlayer.currentTime || currentTime;
    const displayTime = !isDraggingSlider && syntheticTime
        ? syntheticTime
        : !isDraggingSlider && probePreviewTime
            ? probePreviewTime
            : baseDisplayTime;
    const sliderValue = displayTime?.getTime() ?? sliderMin;
    const boundedSliderValue = Math.min(sliderMax, Math.max(sliderMin, sliderValue));
    const sliderProgress = sliderMax > sliderMin ? ((sliderValue - sliderMin) / (sliderMax - sliderMin)) * 100 : 0;
    const clampedProgress = Math.min(100, Math.max(0, sliderProgress));
    const thumbSizePx = 12;
    const thumbLeftPx = timelineTrackWidth > 0 ? Math.max(0, Math.min(timelineTrackWidth - thumbSizePx, (timelineTrackWidth * clampedProgress) / 100 - thumbSizePx / 2)) : 0;

    // Tooltip overlap logic
    const isTooltipReady = timelineTrackWidth > 0;
    const overlapThresholdPct = 4;
    const showHoverTooltip = !isDraggingSlider && isTimelineHovered && hoverPercent !== null && hoverTime !== null && hasValidTimelineRange && isTooltipReady;
    const hideCurrentTooltip = showHoverTooltip && Math.abs((hoverPercent ?? 0) - clampedProgress) < overlapThresholdPct;
    const showCurrentTooltip = isTooltipReady && !hideCurrentTooltip;
    const currentTooltipLabel = formatTimeLabel(displayTime);
    const hoverTooltipLabel = hoverTime ? formatTimeLabel(hoverTime) : '';

    // Tooltip positioning effect
    useEffect(() => {
        if (timelineTrackWidth > 0 && Number.isFinite(clampedProgress)) {
            setCurrentTooltipLeftPx((timelineTrackWidth * clampedProgress) / 100);
        } else {
            setCurrentTooltipLeftPx(0);
        }
        if (showHoverTooltip && hoverPercent !== null) {
            setHoverTooltipLeftPx((timelineTrackWidth * hoverPercent) / 100);
        }
    }, [clampedProgress, showHoverTooltip, hoverPercent, timelineTrackWidth]);

    return (
        <div style={{ display: 'flex', flexDirection: 'row', width: '100%', height: isFullscreen ? '100%' : '450px', gap: '8px' }}>
            <div
                ref={containerRef}
                className={`video-panel ${isFullscreen ? 'fullscreen' : ''}`}
                style={{ flex: '1 1 50%', minWidth: 0, height: '100%', '--panel-text-color': '#fff', '--panel-bg-color': '#1e1e1e' } as React.CSSProperties}
                onMouseLeave={() => setIsManuallyClosed(false)}
            >
                {/* Video Area */}
                <div
                    ref={videoContainerRef}
                    className="video-container"
                    style={{ minHeight: '350px' }}
                    onMouseMove={isFullscreen ? handleFullscreenMouseMove : undefined}
                    onClick={isFullscreen ? handleFullscreenVideoClick : undefined}
                >
                    <video ref={videoRef} playsInline muted />
                    {videoPlayer.isLoading && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Loading...</span>
                        </div>
                    )}

                    {/* Seek Step Control */}
                    <div
                        ref={seekControlRef}
                        className={`seek-control${isManuallyClosed ? ' manually-closed' : ''}${isSeekDropdownOpen ? ' force-visible' : ''}`}
                        style={seekControlPos === null ? { right: '16px', bottom: '16px' } : { left: `${seekControlPos.x * 100}%`, top: `${seekControlPos.y * 100}%` }}
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
                                const offsetX = e.clientX - seekRect.left;
                                const offsetY = e.clientY - seekRect.top;
                                const handleMouseMove = (ev: MouseEvent) => {
                                    const newX = ev.clientX - containerRect.left - offsetX;
                                    const newY = ev.clientY - containerRect.top - offsetY;
                                    const maxX = Math.max(0, containerRect.width - seekRect.width);
                                    const maxY = Math.max(0, containerRect.height - seekRect.height);
                                    setSeekControlPos({
                                        x: Math.max(0, Math.min(newX, maxX)) / containerRect.width,
                                        y: Math.max(0, Math.min(newY, maxY)) / containerRect.height,
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
                </div>

                {/* Center Play Button (Fullscreen Only) */}
                {isFullscreen && (
                    <div className={`centered-play-btn${isFullscreenActive ? ' visible' : ''}`}>{videoPlayer.isPlaying ? <MdPause size={48} /> : <MdPlayArrow size={48} />}</div>
                )}

                {/* Fullscreen Hover Trigger */}
                <div className="fullscreen-hover-trigger" />

                {/* Controls Bar */}
                <div className="controls-bar">
                    <div className="timeline-section">
                        <div className="timeline-top">
                            <div className="timeline-track-row">
                                <span className="timeline-edge-label">{formatTimeLabel(rangeStart)}</span>
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
                                    <div ref={timelineTrackRef} className="timeline-track" onMouseMove={handleTimelineMouseMove} onMouseLeave={handleTimelineMouseLeave}>
                                        {/* Missing Data Segments */}
                                        <div className="timeline-missing-overlay" aria-hidden>
                                            {missingSegments.map((segment, index) => (
                                                <span
                                                    key={`${segment.left.toFixed(3)}-${segment.width.toFixed(3)}-${index}`}
                                                    className="timeline-missing-segment"
                                                    style={{
                                                        left: `${segment.left}%`,
                                                        width: `${segment.width}%`,
                                                        backgroundColor: `rgba(248, 113, 113, ${MISSING_SEGMENT_ALPHA})`,
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <div className="timeline-progress" style={{ width: `${clampedProgress}%` }} />
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
                                        />
                                    </div>
                                </div>
                                <span className="timeline-edge-label">{formatTimeLabel(rangeEnd)}</span>
                            </div>
                        </div>

                        <div className="timeline-controls-row">
                            <div className="timeline-left-controls">
                                <IconButton
                                    icon={videoPlayer.isPlaying ? <MdPause size={24} /> : <MdPlayArrow size={24} />}
                                    onClick={handlePlayToggle}
                                    disabled={videoPlayer.isProbing}
                                    variant="none"
                                    className="play-btn"
                                    aria-label={videoPlayer.isPlaying ? 'Pause' : 'Play'}
                                />
                                <IconButton
                                    icon={<MdSkipPrevious size={24} />}
                                    onClick={() => handleShiftWindow('prev')}
                                    variant="none"
                                    className="nav-btn"
                                    aria-label="Previous window"
                                />
                                <IconButton icon={<MdSkipNext size={24} />} onClick={() => handleShiftWindow('next')} variant="none" className="nav-btn" aria-label="Next window" />
                            </div>
                            <div className="timeline-right-controls">
                                {hasChartData && (
                                    <IconButton
                                        icon={<MdShowChart size={20} />}
                                        onClick={() => {
                                            const next = !showChart;
                                            setShowChart(next);
                                            onChartToggle?.(next);
                                        }}
                                        aria-label="Toggle Chart"
                                        variant={showChart ? 'primary' : 'secondary'}
                                    />
                                )}
                                <IconButton
                                    icon={isFullscreen ? <MdFullscreenExit size={20} /> : <MdFullscreen size={20} />}
                                    onClick={handleFullscreen}
                                    aria-label="Toggle Fullscreen"
                                    variant="secondary"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {hasChartData && (
                <div
                    style={{
                        flex: showChart ? '1 1 50%' : '0 0 0px',
                        minWidth: 0,
                        height: '100%',
                        overflow: 'hidden',
                        opacity: showChart ? 1 : 0,
                        transition: 'flex 0.3s ease, opacity 0.3s ease',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <div style={{ flex: 1, minHeight: 0 }}>
                        {chartMounted && (
                            <EventSyncChart
                                cameraId={cameraId}
                                event={event}
                                eventTimestamp={timestamp}
                                currentTime={currentTime}
                                isPlaying={videoPlayer.isPlaying}
                                onSeek={handleChartSeek}
                                cameraDetail={cameraDetail}
                                rangeStart={rangeStart}
                                rangeEnd={rangeEnd}
                            />
                        )}
                    </div>
                    {showChart && chartSlot && (
                        <div style={{ flex: 'none', padding: '8px 4px 0' }}>
                            {chartSlot}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const EventDetailModal = ({ isOpen, onClose, event, baseUrl }: EventDetailModalProps) => {
    const [cameraDetail, setCameraDetail] = useState<CameraInfo | null>(null);
    const [isChartOpen, setIsChartOpen] = useState(false);

    // 10 minutes before and after event timestamp
    const rangeMs = 10 * 60 * 1000;


    useEffect(() => {
        if (!isOpen || !event?.cameraId) {
            setCameraDetail(null);
            return;
        }

        getCamera(event.cameraId, baseUrl)
            .then((res) => {
                if (res.success && res.data) {
                    setCameraDetail(res.data);
                }
            })
            .catch(() => {
                setCameraDetail(null);
            });
    }, [isOpen, event?.cameraId]);

    useEffect(() => {
        if (!isOpen) setIsChartOpen(false);
    }, [isOpen]);

    if (!event) return null;

    const metadataContent = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <TextHighlight variant="muted">Camera</TextHighlight>
                    <TextHighlight>{cameraDetail?.name || event.cameraId}</TextHighlight>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <TextHighlight variant="muted">Time</TextHighlight>
                    <TextHighlight>{event.timestamp.toLocaleString()}</TextHighlight>
                </span>
                {event.ruleId && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <TextHighlight variant="muted">Rule</TextHighlight>
                        <TextHighlight>{event.ruleId}</TextHighlight>
                    </span>
                )}
                {event.expressionText && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <TextHighlight variant="muted">Condition</TextHighlight>
                        <TextHighlight variant="warning" style={{ fontFamily: 'monospace' }}>{event.expressionText}</TextHighlight>
                    </span>
                )}
            </div>
            {event.usedCountsSnapshot && Object.keys(event.usedCountsSnapshot).length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextHighlight variant="muted">Detected</TextHighlight>
                    {Object.entries(event.usedCountsSnapshot).map(([obj, count]) => (
                        <Badge key={obj} variant="primary" size="sm">
                            {obj}: {String(count)}
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <Modal.Root isOpen={isOpen} onClose={onClose} style={{ width: isChartOpen ? '80%' : '50%', transition: 'width 0.3s ease' }}>
            <Modal.Header>
                <Modal.Title>
                    <Badge
                        variant={
                            event.valueLabel === 'MATCH' ? 'warning'
                                : event.valueLabel === 'TRIGGER' ? 'primary'
                                : event.valueLabel === 'RESOLVE' ? 'success'
                                : event.valueLabel === 'ERROR' ? 'error'
                                : 'neutral'
                        }
                    >
                        {event.valueLabel}
                    </Badge>
                    Event: <TextHighlight style={{ fontSize: '14px' }}>{event.name}</TextHighlight>
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <Modal.Content style={{ flex: 'none' }}>
                    <EventMediaSection
                        cameraId={event.cameraId}
                        event={event}
                        timestamp={event.timestamp}
                        cameraDetail={cameraDetail}
                        rangeMs={rangeMs}
                        onChartToggle={setIsChartOpen}
                        chartSlot={metadataContent}
                    />
                </Modal.Content>
                {!isChartOpen && (
                    <Modal.Content style={{ flex: 'none' }}>
                        {metadataContent}
                    </Modal.Content>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Modal.Cancel />
            </Modal.Footer>
        </Modal.Root>
    );
};
