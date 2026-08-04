import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BiAlarmOff } from 'react-icons/bi';
import { VscCheck } from 'react-icons/vsc';
import { calcRefreshTime, refreshTimeList } from '@/utils/dashboardUtil';
import styles from './AutoRefreshControl.module.scss';

interface AutoRefreshOption {
    /** Stored value, kept in the legacy `dashboard.timeRange.refresh` format (e.g. 'Off', '5 seconds'). */
    value: string;
    /** Compact label shown inside the countdown ring (e.g. '5s', '1h'). */
    short: string;
    /** Interval length in seconds; `null` when auto refresh is Off. */
    seconds: number | null;
}

/** Abbreviate a legacy refresh string ('5 seconds' -> '5s', '1 minute' -> '1m', '1 hour' -> '1h'). */
const abbreviate = (aValue: string): string => {
    if (aValue === 'Off') return 'Off';
    const [sNum, sUnit = ''] = aValue.split(' ');
    const sSuffix = sUnit.startsWith('second') ? 's' : sUnit.startsWith('minute') ? 'm' : 'h';
    return `${sNum}${sSuffix}`;
};

// Derived from the shared refresh list so the option set never drifts from the rest of the dashboard.
const AUTO_REFRESH_OPTIONS: AutoRefreshOption[] = refreshTimeList.map((aItem) => ({
    value: aItem,
    short: abbreviate(aItem),
    seconds: aItem === 'Off' ? null : calcRefreshTime(aItem) / 1000,
}));

interface AutoRefreshControlProps {
    /** Current refresh value in legacy format ('Off' | '3 seconds' | ...). */
    pValue: string;
    /** Emits the newly selected value in the same legacy format. Not called in read-only mode. */
    pOnChange?: (aValue: string) => void;
    /** Display-only: shows the current state but the menu can't be opened (e.g. the panel editor header). */
    pReadOnly?: boolean;
    /**
     * Bumped by the parent each time the refresh timer starts a fresh cycle (e.g. resuming after the
     * edit-mode pause, an interval change, or a tab becoming active). Changing it remounts the countdown
     * ring so it restarts from full, keeping the animation aligned with the real (paused-during-edit)
     * refresh timer instead of free-running out of phase.
     */
    pCycleId?: number;
    /**
     * Ring only, no "auto refresh:" caption. For the panel header, where the control sits in a 30px
     * strip beside the panel menu and the caption would not fit — the ring already says what it is.
     */
    pCompact?: boolean;
    /**
     * Ink colour for the ring's label, for a surface that is not the dark board header — a panel
     * carries one of fourteen chart themes (`chalk` is navy, `white` is white, `vintage` is cream),
     * so "light or dark" is not a question that can be answered from the theme *name*. Pass the
     * theme's own text colour (`ChartThemeTextColor`) and the track and hover tints are derived from
     * it, which lands correctly on every one of them.
     */
    pInk?: string;
    /** Tooltip text for the trigger. Defaults to the aria-label. */
    pTitle?: string;
}

/**
 * Dashboard header auto-refresh control.
 * Relocates the refresh setting out of the Time Range modal into a standalone toolbar control
 * that applies board-wide (time + distance axes). Off/Running is distinguishable at a glance via
 * a static gray ring (Off) vs. a rotating countdown ring (Running).
 */
/** '#eeeeee' -> 'rgba(238, 238, 238, a)'. Non-hex input is returned as-is (already a usable colour). */
const withAlpha = (aColor: string, aAlpha: number) => {
    const sHex = aColor.trim();
    const sMatch = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(sHex);
    if (!sMatch) return sHex;
    const sBody = sMatch[1].length === 3 ? sMatch[1].split('').map((aChar) => aChar + aChar).join('') : sMatch[1];
    const sR = parseInt(sBody.slice(0, 2), 16);
    const sG = parseInt(sBody.slice(2, 4), 16);
    const sB = parseInt(sBody.slice(4, 6), 16);
    return `rgba(${sR}, ${sG}, ${sB}, ${aAlpha})`;
};

