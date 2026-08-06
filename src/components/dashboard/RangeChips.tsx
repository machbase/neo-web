import { VscAdd, VscChevronLeft, VscChevronRight } from 'react-icons/vsc';
import { formatDistanceEdgeLabel, formatDistanceReadout, formatDistanceSiShort, isDistanceAnchorEdge, isDistanceEdgeSet } from '@/utils/distanceRange';
import { formatTimeValue } from '@/utils/dashboardUtil';
import styles from './RangeChips.module.scss';

type RangeMode = 'set' | 'default' | 'unset';

interface RangeChipsProps {
    pBoardInfo: any;
    /** Shift a single axis by its current span. */
    pOnShiftTime: (aDir: 'l' | 'r') => void;
    pOnShiftDist: (aDir: 'l' | 'r') => void;
    /** Open that axis's range editor. */
    pOnEditTime: () => void;
    pOnEditDist: () => void;
    /**
     * Single-axis mode (panel editor): render only this one chip. For the forced axis the set/unset mode is
     * computed WITHOUT the board-panel gate, so an in-editor TIME panel with a board time range shows 'set'
     * even when no TIME panel is saved on the board yet. Omit for the dashboard's two-chip header.
     */
    pOnlyAxis?: 'TIME' | 'DIST';
}


interface ChipProps {
    axis: 'TIME' | 'DIST';
    mode: RangeMode;
    value: string;
    /** Exact edges, for hover: the DIST chip is abbreviated and two nearby edges can print the same. */
    title?: string;
    onShift: (aDir: 'l' | 'r') => void;
    onEdit: () => void;
}

const Chip = ({ axis, mode, value, title, onShift, onEdit }: ChipProps) => {
    // Unset axis → empty slot (dashed), prompts to set; no chevrons/value.
    if (mode === 'unset') {
        return (
            <button type="button" className={`${styles.chip} ${styles.chipUnset}`} onClick={onEdit} aria-label={`Set ${axis} range`}>
                <span className={`${styles.label} ${styles.labelUnset}`}>{axis}</span>
                <VscAdd size={12} className={styles.icon} />
            </button>
        );
    }

    // Whole chip opens the range editor; chevrons stop propagation and shift only.
    return (
        <div
            className={styles.chip}
            role="button"
            tabIndex={0}
            aria-label={`Edit ${axis} range`}
            onClick={onEdit}
            onKeyDown={(aEvent) => {
                if (aEvent.key === 'Enter' || aEvent.key === ' ') {
                    aEvent.preventDefault();
                    onEdit();
                }
            }}
        >
            <span className={`${styles.label} ${axis === 'TIME' ? styles.labelTime : styles.labelDist}`}>{axis}</span>
            <button
                type="button"
                className={styles.chevron}
                aria-label={`${axis} previous`}
                onClick={(aEvent) => {
                    aEvent.stopPropagation();
                    onShift('l');
                }}
            >
                <VscChevronLeft size={12} />
            </button>
            <span className={styles.value} title={title}>
                <span className={mode === 'default' ? styles.valueDefault : undefined}>{value}</span>
                {mode === 'default' && <span className={styles.defaultCaption}>default</span>}
            </span>
            <button
                type="button"
                className={styles.chevron}
                aria-label={`${axis} next`}
                onClick={(aEvent) => {
                    aEvent.stopPropagation();
                    onShift('r');
                }}
            >
                <VscChevronRight size={12} />
            </button>
        </div>
    );
};

/**
 * Dashboard header range display: two fixed chips (TIME → DIST). Each chip shifts / edits only its own
 * axis. An axis is "set" only when it has an explicit range; otherwise it keeps a dashed empty slot
 * (never hidden) — identical whether or not a matching panel exists, so there is no data-dependent
 * default value.
 */
