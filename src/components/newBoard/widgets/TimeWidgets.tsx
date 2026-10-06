import { useEffect, useMemo, useState } from 'react';
import { isValidTimeZone } from './timeZone';

export interface ClockSettings {
    style?: 'analog' | 'digital';
    /** IANA zone, e.g. `Asia/Seoul`. Empty means this browser's zone. */
    timeZone?: string;
    label?: string;
    hour12?: boolean;
}
export interface CalendarSettings {
    weekStart?: 'sun' | 'mon';
}

/** Ticks while the New tab is showing; a hidden tab or browser window costs nothing. */
const useNow = (aActive: boolean, aStepMs: number) => {
    const [sNow, setNow] = useState(() => new Date());
    useEffect(() => {
        if (!aActive) return;
        setNow(new Date());
        const sTimer = window.setInterval(() => {
            if (document.visibilityState === 'visible') setNow(new Date());
        }, aStepMs);
        return () => window.clearInterval(sTimer);
    }, [aActive, aStepMs]);
    return sNow;
};

/** Wall-clock parts of `aDate` in `aZone`, read through Intl so no zone database is shipped. */
const partsIn = (aDate: Date, aZone?: string) => {
    const sParts = new Intl.DateTimeFormat('en-US', {
        timeZone: aZone || undefined,
        hourCycle: 'h23',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        weekday: 'short',
    }).formatToParts(aDate);
    const sGet = (aType: string) => sParts.find((aPart) => aPart.type === aType)?.value ?? '';
    return { year: +sGet('year'), month: +sGet('month'), day: +sGet('day'), hour: +sGet('hour') % 24, minute: +sGet('minute'), second: +sGet('second'), weekday: sGet('weekday') };
};


const zoneCaption = (aZone?: string) => {
    if (!aZone) return 'Local time';
    return aZone.split('/').pop()?.replace(/_/g, ' ') ?? aZone;
};

/** `GMT+9`, `GMT-3:30`; empty when the browser cannot name the offset. */
const offsetLabel = (aDate: Date, aZone?: string) => {
    try {
        return new Intl.DateTimeFormat('en-US', { timeZone: aZone || undefined, timeZoneName: 'shortOffset' }).formatToParts(aDate).find((aPart) => aPart.type === 'timeZoneName')?.value ?? '';
    } catch {
        return '';
    }
};

const pad = (aValue: number) => String(aValue).padStart(2, '0');