const AutoRefreshControl = ({ pValue, pOnChange, pReadOnly = false, pCycleId, pCompact = false, pInk, pTitle }: AutoRefreshControlProps) => {
    const [sOpen, setOpen] = useState<boolean>(false);
    // Menu is right-anchored to the trigger; { top, right } are viewport coords for the fixed portal.
    const [sPos, setPos] = useState<{ top: number; right: number } | null>(null);
    const sWrapperRef = useRef<HTMLDivElement>(null);
    const sTriggerRef = useRef<HTMLButtonElement>(null);
    const sMenuRef = useRef<HTMLDivElement>(null);

    // Position the menu below the trigger, right-aligned. The menu is portaled to <body> so it
    // escapes the header's stacking context and renders above dashboard panels (z-index 1000+).
    useLayoutEffect(() => {
        if (!sOpen || !sTriggerRef.current) return;
        const sRect = sTriggerRef.current.getBoundingClientRect();
        setPos({ top: sRect.bottom + 4, right: window.innerWidth - sRect.right });
    }, [sOpen]);

    useEffect(() => {
        if (!sOpen) return;
        const handleKeyDown = (aEvent: KeyboardEvent) => {
            if (aEvent.key === 'Escape') setOpen(false);
        };
        // Close on click outside both the trigger and the portaled menu.
        const handlePointerDown = (aEvent: MouseEvent) => {
            const sTarget = aEvent.target as Node;
            if (sWrapperRef.current?.contains(sTarget) || sMenuRef.current?.contains(sTarget)) return;
            setOpen(false);
        };
        // Reposition/close when the layout shifts (scroll or resize) while open.
        const handleReflow = () => setOpen(false);
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handlePointerDown);
        window.addEventListener('resize', handleReflow);
        window.addEventListener('scroll', handleReflow, true);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handlePointerDown);
            window.removeEventListener('resize', handleReflow);
            window.removeEventListener('scroll', handleReflow, true);
        };
    }, [sOpen]);

    const sCurrent = AUTO_REFRESH_OPTIONS.find((aItem) => aItem.value === pValue) ?? AUTO_REFRESH_OPTIONS[0];
    const sIsRunning = sCurrent.seconds !== null;

    const handleSelect = (aValue: string) => {
        pOnChange?.(aValue);
        setOpen(false);
    };

    return (
        <div
            className={`${styles.wrapper} ${pCompact ? styles.wrapperCompact : ''}`}
            ref={sWrapperRef}
            style={
                pInk
                    ? ({
                          '--auto-refresh-fg': pInk,
                          '--auto-refresh-muted': withAlpha(pInk, 0.75),
                          '--auto-refresh-track': withAlpha(pInk, 0.2),
                          '--auto-refresh-hover': withAlpha(pInk, 0.1),
                      } as React.CSSProperties)
                    : undefined
            }
        >
            <button
                ref={sTriggerRef}
                type="button"
                className={`${styles.control} ${pReadOnly ? styles.controlReadOnly : ''} ${pCompact ? styles.controlCompact : ''}`}
                title={pTitle ?? 'Auto refresh'}
                aria-haspopup={pReadOnly ? undefined : 'menu'}
                aria-expanded={pReadOnly ? undefined : sOpen}
                aria-disabled={pReadOnly || undefined}
                aria-label="Auto refresh"
                tabIndex={pReadOnly ? -1 : undefined}
                onClick={() => {
                    if (pReadOnly) return;
                    setOpen((aPrev) => !aPrev);
                }}
            >
                {!pCompact && <span className={styles.label}>auto refresh:</span>}
                <span className={`${styles.ring} ${pCompact ? styles.ringCompact : ''}`}>
                    {/* One viewBox, two rendered sizes: the geometry below is in viewBox units, so the
                        compact ring is the same drawing scaled by the <svg> box. */}
                    <svg width={pCompact ? 24 : 30} height={pCompact ? 24 : 30} viewBox="0 0 30 30">
                        <circle className={styles.track} cx={15} cy={15} r={12} />
                        {sIsRunning && (
                            <circle
                                // key restarts the fill animation (reset the countdown) whenever the interval changes
                                // OR the refresh timer starts a fresh cycle (pCycleId), so the ring realigns with the
                                // real refresh after the edit-mode pause instead of drifting out of phase.
                                key={`${sCurrent.value}:${pCycleId ?? 0}`}
                                className={styles.progress}
                                cx={15}
                                cy={15}
                                r={12}
                                pathLength={100}
                                style={{ animationDuration: `${sCurrent.seconds}s` }}
                            />
                        )}
                    </svg>
                    <span className={styles.center}>{sIsRunning ? sCurrent.short : <BiAlarmOff className={styles.idleIcon} size={14} />}</span>
                </span>
            </button>

            {!pReadOnly &&
                sOpen &&
                sPos &&
                createPortal(
                    <div ref={sMenuRef} className={styles.menu} role="menu" style={{ top: sPos.top, right: sPos.right }}>
                        <div className={styles.menuHeader}>AUTO-REFRESH</div>
                        {AUTO_REFRESH_OPTIONS.map((aItem) => {
                            const sSelected = aItem.value === sCurrent.value;
                            return (
                                <button
                                    type="button"
                                    key={aItem.value}
                                    className={`${styles.menuItem} ${sSelected ? styles.menuItemActive : ''}`}
                                    role="menuitem"
                                    onClick={() => handleSelect(aItem.value)}
                                >
                                    <span>{aItem.value}</span>
                                    {sSelected && <VscCheck className={styles.check} size={12} />}
                                </button>
                            );
                        })}
                    </div>,
                    document.body
                )}
        </div>
    );
};

export default AutoRefreshControl;
