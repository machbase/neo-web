import './TimeRange.scss';
import { TIME_RANGE } from '@/utils/constants';
import { useState } from 'react';
import moment from 'moment';
import { useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { convertTimeToFullDate } from '@/utils/helpers/date';

const TimeRange = ({ pPanelInfo, pSetCopyPanelInfo }: any) => {
    const sTimeRange: any = TIME_RANGE;

    const [sStartTime, setStartTime] = useState<any>(undefined);
    const [sEndTime, setEndTime] = useState<any>(undefined);

    useEffect(() => {
        const sBoardStartTime = pPanelInfo.range_bgn;
        const sBoardEndTime = pPanelInfo.range_end;
        setStartTime(
            sBoardStartTime === ''
                ? new Date()
                : typeof sBoardStartTime === 'string' && sBoardStartTime.includes('now')
                ? sBoardStartTime
                : moment.unix(sBoardStartTime / 1000).toDate()
        );
        setEndTime(
            sBoardEndTime === '' ? new Date() : typeof sBoardStartTime === 'string' && sBoardEndTime.includes('now') ? sBoardEndTime : moment.unix(sBoardEndTime / 1000).toDate()
        );
    }, []);

    const handleStartTime = (aEvent: any) => {
        let sStart: any;

        if (typeof aEvent === 'string' && aEvent.includes('now')) {
            sStart = aEvent;
        } else {
            sStart = moment(aEvent).unix() * 1000;
        }

        pSetCopyPanelInfo({ ...pPanelInfo, range_bgn: sStart });
        setStartTime(aEvent);
    };

    const handleEndTime = (aEvent: any) => {
        let sEnd: any;

        if (typeof aEvent === 'string' && aEvent.includes('now')) {
            sEnd = aEvent;
        } else {
            sEnd = moment(aEvent).unix() * 1000;
        }
        pSetCopyPanelInfo({ ...pPanelInfo, range_end: sEnd });

        setEndTime(aEvent);
    };

    const handleQuickTime = (aValue: any) => {
        let sStart: any;
        let sEnd: any;
        if (typeof aValue.value[0] === 'string' && aValue.value[0].includes('now')) {
            sStart = aValue.value[0];
        } else {
            sStart = moment(aValue.value[0]).unix() * 1000;
        }
        if (typeof aValue[1] === 'string' && aValue[1].includes('now')) {
            sEnd = aValue[1];
        } else {
            sEnd = moment(aValue[1]).unix() * 1000;
        }

        pSetCopyPanelInfo({ ...pPanelInfo, range_bgn: sStart, range_end: sEnd });

        setStartTime(convertTimeToFullDate(aValue.value[0]));
        setEndTime(convertTimeToFullDate(aValue.value[1]));
    };

    return (
        <div className="time-range">
            <div className="first-row">
                <div className="from">
                    <span className="span-from">From</span>
                    <DatePicker
                        selected={sStartTime}
                        calendarClassName="modal-date-picker"
                        timeInputLabel="Time: "
                        onChange={(date: any) => handleStartTime(date)}
                        dateFormat="yyyy-MM-dd HH:mm:ss"
                        popperPlacement="top"
                        showTimeInput
                    ></DatePicker>
                </div>
                <div className="to">
                    <span className="span-to">To</span>
                    <DatePicker
                        selected={typeof sEndTime === 'string' && sEndTime.includes('now') ? moment(sEndTime).format('yyyy-MM-DD HH:mm:ss') : sEndTime}
                        calendarClassName="modal-date-picker"
                        timeInputLabel="Time: "
                        onChange={(date: any) => handleEndTime(date)}
                        dateFormat="yyyy-MM-dd HH:mm:ss"
                        popperPlacement="top"
                        showTimeInput
                    ></DatePicker>
                </div>
            </div>
            <div className="second-row">
                <div className="quick-range">Quick Range</div>
                <div>
                    {sTimeRange.map((aItem: any, aIdx: number) => {
                        return (
                            <div key={aIdx} className="quick-select-form">
                                {aItem.map((bItem: any) => {
                                    return (
                                        <div key={bItem.name} className="btn">
                                            <span onClick={() => handleQuickTime(bItem)}>{bItem.name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default TimeRange;
