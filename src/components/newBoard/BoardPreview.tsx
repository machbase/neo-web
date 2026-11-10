import { useEffect, useRef, useState } from 'react';

/**
 * Small drawings of what each kind of tab looks like once it has content, shown on the New tab's
 * cards. They are illustrations, not data: the point is to show what the user will end up with.
 * While `pActive` (the card is hovered or focused) the lines drift, unless the user asked for
 * reduced motion.
 *
 * The drawings are 104 units tall, the preview's height in pixels, and as wide as the card: a fixed
 * 300-wide drawing scaled to cover a wider card lost its top and bottom (the worksheet's first cell
 * touched the edge and its last was cut off), so each drawing lays itself out across `w` instead.
 */
const MIN_W = 200;
const H = 104;
const MONO = 'D2Coding, ui-monospace, Menlo, monospace';

const wave = (x0: number, yc: number, width: number, amp: number, phase: number, seed: number) => {
    const sPoints: string[] = [];
    for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        const v = Math.sin(t * 6.3 * (1 + seed * 0.25) + phase * 1.3 + seed) * 0.7 + Math.sin(t * 17 + seed * 2 + phase) * 0.3;
        sPoints.push(`${(x0 + t * width).toFixed(1)},${(yc - v * amp).toFixed(1)}`);
    }
    return sPoints.join(' ');
};

const Frame = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }) => (
    <rect x={x} y={y} width={w} height={h} rx="4" style={{ fill: 'var(--neo-bg-secondary, #252525)', stroke: 'var(--neo-border-color-default, rgba(255, 255, 255, 0.13))' }} />
);

const BARS = [10, 18, 14, 24, 16, 28, 20];
const SQL_ROWS = ['00:55:00    13.380', '00:56:00    13.625', '00:57:00    14.300', '00:58:00    18.605'];

const drawings: Record<string, (aPhase: number, w: number) => JSX.Element> = {
    dsh: (p, w) => {
        const sCol = (w - 28) / 2;
        const sRight = 18 + sCol;
        const sBarStep = (sCol - 16) / BARS.length;
        return (
        <>
            <Frame x={10} y={10} w={sCol} h={40} />
            <Frame x={sRight} y={10} w={sCol} h={40} />
            <Frame x={10} y={58} w={sCol} h={40} />
            <Frame x={sRight} y={58} w={sCol} h={40} />
            <polyline points={wave(16, 30, sCol - 12, 12, p, 0)} fill="none" strokeWidth="1.6" style={{ stroke: 'var(--neo-accent-light, rgb(0, 108, 210))' }} />
            {BARS.map((aHeight, i) => {
                const sHeight = aHeight * (0.8 + 0.2 * Math.sin(p * 2 + i));
                return <rect key={i} x={sRight + 8 + i * sBarStep} y={46 - sHeight} width={sBarStep * 0.6} height={sHeight} fill="#8ea4ff" opacity="0.85" />;
            })}
            <circle cx="44" cy="78" r="13" fill="none" strokeWidth="6"  style={{ stroke: 'var(--neo-border-color-default, rgba(255, 255, 255, 0.13))' }}/>
            <circle cx="44" cy="78" r="13" fill="none" stroke="#b3c1ff" strokeWidth="6" strokeDasharray={`${54 + 6 * Math.sin(p)} 90`} transform="rotate(-90 44 78)" />
            <text x="68" y="83" fontSize="15" fontWeight="600" style={{ fill: 'var(--neo-text-primary, #f1f1f1)' }}>
                74.8%
            </text>
            <polyline points={wave(sRight + 6, 80, sCol - 12, 9, p + 1, 1)} fill="none" stroke="#fac858" strokeWidth="1.4" />
        </>
        );
    },
    sql: (_p, w) => (
        <>
            <text x="12" y="20" fontFamily={MONO} fontSize="10">
                <tspan fill="#569cd6">SELECT</tspan>
                <tspan style={{ fill: 'var(--neo-text-secondary, #c4c4c4)' }}> TIME, VALUE </tspan>
                <tspan fill="#569cd6">FROM</tspan>
                <tspan style={{ fill: 'var(--neo-text-secondary, #c4c4c4)' }}> _NEO_STATZ</tspan>
            </text>
            {/* a result grid as the SQL editor draws it: content behind, the table's header and cell colours */}
            <rect x="10" y="32" width={w - 20} height="64" style={{ fill: 'var(--neo-bg-secondary, #252525)', stroke: 'var(--neo-border-color-default, rgba(255, 255, 255, 0.13))' }} />
            <rect x="10" y="32" width={w - 20} height="14" style={{ fill: 'var(--neo-table-header-bg, var(--neo-bg-elevated, #2c2c2c))' }} />
            <text x="16" y="42" fontSize="8" fontFamily={MONO} style={{ fill: 'var(--neo-table-header-text, var(--neo-text-muted, #818181))' }}>
                TIME                         VALUE
            </text>
            {SQL_ROWS.map((aRow, i) => (
                <text key={i} x="16" y={57 + i * 11} fontSize="8" fontFamily={MONO} xmlSpace="preserve" style={{ fill: 'var(--neo-text-secondary, #c4c4c4)' }}>
                    {`2026-10-01 ${aRow}`}
                </text>
            ))}
        </>
    ),
    tql: (p, w) => (
        <>
            <text x="12" y="20" fontFamily={MONO} fontSize="9" style={{ fill: 'var(--neo-text-secondary, #c4c4c4)' }}>
                <tspan style={{ fill: 'var(--neo-event-match-main, #ffdc72)' }}>FAKE</tspan>( oscillator(...) )
            </text>
            <text x="12" y="33" fontFamily={MONO} fontSize="9" style={{ fill: 'var(--neo-event-match-main, #ffdc72)' }}>
                CHART_LINE()
            </text>
            <line x1="12" x2={w - 12} y1="70" y2="70" style={{ stroke: 'var(--neo-border-color-default, rgba(255, 255, 255, 0.13))' }} />
            <polyline points={wave(12, 70, w - 24, 22, p, 2)} fill="none" stroke="#8ea4ff" strokeWidth="1.8" />
        </>
    ),
    taz: (p, w) => (
        <>
            <polyline points={wave(10, 38, w - 20, 20, p, 3)} fill="none" strokeWidth="1.6" style={{ stroke: 'var(--neo-accent-light, rgb(0, 108, 210))' }} />
            <polyline points={wave(10, 42, w - 20, 13, p + 2, 4)} fill="none" stroke="#fac858" strokeWidth="1.2" opacity="0.8" />
            <rect x="10" y="74" width={w - 20} height="20" rx="3" style={{ fill: 'var(--neo-bg-secondary, #252525)', stroke: 'var(--neo-border-color-default, rgba(255, 255, 255, 0.13))' }} />
            <polyline points={wave(10, 84, w - 20, 6, 0, 3)} fill="none" strokeWidth="1" style={{ stroke: 'var(--neo-border-color-strong, #767676)' }} />
            <rect x={w / 2 - 40 + Math.sin(p) * 60} y="74" width="70" height="20" style={{ fill: 'color-mix(in srgb, var(--neo-accent-light, rgb(0, 108, 210)) 22%, transparent)', stroke: 'var(--neo-accent-light, rgb(0, 108, 210))' }} />
        </>
    ),
    wrk: (p, w) => (
        <>
            <Frame x={10} y={8} w={w - 20} h={24} />
            <text x="18" y="24" fontSize="9" fontFamily={MONO} style={{ fill: 'var(--neo-text-secondary, #c4c4c4)' }}>
                ## Daily check
            </text>
            <Frame x={10} y={38} w={w - 20} h={24} />
            <text x="18" y="54" fontSize="9" fontFamily={MONO}>
                <tspan fill="#569cd6">SELECT</tspan>
                <tspan style={{ fill: 'var(--neo-text-secondary, #c4c4c4)' }}> count(*) FROM ...</tspan>
            </text>
            <Frame x={10} y={68} w={w - 20} h={28} />
            <polyline points={wave(18, 82, w - 36, 8, p, 5)} fill="none" stroke="#b3c1ff" strokeWidth="1.4" />
        </>
    ),
    open: (_p, w) => (
        <>
            <rect x={w / 2 - 50} y="16" width="100" height="72" rx="8" fill="none" strokeDasharray="5 4" style={{ stroke: 'var(--neo-border-color-strong, #767676)' }} />
            <path d={`M${w / 2} 34 v30 M${w / 2 - 12} 52 l12 12 l12 -12`} fill="none" stroke="#a3a3a3" strokeWidth="2" />
        </>
    ),
};

