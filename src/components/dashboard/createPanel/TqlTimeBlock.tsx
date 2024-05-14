import DatePicker from '@/components/datePicker/DatePicker';
import { IconButton } from '@/components/buttons/IconButton';
import { VscTrash } from 'react-icons/vsc';
import { Select } from '@/components/inputs/Select';
import { refreshTimeList } from '@/utils/dashboardUtil';
import { TIME_RANGE_NOW } from '@/utils/constants';
import './TqlTimeBlock.scss';

export const TqlTimeBlock = ({ pPanelOption, pSetPanelOption }: { pPanelOption: any; pSetPanelOption: any }) => {
    const handleTime = (aKey: string, aEvent: any) => {
        let sUseCustomTime: boolean = false;
        let sTimeRange: any = null;
        if (aKey === 'start') {
            sUseCustomTime = aEvent !== '' && pPanelOption.timeRange.end !== '';
            sTimeRange = { ...pPanelOption.timeRange, [aKey]: aEvent };
        } else if (aKey === 'end') {
            sUseCustomTime = aEvent !== '' && pPanelOption.timeRange.start !== '';
            sTimeRange = { ...pPanelOption.timeRange, [aKey]: aEvent };
        } else {
            sTimeRange = { ...pPanelOption.timeRange, start: '', end: '' };
        }

        if (sTimeRange.start.toLowerCase().includes('last')) sTimeRange.start = sTimeRange.start.toLowerCase().replace('last', 'now');
        if (sTimeRange.end.toLowerCase().includes('last')) sTimeRange.end = sTimeRange.end.toLowerCase().replace('last', 'now');
        pSetPanelOption((aPrev: any) => {
            return { ...aPrev, useCustomTime: sUseCustomTime, timeRange: sTimeRange };
        });
    };
    const handleQuickTime = (aValue: any) => {
        pSetPanelOption((aPrev: any) => {
            return { ...aPrev, useCustomTime: true, timeRange: { ...aPrev.timeRange, start: aValue.value[0], end: aValue.value[1] } };
        });
    };
    const setUseTimePicker = (aKey: string, aValue: any) => {
        pSetPanelOption((aPrev: any) => {
            return { ...aPrev, timeRange: { ...aPrev.timeRange, [aKey]: aValue } };
        });
    };
    return (
        <div className="tql-panel-time-wrap">
            <div className="time-form">
                <div className="time-header">Custom time range</div>
                <div className="time-set-form">
                    <div className="date-picker">
                        <div>
                            From
                            <DatePicker
                                pTopPixel={55}
                                pTimeValue={pPanelOption.timeRange.start ?? ''}
                                onChange={(date: any) => handleTime('start', date.target.value)}
                                pSetApply={(date: any) => handleTime('start', date)}
                            />
                        </div>
                        <div>
                            To
                            <DatePicker
                                pTopPixel={55}
                                pTimeValue={pPanelOption.timeRange.end ?? ''}
                                onChange={(date: any) => handleTime('end', date.target.value)}
                                pSetApply={(date: any) => handleTime('end', date)}
                            />
                        </div>
                        <div className="icon-btn-wrapper" style={{ marginTop: '24px', display: 'flex', justifyContent: 'start' }}>
                            <IconButton
                                pWidth={50}
                                pHeight={20}
                                pIcon={
                                    <>
                                        <VscTrash size="70px" />
                                        <span style={{ cursor: 'pointer' }}>Clear</span>
                                    </>
                                }
                                onClick={() => handleTime('', '')}
                            />
                        </div>
                    </div>
                    <div className="select-time-range">
                        {TIME_RANGE_NOW.map((aItem: any, aIdx: number) => {
                            return (
                                <div key={aIdx} className="quick-select-form">
                                    <div key={aItem.name} className="btn">
                                        <span onClick={() => handleQuickTime(aItem)}>{aItem.name}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            <div className="time-divider" />
            <div className="refresh-form">
                <div className="time-header">Refresh</div>

                <div className="refresh-set-form">
                    <Select
                        pInitValue={pPanelOption.timeRange.refresh}
                        pFontSize={12}
                        pWidth={200}
                        pBorderRadius={4}
                        pHeight={30}
                        onChange={(aEvent: any) => setUseTimePicker('refresh', aEvent.target.value)}
                        pOptions={refreshTimeList}
                    />
                </div>
            </div>
        </div>
    );
};
