import { useEffect, useMemo, useRef, useState } from 'react';
import { VscTrash } from '@/assets/icons/Icon';
import {
    buildDistanceQuickWindowExpression,
    buildDistanceSliderClickRange,
    buildDistanceTickValues,
    clampDistance,
    formatDistanceReadout,
    formatDistanceAxisLabel,
    isDistanceAnchorEdge,
    parseDistanceValue,
    resolveDistanceEdge,
    snapDistanceEdge,
    thinDistanceTicks,
    DISTANCE_QUICK_WINDOWS,
    DISTANCE_THUMB_GRAB_PX,
    DISTANCE_THUMB_WIDTH,
} from '@/utils/distanceRange';
import styles from './DistanceRangeTab.module.scss';

interface DistanceRangeTabProps {
    /** Full data extent of the distance base column — the slider bounds [first, last]. {0,0} when unknown. */
    pBounds: { min: number; max: number };
    /**
     * Current selection. Either a coordinate, or an edge anchored to the data — `last-5000`, `first`,
     * `first+5000` — which is resolved against `pBounds` for display and stays an expression when it
     * is stored, so the window follows the data the way `last-1h ~ last` does on a time axis.
     */
    pFrom: number | string;
    pTo: number | string;
    /** Emits a new [from, to] selection (caller clamps/persists). Anchored edges pass through as text. */
    pOnChange: (aFrom: number | string, aTo: number | string) => void;
    /** Reset to the system default (full) range. */
    pOnResetToFull?: () => void;
    /** Wording for that reset control — the modal resets to the system default, the panel editor clears an override. */
    pResetLabel?: string;
    /** Greyed out when there is nothing to reset (no override in effect). */
    pResetDisabled?: boolean;
    /**
     * Short chip beside the readout naming *whose* range is on screen — 'Board' when these numbers are
     * inherited, 'Panel' when this editor owns them. Without it the two states are indistinguishable:
     * an unset editor shows the full extent, which is exactly what an override equal to the extent
     * looks like.
     */
    pBadge?: string;
    /** Dim the readout: the numbers are inherited rather than chosen here. */
    pMuted?: boolean;
    /**
     * Why the typed range cannot be applied, or `''` when it can. The tab reports rather than
     * blocks — Apply belongs to the modal around it, and a message the footer button then ignored
     * would be worse than no message at all.
     */
    pOnValidityChange?: (aMessage: string) => void;
    /**
     * Draw the quick-window shortcuts somewhere else. The modal keeps them under the fields, where
     * the dialog is narrow and there is only one column; the panel editor is a wide row and puts
     * them in a column of their own beside the slider, via `DistanceQuickWindows`.
     */
    pHideQuickWindows?: boolean;
    pUnit?: string;
}

/**
 * Is the text in the box already the same edge the prop carries? Compared as text for an anchored
 * edge (the expression *is* the value) and numerically otherwise, so `1e3` typed against a prop of
 * 1000 is left alone rather than rewritten under the cursor.
 */
const sameEdge = (aText: string, aValue: number | string) => {
    if (isDistanceAnchorEdge(aValue) || isDistanceAnchorEdge(aText)) return aText.trim().toLowerCase() === String(aValue).trim().toLowerCase();
    return parseDistanceValue(aText) === parseDistanceValue(aValue);
};

/**
 * The quick-window shortcuts on their own, for a caller that places them itself. Same rows and same
 * arithmetic as the ones `DistanceRangeTab` draws inline — only the position differs.
 */
export const DistanceQuickWindows = ({ pBounds, pOnSelect }: { pBounds: { min: number; max: number }; pOnSelect: (aFrom: number | string, aTo: number | string) => void }) => {
    const sHasExtent = Number.isFinite(pBounds?.min) && Number.isFinite(pBounds?.max) && pBounds.max > pBounds.min;
    // Without an extent there is nothing for "First 25%" to be a quarter of, which is the same
    // reason the slider itself is not drawn.
    if (!sHasExtent) return null;
    return (
        <div className={styles.quick} data-testid="distance-quick">
            <span className={styles.quickLabel} data-testid="distance-quick-label">Quick windows</span>
            {DISTANCE_QUICK_WINDOWS.map((aRow, aIndex) => (
                <div key={aIndex} className={styles.quickRow} data-testid="distance-quick-row">
                    {aRow.map((aItem) => (
                        <button
                            key={aItem.label}
                            type="button"
                            className={styles.quickButton}
                            onClick={() => {
                                // Anchored, not frozen: 'Last 25%' means the most recent quarter of the
                                // data as it stands now *and* as it grows, which is what makes it the
                                // distance answer to 'Last 1 hour'.
                                const sNext = buildDistanceQuickWindowExpression({ min: pBounds.min, max: pBounds.max, edge: aItem.edge, ratio: aItem.ratio });
                                if (sNext) pOnSelect(sNext.from, sNext.to);
                            }}
                        >
                            {aItem.label}
                        </button>
                    ))}
                </div>
            ))}
        </div>
    );
};