const RangeChips = ({ pBoardInfo, pOnShiftTime, pOnShiftDist, pOnEditTime, pOnEditDist, pOnlyAxis }: RangeChipsProps) => {
    const sTimeRange = pBoardInfo?.dashboard?.timeRange ?? {};
    const sDistRange = pBoardInfo?.dashboard?.distanceRange ?? {};

    // TIME: "set" whenever a real range exists. The board always carries a default timeRange (now-1h~now),
    // so TIME shows from an empty board onward — no panel-dependent pop-in — mirroring DIST's value-only rule.
    const sTimeHasRange = sTimeRange.start != null && sTimeRange.start !== '' && sTimeRange.end != null && sTimeRange.end !== '';
    const sTimeMode: RangeMode = sTimeHasRange ? 'set' : 'unset';
    const sTimeValue = sTimeHasRange ? `${formatTimeValue(sTimeRange.start)} ~ ${formatTimeValue(sTimeRange.end)}` : '';

    // DIST: "set" only when an explicit, non-degenerate range exists; otherwise always the unset slot.
    // An anchored edge ('last-5000', 'first') is explicit too — it just names its coordinate in terms
    // of the data, so the chip shows the expression rather than a number that would go stale.
    const sFromAnchored = isDistanceAnchorEdge(sDistRange.start);
    const sToAnchored = isDistanceAnchorEdge(sDistRange.end);
    const sExplicitFrom = Number(sDistRange.start);
    const sExplicitTo = Number(sDistRange.end);
    const sDistExplicit = isDistanceEdgeSet(sDistRange.start) && isDistanceEdgeSet(sDistRange.end);
    const sExplicitValid =
        sDistExplicit &&
        (sFromAnchored || Number.isFinite(sExplicitFrom)) &&
        (sToAnchored || Number.isFinite(sExplicitTo)) &&
        (sFromAnchored || sToAnchored || sExplicitFrom !== sExplicitTo);
    const sDistMode: RangeMode = sExplicitValid ? 'set' : 'unset';
    // SI short rounds, and a window narrower than the scale it is printed at reads as a single value.
    // The exact pair stays one hover away rather than being lost.
    const sDistExact = sExplicitValid
        ? `${sFromAnchored ? formatDistanceEdgeLabel(sDistRange.start) : formatDistanceReadout(sExplicitFrom)} ~ ${
              sToAnchored ? formatDistanceEdgeLabel(sDistRange.end) : formatDistanceReadout(sExplicitTo)
          }`
        : undefined;
    // SI short, like the chart axis: a distance chip carries odometer-sized numbers, and
    // `25,150,651 ~ 25,150,976` is a chip nobody can read at a glance.
    const sDistValue = sExplicitValid
        ? `${sFromAnchored ? formatDistanceEdgeLabel(sDistRange.start) : formatDistanceSiShort(sExplicitFrom)} ~ ${
              sToAnchored ? formatDistanceEdgeLabel(sDistRange.end) : formatDistanceSiShort(sExplicitTo)
          }`
        : '';

    // Panel editor: render only the forced axis.
    if (pOnlyAxis === 'TIME') {
        return (
            <div className={styles.wrap}>
                <Chip axis="TIME" mode={sTimeMode} value={sTimeValue} onShift={pOnShiftTime} onEdit={pOnEditTime} />
            </div>
        );
    }
    if (pOnlyAxis === 'DIST') {
        return (
            <div className={styles.wrap}>
                <Chip axis="DIST" mode={sDistMode} value={sDistValue} title={sDistExact} onShift={pOnShiftDist} onEdit={pOnEditDist} />
            </div>
        );
    }

    return (
        <div className={styles.wrap}>
            <Chip axis="TIME" mode={sTimeMode} value={sTimeValue} onShift={pOnShiftTime} onEdit={pOnEditTime} />
            <Chip axis="DIST" mode={sDistMode} value={sDistValue} onShift={pOnShiftDist} onEdit={pOnEditDist} />
        </div>
    );
};

export default RangeChips;
