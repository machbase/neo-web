import { useEffect, useState } from 'react';
import { Dropdown, Page } from '@/design-system/components';
import { refreshTimeOptions } from '@/utils/dashboardUtil';
import { fetchBlockBaseMinMax } from '@/utils/dashboardBaseMinMax';
import { isDistanceEdgeSet } from '@/utils/distanceRange';
import DistanceRangeTab, { DistanceQuickWindows } from '@/components/modal/DistanceRangeTab';

interface DistanceRangeBlockProps {
    pPanelOption: any;
    pSetPanelOption: any;
}

/**
 * The distance (numeric base) counterpart of `TimeRangeBlock`: the per-panel custom range editor for
 * a panel whose base column is a distance rather than a timestamp.
 *
 * `last-1h` has no distance analogue and a date picker cannot express 138,000 m, so the whole time
 * body — pickers, quick time ranges — is replaced by the same `DistanceRangeTab` the Range modal
 * draws, bounded by *this* panel's own data extent. Refresh stays: it is per-panel polling and has
 * nothing to do with which axis the panel is on.
 *
 * Written to `panel.distanceRange` + `panel.useCustomDistance`, kind-separated from
 * `timeRange`/`useCustomTime` exactly as the board separates `dashboard.distanceRange` — a numeric
 * window and a time expression cannot share one field without something downstream reading metres
 * as milliseconds.
 */
export const DistanceRangeBlock = ({ pPanelOption, pSetPanelOption }: DistanceRangeBlockProps) => {
    const sBlock = pPanelOption.blockList?.[0];
    const [sBounds, setBounds] = useState<{ min: number; max: number }>({ min: 0, max: 0 });
    // What actually identifies the extent: change the table, the tag or the base column and the
    // slider is measuring something else. Every other edit to the block leaves it where it is.
    const sBlockKey = `${sBlock?.table ?? ''}|${sBlock?.tag ?? ''}|${sBlock?.time ?? ''}`;

    // The panel's own extent, not the board's first distance panel: this editor edits this panel.
    useEffect(() => {
        let sCancelled = false;
        (async () => {
            const sFetched = await fetchBlockBaseMinMax(sBlock);
            if (sCancelled || !sFetched) return;
            setBounds(sFetched);
        })();
        return () => {
            sCancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sBlockKey]);

    const sRange = pPanelOption.distanceRange ?? { start: '', end: '' };
    const sHasStart = isDistanceEdgeSet(sRange.start);
    const sHasEnd = isDistanceEdgeSet(sRange.end);
    // Unset edges show the full extent — which is what the panel actually renders when it falls back
    // to the board — so the editor opens on what is on screen rather than on 0 – 0. A set edge is
    // passed through as stored: a number stays a number, `last-5000` stays an anchor.
    const sFrom = sHasStart ? sRange.start : sBounds.min;
    const sTo = sHasEnd ? sRange.end : sBounds.max;
    // Whether this panel actually owns the window on screen. Both the flag and a stored edge, because
    // the flag alone survives a Clear in older configs and an edge alone can be left by a partial edit.
    const sIsOverride = Boolean(pPanelOption.useCustomDistance) && (sHasStart || sHasEnd);

    const handleChange = (aFrom: number | string, aTo: number | string) => {
        pSetPanelOption((aPrev: any) => ({ ...aPrev, useCustomDistance: true, distanceRange: { start: aFrom, end: aTo } }));
    };

    // Back to following the board's distance range. Both edges cleared together: a half-set panel
    // override reads as "custom" while behaving like the board on one side.
    const handleClear = () => {
        pSetPanelOption((aPrev: any) => ({ ...aPrev, useCustomDistance: false, distanceRange: { start: '', end: '' } }));
    };

    const setRefresh = (aValue: string) => {
        pSetPanelOption((aPrev: any) => ({ ...aPrev, timeRange: { ...aPrev.timeRange, refresh: aValue } }));
    };

    return (
        <>
            <Page.ContentBlock pHoverNone style={{ padding: 0, margin: 0 }}>
                <Page.ContentTitle>Custom distance range</Page.ContentTitle>
            </Page.ContentBlock>
            <Page.DpRow style={{ alignItems: 'start', padding: 0 }}>
                <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                    <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                        <Dropdown.Root
                            label="Refresh"
                            labelPosition="left"
                            fullWidth
                            options={refreshTimeOptions}
                            value={pPanelOption.timeRange?.refresh ?? 'Off'}
                            onChange={setRefresh}
                            placeholder="Select refresh time"
                        >
                            <Dropdown.Trigger />
                            <Dropdown.Menu>
                                <Dropdown.List />
                            </Dropdown.Menu>
                        </Dropdown.Root>
                    </Page.ContentBlock>
                    <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                        {/* Clear sits at the right of the readout, where the modal keeps its reset:
                            same control, same place, whichever of the two editors you are in. */}
                        <DistanceRangeTab
                            pBounds={sBounds}
                            pFrom={sFrom}
                            pTo={sTo}
                            pOnChange={handleChange}
                            pOnResetToFull={handleClear}
                            pResetLabel="Clear"
                            pResetDisabled={!sIsOverride}
                            pBadge={sIsOverride ? 'Panel' : 'Board'}
                            pMuted={!sIsOverride}
                            pHideQuickWindows
                        />
                    </Page.ContentBlock>
                </Page.ContentBlock>
                {/* The quick windows go in the right-hand column, where the time editor keeps its
                    quick ranges — this row is wide, and stacked under the slider they would push
                    Clear off the bottom of the panel. */}
                <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                    <DistanceQuickWindows pBounds={sBounds} pOnSelect={handleChange} />
                </Page.ContentBlock>
            </Page.DpRow>
        </>
    );
};
