// Timeline Bar Component - Ported from viewer-v3.html

import { useMemo, useCallback } from 'react';
import { EventBucket } from '../types/blackbox';
import { formatTimeLabel, toLocalInputValue, formatKST, formatIsoWithMs } from '../utils/timeUtils';
import './TimelineBar.scss';

interface TimelineBarProps {
    start: Date | null;
    end: Date | null;
    currentTime: Date | null;
    currentDisplayTime: string | null;
    eventBuckets: EventBucket[];
    onStartChange: (date: Date | null) => void;
    onEndChange: (date: Date | null) => void;
    onSliderChange: (time: Date) => void;
    onSliderInput?: (time: Date) => void; // For drag preview (no video load)
}

const TimelineBar = ({
    start,
    end,
    currentTime,
    currentDisplayTime,
    eventBuckets,
    onStartChange,
    onEndChange,
    onSliderChange,
    onSliderInput,
}: TimelineBarProps) => {
    const sliderMin = start?.getTime() ?? 0;
    const sliderMax = end?.getTime() ?? 0;
    const sliderValue = currentTime?.getTime() ?? sliderMin;
    const hasValidRange = sliderMax > sliderMin;

    const ticks = useMemo(() => {
        if (!start || !end) return Array(6).fill('--:--:--');
        const total = end.getTime() - start.getTime();
        return Array.from({ length: 6 }, (_, i) => {
            const ratio = i / 5;
            const tickDate = new Date(start.getTime() + ratio * total);
            return formatTimeLabel(tickDate);
        });
    }, [start, end]);

    const eventSegments = useMemo(() => {
        if (!start || !end || !eventBuckets.length) return [];
        const total = end.getTime() - start.getTime();
        if (total <= 0) return [];

        return eventBuckets.map(bucket => {
            const bucketStart = Math.max(bucket.start.getTime(), start.getTime());
            const bucketEnd = Math.min(bucket.end.getTime(), end.getTime());
            if (bucketEnd <= bucketStart) return null;

            const left = ((bucketStart - start.getTime()) / total) * 100;
            const width = ((bucketEnd - bucketStart) / total) * 100;
            const alpha = Math.min(0.9, Math.max(0.2, bucket.intensity));

            return { left, width, alpha };
        }).filter(Boolean);
    }, [start, end, eventBuckets]);

    const handleStartInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value) {
            onStartChange(new Date(value));
        }
    }, [onStartChange]);

    const handleEndInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value) {
            onEndChange(new Date(value));
        }
    }, [onEndChange]);

    // Input event: fires during drag - update UI only, no video load
    const handleSliderInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const ms = parseInt(e.target.value, 10);
        if (!Number.isNaN(ms)) {
            const targetDate = new Date(ms);
            // Just update display, don't trigger video load
            if (onSliderInput) {
                onSliderInput(targetDate);
            }
        }
    }, [onSliderInput]);

    // Change event: fires on drag end or click - trigger video load
    const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const ms = parseInt(e.target.value, 10);
        if (!Number.isNaN(ms)) {
            onSliderChange(new Date(ms));
        }
    }, [onSliderChange]);

    // Mouse move for hover tooltip
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
        if (!start || !end) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0;
        const clampedRatio = Math.min(Math.max(ratio, 0), 1);
        const hoverMs = start.getTime() + clampedRatio * (end.getTime() - start.getTime());
        const hoverDate = new Date(hoverMs);
        const label = formatKST(formatIsoWithMs(hoverDate));
        e.currentTarget.title = label;
    }, [start, end]);

    return (
        <div className="blackbox-timeline-wrapper">
            <div className="timeline-bar">
                <div className="timeline-input timeline-input--start">
                    <input
                        type="datetime-local"
                        value={start ? toLocalInputValue(start) : ''}
                        onChange={handleStartInput}
                        placeholder="시작"
                    />
                </div>
                <div className="timeline-center">
                    <span className="timeline-current">
                        ({currentDisplayTime || '--:--:--.---'})
                    </span>
                    <div className="timeline-events">
                        {eventSegments.map((seg, i) => seg && (
                            <span
                                key={i}
                                className="event-segment"
                                style={{
                                    left: `${seg.left}%`,
                                    width: `${seg.width}%`,
                                    backgroundColor: `rgba(248, 113, 113, ${seg.alpha})`,
                                }}
                            />
                        ))}
                    </div>
                    <input
                        type="range"
                        min={sliderMin}
                        max={sliderMax}
                        value={sliderValue}
                        onInput={handleSliderInput}
                        onChange={handleSliderChange}
                        onMouseMove={handleMouseMove}
                        disabled={!hasValidRange}
                        step={1}
                    />
                    <div className="timeline-scale">
                        {ticks.map((tick, i) => (
                            <span key={i}>{tick}</span>
                        ))}
                    </div>
                </div>
                <div className="timeline-input timeline-input--end">
                    <input
                        type="datetime-local"
                        value={end ? toLocalInputValue(end) : ''}
                        onChange={handleEndInput}
                        placeholder="끝"
                    />
                </div>
            </div>
        </div>
    );
};

export default TimelineBar;
