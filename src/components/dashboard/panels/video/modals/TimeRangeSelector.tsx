import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { MdCalendarToday } from '@/assets/icons/Icon';
import { Modal, Dropdown, Button, Input } from '@/design-system/components';
import './TimeRangeSelector.scss';

interface TimeRangeSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (start: Date, end: Date) => void;
    initialStartTime: Date | null;
    initialEndTime: Date | null;
    minTime: Date | null;
    maxTime: Date | null;
}

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
    isOpen,
    onClose,
    onApply,
    initialStartTime,
    initialEndTime,
    minTime,
    maxTime,
}) => {
    // Internal Date objects
    const [startDateTime, setStartDateTime] = useState<Date>(new Date());
    const [endDateTime, setEndDateTime] = useState<Date>(new Date());

    // Split input fields for Start
    const [startYear, setStartYear] = useState('2023');
    const [startMonth, setStartMonth] = useState('10');
    const [startDay, setStartDay] = useState('27');
    const [startHour, setStartHour] = useState('02');
    const [startMinute, setStartMinute] = useState('30');
    const [startSecond, setStartSecond] = useState('00');

    // Split input fields for End
    const [endYear, setEndYear] = useState('2023');
    const [endMonth, setEndMonth] = useState('10');
    const [endDay, setEndDay] = useState('27');
    const [endHour, setEndHour] = useState('13');
    const [endMinute, setEndMinute] = useState('15');
    const [endSecond, setEndSecond] = useState('00');

    // Presets state
    const [presetInput, setPresetInput] = useState('5m');


    // Popup state
    const [activePopup, setActivePopup] = useState<'start' | 'end' | null>(null);

    // Timeline Drag State
    const timelineRef = useRef<HTMLDivElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState<'selection' | 'left' | 'right' | null>(null);
    const dragStartX = useRef<number>(0);
    const dragStartDates = useRef<{ start: Date; end: Date } | null>(null);

    // Master Timeline Range
    const availableMin = useMemo(() => minTime || new Date(new Date().getTime() - 24 * 60 * 60 * 1000), [minTime]);
    const availableMax = useMemo(() => maxTime || new Date(), [maxTime]);

    // Initialize state when modal opens
    useEffect(() => {
        if (isOpen) {
            let start = initialStartTime;
            let end = initialEndTime;

            if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
                end = new Date();
                start = new Date(end.getTime() - 6 * 60 * 60 * 1000); // 6 hours ago
            }

            if (start > end) {
                [start, end] = [end, start];
            }

            // Clamp to available range
            if (availableMin && start < availableMin) start = availableMin;
            if (availableMax && end > availableMax) end = availableMax;

            // Ensure min duration if clamped
            if (start >= end) {
                start = new Date(end.getTime() - 60 * 1000); // 1 min duration
                if (availableMin && start < availableMin) start = availableMin;
            }

            updateAllFromDates(start, end);
        }
    }, [isOpen, initialStartTime, initialEndTime, availableMin, availableMax]);

    // Click outside to close popup and dropdown
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            // Check if click is inside the popup
            const isInsidePopup = popupRef.current && popupRef.current.contains(e.target as Node);

            // Check if click is inside the portal dropdown (which is physically outside the popup)
            const isInsidePortal = (e.target as Element).closest('.preset-dropdown-menu-portal');

            if (activePopup && !isInsidePopup && !isInsidePortal) {
                setActivePopup(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activePopup]);

    const updateAllFromDates = (start: Date, end: Date) => {
        setStartDateTime(new Date(start));
        setEndDateTime(new Date(end));

        // Update split fields for Start
        setStartYear(String(start.getFullYear()));
        setStartMonth(String(start.getMonth() + 1).padStart(2, '0'));
        setStartDay(String(start.getDate()).padStart(2, '0'));
        setStartHour(String(start.getHours()).padStart(2, '0'));
        setStartMinute(String(start.getMinutes()).padStart(2, '0'));
        setStartSecond(String(start.getSeconds()).padStart(2, '0'));

        // Update split fields for End
        setEndYear(String(end.getFullYear()));
        setEndMonth(String(end.getMonth() + 1).padStart(2, '0'));
        setEndDay(String(end.getDate()).padStart(2, '0'));
        setEndHour(String(end.getHours()).padStart(2, '0'));
        setEndMinute(String(end.getMinutes()).padStart(2, '0'));
        setEndSecond(String(end.getSeconds()).padStart(2, '0'));
    };

    const buildDateFromFields = (
        year: string, month: string, day: string,
        hour: string, minute: string, second: string
    ): Date => {
        return new Date(
            parseInt(year) || 2023,
            (parseInt(month) || 1) - 1,
            parseInt(day) || 1,
            parseInt(hour) || 0,
            parseInt(minute) || 0,
            parseInt(second) || 0
        );
    };

    const syncStartFromFields = () => {
        const newStart = buildDateFromFields(startYear, startMonth, startDay, startHour, startMinute, startSecond);
        if (!isNaN(newStart.getTime())) {
            setStartDateTime(newStart);
        }
    };

    const syncEndFromFields = () => {
        const newEnd = buildDateFromFields(endYear, endMonth, endDay, endHour, endMinute, endSecond);
        if (!isNaN(newEnd.getTime())) {
            setEndDateTime(newEnd);
        }
    };

    // Time conversion helpers
    const timeToPercent = (date: Date) => {
        const minMs = availableMin.getTime();
        const maxMs = availableMax.getTime();
        const totalMs = maxMs - minMs;
        if (totalMs <= 0) return 0;
        const percent = ((date.getTime() - minMs) / totalMs) * 100;
        return Math.max(0, Math.min(100, percent));
    };

    // Format for Window Range display
    const formatWindowRange = (date: Date) => {
        const y = String(date.getFullYear()).slice(-2);
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        const ss = String(date.getSeconds()).padStart(2, '0');
        return `${y}/${m}/${d} ${hh}:${mm}:${ss}`;
    };

    // Format for timeline tick labels
    const formatTickLabel = (date: Date, index: number, total: number) => {
        const month = date.toLocaleString('en', { month: 'short' });
        const day = date.getDate();
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');

        // First and last: show date, middle: show time
        if (index === 0 || index === total - 1) {
            return `${month} ${day}`;
        }
        return `${hour}:${minute}`;
    };

    // Generate 5 tick labels
    const getTickLabels = () => {
        const labels = [];
        const minMs = availableMin.getTime();
        const maxMs = availableMax.getTime();
        const count = 5;

        for (let i = 0; i < count; i++) {
            const ratio = i / (count - 1);
            const ms = minMs + ratio * (maxMs - minMs);
            const date = new Date(ms);
            labels.push({
                text: formatTickLabel(date, i, count),
                percent: ratio * 100
            });
        }
        return labels;
    };

    // Drag handlers
    const handleMouseDown = (e: React.MouseEvent, type: 'selection' | 'left' | 'right') => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(type);
        dragStartX.current = e.clientX;
        dragStartDates.current = { start: new Date(startDateTime), end: new Date(endDateTime) };
        document.body.style.cursor = type === 'selection' ? 'grabbing' : 'col-resize';

        // Show popup for the handle being dragged
        if (type === 'left') {
            setActivePopup('start');
        } else if (type === 'right') {
            setActivePopup('end');
        }
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !timelineRef.current || !dragStartDates.current) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const totalMs = availableMax.getTime() - availableMin.getTime();
        if (totalMs <= 0 || rect.width <= 0) return;

        const deltaPx = e.clientX - dragStartX.current;
        const deltaMs = (deltaPx / rect.width) * totalMs;

        let newStartMs = dragStartDates.current.start.getTime();
        let newEndMs = dragStartDates.current.end.getTime();

        if (isDragging === 'selection') {
            newStartMs += deltaMs;
            newEndMs += deltaMs;
            const duration = newEndMs - newStartMs;
            if (newStartMs < availableMin.getTime()) {
                newStartMs = availableMin.getTime();
                newEndMs = newStartMs + duration;
            }
            if (newEndMs > availableMax.getTime()) {
                newEndMs = availableMax.getTime();
                newStartMs = newEndMs - duration;
            }
        } else if (isDragging === 'left') {
            newStartMs += deltaMs;
            if (newStartMs < availableMin.getTime()) newStartMs = availableMin.getTime();
            if (newStartMs >= newEndMs) newStartMs = newEndMs - 1000;
        } else if (isDragging === 'right') {
            newEndMs += deltaMs;
            if (newEndMs > availableMax.getTime()) newEndMs = availableMax.getTime();
            if (newEndMs <= newStartMs) newEndMs = newStartMs + 1000;
        }

        updateAllFromDates(new Date(newStartMs), new Date(newEndMs));
    }, [isDragging, availableMin, availableMax]);

    const handleMouseUp = useCallback(() => {
        if (isDragging) {
            setIsDragging(null);
            document.body.style.cursor = '';
        }
    }, [isDragging]);

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    // Preset handlers
    const parseDuration = (input: string): number | null => {
        const match = input.match(/[+]?\s*(\d+)\s*([a-zA-Z]+)/);
        if (!match) return null;

        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();

        let multiplier = 0;
        switch (unit) {
            case 's': multiplier = 1000; break;
            case 'm': multiplier = 60 * 1000; break;
            case 'h': multiplier = 60 * 60 * 1000; break;
            case 'd': multiplier = 24 * 60 * 60 * 1000; break;
            case 'w': multiplier = 7 * 24 * 60 * 60 * 1000; break;
            case 'mo': multiplier = 30 * 24 * 60 * 60 * 1000; break;
            case 'y': multiplier = 365 * 24 * 60 * 60 * 1000; break;
            default: return null;
        }

        return value * multiplier;
    };

    const handlePresetApply = (type: 'start' | 'end') => {
        const ms = parseDuration(presetInput);
        if (ms !== null) {
            let newStart = startDateTime;
            let newEnd = endDateTime;

            if (type === 'start') {
                // Determine Start based on current End
                const targetStartMs = endDateTime.getTime() - ms;
                newStart = new Date(targetStartMs);
                newEnd = endDateTime;
            } else {
                // Determine End based on current Start
                const targetEndMs = startDateTime.getTime() + ms;
                newEnd = new Date(targetEndMs);
                newStart = startDateTime;
            }

            // Clamp to available range logic could go here if needed, 
            // but updateAllFromDates will receive these raw values. 
            // It's better to ensure they are valid before setting.
            if (availableMin && newStart < availableMin) newStart = availableMin;
            if (availableMax && newEnd > availableMax) newEnd = availableMax;

            // Ensure we don't flip (though logical deduction says we shouldn't if ms > 0)
            if (newStart > newEnd) {
                // In case of extreme clamping
                if (type === 'start') newStart = newEnd;
                else newEnd = newStart;
            }

            updateAllFromDates(newStart, newEnd);
        }
    };



    const handleApply = () => {
        if (!isNaN(startDateTime.getTime()) && !isNaN(endDateTime.getTime())) {
            onApply(startDateTime, endDateTime);
            onClose();
        }
    };

    const PRESET_OPTIONS = [
        { label: '5 seconds (5s)', value: '5s' },
        { label: '10 seconds (10s)', value: '10s' },
        { label: '5 minutes (5m)', value: '5m' },
        { label: '10 minutes (10m)', value: '10m' },
        { label: '15 minutes (15m)', value: '15m' },
        { label: '1 hour (1h)', value: '1h' },
        { label: '3 hour (3h)', value: '3h' },
    ];



    // Real-time sync effects
    useEffect(() => {
        syncStartFromFields();
    }, [startYear, startMonth, startDay, startHour, startMinute, startSecond]);

    useEffect(() => {
        syncEndFromFields();
    }, [endYear, endMonth, endDay, endHour, endMinute, endSecond]);

    // Render popup panel
    const renderPopup = (type: 'start' | 'end') => {
        const isStart = type === 'start';
        const year = isStart ? startYear : endYear;
        const month = isStart ? startMonth : endMonth;
        const day = isStart ? startDay : endDay;
        const hour = isStart ? startHour : endHour;
        const minute = isStart ? startMinute : endMinute;
        const second = isStart ? startSecond : endSecond;

        const setYear = isStart ? setStartYear : setEndYear;
        const setMonth = isStart ? setStartMonth : setEndMonth;
        const setDay = isStart ? setStartDay : setEndDay;
        const setHour = isStart ? setStartHour : setEndHour;
        const setMinute = isStart ? setStartMinute : setEndMinute;
        const setSecond = isStart ? setStartSecond : setEndSecond;
        // onBlur is no longer strictly needed for sync, but harmless to keep or remove. Keeping for safety?
        // Actually removing it makes it clearer that sync is automated.

        return (
            <div className={`datetime-popup ${type}`} ref={popupRef}>
                <div className="popup-header">
                    <MdCalendarToday size={18} />
                    <span>{isStart ? 'START' : 'END'} DATE & TIME</span>
                </div>

                <div className="date-inputs">
                    <div className="field">
                        <Input
                            type="text"
                            value={year}
                            onChange={(e) => { setYear(e.target.value); }}
                            maxLength={4}
                            fullWidth
                            helperText="YYYY"
                            className="aligned-input"
                        />
                    </div>
                    <div className="field">
                        <Input
                            type="text"
                            value={month}
                            onChange={(e) => { setMonth(e.target.value); }}
                            maxLength={2}
                            fullWidth
                            helperText="MM"
                            className="aligned-input"
                        />
                    </div>
                    <div className="field">
                        <Input
                            type="text"
                            value={day}
                            onChange={(e) => { setDay(e.target.value); }}
                            maxLength={2}
                            fullWidth
                            helperText="DD"
                            className="aligned-input"
                        />
                    </div>
                </div>

                <div className="time-inputs">
                    <div className="field">
                        <Input
                            type="text"
                            value={hour}
                            onChange={(e) => { setHour(e.target.value); }}
                            maxLength={2}
                            fullWidth
                            helperText="HH"
                            className="aligned-input"
                        />
                    </div>
                    <span className="separator">:</span>
                    <div className="field">
                        <Input
                            type="text"
                            value={minute}
                            onChange={(e) => { setMinute(e.target.value); }}
                            maxLength={2}
                            fullWidth
                            helperText="MM"
                            className="aligned-input"
                        />
                    </div>
                    <span className="separator">:</span>
                    <div className="field">
                        <Input
                            type="text"
                            value={second}
                            onChange={(e) => { setSecond(e.target.value); }}
                            maxLength={2}
                            fullWidth
                            helperText="SS"
                            className="aligned-input"
                        />
                    </div>
                </div>

                <div className="presets-section">
                    <div className="presets-header">
                        <span>PRESETS</span>
                    </div>
                    <div className="hybrid-preset-container">
                        <div style={{ width: '200px' }}>
                            <Dropdown.Root
                                options={PRESET_OPTIONS}
                                value={presetInput}
                                onChange={(val) => setPresetInput(val as string)}
                                placeholder="Select preset"
                            >
                                <Dropdown.Trigger style={{ height: '36px' }} />
                                <Dropdown.Menu className="preset-dropdown-menu-portal">
                                    <Dropdown.List />
                                </Dropdown.Menu>
                            </Dropdown.Root>
                        </div>
                        <Button className="preset-apply-btn" onClick={() => handlePresetApply(type)} style={{ height: '36px' }}>
                            Apply
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    // Render timeline
    const renderTimeline = () => {
        const startPercent = timeToPercent(startDateTime);
        const endPercent = timeToPercent(endDateTime);
        const widthPercent = Math.max(1, endPercent - startPercent);
        const tickLabels = getTickLabels();

        return (
            <div className="timeline-container">


                <div className="timeline-header">
                    <span className="timeline-label">MASTER TIMELINE</span>
                    <span className="window-range">
                        Window Range: <span className="range-value">{formatWindowRange(startDateTime)} - {formatWindowRange(endDateTime)}</span>
                    </span>
                </div>

                <div className={`master-timeline ${isDragging ? 'dragging' : ''}`} ref={timelineRef}>
                    <div className="timeline-track" />

                    <div
                        className="timeline-selection"
                        style={{ left: `${startPercent}%`, width: `${widthPercent}%` }}
                        onMouseDown={(e) => handleMouseDown(e, 'selection')}
                    >
                        {/* Left handle */}
                        <div
                            className="handle left"
                            onMouseDown={(e) => handleMouseDown(e, 'left')}
                        />
                        {/* Right handle */}
                        <div
                            className="handle right"
                            onMouseDown={(e) => handleMouseDown(e, 'right')}
                        />
                    </div>
                </div>

                {/* Bottom tooltip for the dragged handle */}


                <div className="timeline-ticks">
                    {tickLabels.map((tick, i) => (
                        <span key={i} style={{ left: `${tick.percent}%` }}>{tick.text}</span>
                    ))}
                </div>
            </div>
        );
    };

    // Get active popup position
    const getActivePopupPosition = () => {
        const startPercent = timeToPercent(startDateTime);
        const endPercent = timeToPercent(endDateTime);

        if (isDragging === 'left' || activePopup === 'start') {
            return { percent: startPercent, type: 'start' as const };
        }
        if (isDragging === 'right' || activePopup === 'end') {
            return { percent: endPercent, type: 'end' as const };
        }
        return null;
    };

    const popupInfo = getActivePopupPosition();

    // Render popup using Portal
    const renderPopupPortal = () => {
        if (!popupInfo || !timelineRef.current) return null;

        const { percent, type } = popupInfo;
        const timelineRect = timelineRef.current.getBoundingClientRect();

        // Calculate absolute position
        const left = timelineRect.left + (timelineRect.width * percent / 100);
        const top = timelineRect.top; // Position above the timeline

        const style: React.CSSProperties = {
            position: 'absolute',
            left: `${left}px`,
            top: `${top}px`,
            zIndex: 9999, // High z-index to stay on top
        };

        return ReactDOM.createPortal(
            <div className="handle-popup-wrapper-portal" style={style}>
                {/* Wrapper to offset the popup to sit above the point */}
                <div style={{ position: 'relative' }}>
                    {renderPopup(type)}
                </div>
            </div>,
            document.body
        );
    };

    return (
        <Modal.Root isOpen={isOpen} onClose={onClose} size="fit">
            <Modal.Header>
                <Modal.Title>
                    <MdCalendarToday style={{ marginRight: '8px', fontSize: '20px', verticalAlign: 'bottom' }} />
                    SELECT TIME RANGE
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>

            <Modal.Body>
                <Modal.Content className="time-range-modal-body">
                    {renderTimeline()}
                    {renderPopupPortal()}
                </Modal.Content>
            </Modal.Body>

            <Modal.Footer>
                <Modal.Cancel onClick={onClose}>Cancel</Modal.Cancel>
                <Modal.Confirm onClick={handleApply}>
                    Apply Range
                </Modal.Confirm>
            </Modal.Footer>
        </Modal.Root>
    );
};
