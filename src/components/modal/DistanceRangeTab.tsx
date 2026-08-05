import { useMemo } from 'react';
import { Input } from '@/design-system/components';
import styles from './DistanceRangeTab.module.scss';

interface DistanceRangeTabProps {
    /** Full data extent of the distance base column — the slider bounds [first, last]. {0,0} when unknown. */
    pBounds: { min: number; max: number };
    /** Current selection. */
    pFrom: number;
    pTo: number;
    /** Emits a new [from, to] selection (caller clamps/persists). */
    pOnChange: (aFrom: number, aTo: number) => void;
    /** Reset to the system default (full) range. */
    pOnResetToFull?: () => void;
    pUnit?: string;
}

const clamp = (aValue: number, aMin: number, aMax: number) => Math.min(aMax, Math.max(aMin, aValue));
const formatNum = (aValue: number) => (Number.isFinite(aValue) ? Math.round(aValue).toLocaleString() : '-');

/**
 * Distance (numeric base) range picker — a bounded dual-thumb slider over [first, last] plus From/To
 * numeric inputs. When the data extent is unknown (no distance panel yet) the slider is hidden and
 * From/To accept free numeric entry so a range can still be configured.
 */
const DistanceRangeTab = ({ pBounds, pFrom, pTo, pOnChange, pOnResetToFull, pUnit = '' }: DistanceRangeTabProps) => {
    const sHasExtent = Number.isFinite(pBounds.min) && Number.isFinite(pBounds.max) && pBounds.max > pBounds.min;
    const sMin = sHasExtent ? pBounds.min : Math.min(0, pFrom, pTo);
    const sMax = sHasExtent ? pBounds.max : Math.max(pFrom, pTo, sMin + 100);
    const sRange = sMax - sMin || 1;

    const sFrom = sHasExtent ? clamp(pFrom, sMin, sMax) : pFrom;
    const sTo = sHasExtent ? clamp(pTo, sMin, sMax) : pTo;
    const sSpan = Math.max(0, sTo - sFrom);

    // Slider step: ~1/1000 of the range, rounded to a sane precision.
    const sStep = useMemo(() => {
        const sRaw = sRange / 1000;
        if (sRaw >= 1) return Math.max(1, Math.round(sRaw));
        return sRaw > 0 ? sRaw : 1;
    }, [sRange]);

    const sFromPct = ((sFrom - sMin) / sRange) * 100;
    const sToPct = ((sTo - sMin) / sRange) * 100;

    const handleFrom = (aValue: number) => {
        const sNext = sHasExtent ? clamp(Math.min(aValue, sTo), sMin, sMax) : Math.min(aValue, sTo);
        pOnChange(sNext, sTo);
    };
    const handleTo = (aValue: number) => {
        const sNext = sHasExtent ? clamp(Math.max(aValue, sFrom), sMin, sMax) : Math.max(aValue, sFrom);
        pOnChange(sFrom, sNext);
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.readout}>
                <span className={styles.readoutValue}>
                    {formatNum(sFrom)} <span className={styles.dash}>–</span> {formatNum(sTo)} {pUnit && <span className={styles.unit}>{pUnit}</span>}
                </span>
                {pOnResetToFull ? (
                    <button type="button" className={styles.reset} onClick={pOnResetToFull}>
                        Full range
                    </button>
                ) : (
                    <span className={styles.span}>
                        span {formatNum(sSpan)} {pUnit}
                    </span>
                )}
            </div>

            {sHasExtent && (
                <>
                    <div className={styles.slider}>
                        <div className={styles.track} />
                        <div className={styles.fill} style={{ left: `${sFromPct}%`, width: `${Math.max(0, sToPct - sFromPct)}%` }} />
                        <input
                            type="range"
                            className={`${styles.thumb} ${styles.thumbFrom}`}
                            min={sMin}
                            max={sMax}
                            step={sStep}
                            value={sFrom}
                            aria-label="Distance from"
                            onChange={(aEvent) => handleFrom(Number(aEvent.target.value))}
                        />
                        <input
                            type="range"
                            className={`${styles.thumb} ${styles.thumbTo}`}
                            min={sMin}
                            max={sMax}
                            step={sStep}
                            value={sTo}
                            aria-label="Distance to"
                            onChange={(aEvent) => handleTo(Number(aEvent.target.value))}
                        />
                    </div>

                    <div className={styles.ticks}>
                        <span>{formatNum(sMin)}</span>
                        <span className={styles.tickMax}>{formatNum(sMax)}</span>
                    </div>
                </>
            )}

            <div className={styles.inputs}>
                <Input
                    label="From"
                    type="number"
                    fullWidth
                    value={String(Math.round(sFrom))}
                    onChange={(aEvent: any) => handleFrom(Number(aEvent.target.value))}
                    addonAfter={pUnit || undefined}
                />
                <Input
                    label="To"
                    type="number"
                    fullWidth
                    value={String(Math.round(sTo))}
                    onChange={(aEvent: any) => handleTo(Number(aEvent.target.value))}
                    addonAfter={pUnit || undefined}
                />
            </div>
        </div>
    );
};

export default DistanceRangeTab;
