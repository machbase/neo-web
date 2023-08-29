import { Calendar, Close } from '@/assets/icons/Icon';
import './ModalTimeRange.scss';
import { useState, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { TIME_RANGE } from '@/utils/constants';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import moment from 'moment';
import OutsideClickHandler from 'react-outside-click-handler';
import { TextButton } from '../buttons/TextButton';
const ModalTimeRange = ({ pSetTimeRangeModal }: any) => {
    const sTimeRange: any = TIME_RANGE;

    const [sSelectedTab] = useRecoilState(gSelectedTab);
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);

    const [sStartTime, setStartTime] = useState<any>(undefined);
    const [sEndTime, setEndTime] = useState<any>(undefined);
    const [sIsStart, setIsStart] = useState<any>(false);
    const [sIsEnd, setIsEnd] = useState<any>(false);

    useEffect(() => {
        const sBoardStartTime = sBoardList.filter((aItem) => sSelectedTab === aItem.id)[0].range_bgn;
        const sBoardEndTime = sBoardList.filter((aItem) => sSelectedTab === aItem.id)[0].range_end;
        setStartTime(
            sBoardStartTime === '' || sBoardStartTime === undefined
                ? new Date()
                : typeof sBoardStartTime === 'string' && sBoardStartTime.includes('now')
                ? sBoardStartTime
                : moment.unix(sBoardStartTime / 1000).toDate()
        );
        setEndTime(
            sBoardEndTime === '' || sBoardEndTime === undefined
                ? new Date()
                : typeof sBoardEndTime === 'string' && sBoardEndTime.includes('now')
                ? sBoardEndTime
                : moment.unix(sBoardEndTime / 1000).toDate()
        );
    }, []);

    const handleStartTime = (aEvent: any) => {
        setStartTime(aEvent);
    };

    const handleEndTime = (aEvent: any) => {
        setEndTime(aEvent);
    };

    const handleQuickTime = (aValue: any) => {
        setStartTime(aValue.value[0]);
        setEndTime(aValue.value[1]);
    };

    const setGlobalTime = () => {
        let sStart: any;
        let sEnd: any;
        if (typeof sStartTime === 'string' && sStartTime.includes('now')) {
            sStart = sStartTime;
        } else {
            sStart = moment(sStartTime).unix() * 1000;
        }
        if (typeof sEndTime === 'string' && sEndTime.includes('now')) {
            sEnd = sEndTime;
        } else {
            sEnd = moment(sEndTime).unix() * 1000;
        }

        setBoardList(
            sBoardList.map((aItem) => {
                return aItem.id === sSelectedTab ? { ...aItem, range_bgn: sStart, range_end: sEnd } : aItem;
            })
        );

        pSetTimeRangeModal(false);
    };

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
                            {sStartTime !== undefined && (
                                <input
                                    type="text"
                                    onChange={(aEvent: any) => handleStartTime(aEvent.target.value)}
                                    value={typeof sStartTime === 'string' ? sStartTime : moment(sStartTime).format('yyyy-MM-DD HH:mm:ss')}
                                    className="date-picker"
                                    onClick={() => setIsStart(true)}
                                />
                            )}
                            {sIsStart && (
                                <OutsideClickHandler onOutsideClick={() => setIsStart(false)}>
                                    <DatePicker
                                        calendarClassName="modal-date-picker"
                                        timeInputLabel=""
                                        onChange={(date: any) => handleStartTime(date)}
                                        dateFormat="yyyy-MM-dd HH:mm:ss"
                                        showTimeInput
                                        inline
                                    ></DatePicker>
                                </OutsideClickHandler>
                            )}
                        </div>
                        <div className="to">
                            <span className="span-to">To </span>
                            {sEndTime !== undefined && (
                                <input
                                    type="text"
                                    onChange={(aEvent: any) => handleEndTime(aEvent.target.value)}
                                    value={typeof sEndTime === 'string' ? sEndTime : moment(sEndTime).format('yyyy-MM-DD HH:mm:ss')}
                                    onClick={() => setIsEnd(true)}
                                    className="date-picker"
                                />
                            )}
                            {sIsEnd && (
                                <OutsideClickHandler onOutsideClick={() => setIsEnd(false)}>
                                    <DatePicker
                                        calendarClassName="modal-date-picker"
                                        timeInputLabel=""
                                        onChange={(date: any) => handleEndTime(date)}
                                        dateFormat="yyyy-MM-dd HH:mm:ss"
                                        showTimeInput
                                        inline
                                    ></DatePicker>
                                </OutsideClickHandler>
                            )}
                        </div>
                    </div>
                    <div className="bottom">
                        <div className="quick-range">Quick Range</div>
                        <div className="list">
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
                <div className="time-range-footer">
                    <TextButton pWidth={100} pHeight={34} pText="Apply" pBackgroundColor="#4199ff" onClick={setGlobalTime} />
                    <TextButton pWidth={100} pHeight={34} pText="Cancel" pBackgroundColor="#666979" onClick={() => pSetTimeRangeModal(false)} />
                </div>
            </div>
        </div>
    );
};
export default ModalTimeRange;
