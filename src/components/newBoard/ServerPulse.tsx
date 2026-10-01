import { useCallback, useEffect, useId, useState } from 'react';
import moment from 'moment';
import { fetchServerPulse, MetricPoint, PULSE_METRICS, ServerPulse as ServerPulseData } from './serverMetrics';

const REFRESH_MS = 60_000;

const Sparkline = ({ pPoints, pColor }: { pPoints: MetricPoint[]; pColor: string }) => {
    const sGradientId = useId();
    const W = 200;
    const H = 46;
    const PAD = 4;
    if (pPoints.length < 2) return <svg className="pulse-spark" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" />;

    const sValues = pPoints.map((aPoint) => aPoint.value);
    const sLow = Math.min(...sValues);
    const sSpan = Math.max(...sValues) - sLow || 1;
    const sFirst = pPoints[0].time;
    const sDuration = pPoints[pPoints.length - 1].time - sFirst || 1;
    const x = (aTime: number) => PAD + ((aTime - sFirst) / sDuration) * (W - 2 * PAD);
    const y = (aValue: number) => H - PAD - ((aValue - sLow) / sSpan) * (H - 2 * PAD);
    const sLine = pPoints.map((aPoint) => `${x(aPoint.time).toFixed(1)},${y(aPoint.value).toFixed(1)}`).join(' ');
    const sLast = pPoints[pPoints.length - 1];

    return (
        <svg className="pulse-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
            <defs>
                <linearGradient id={sGradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={pColor} stopOpacity="0.35" />
                    <stop offset="1" stopColor={pColor} stopOpacity="0" />
                </linearGradient>
            </defs>
            <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="rgba(255,255,255,0.06)" vectorEffect="non-scaling-stroke" />
            <polygon points={`${x(sFirst).toFixed(1)},${H} ${sLine} ${x(sLast.time).toFixed(1)},${H}`} fill={`url(#${sGradientId})`} />
            <polyline points={sLine} fill="none" stroke={pColor} strokeWidth="1.6" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <circle cx={x(sLast.time)} cy={y(sLast.value)} r="2.6" fill={pColor} />
        </svg>
    );
};

const formatValue = (aValue: number, aDecimals: number) => aValue.toLocaleString('en-US', { minimumFractionDigits: aDecimals, maximumFractionDigits: aDecimals });

/**
 * The server's own metrics from `_NEO_STATZ`, so the first screen after login already has live
 * charts on it. Polls once a minute (the table's own interval) while this New tab is the selected
 * one and the browser tab is visible. Renders nothing when the metrics cannot be read.
 */
export const ServerPulse = ({ pIsActive, pIsOpeningDashboard = false, pOnOpenDashboard }: { pIsActive: boolean; pIsOpeningDashboard?: boolean; pOnOpenDashboard: () => void }) => {
    const [sPulse, setPulse] = useState<ServerPulseData | undefined | null>(null);

    const load = useCallback(async () => {
        try {
            setPulse(await fetchServerPulse());
        } catch {
            setPulse(undefined);
        }
    }, []);

    useEffect(() => {
        if (!pIsActive) return;
        load();
        const sTimer = window.setInterval(() => {
            if (document.visibilityState === 'visible') load();
        }, REFRESH_MS);
        return () => window.clearInterval(sTimer);
    }, [pIsActive, load]);

    if (sPulse === undefined) return null;

    const sLatest = sPulse ? Math.max(0, ...PULSE_METRICS.map((aMetric) => sPulse.series[aMetric.name]?.at(-1)?.time ?? 0)) : 0;

    return (
        <section className="new-board-section" data-testid="new-board-server-pulse">
            <div className="new-board-section-head">
                <h2>Server pulse</h2>
                <small>
                    <code>_NEO_STATZ</code> · every minute · last 1 hour{sLatest ? ` · as of ${moment(sLatest).format('HH:mm')}` : ''}
                </small>
            </div>
            <div className="pulse-grid">
                {PULSE_METRICS.map((aMetric) => {
                    const sPoints = sPulse?.series[aMetric.name] ?? [];
                    const sLast = sPoints.at(-1);
                    return (
                        <div className="pulse-tile" key={aMetric.name}>
                            <div className="pulse-key">
                                <span>{aMetric.label}</span>
                                <code title={aMetric.name}>{aMetric.name}</code>
                            </div>
                            <div className="pulse-value">
                                {sLast ? formatValue(sLast.value, aMetric.decimals) : sPulse ? '–' : '…'}
                                {sLast && aMetric.unit ? <span>{aMetric.unit}</span> : null}
                            </div>
                            <Sparkline pPoints={sPoints} pColor={aMetric.color} />
                        </div>
                    );
                })}
                <div className="pulse-tile pulse-tile--cta">
                    <div className="pulse-key">
                        <span>Recorded so far</span>
                    </div>
                    <div className="pulse-value pulse-value--small">
                        {sPulse ? sPulse.metricCount : '…'}
                        <span>metrics</span>
                    </div>
                    <p>{sPulse?.recordingSince ? `Since ${moment(sPulse.recordingSince).format('YYYY-MM-DD HH:mm')}. Already in your database.` : 'Already in your database.'}</p>
                    <button
                        type="button"
                        className="new-board-primary"
                        data-testid="new-board-open-server-dashboard"
                        disabled={pIsOpeningDashboard}
                        onClick={pOnOpenDashboard}
                    >
                        {pIsOpeningDashboard ? 'Opening…' : 'Open as dashboard'} <span aria-hidden="true">→</span>
                    </button>
                </div>
            </div>
        </section>
    );
};
