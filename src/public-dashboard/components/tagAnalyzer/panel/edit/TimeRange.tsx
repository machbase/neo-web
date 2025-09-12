import './TimeRange.scss';
import { useEffect, useState } from 'react';
import moment from 'moment';
import { SelectTimeRanges } from '../../components/tagAnalyzer/SelectTimeRanges';
import { changeTextToUtc } from '../../utils/helpers/date';
import DatePicker from '../../components/datePicker/DatePicker';

const TimeRange = ({ pPanelInfo, pSetCopyPanelInfo }: any) => {
    const [sStartTime, setStartTime] = useState<any>('');
    const [sEndTime, setEndTime] = useState<any>('');

    useEffect(() => {
        const sBoardStartTime = pPanelInfo.range_bgn;
        const sBoardEndTime = pPanelInfo.range_end;
        setStartTime(
            sBoardStartTime === ''
                ? ''
                : typeof sBoardStartTime === 'string' && (sBoardStartTime.includes('now') || sBoardStartTime.includes('last'))
                ? sBoardStartTime
                : moment.unix(sBoardStartTime / 1000).format('YYYY-MM-DD HH:mm:ss')
        );
        setEndTime(
            sBoardEndTime === ''
                ? ''
                : typeof sBoardEndTime === 'string' && (sBoardEndTime.includes('now') || sBoardStartTime.includes('last'))
                ? sBoardEndTime
                : moment.unix(sBoardEndTime / 1000).format('YYYY-MM-DD HH:mm:ss')
        );
    }, []);
    const handleStartTime = (aEvent: any, aIsApply: boolean) => {
        if (aIsApply) {
            pSetCopyPanelInfo({ ...pPanelInfo, range_bgn: (changeTextToUtc(aEvent) as number) * 1000 });
            setStartTime(aEvent);
            return;
        }

        if (typeof aEvent === 'object') {
            let sStart: any;
            if (aEvent.target.value.toLowerCase().includes('now') || aEvent.target.value.toLowerCase().includes('last')) sStart = aEvent.target.value;
            else {
                const tmpTime = moment(aEvent.target.value).unix() * 1000;
                sStart = tmpTime > 0 ? tmpTime : aEvent.target.value;
            }
            pSetCopyPanelInfo({ ...pPanelInfo, range_bgn: sStart });
            setStartTime(aEvent.target.value);
        }
    };

    const handleEndTime = (aEvent: any, aIsApply: boolean) => {
        if (aIsApply) {
            pSetCopyPanelInfo({ ...pPanelInfo, range_end: (changeTextToUtc(aEvent) as number) * 1000 });
            setEndTime(aEvent);
            return;
        }

        if (typeof aEvent === 'object') {
            let sEnd: any;
            if (aEvent.target.value.toLowerCase().includes('now') || aEvent.target.value.toLowerCase().includes('last')) sEnd = aEvent.target.value;
            else {
                const tmpTime = moment(aEvent.target.value).unix() * 1000;
                sEnd = tmpTime > 0 ? tmpTime : aEvent.target.value;
            }
            pSetCopyPanelInfo({ ...pPanelInfo, range_end: sEnd });
            setEndTime(aEvent.target.value);
        }
    };

    const handleQuickTime = (aValue: any) => {
        pSetCopyPanelInfo({ ...pPanelInfo, range_bgn: aValue.value[0], range_end: aValue.value[1] });
        setStartTime(aValue.value[0]);
        setEndTime(aValue.value[1]);
    };

    return (
        <div className="time-range">
            <div className="first-row">
                <div className="from">
                    <span className="span-from">From</span>
                    <DatePicker
                        pTopPixel={-370}
                        pTimeValue={sStartTime}
                        onChange={(date: any) => handleStartTime(date, false)}
                        pSetApply={(date: any) => handleStartTime(date, true)}
                    />
                </div>
                <div className="to">
                    <span className="span-to">To</span>
                    <DatePicker pTopPixel={-370} pTimeValue={sEndTime} onChange={(date: any) => handleEndTime(date, false)} pSetApply={(date: any) => handleEndTime(date, true)} />
                </div>
            </div>
            <div className="second-row">
                <div className="quick-range">Quick Range</div>
                <div>
                    <SelectTimeRanges onClick={handleQuickTime} />
                </div>
            </div>
        </div>
    );
};

export default TimeRange;
