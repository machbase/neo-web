import { Calendar, Close } from '@/assets/icons/Icon';
import './ModalTimeRange.scss';
import { useState, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import DatePicker from '@/components/datePicker/DatePicker';
import moment from 'moment';
import { TextButton } from '../buttons/TextButton';
import { SelectTimeRanges } from '@/components/tagAnalyzer/SelectTimeRanges';
import { Error } from '../toast/Toast';
import { Select } from '../inputs/Select';
import { refreshTimeList } from '@/utils/dashboardUtil';
import useEsc from '@/hooks/useEsc';

const ModalTimeRange = ({ pType, pSetTimeRangeModal, pSaveCallback }: any) => {
    const [sSelectedTab] = useRecoilState(gSelectedTab);
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const [sStartTime, setStartTime] = useState<any>('');
    const [sEndTime, setEndTime] = useState<any>('');
    const [sRefresh, setRefresh] = useState<any>('');

    useEffect(() => {
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
    }, []);

    const handleStartTime = (aEvent: any) => {
        setStartTime(aEvent.target.value);
    };

    const handleEndTime = (aEvent: any) => {
        setEndTime(aEvent.target.value);
    };

    const handleQuickTime = (aValue: any) => {
        setStartTime(aValue.value[0]);
        setEndTime(aValue.value[1]);
    };

    const setGlobalTime = () => {
        let sStart: any;
        let sEnd: any;

        if (typeof sStartTime === 'string' && (sStartTime.includes('now') || sStartTime.includes('last') || sStartTime === '')) {
            sStart = sStartTime;
        } else {
            sStart = moment(sStartTime).unix() * 1000;
            if (sStart < 0 || isNaN(sStart)) {
                Error('Please check the entered time.');
                return;
            }
        }
        if (typeof sEndTime === 'string' && (sEndTime.includes('now') || sStartTime.includes('last') || sEndTime === '')) {
            sEnd = sEndTime;
        } else {
            sEnd = moment(sEndTime).unix() * 1000;
            if (sEnd < 0 || isNaN(sEnd)) {
                Error('Please check the entered time.');
                return;
            }
        }

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
        if (pSaveCallback) pSaveCallback(sStart, sEnd);
        pSetTimeRangeModal(false);
    };

    useEsc(() => pSetTimeRangeModal && pSetTimeRangeModal(false));

    return (
        <div>
            <div onClick={() => pSetTimeRangeModal(false)} className="time-range-cover"></div>
            <div className="modal-time-range">
                <div className="time-range-header">
                    <div className="time-range-title">
                        <Calendar></Calendar>
                        Time Range
                    </div>
                    <div className="time-range-close">
                        <Close onClick={() => pSetTimeRangeModal(false)} color="#f8f8f8"></Close>
                    </div>
                </div>

                <div className="time-range-body">
                    <div className="top">
                        <div className="from">
                            <span className="span-from">From</span>
                            <DatePicker
                                pTopPixel={32}
                                pTimeValue={sStartTime}
                                onChange={(date: any) => handleStartTime(date)}
                                pSetApply={(date: any) => setStartTime(date)}
                                pAutoFocus
                            />
                        </div>
                        <div className="to">
                            <span className="span-to">To </span>
                            <DatePicker pTopPixel={32} pTimeValue={sEndTime} onChange={(date: any) => handleEndTime(date)} pSetApply={(date: any) => setEndTime(date)} />
                        </div>
                        {pType === 'dashboard' && (
                            <div className="to">
                                <span className="span-to">Refresh </span>
                                {sRefresh && (
                                    <Select
                                        pInitValue={sRefresh}
                                        pFontSize={12}
                                        pWidth={200}
                                        pBorderRadius={4}
                                        pHeight={30}
                                        onChange={(aEvent: any) => setRefresh(aEvent.target.value)}
                                        pOptions={refreshTimeList}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                    <div className="bottom">
                        <div className="quick-range">Quick Range</div>
                        <div className="list">
                            <SelectTimeRanges onClick={handleQuickTime} />
                        </div>
                    </div>
                </div>
                <div className="time-range-footer">
                    <TextButton pWidth={100} pHeight={34} pText="Apply" pBackgroundColor="#4199ff" onClick={setGlobalTime} />
                    <TextButton pWidth={100} pHeight={34} pText="Cancel" pBackgroundColor="#666979" onClick={() => pSetTimeRangeModal(false)} />
                </div>
            </div>
        </div>
    );
};
export default ModalTimeRange;