const prefersReducedMotion = () => {
    try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
        return false;
    }
};

/** Falls back to `pFallback` (the tab type's icon) for a type there is no drawing for. */
export const BoardPreview = ({ pType, pActive = false, pFallback = null }: { pType: string; pActive?: boolean; pFallback?: React.ReactNode }) => {
    const [sPhase, setPhase] = useState(0);
    const [sWidth, setWidth] = useState(MIN_W);
    const sSvgRef = useRef<SVGSVGElement>(null);

    // Drawn at one unit per pixel: the viewBox is as wide as the card, down to the narrowest width
    // the drawings still fit (a card narrower than that crops the sides).
    useEffect(() => {
        const sSvg = sSvgRef.current;
        if (!sSvg || typeof ResizeObserver === 'undefined') return;
        const sObserver = new ResizeObserver(([aEntry]) => {
            const sBox = aEntry.contentRect;
            if (!sBox.width || !sBox.height) return;
            setWidth(Math.max(MIN_W, Math.round((sBox.width / sBox.height) * H)));
        });
        sObserver.observe(sSvg);
        return () => sObserver.disconnect();
    }, [pType]);

    useEffect(() => {
        if (!pActive || prefersReducedMotion()) {
            setPhase(0);
            return;
        }
        let sFrame = 0;
        let sStart: number | undefined;
        const step = (aNow: number) => {
            sStart ??= aNow;
            setPhase((aNow - sStart) / 1000);
            sFrame = requestAnimationFrame(step);
        };
        sFrame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(sFrame);
    }, [pActive]);

    const sDraw = drawings[pType];
    if (!sDraw) return <>{pFallback}</>;
    return (
        <svg ref={sSvgRef} viewBox={`0 0 ${sWidth} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
            {sDraw(sPhase, sWidth)}
        </svg>
    );
};
