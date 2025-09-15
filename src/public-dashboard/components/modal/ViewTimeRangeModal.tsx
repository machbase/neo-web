import { Calendar, Close } from '../../assets/icons/Icon';
import { useState, useEffect } from 'react';
import DatePicker from '../datePicker/DatePicker';
import moment from 'moment';
import { TextButton } from '../buttons/TextButton';
import { SelectTimeRanges } from '../SelectTimeRanges';
import { Error } from '../toast/Toast';
import { Select } from '../inputs/Select';
import { refreshTimeList } from '../../utils/dashboardUtil';
import './ViewTimeRangeModal.scss';

interface ViewTimeRangeModalProps {
    pSetTimeRangeModal: React.Dispatch<React.SetStateAction<boolean>>;
    pStartTime: string | number;
    pEndTime: string | number;
    pRefresh: any;
    pSetTime: any;
    pSaveCallback: any;
}

const ViewTimeRangeModal = (props: ViewTimeRangeModalProps) => {
    const { pSetTimeRangeModal, pStartTime, pEndTime, pRefresh, pSetTime, pSaveCallback } = props;

    const [sStartTime, setStartTime] = useState<any>('');
    const [sEndTime, setEndTime] = useState<any>('');
    const [sRefresh, setRefresh] = useState<any>('');

    useEffect(() => {
        const sStart = typeof pStartTime === 'number' ? moment.unix(pStartTime / 1000).format('YYYY-MM-DD HH:mm:ss') : pStartTime;
        const sEnd = typeof pEndTime === 'number' ? moment.unix(pEndTime / 1000).format('YYYY-MM-DD HH:mm:ss') : pEndTime;
        setStartTime(sStart);
        setEndTime(sEnd);
        setRefresh(pRefresh);
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

    const HandleRefresh = (aValue: any) => {
        setRefresh(aValue.target.value);
    };

    const setGlobalTime = () => {
        let sStart: any;
        let sEnd: any;
        if (typeof sStartTime === 'string' && (sStartTime.includes('now') || sStartTime.includes('last'))) {
            sStart = sStartTime;
        } else {
            sStart = moment(sStartTime).unix() * 1000;
            if (sStart < 0 || isNaN(sStart)) {
                Error('Please check the entered time.');
                return;
            }
        }
        if (typeof sEndTime === 'string' && (sEndTime.includes('now') || sEndTime.includes('last'))) {
            sEnd = sEndTime;
        } else {
            sEnd = moment(sEndTime).unix() * 1000;
            if (sEnd < 0 || isNaN(sEnd)) {
                Error('Please check the entered time.');
                return;
            }
        }

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

        if (pSaveCallback) pSaveCallback(sStart, sEnd);

        pSetTimeRangeModal(false);
    };

    return (
        <div>
            <div onClick={() => pSetTimeRangeModal(false)} className="time-range-cover"></div>
            <div className="view-timerange-modal">
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
                                pAutoFocus
                                pTopPixel={32}
                                pTimeValue={sStartTime}
                                onChange={(date: any) => handleStartTime(date)}
                                pSetApply={(date: any) => setStartTime(date)}
                            />
                        </div>
                        <div className="to">
                            <span className="span-to">To </span>
                            <DatePicker pTopPixel={32} pTimeValue={sEndTime} onChange={(date: any) => handleEndTime(date)} pSetApply={(date: any) => setEndTime(date)}></DatePicker>
                        </div>
                        <div className="refresh">
                            <span className="span-to">Refresh </span>
                            <Select pInitValue={sRefresh} pFontSize={12} pWidth={200} pBorderRadius={4} pHeight={30} onChange={HandleRefresh} pOptions={refreshTimeList} />
                        </div>
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
export default ViewTimeRangeModal;
