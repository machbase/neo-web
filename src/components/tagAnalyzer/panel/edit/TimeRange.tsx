import './TimeRange.scss';
import { TIME_RANGE } from '@/utils/constants';
import { useState, useRef } from 'react';
import moment from 'moment';
import { useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { Input } from '@/components/inputs/Input';
import { convertTimeToFullDate } from '@/utils/helpers/date';
import useOutsideClick from '@/hooks/useOutsideClick';

const TimeRange = ({ pPanelInfo, pSetCopyPanelInfo }: any) => {
    const sTimeRange: any = TIME_RANGE;

    const [sStartTime, setStartTime] = useState<any>(undefined);
    const [sEndTime, setEndTime] = useState<any>(undefined);
    const [sIsStart, setIsStart] = useState<any>(false);
    const [sIsEnd, setIsEnd] = useState<any>(false);
    const sStartRef = useRef<HTMLDivElement>(null);
    const sEndRef = useRef<HTMLDivElement>(null);

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

    useOutsideClick(sStartRef, () => setIsStart(false));
    useOutsideClick(sEndRef, () => setIsEnd(false));

    return (
        <div className="time-range">
            <div className="first-row">
                <div ref={sStartRef} className="from">
                    <span>From</span>
                    <div className="time-range-select-box">
                        {sStartTime !== undefined && (
                            <div onClick={() => setIsStart(true)}>
                                <Input
                                    pWidth={180}
                                    pHeight={28}
                                    onChange={(aEvent: any) => handleStartTime(aEvent.target.value)}
                                    pValue={typeof sStartTime === 'string' ? sStartTime : moment(sStartTime).format('yyyy-MM-DD HH:mm:ss')}
                                    pSetValue={() => null}
                                />
                            </div>
                        )}
                        {sIsStart && (
                            <DatePicker
                                selected={sStartTime}
                                calendarClassName="modal-date-picker"
                                timeInputLabel="Time: "
                                onChange={(date: any) => handleStartTime(date)}
                                dateFormat="yyyy-MM-dd HH:mm:ss"
                                showTimeInput
                                inline
                            ></DatePicker>
                        )}
                    </div>
                </div>
                <div ref={sEndRef} className="to">
                    <span>To</span>
                    <div className="time-range-select-box">
                        {sEndTime && (
                            <div onClick={() => setIsEnd(true)}>
                                <Input
                                    pWidth={180}
                                    pHeight={28}
                                    onChange={(aEvent: any) => handleEndTime(aEvent.target.value)}
                                    pValue={typeof sEndTime === 'string' ? sEndTime : moment(sEndTime).format('yyyy-MM-DD HH:mm:ss')}
                                    pSetValue={() => null}
                                />
                            </div>
                        )}
                        {sIsEnd && (
                            <DatePicker
                                selected={typeof sEndTime === 'string' && sEndTime.includes('now') ? moment(sEndTime).format('yyyy-MM-DD HH:mm:ss') : sEndTime}
                                calendarClassName="modal-date-picker"
                                timeInputLabel="Time: "
                                onChange={(date: any) => handleEndTime(date)}
                                dateFormat="yyyy-MM-dd HH:mm:ss"
                                showTimeInput
                                inline
                            ></DatePicker>
                        )}
                    </div>
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
