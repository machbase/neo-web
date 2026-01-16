import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { MultiSectionDigitalClock } from '@mui/x-date-pickers/MultiSectionDigitalClock';
import './DatePicker.scss';
import { TextButton } from '../buttons/TextButton';
import { IconButton } from '../buttons/IconButton';
import { Calendar } from '../../assets/icons/Icon';
import { useState, useRef } from 'react';
import useOutsideClick from '../../hooks/useOutsideClick';
import { Toast } from '@/design-system/components';
import moment from 'moment';

const DatePicker = ({ pTimeValue, pSetApply, onChange, pTopPixel, pAutoFocus }: any) => {
    const [sIsModalPicker, setIsModalPicker] = useState<boolean>(false);
    const [sHours, setHours] = useState<any>(0);
    const [sMinute, setMinute] = useState<any>(0);
    const [sSecond, setSecond] = useState<any>(0);
    const [sDate, setDate] = useState<any>();

    const sInputRef = useRef<any>(null);
    const sOptionRef = useRef(null);

    const apply = () => {
        if (!sDate) {
            Toast.error('Please select date.');
            return;
        }

        const sListDate = new Date(`${sDate} ${sHours}:${sMinute}:${sSecond}`).getTime();
        pSetApply(moment(sListDate).format('YYYY-MM-DD HH:mm:ss'));
        setIsModalPicker(false);
    };

    useOutsideClick(sOptionRef, () => setIsModalPicker(false));

    return (
        <div ref={sOptionRef}>
            <div className="date-picker">
                <input autoFocus={pAutoFocus} ref={sInputRef} value={pTimeValue} onChange={onChange}></input>
                <IconButton pWidth={20} pHeight={20} pIcon={<Calendar />} onClick={() => setIsModalPicker(true)} />
            </div>
            {sIsModalPicker && sInputRef && (
                <div
                    className="date-picker-modal"
                    style={{
                        left: sInputRef.current.offsetLeft,
                        top: sInputRef.current.offsetTop + pTopPixel,
                    }}
                >
                    <div className="date-picker-wrap">
                        <div className="picker-form">
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DateCalendar
                                    className="date-calendar"
                                    onChange={(aValue: any) => {
                                        setDate(`${aValue.$y}-${aValue.$M + 1}-${aValue.$D}`);
                                    }}
                                />
                                <MultiSectionDigitalClock
                                    className="time-clock"
                                    onChange={(aValue: any, state: any, view: any) => {
                                        state;
                                        if (view === 'hours') {
                                            setHours(aValue.$H);
                                        } else if (view === 'minutes') {
                                            setMinute(aValue.$m);
                                        } else {
                                            setSecond(aValue.$s);
                                        }
                                    }}
                                    // defaultValue={pValue}
                                    views={['hours', 'minutes', 'seconds']}
                                    ampm={false}
                                    timeSteps={{ hours: 1, minutes: 1, seconds: 1 }}
                                />
                            </LocalizationProvider>
                        </div>
                        <div className="date-picker-button">
                            <TextButton
                                pBorderColor="#4199ff"
                                pHeight={28}
                                pWidth={65}
                                pFontColor="#4199ff"
                                pBorderRadius={2}
                                onClick={() => apply()}
                                pText="Apply"
                                pBackgroundColor="transparent"
                            />
                            <TextButton
                                pFontColor="rgb(231 65 131)"
                                pBorderColor="rgb(231 65 131)"
                                pHeight={28}
                                pWidth={65}
                                pBorderRadius={2}
                                onClick={() => setIsModalPicker(false)}
                                pText="Cancel"
                                pBackgroundColor="transparent"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatePicker;
