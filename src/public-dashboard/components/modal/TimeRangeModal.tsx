import { Calendar } from '@/assets/icons/Icon';
import { useState, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import moment from 'moment';
import { Toast } from '@/design-system/components';
import { refreshTimeOptions } from '@/utils/dashboardUtil';
import { TIME_RANGE } from '@/utils/constants';
import { DatePicker, Dropdown, Modal, Page, QuickTimeRange, type QuickTimeRangeOption } from '@/design-system/components';

interface TimeRangeModalPropsBase {
    pSetTimeRangeModal: React.Dispatch<React.SetStateAction<boolean>>;
    pSaveCallback?: (start: any, end: any) => void;
    pShowRefresh?: boolean;
    pType?: 'dashboard' | 'tag';
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

    useEffect(() => {
        if (pUseRecoil) {
            // Recoil-based mode (ModalTimeRange pattern)
            const pType = props.pType || 'dashboard';
            const sBoardStartTime =
                pType === 'dashboard'
                    ? sBoardList.filter((aItem) => sSelectedTab === aItem.id)[0].dashboard.timeRange.start
                    : sBoardList.filter((aItem) => sSelectedTab === aItem.id)[0].range_bgn;
            const sBoardEndTime =
                pType === 'dashboard'
                    ? sBoardList.filter((aItem) => sSelectedTab === aItem.id)[0].dashboard.timeRange.end
                    : sBoardList.filter((aItem) => sSelectedTab === aItem.id)[0].range_end;
            if (pType === 'dashboard') {
                const sBoardRefresh = sBoardList.filter((aItem) => sSelectedTab === aItem.id)[0].dashboard.timeRange?.refresh ?? 'Off';
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
                    : typeof sBoardEndTime === 'string' && (sBoardEndTime.includes('now') || sBoardStartTime.includes('last'))
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
    }, []);

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

    const setGlobalTime = () => {
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
        if (typeof sEndTime === 'string' && (sEndTime.includes('now') || sStartTime.includes('last') || sEndTime === '')) {
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
            const pType = props.pType || 'dashboard';
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
                    Time Range
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>

            <Modal.Body>
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
            </Modal.Body>

            <Modal.Footer>
                <Modal.Confirm onClick={setGlobalTime}>Apply</Modal.Confirm>
                <Modal.Cancel>Cancel</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};
export default TimeRangeModal;
