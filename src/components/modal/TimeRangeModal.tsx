import { Calendar } from '@/assets/icons/Icon';
import MaterialIcon from '@/components/common/MaterialIcon';
import { useState, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import moment from 'moment';
import { Toast } from '@/design-system/components';
import { refreshTimeOptions } from '@/utils/dashboardUtil';
import { TIME_RANGE } from '@/utils/constants';
import { DatePicker, Dropdown, Modal, Page, QuickTimeRange, type QuickTimeRangeOption } from '@/design-system/components';
import { isNumericBaseTimeBlock } from '@/utils/timeFieldColumns';
import { fetchBlockBaseMinMax } from '@/utils/dashboardBaseMinMax';
import DistanceRangeTab from './DistanceRangeTab';

interface TimeRangeModalPropsBase {
    pSetTimeRangeModal: React.Dispatch<React.SetStateAction<boolean>>;
    pSaveCallback?: (start: any, end: any) => void;
    pShowRefresh?: boolean;
    /** Allow pre-1970 absolute timestamps. Off by default to preserve existing callers. */
    pAllowNegativeTime?: boolean;
    /** Which tab to open initially (dashboard mode with a distance panel). */
    pInitialTab?: 'time' | 'distance';
    /** Lock the modal to a single axis tab (panel editor: one panel = one base). Hides the tab bar. */
    pLockTab?: 'time' | 'distance';
    /**
     * The block whose base column supplies the distance slider bounds. The panel editor passes the
     * panel it is editing, which is the only honest extent there: that panel may not be the board's
     * first distance panel, and while it is being created it is not on the board at all. Omitted on
     * the board header, where the first distance panel is the reference.
     */
    pBoundsBlock?: any;
    /**
     * The distance slider's extent, supplied by the caller instead of read from a board.
     *
     * The dashboard has a block to measure — `pBoundsBlock` — but a caller that is not a board has
     * already read the same extent for its own axis (the Data Viewer holds it for the slider it
     * draws beside the grid), and it has no `blockList` to hand over. Passing it in skips the fetch
     * entirely; the fetch stays for the board, which cannot know its extent until the modal opens.
     */
    pBounds?: { min: number; max: number } | null;
}

// Props-based mode (ViewTimeRangeModal pattern)
interface TimeRangeModalPropsExternal extends TimeRangeModalPropsBase {
    pStartTime: string | number;
    pEndTime: string | number;
    pRefresh?: any;
    pSetTime: any;
    pUseRecoil?: false;
}

// Recoil-based mode (ModalTimeRange pattern)
interface TimeRangeModalPropsRecoil extends TimeRangeModalPropsBase {
    pType?: 'dashboard' | 'tag';
    pUseRecoil: true;
    pStartTime?: never;
    pEndTime?: never;
    pRefresh?: never;
    pSetTime?: never;
}

type TimeRangeModalProps = TimeRangeModalPropsExternal | TimeRangeModalPropsRecoil;

const TimeRangeModal = (props: TimeRangeModalProps) => {
    const { pSetTimeRangeModal, pSaveCallback, pShowRefresh = false, pUseRecoil = false, pAllowNegativeTime = false } = props;

    const [sSelectedTab] = useRecoilState(gSelectedTab);
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const [sStartTime, setStartTime] = useState<any>('');
    const [sEndTime, setEndTime] = useState<any>('');
    const [sRefresh, setRefresh] = useState<any>('');

    // ── Distance (numeric base) range ──────────────────────────────────────────
    const sModalType = pUseRecoil ? (props as any)?.pType || 'dashboard' : undefined;
    const sBoard = pUseRecoil ? sBoardList.find((aItem) => aItem.id === sSelectedTab) : undefined;
    // First non-Tql panel whose base column is distance — its blockList[0] is the range reference.
    const sDistancePanel = sBoard?.dashboard?.panels?.find((aPanel: any) => aPanel.type !== 'Tql chart' && isNumericBaseTimeBlock(aPanel.blockList?.[0]));
    // Distance range is configurable on any dashboard (even before a distance panel exists), so the
    // tab is offered whenever the modal is in dashboard mode; bounds are only fetched when a panel exists.
    const sHasDistance = sModalType === 'dashboard';
    // When locked (panel editor), the modal is pinned to the edited panel's single base kind: the
    // tab bar is hidden and the matching content branch is forced.
    const sLockTab = (props as any)?.pLockTab as 'time' | 'distance' | undefined;
    // The panel editor names its own block; the board header falls back to the first distance panel.
    const sBoundsBlock = (props as any)?.pBoundsBlock ?? sDistancePanel?.blockList?.[0];
    // `null` from a caller means "extent unknown" — the same thing an unread board extent means, so
    // it falls through to {0,0} and the tab hides the slider rather than drawing a bogus rail.
    const sInjectedBoundsProp = (props as any)?.pBounds as { min: number; max: number } | null | undefined;
    const sInjectedBounds =
        sInjectedBoundsProp && Number.isFinite(sInjectedBoundsProp.min) && Number.isFinite(sInjectedBoundsProp.max) ? sInjectedBoundsProp : undefined;

    const [sTab, setTab] = useState<'time' | 'distance'>(sLockTab ?? (props as any)?.pInitialTab ?? 'time');
    const [sBounds, setBounds] = useState<{ min: number; max: number }>({ min: 0, max: 0 });
    // Either a coordinate or an anchored edge ('last-5000', 'first'), stored as written so the window
    // keeps following the data instead of freezing at today's numbers.
    const [sDistFrom, setDistFrom] = useState<number | string>(0);
    const [sDistTo, setDistTo] = useState<number | string>(0);
    // The board fetches its extent into state; a props-mode caller passes one in. Everything below
    // reads this one value so the two paths cannot drift.
    const sEffectiveBounds = sInjectedBounds ?? sBounds;
    // Why the distance tab's typed range cannot be applied, or '' when it can. The tab reports it;
    // Apply is here, so refusing is here too.
    const [sDistNotice, setDistNotice] = useState<string>('');

    useEffect(() => {
        // An injected extent settles both questions the board answers below: there is nothing to
        // fetch, and the range to show is the one the caller passed as pStartTime/pEndTime (seeded
        // by the init effect), not a board's stored distanceRange. It is read live rather than
        // copied into state here, because the caller reads it asynchronously and it can land after
        // this modal is already open — a mount-time copy would leave the slider permanently hidden.
        if (sInjectedBoundsProp !== undefined) return;
        if (!sHasDistance) return;
        const sDR = sBoard?.dashboard?.distanceRange ?? {};
        const sHasStart = sDR.start !== '' && sDR.start != null;
        const sHasEnd = sDR.end !== '' && sDR.end != null;
        if (sHasStart) setDistFrom(sDR.start);
        if (sHasEnd) setDistTo(sDR.end);
        if (!sBoundsBlock) return;
        let sCancelled = false;
        (async () => {
            const sFetched = await fetchBlockBaseMinMax(sBoundsBlock);
            if (sCancelled || !sFetched) return;
            setBounds(sFetched);
            if (!sHasStart) setDistFrom(sFetched.min);
            if (!sHasEnd) setDistTo(sFetched.max);
        })();
        return () => {
            sCancelled = true;
        };
    }, []);

    useEffect(() => {
        if (pUseRecoil) {
            // Recoil-based mode (ModalTimeRange pattern)
            const pType = (props as any)?.pType || 'dashboard';
            const sBoardStartTime =
                pType === 'dashboard'
                    ? sBoardList.filter((aItem) => sSelectedTab === aItem.id)[0]?.dashboard.timeRange.start
                    : sBoardList.filter((aItem) => sSelectedTab === aItem.id)[0]?.range_bgn;
            const sBoardEndTime =
                pType === 'dashboard'
                    ? sBoardList.filter((aItem) => sSelectedTab === aItem.id)[0]?.dashboard.timeRange.end
                    : sBoardList.filter((aItem) => sSelectedTab === aItem.id)[0]?.range_end;
            if (pType === 'dashboard') {
                const sBoardRefresh = sBoardList.filter((aItem) => sSelectedTab === aItem.id)[0]?.dashboard.timeRange?.refresh ?? 'Off';
                setRefresh(sBoardRefresh);
            }
            setStartTime(
                sBoardStartTime === '' || sBoardStartTime === undefined
                    ? ''
                    : typeof sBoardStartTime === 'string' && (sBoardStartTime.includes('now') || sBoardStartTime.includes('last'))
                    ? sBoardStartTime
                    : moment.unix(sBoardStartTime / 1000).format('YYYY-MM-DD HH:mm:ss')
            );
            setEndTime(
                sBoardEndTime === '' || sBoardEndTime === undefined
                    ? ''
                    : typeof sBoardEndTime === 'string' && (sBoardEndTime.includes('now') || sBoardEndTime.includes('last'))
                    ? sBoardEndTime
                    : moment.unix(sBoardEndTime / 1000).format('YYYY-MM-DD HH:mm:ss')
            );
        } else {
            // Props-based mode (ViewTimeRangeModal pattern)
            const { pStartTime, pEndTime, pRefresh } = props;
            // A distance range is never a clock reading: `0` is metre zero, not 1970, so it must not
            // go through the epoch formatting the time axis needs.
            if (sLockTab === 'distance') {
                setDistFrom(pStartTime ?? 0);
                setDistTo(pEndTime ?? 0);
                setStartTime(pStartTime);
                setEndTime(pEndTime);
                setRefresh(pRefresh);
                return;
            }
            const sStart = typeof pStartTime === 'number' ? moment.unix(pStartTime / 1000).format('YYYY-MM-DD HH:mm:ss') : pStartTime;
            const sEnd = typeof pEndTime === 'number' ? moment.unix(pEndTime / 1000).format('YYYY-MM-DD HH:mm:ss') : pEndTime;
            setStartTime(sStart);
            setEndTime(sEnd);
            setRefresh(pRefresh);
        }
    }, []); // pUseRecoil, sBoardList, sSelectedTab, props

    const handleStartTime = (aEvent: any) => {
        setStartTime(aEvent.target.value);
    };

    const handleEndTime = (aEvent: any) => {
        setEndTime(aEvent.target.value);
    };

    const handleQuickTime = (option: QuickTimeRangeOption) => {
        setStartTime(option.value[0]);
        setEndTime(option.value[1]);
    };

    const HandleRefresh = (aValue: string) => {
        setRefresh(aValue);
    };

    // Reset the distance axis back to the system default (full [first, last]) range.
    const handleResetDistanceToFull = () => {
        // Full means the whole extent. A board stores that as the empty pair and resolves it per
        // query; a props-mode caller has the extent in hand and needs two real edges, because an
        // empty edge there is an unbounded scan rather than "open-ended". With no extent read there
        // is no "full" to reset to — writing the {0,0} placeholder would apply as a zero-width
        // window, so the control is disabled and this is a no-op if it is reached anyway.
        if (!pUseRecoil) {
            if (!sInjectedBounds) return;
            setDistFrom(sEffectiveBounds.min);
            setDistTo(sEffectiveBounds.max);
            return;
        }
        setBoardList((aPrev: any) =>
            aPrev.map((aItem: any) => (aItem.id === sSelectedTab ? { ...aItem, dashboard: { ...aItem.dashboard, distanceRange: { start: '', end: '' } } } : aItem))
        );
        pSetTimeRangeModal(false);
    };

    const setGlobalTime = () => {
        // Distance tab → write the kind-separated dashboard.distanceRange (numeric start/end).
        if (sTab === 'distance') {
            if (sDistNotice) {
                Toast.error(sDistNotice);
                return;
            }
            // Only two coordinates can be put in order; an anchored pair is already ordered by what
            // it means (`first…` opens, `last…` closes) and reordering it would rewrite the anchors.
            const sBothNumeric = typeof sDistFrom === 'number' && typeof sDistTo === 'number';
            const sFrom = sBothNumeric ? Math.min(sDistFrom as number, sDistTo as number) : sDistFrom;
            const sTo = sBothNumeric ? Math.max(sDistFrom as number, sDistTo as number) : sDistTo;
            // A props-mode caller owns its own range — writing the board's distanceRange from here
            // would edit whichever dashboard happens to be the selected tab.
            if (!pUseRecoil) {
                if (pSaveCallback) pSaveCallback(sFrom, sTo);
                pSetTimeRangeModal(false);
                return;
            }
            setBoardList((aPrev: any) =>
                aPrev.map((aItem: any) => (aItem.id === sSelectedTab ? { ...aItem, dashboard: { ...aItem.dashboard, distanceRange: { start: sFrom, end: sTo } } } : aItem))
            );
            pSetTimeRangeModal(false);
            return;
        }

        let sStart: any;
        let sEnd: any;

        if (typeof sStartTime === 'string' && (sStartTime.includes('now') || sStartTime.includes('last') || sStartTime === '')) {
            sStart = sStartTime;
        } else {
            sStart = moment(sStartTime).unix() * 1000;
            if ((!pAllowNegativeTime && sStart < 0) || isNaN(sStart)) {
                Toast.error('Please check the entered time.');
                return;
            }
        }
        if (typeof sEndTime === 'string' && (sEndTime.includes('now') || sEndTime.includes('last') || sEndTime === '')) {
            sEnd = sEndTime;
        } else {
            sEnd = moment(sEndTime).unix() * 1000;
            if ((!pAllowNegativeTime && sEnd < 0) || isNaN(sEnd)) {
                Toast.error('Please check the entered time.');
                return;
            }
        }

        if (pUseRecoil) {
            // Recoil-based mode (ModalTimeRange pattern)
            const pType = (props as any)?.pType || 'dashboard';
            if (pType === 'dashboard') {
                setBoardList((aPrev: any) =>
                    aPrev.map((aItem: any) => {
                        return aItem.id === sSelectedTab ? { ...aItem, dashboard: { ...aItem.dashboard, timeRange: { start: sStart, end: sEnd, refresh: sRefresh } } } : aItem;
                    })
                );
            } else {
                setBoardList((aPrev: any) =>
                    aPrev.map((aItem: any) => {
                        return aItem.id === sSelectedTab ? { ...aItem, range_bgn: sStart, range_end: sEnd } : aItem;
                    })
                );
            }
        } else {
            // Props-based mode (ViewTimeRangeModal pattern)
            const { pSetTime } = props;
            pSetTime((aPrev: any) => {
                return {
                    ...aPrev,
                    dashboard: {
                        ...aPrev.dashboard,
                        timeRange: {
                            start: sStart,
                            end: sEnd,
                            refresh: sRefresh,
                        },
                    },
                };
            });
        }

        if (pSaveCallback) pSaveCallback(sStart, sEnd);

        pSetTimeRangeModal(false);
    };

    return (
        <Modal.Root
            isOpen={true}
            onClose={() => pSetTimeRangeModal(false)}
            // Enter applies, which is what the Data Viewer's own distance dialog did before it was
            // folded into this one — a range is typed, and typing ends with Enter.
            onKeyDown={(aEvent) => {
                if (aEvent.key !== 'Enter') return;
                const sTag = (aEvent.target as HTMLElement)?.tagName;
                // A button under Enter is already doing its own thing (Cancel is a Cancel), and a
                // textarea's Enter is a newline.
                if (sTag === 'BUTTON' || sTag === 'TEXTAREA') return;
                aEvent.preventDefault();
                setGlobalTime();
            }}
        >
            <Modal.Header>
                <Modal.Title>
                    {/* A calendar over an odometer reading is the same category error the axis
                        itself guards against, so the icon follows the locked axis. */}
                    {sLockTab === 'distance' ? <MaterialIcon name="straighten" size={16} /> : <Calendar />}
                    {sLockTab === 'distance' ? 'Distance Range' : sLockTab === 'time' ? 'Time Range' : sHasDistance ? 'Range' : 'Time Range'}
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>

            <Modal.Body>
                {sHasDistance && !sLockTab && (
                    <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '12px' }}>
                        {(['time', 'distance'] as const).map((aKey) => (
                            <button
                                key={aKey}
                                type="button"
                                onClick={() => setTab(aKey)}
                                style={{
                                    padding: '8px 16px',
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: sTab === aKey ? '2px solid #2f7fe0' : '2px solid transparent',
                                    borderRadius: 0,
                                    color: sTab === aKey ? '#e8e8e8' : '#8a8d94',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                {aKey === 'time' ? 'Time' : 'Distance'}
                            </button>
                        ))}
                    </div>
                )}

                {(sHasDistance || sLockTab === 'distance') && sTab === 'distance' ? (
                    <DistanceRangeTab
                        pBounds={sEffectiveBounds}
                        pFrom={sDistFrom}
                        pTo={sDistTo}
                        pOnChange={(aFrom, aTo) => {
                            setDistFrom(aFrom);
                            setDistTo(aTo);
                        }}
                        pOnResetToFull={handleResetDistanceToFull}
                        pResetDisabled={!pUseRecoil && !sInjectedBounds}
                        pOnValidityChange={setDistNotice}
                    />
                ) : (
                    <>
                        <DatePicker pLabel="From" pTopPixel={32} pTimeValue={sStartTime} onChange={(date: any) => handleStartTime(date)} pSetApply={(date: any) => setStartTime(date)} />
                        <DatePicker pLabel="To" pTopPixel={32} pTimeValue={sEndTime} onChange={(date: any) => handleEndTime(date)} pSetApply={(date: any) => setEndTime(date)} />
                        {pShowRefresh && (
                            <Dropdown.Root
                                label="Refresh"
                                labelPosition="left"
                                fullWidth
                                options={refreshTimeOptions}
                                value={sRefresh}
                                onChange={HandleRefresh}
                                placeholder="Select refresh time"
                            >
                                <Dropdown.Trigger />
                                <Dropdown.Menu>
                                    <Dropdown.List />
                                </Dropdown.Menu>
                            </Dropdown.Root>
                        )}
                        <Page.Space />
                        <QuickTimeRange options={TIME_RANGE} onSelect={handleQuickTime} title="Quick Range" />
                    </>
                )}
            </Modal.Body>

            <Modal.Footer>
                <Modal.Confirm onClick={setGlobalTime}>Apply</Modal.Confirm>
                <Modal.Cancel>Cancel</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};
export default TimeRangeModal;