export const ClockWidget = ({ pSettings, pActive }: { pSettings?: ClockSettings; pActive: boolean }) => {
    const sZone = pSettings?.timeZone && isValidTimeZone(pSettings.timeZone) ? pSettings.timeZone : undefined;
    const sAnalog = (pSettings?.style ?? 'analog') === 'analog';
    const sNow = useNow(pActive, 1000);
    const sP = partsIn(sNow, sZone);
    const sCaption = pSettings?.label || zoneCaption(sZone);
    const sDate = new Intl.DateTimeFormat('en-US', { timeZone: sZone, weekday: 'short', month: 'short', day: 'numeric' }).format(sNow);
    const sOffset = offsetLabel(sNow, sZone);
    const sSpoken = `${sCaption} ${sP.hour}:${pad(sP.minute)}`;

    if (!sAnalog) {
        const sHour = pSettings?.hour12 ? sP.hour % 12 || 12 : sP.hour;
        return (
            <div className="nb-tile nb-clock nb-clock--digital" data-testid="new-board-clock">
                <span className="nb-clock-top">
                    <span className="nb-clock-caption">{sCaption}</span>
                    {sOffset ? <span className="nb-clock-offset">{sOffset}</span> : null}
                </span>
                <span className="nb-clock-digits" role="img" aria-label={sSpoken}>
                    {pad(sHour)}
                    <span className="nb-clock-colon">:</span>
                    {pad(sP.minute)}
                    <span className="nb-clock-sec">{pSettings?.hour12 ? (sP.hour < 12 ? 'AM' : 'PM') : pad(sP.second)}</span>
                </span>
                <span className="nb-clock-date">{sDate}</span>
            </div>
        );
    }

    const sHourAngle = ((sP.hour % 12) + sP.minute / 60) * 30;
    const sMinuteAngle = (sP.minute + sP.second / 60) * 6;
    const sSecondAngle = sP.second * 6;
    return (
        <div className="nb-tile nb-clock nb-clock--analog" data-testid="new-board-clock">
            <svg viewBox="0 0 120 120" className="nb-clock-face" role="img" aria-label={sSpoken}>
                <defs>
                    <radialGradient id="nb-clock-dial" cx="50%" cy="40%" r="65%">
                        <stop offset="0" stopColor="#2a2a2a" />
                        <stop offset="1" stopColor="#171717" />
                    </radialGradient>
                </defs>
                <circle cx="60" cy="60" r="57" fill="url(#nb-clock-dial)" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
                {Array.from({ length: 60 }, (_, aIndex) => {
                    const sHourMark = aIndex % 5 === 0;
                    return (
                        <line
                            key={aIndex}
                            x1="60"
                            y1="7"
                            x2="60"
                            y2={sHourMark ? 14 : 10}
                            stroke={sHourMark ? '#d6d6d6' : '#555'}
                            strokeWidth={sHourMark ? 1.8 : 0.8}
                            strokeLinecap="round"
                            transform={`rotate(${aIndex * 6} 60 60)`}
                        />
                    );
                })}
                {[
                    ['12', 60, 26],
                    ['3', 96, 64],
                    ['6', 60, 101],
                    ['9', 24, 64],
                ].map(([aText, aX, aY]) => (
                    <text key={aText} x={aX} y={aY} textAnchor="middle" fontSize="10" fill="#8a8a8a" fontFamily="Pretendard, sans-serif">
                        {aText}
                    </text>
                ))}
                <line x1="60" y1="64" x2="60" y2="34" stroke="#f1f1f1" strokeWidth="4" strokeLinecap="round" transform={`rotate(${sHourAngle} 60 60)`} />
                <line x1="60" y1="66" x2="60" y2="20" stroke="#f1f1f1" strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${sMinuteAngle} 60 60)`} />
                <line x1="60" y1="72" x2="60" y2="16" stroke="#6d8bff" strokeWidth="1.1" strokeLinecap="round" transform={`rotate(${sSecondAngle} 60 60)`} />
                <circle cx="60" cy="60" r="3.2" fill="#6d8bff" stroke="#171717" strokeWidth="1.2" />
            </svg>
            <span className="nb-clock-caption">{sCaption}</span>
            <span className="nb-clock-date">
                {sDate}
                {sOffset ? ` · ${sOffset}` : ''}
            </span>
        </div>
    );
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DayCell {
    day: number;
    /** -1 previous month, 0 this month, 1 next month. */
    month: -1 | 0 | 1;
    today: boolean;
    past: boolean;
    weekend: boolean;
}

export const CalendarWidget = ({ pSettings, pActive }: { pSettings?: CalendarSettings; pActive: boolean }) => {
    // A minute is plenty to roll over at midnight.
    const sNow = useNow(pActive, 60_000);
    const [sOffset, setOffset] = useState(0);
    const sStart = pSettings?.weekStart === 'mon' ? 1 : 0;

    const { sTitle, sCells } = useMemo(() => {
        const sView = new Date(sNow.getFullYear(), sNow.getMonth() + sOffset, 1);
        const sYear = sView.getFullYear();
        const sMonth = sView.getMonth();
        const sLead = (sView.getDay() - sStart + 7) % 7;
        const sToday = new Date(sNow.getFullYear(), sNow.getMonth(), sNow.getDate()).getTime();
        // Always six weeks, so the tile keeps its height from month to month.
        const sList: DayCell[] = Array.from({ length: 42 }, (_, aIndex) => {
            const sDate = new Date(sYear, sMonth, aIndex - sLead + 1);
            const sTime = sDate.getTime();
            return {
                day: sDate.getDate(),
                month: sDate.getMonth() === sMonth ? 0 : sTime < sView.getTime() ? -1 : 1,
                today: sTime === sToday,
                past: sTime < sToday,
                weekend: sDate.getDay() === 0 || sDate.getDay() === 6,
            };
        });
        return { sTitle: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(sView), sCells: sList };
    }, [sNow, sOffset, sStart]);

    const sHeads = [...WEEKDAYS.slice(sStart), ...WEEKDAYS.slice(0, sStart)];
    const sWeekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(sNow);
    return (
        <div className="nb-tile nb-calendar" data-testid="new-board-calendar">
            <div className="nb-calendar-head">
                <span className="nb-calendar-today" aria-label={`Today is ${sWeekday}, ${sNow.toDateString()}`}>
                    <span className="nb-calendar-bigday">{sNow.getDate()}</span>
                    <span className="nb-calendar-when">
                        <span className="nb-calendar-weekname">{sWeekday}</span>
                        <span className="nb-calendar-month">{sTitle}</span>
                    </span>
                </span>
                <span className="nb-calendar-nav">
                    {sOffset !== 0 ? (
                        <button type="button" className="nb-calendar-back" onClick={() => setOffset(0)}>
                            Today
                        </button>
                    ) : null}
                    <button type="button" className="nb-icon-btn" aria-label="Previous month" onClick={() => setOffset((aValue) => aValue - 1)}>
                        ‹
                    </button>
                    <button type="button" className="nb-icon-btn" aria-label="Next month" onClick={() => setOffset((aValue) => aValue + 1)}>
                        ›
                    </button>
                </span>
            </div>
            <div className="nb-calendar-grid" role="grid" aria-label={sTitle}>
                {sHeads.map((aHead) => (
                    <span key={aHead} className={`nb-calendar-weekday${aHead === 'Sun' || aHead === 'Sat' ? ' is-weekend' : ''}`} role="columnheader">
                        {aHead.slice(0, 1)}
                    </span>
                ))}
                {sCells.map((aCell, aIndex) => (
                    <span
                        key={aIndex}
                        role="gridcell"
                        aria-current={aCell.today ? 'date' : undefined}
                        className={[
                            'nb-calendar-day',
                            aCell.month !== 0 ? 'is-outside' : '',
                            aCell.today ? 'is-today' : '',
                            aCell.past && aCell.month === 0 ? 'is-past' : '',
                            aCell.weekend ? 'is-weekend' : '',
                        ]
                            .filter(Boolean)
                            .join(' ')}
                    >
                        {aCell.day}
                    </span>
                ))}
            </div>
        </div>
    );
};
