import { Calendar } from '@/assets/icons/Icon';
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
    /** Which tab to open initially (dashboard mode with a distance panel). */
    pInitialTab?: 'time' | 'distance';
    /** Lock the modal to a single axis tab (panel editor: one panel = one base). Hides the tab bar. */
    pLockTab?: 'time' | 'distance';
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
    const { pSetTimeRangeModal, pSaveCallback, pShowRefresh = false, pUseRecoil = false } = props;

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

    const [sTab, setTab] = useState<'time' | 'distance'>(sLockTab ?? (props as any)?.pInitialTab ?? 'time');
    const [sBounds, setBounds] = useState<{ min: number; max: number }>({ min: 0, max: 0 });
    const [sDistFrom, setDistFrom] = useState<number>(0);
    const [sDistTo, setDistTo] = useState<number>(0);

    useEffect(() => {
        if (!sHasDistance) return;
        const sDR = sBoard?.dashboard?.distanceRange ?? {};
        const sHasStart = sDR.start !== '' && sDR.start != null;
        const sHasEnd = sDR.end !== '' && sDR.end != null;
        if (sHasStart) setDistFrom(Number(sDR.start));
        if (sHasEnd) setDistTo(Number(sDR.end));
        if (!sDistancePanel) return;
        let sCancelled = false;
        (async () => {
            const sFetched = await fetchBlockBaseMinMax(sDistancePanel.blockList?.[0]);
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
        setBoardList((aPrev: any) =>
            aPrev.map((aItem: any) => (aItem.id === sSelectedTab ? { ...aItem, dashboard: { ...aItem.dashboard, distanceRange: { start: '', end: '' } } } : aItem))
        );
        pSetTimeRangeModal(false);
    };

    const setGlobalTime = () => {
        // Distance tab → write the kind-separated dashboard.distanceRange (numeric start/end).
        if (sTab === 'distance') {
            const sFrom = Math.min(sDistFrom, sDistTo);
            const sTo = Math.max(sDistFrom, sDistTo);
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
            if (sStart < 0 || isNaN(sStart)) {
                Toast.error('Please check the entered time.');
                return;
            }
        }
        if (typeof sEndTime === 'string' && (sEndTime.includes('now') || sEndTime.includes('last') || sEndTime === '')) {
            sEnd = sEndTime;
        } else {
            sEnd = moment(sEndTime).unix() * 1000;
            if (sEnd < 0 || isNaN(sEnd)) {
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
        <Modal.Root isOpen={true} onClose={() => pSetTimeRangeModal(false)}>
            <Modal.Header>
                <Modal.Title>
                    <Calendar />
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
                        pBounds={sBounds}
                        pFrom={sDistFrom}
                        pTo={sDistTo}
                        pOnChange={(aFrom, aTo) => {
                            setDistFrom(aFrom);
                            setDistTo(aTo);
                        }}
                        pOnResetToFull={handleResetDistanceToFull}
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