/**
 * Distance (numeric base) range picker — the same editor the Data Viewer draws for a distance axis,
 * as a tab body inside the shared Range modal: a readout, a bounded dual-thumb slider over the
 * base column's real extent, a tick scale, From/To numeric inputs and the quick-window shortcuts.
 *
 * The geometry is not re-derived here: every value a gesture produces comes from
 * `@/utils/distanceRange`, which is the same module the Data Viewer's dialog uses, so a drag, a
 * track click or a `First 25%` lands on exactly the same number in both editors. What differs is
 * only the shell — this one is a tab, styles itself with CSS modules, and leaves Apply/Cancel to
 * the modal around it.
 *
 * When the data extent is unknown (no distance panel yet) the slider, ticks and quick windows are
 * hidden and the From/To boxes accept free numeric entry, so a range can still be configured.
 */
const DistanceRangeTab = ({
    pBounds,
    pFrom,
    pTo,
    pOnChange,
    pOnResetToFull,
    pResetLabel = 'Reset to default',
    pResetDisabled = false,
    pBadge,
    pMuted = false,
    pOnValidityChange,
    pHideQuickWindows = false,
    pUnit = '',
}: DistanceRangeTabProps) => {
    // The text is what the user is editing, the numbers are what the modal will apply. A half-typed
    // edge ('', '-', '1e') has no number in it, so it stays exactly as typed and simply does not
    // move the selection until it parses — rewriting it to 0 mid-keystroke is the one thing a
    // numeric input must not do.
    const [sFromText, setFromText] = useState(() => String(pFrom));
    const [sToText, setToText] = useState(() => String(pTo));

    // The bounds arrive asynchronously (the modal fetches the panel's min/max after mount) and land
    // as new pFrom/pTo. Re-seed the text from the prop only when the two actually disagree, so an
    // echo of a value this component just emitted never clobbers what is being typed.
    // The text is deliberately not a dependency: this effect exists to react to the *prop* moving,
    // and re-running it on every keystroke is what would turn a half-typed edge back into a number.
    useEffect(() => {
        if (!sameEdge(sFromText, pFrom)) setFromText(String(pFrom));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pFrom]);
    useEffect(() => {
        if (!sameEdge(sToText, pTo)) setToText(String(pTo));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pTo]);

    const sHasExtent = Number.isFinite(pBounds?.min) && Number.isFinite(pBounds?.max) && pBounds.max > pBounds.min;
    const sMin = sHasExtent ? pBounds.min : 0;
    const sMax = sHasExtent ? pBounds.max : 0;
    // `last-5000` is a number the moment the extent is known, and nothing below this line needs to
    // know it was ever written as an anchor — the slider, the readout and the span all work on the
    // resolved pair. Only the From/To text and what is emitted keep the expression.
    const sFromValue = resolveDistanceEdge(sFromText, sHasExtent ? { min: sMin, max: sMax } : null);
    const sToValue = resolveDistanceEdge(sToText, sHasExtent ? { min: sMin, max: sMax } : null);
    const sRange = sMax - sMin || 1;
    // An unparseable edge still has to put the thumb *somewhere*; the corresponding bound is the
    // only honest place for it, and the readout says `-` so nothing claims that guess is the value.
    const sSliderFrom = sHasExtent ? clampDistance(sFromValue ?? sMin, sMin, sMax) : 0;
    const sSliderTo = sHasExtent ? clampDistance(sToValue ?? sMax, sMin, sMax) : 0;
    // How wide the selected window is. `null` — and so `-` — whenever either edge is not a number,
    // because a width computed from a guessed edge would be a number nobody selected.
    const sSpan = sFromValue === null || sToValue === null ? null : sToValue - sFromValue;

    // ~1/1000 of the extent, so a full drag is a smooth sweep rather than a few hundred discrete
    // stops, and never below the smallest value the axis can actually distinguish.
    const sStep = useMemo(() => {
        const sRaw = sRange / 1000;
        if (!Number.isFinite(sRaw) || sRaw <= 0) return 1;
        return sRaw >= 1 ? Math.max(1, Math.round(sRaw)) : sRaw;
    }, [sRange]);
    const sTickValues = useMemo(() => (sHasExtent ? buildDistanceTickValues(sMin, sMax) : []), [sHasExtent, sMin, sMax]);
    // The labels are sized to the tick step, and thinned when that makes them long: five ticks reading
    // `25.1509M` overlap each other and the max label, which is worse than three that can be read.
    const sTickStep = sTickValues.length > 1 ? sTickValues[1] - sTickValues[0] : sRange / 4;
    const sTickLabel = (aValue: number) => formatDistanceAxisLabel(aValue, sTickStep);
    const sExactMaxLabel = formatDistanceReadout(sMax);
    const sMaxLabel = sExactMaxLabel.length > 9 ? sTickLabel(sMax) : sExactMaxLabel;
    const sDrawnTicks = useMemo(() => {
        // How much room the max label needs at the right edge, in fractions of the rail: a `50k` label
        // clears everything past 92%, a `25.1504M` one needs three times that or it lands on the tick
        // beside it. Measured in characters rather than pixels — the rail's width is not known here,
        // and the ratio only has to be right to the nearest tick.
        const sLongest = sTickValues.reduce((aMax, aValue) => Math.max(aMax, sTickLabel(aValue).length), sMaxLabel.length);
        const sEdgeCut = sLongest > 10 ? 0.6 : sLongest > 6 ? 0.72 : 0.92;
        return thinDistanceTicks(
            sTickValues.filter((aValue) => (aValue - sMin) / sRange <= sEdgeCut),
            sTickLabel
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sTickValues, sMin, sMax, sRange, sTickStep, sMaxLabel]);

    // Every value the slider produces — a pixel on the rail, an arrow key — goes through here, so a
    // continuous ratio can never reach the From box as `401578.346465`, and either bound is exactly
    // reachable however badly the step divides the extent.
    const snapEdge = (aValue: number) => snapDistanceEdge({ value: aValue, min: sMin, max: sMax, step: sStep });

    // Crossing is a *swap*: pull From past To and the two exchange roles, so the thumb under the
    // cursor keeps following it instead of stopping dead against its neighbour. Nothing downstream
    // ever sees a backwards range, because the pair is written as the min and max of one moved value
    // and one anchored one rather than as "the From edge".
    const commitEdges = (aMoved: number, aAnchored: number) => {
        const sNextFrom = Math.min(aMoved, aAnchored);
        const sNextTo = Math.max(aMoved, aAnchored);
        setFromText(String(sNextFrom));
        setToText(String(sNextTo));
        pOnChange(sNextFrom, sNextTo);
    };

    const setRange = (aFrom: number | string, aTo: number | string) => {
        setFromText(String(aFrom));
        setToText(String(aTo));
        pOnChange(aFrom, aTo);
    };

    const fromThumbRef = useRef<HTMLInputElement | null>(null);
    const toThumbRef = useRef<HTMLInputElement | null>(null);

    // One edge moved from the keyboard. The other anchors; if the move crossed it, focus follows the
    // value across, so the arrows go on driving the number they were driving.
    const moveEdgeTo = (aEdge: 'from' | 'to', aValue: number) => {
        const sAnchored = aEdge === 'from' ? sSliderTo : sSliderFrom;
        const sMoved = snapEdge(aValue);
        commitEdges(sMoved, sAnchored);
        if (aEdge === 'from' && sMoved > sAnchored) toThumbRef.current?.focus();
        if (aEdge === 'to' && sMoved < sAnchored) fromThumbRef.current?.focus();
    };

    // `step="any"` on the inputs is what lets a thumb be *drawn* at a bound the step grid misses: at
    // a step of 1,000 on a 0 .. 999,990 extent the browser's own value sanitisation snaps 999,990
    // back to 999,000 and the thumb sits short of the end of its own rail while the readout claims
    // the maximum. The cost of `any` is that the arrows would move in some UA-chosen fraction of the
    // extent, so they are handled here: one step, ten of them, or straight to a bound.
    const handleThumbKeyDown = (aEdge: 'from' | 'to', aEvent: React.KeyboardEvent<HTMLInputElement>) => {
        const sCurrent = aEdge === 'from' ? sSliderFrom : sSliderTo;
        const sLeap = sStep * 10;
        const sNext =
            aEvent.key === 'ArrowRight' || aEvent.key === 'ArrowUp'
                ? sCurrent + sStep
                : aEvent.key === 'ArrowLeft' || aEvent.key === 'ArrowDown'
                ? sCurrent - sStep
                : aEvent.key === 'PageUp'
                ? sCurrent + sLeap
                : aEvent.key === 'PageDown'
                ? sCurrent - sLeap
                : aEvent.key === 'Home'
                ? sMin
                : aEvent.key === 'End'
                ? sMax
                : null;
        if (sNext === null) return;
        aEvent.preventDefault();
        moveEdgeTo(aEdge, sNext);
    };

    // ── thumb dragging ────────────────────────────────────────────────────────────────────────
    // The drag is run here rather than left to the two native range inputs, because two stacked
    // inputs cannot express "whichever thumb you meant": their thumbs are the only part of them a
    // pointer can reach, so the one painted later — To — wins every press where the two coincide and
    // the other is unreachable underneath it. The container owns the gesture instead: it names the
    // nearer thumb, anchors the other, and from then on the gesture is just "this value, that
    // anchor" — which is why crossing needs no case of its own here.
    const sliderRef = useRef<HTMLDivElement | null>(null);
    const thumbDragRef = useRef<{ anchored: number } | null>(null);

    // Value → x, on the rail the thumb centre can actually reach.
    const valueToClientX = (aValue: number, aRect: DOMRect) => {
        const sInset = DISTANCE_THUMB_WIDTH / 2;
        const sUsable = aRect.width - DISTANCE_THUMB_WIDTH;
        if (!(sUsable > 0)) return aRect.left + aRect.width / 2;
        return aRect.left + sInset + ((aValue - sMin) / sRange) * sUsable;
    };
    // ...and back, snapped to the same step the keyboard moves in so the two agree.
    const clientXToValue = (aClientX: number, aRect: DOMRect) => {
        const sInset = DISTANCE_THUMB_WIDTH / 2;
        const sUsable = aRect.width - DISTANCE_THUMB_WIDTH;
        const sRatio = sUsable > 0 ? (aClientX - aRect.left - sInset) / sUsable : 0;
        return snapEdge(sMin + Math.min(Math.max(sRatio, 0), 1) * sRange);
    };

    useEffect(() => {
        const handleMove = (aEvent: PointerEvent) => {
            const sDrag = thumbDragRef.current;
            const sRect = sliderRef.current?.getBoundingClientRect();
            if (!sDrag || !sRect || !(sRect.width > 0)) return;
            aEvent.preventDefault();
            commitEdges(clientXToValue(aEvent.clientX, sRect), sDrag.anchored);
        };
        const handleUp = () => {
            thumbDragRef.current = null;
        };
        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
        window.addEventListener('pointercancel', handleUp);
        return () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
            window.removeEventListener('pointercancel', handleUp);
        };
    });

    // A press on the bare track moves the whole window to that point, keeping its width. Without it
    // the only way to reach the far end of a long axis with a narrow window is to drag both thumbs
    // the length of the rail, one after the other, and get the width right by hand on the way.
    //
    // `pointerdown`, not `click`: a press on the track that turns into a drag would otherwise both
    // jump the window here *and* leave a click behind at the end of the gesture.
    const handleTrackPointerDown = (aEvent: React.PointerEvent<HTMLDivElement>) => {
        if (!sHasExtent) return;
        const sRect = aEvent.currentTarget.getBoundingClientRect();
        if (!(sRect.width > 0)) return;

        const sFromX = valueToClientX(sSliderFrom, sRect);
        const sToX = valueToClientX(sSliderTo, sRect);
        const sDistanceToFrom = Math.abs(aEvent.clientX - sFromX);
        const sDistanceToTo = Math.abs(aEvent.clientX - sToX);
        // A press that landed on one of the inputs came off its thumb — in a browser that is the
        // only part of them a pointer can reach — so it names its own edge and needs no guessing.
        // Compared by ref, not by class: a CSS-module class name is a build artefact, and reading
        // one that does not exist yields `undefined`, which every element's className then matches.
        const sTargetEdge = aEvent.target === fromThumbRef.current ? 'from' : aEvent.target === toThumbRef.current ? 'to' : undefined;
        const sNearest = Math.min(sDistanceToFrom, sDistanceToTo) <= DISTANCE_THUMB_GRAB_PX ? (sDistanceToFrom <= sDistanceToTo ? 'from' : 'to') : undefined;
        // A press where the two coincide needs no tie-break of its own: whichever edge is named, the
        // *other* one is the same number, and the swap in `commitEdges` sorts the pair out from there
        // whichever way the gesture then goes.
        const sEdge = sTargetEdge ?? sNearest;

        if (sEdge) {
            aEvent.preventDefault();
            thumbDragRef.current = { anchored: sEdge === 'from' ? sSliderTo : sSliderFrom };
            return;
        }

        // Not a thumb, so nothing is being dragged — including anything a previous gesture left
        // behind if its pointerup landed somewhere that never reached us.
        thumbDragRef.current = null;
        const sNext = buildDistanceSliderClickRange({ ratio: (aEvent.clientX - sRect.left) / sRect.width, from: sSliderFrom, to: sSliderTo, min: sMin, max: sMax });
        if (!sNext) return;
        setRange(sNext.from, sNext.to);
    };

    // Typed edges are deliberately never reordered or clamped while they are being typed: silently
    // rewriting `900` to `100` halfway through replacing both edges is worse than saying so. The
    // modal's Apply is what sorts the pair, so a backwards range only has to be *reported* here.
    // An anchored edge is emitted as its expression — resolving it here would freeze the window to
    // the coordinate it happens to sit at today, which is the one thing the anchor exists to avoid.
    const emittableEdge = (aText: string, aFallback: number) => {
        if (isDistanceAnchorEdge(aText)) return aText.trim();
        return parseDistanceValue(aText) ?? aFallback;
    };
    const handleFromText = (aText: string) => {
        setFromText(aText);
        if (parseDistanceValue(aText) === null && !isDistanceAnchorEdge(aText)) return;
        pOnChange(emittableEdge(aText, sSliderFrom), emittableEdge(sToText, sSliderTo));
    };
    const handleToText = (aText: string) => {
        setToText(aText);
        if (parseDistanceValue(aText) === null && !isDistanceAnchorEdge(aText)) return;
        pOnChange(emittableEdge(sFromText, sSliderFrom), emittableEdge(aText, sSliderTo));
    };

    const sNotice =
        !sFromText.trim() || !sToText.trim()
            ? 'Distance range requires both From and To.'
            : sFromValue === null || sToValue === null
            ? 'Distance range accepts numbers, or first / last (e.g. last-5000).'
            : sFromValue > sToValue
            ? 'Distance range starts after it ends.'
            : '';

    useEffect(() => {
        pOnValidityChange?.(sNotice);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sNotice]);

    return (
        <div className={styles.wrapper} data-testid="distance-body">
            {/* Two lines: the two edges are the headline, the width of the window is the note under
                it. The note carries no label — at this size, directly under a `from – to`, a lone
                number can only be the distance between them. The reset link keeps the right edge —
                it is the one control here that leaves the tab's own state. */}
            <div className={styles.readout} data-testid="distance-readout">
                <div>
                    <div className={`${styles.readoutValue} ${pMuted ? styles.readoutMuted : ''}`} data-testid="distance-readout-value">
                        {formatDistanceReadout(sFromValue)}
                        <span className={styles.dash}>–</span>
                        {formatDistanceReadout(sToValue)}
                        {pUnit && <span className={styles.unit}>{pUnit}</span>}
                        {pBadge && <span className={`${styles.badge} ${pMuted ? styles.badgeInherited : ''}`}>{pBadge}</span>}
                    </div>
                    <div className={styles.readoutSpan} data-testid="distance-readout-span">
                        {formatDistanceReadout(sSpan)}
                        {pUnit && ` ${pUnit}`}
                    </div>
                </div>
                {pOnResetToFull && (
                    <button
                        type="button"
                        className={`${styles.reset} ${pResetDisabled ? styles.resetDisabled : ''}`}
                        onClick={pOnResetToFull}
                        disabled={pResetDisabled}
                        title="Clear the saved range and follow the full data extent"
                    >
                        <VscTrash size={12} />
                        {pResetLabel}
                    </button>
                )}
            </div>

            {/* No extent ⇒ no slider. A bounds read that failed must not cost the user the editor,
                so the numeric inputs below carry on alone. */}
            {sHasExtent && (
                <>
                    <div ref={sliderRef} className={styles.slider} onPointerDown={handleTrackPointerDown} data-testid="distance-range-slider">
                        <div className={styles.track} />
                        <div
                            className={styles.fill}
                            style={{ left: `${((sSliderFrom - sMin) / sRange) * 100}%`, width: `${Math.max(0, ((sSliderTo - sSliderFrom) / sRange) * 100)}%` }}
                        />
                        <input
                            ref={fromThumbRef}
                            type="range"
                            className={`${styles.thumb} ${styles.thumbFrom}`}
                            min={sMin}
                            max={sMax}
                            step="any"
                            value={sSliderFrom}
                            aria-label="Distance from slider"
                            onKeyDown={(aEvent) => handleThumbKeyDown('from', aEvent)}
                            onChange={(aEvent) => moveEdgeTo('from', Number(aEvent.target.value))}
                        />
                        <input
                            ref={toThumbRef}
                            type="range"
                            className={`${styles.thumb} ${styles.thumbTo}`}
                            min={sMin}
                            max={sMax}
                            step="any"
                            value={sSliderTo}
                            aria-label="Distance to slider"
                            onKeyDown={(aEvent) => handleThumbKeyDown('to', aEvent)}
                            onChange={(aEvent) => moveEdgeTo('to', Number(aEvent.target.value))}
                        />
                    </div>

                    <div className={styles.ticks}>
                        {/* The upper bound is drawn at the right edge, so a tick near it would print two
                            numbers in the same place — hence the 0.92 cut above. */}
                        {sDrawnTicks.map((aValue) => {
                            const sPercent = ((aValue - sMin) / sRange) * 100;
                            // The label is centred on its tick, which puts half of the first one off the
                            // left edge of the rail — invisible as soon as it is wider than `0`.
                            return (
                                <span key={aValue} className={`${styles.tick} ${sPercent < 2 ? styles.tickMin : ''}`} style={{ left: `${sPercent}%` }} data-testid="distance-tick">
                                    <span className={styles.tickMark} />
                                    <span className={styles.tickLabel} data-testid="distance-tick-label">{sTickLabel(aValue)}</span>
                                </span>
                            );
                        })}
                        <span className={`${styles.tick} ${styles.tickMax}`} style={{ left: '100%' }} title={formatDistanceReadout(sMax)} data-testid="distance-tick" data-tick-max="true">
                            <span className={styles.tickMark} />
                            {/* The real upper bound, spelled out — it is the one number on this scale
                                that is worth exactly. Only when spelling it out would run into the tick
                                beside it (`25,150,885.5`) does it fall back to the short form, with the
                                exact value on hover. */}
                            <span className={styles.tickLabel} data-testid="distance-tick-label">{sMaxLabel}</span>
                        </span>
                    </div>
                </>
            )}

            <div className={styles.fields} data-testid="distance-fields">
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>
                        From {pUnit && <span className={styles.unit}>{pUnit}</span>}
                    </span>
                    <input value={sFromText} onChange={(aEvent) => handleFromText(aEvent.target.value)} inputMode="decimal" aria-label="Distance from" />
                </label>
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>
                        To {pUnit && <span className={styles.unit}>{pUnit}</span>}
                    </span>
                    <input value={sToText} onChange={(aEvent) => handleToText(aEvent.target.value)} inputMode="decimal" aria-label="Distance to" />
                </label>
            </div>

            {/* Quick windows. Every one of them is a fraction of the *extent*, so they exist only
                when the extent does — the same condition that draws the slider. A caller that
                places them itself (the panel editor's right-hand column) turns them off here. */}
            {sHasExtent && !pHideQuickWindows && <DistanceQuickWindows pBounds={{ min: sMin, max: sMax }} pOnSelect={setRange} />}

            {sNotice && <div className={styles.notice}>{sNotice}</div>}
        </div>
    );
};

export default DistanceRangeTab;
