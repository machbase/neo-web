import './CreatePanelFooter.scss';
import Series from './Series';
import { useState } from 'react';
import { PlusCircle } from '@/assets/icons/Icon';
import { refreshTimeList } from '@/utils/dashboardUtil';
import DatePicker from '@/components/datePicker/DatePicker';

import { SelectTimeRanges } from '@/components/tagAnalyzer/SelectTimeRanges';
import CheckBox from '@/components/inputs/CheckBox';
import { Select } from '@/components/inputs/Select';
import { getId } from '@/utils';

const CreatePanelFotter = ({ pTableList, pType, pGetTables, pSetPanelOption, pPanelOption }: any) => {
    const sColorList = ['#73BF69', '#F2CC0C', '#8AB8FF', '#FF780A', '#F2495C', '#5794F2', '#B877D9', '#705DA0', '#37872D', '#FADE2A'];
    const [sTab, setTab] = useState('Query');

    const setUseTimePicker = (aKey: string, aValue: any) => {
        pSetPanelOption((aPrev: any) => {
            return { ...aPrev, timeRange: { ...aPrev.timeRange, [aKey]: aValue } };
        });
    };

    const handleTime = (aKey: string, aEvent: any) => {
        pSetPanelOption((aPrev: any) => {
            return { ...aPrev, timeRange: { ...aPrev.timeRange, [aKey]: aEvent.target.value } };
        });
    };

    const handleQuickTime = (aValue: any) => {
        pSetPanelOption((aPrev: any) => {
            return { ...aPrev, timeRange: { ...aPrev.timeRange, start: aValue.value[0], end: aValue.value[1] } };
        });
    };

    return (
        <div className="chart-footer-form">
            <div className="chart-footer-tab">
                <div style={sTab === 'Query' ? { borderBottom: '2px solid #005FB8' } : { borderBottom: '2px solid transparent', opacity: 0.8 }} onClick={() => setTab('Query')}>
                    Query
                    <span className="series-count">{Number(pPanelOption.series.length)}</span>
                </div>
                {pTableList.length !== 0 && (
                    <div style={sTab === 'Time' ? { borderBottom: '2px solid #005FB8' } : { borderBottom: '2px solid transparent', opacity: 0.8 }} onClick={() => setTab('Time')}>
                        Time
                    </div>
                )}
            </div>
            <div className="chart-footer">
                <div style={sTab === 'Time' ? { display: 'none' } : {}} className="body">
                    {pTableList.length !== 0 &&
                        pPanelOption.series.map((aItem: any) => {
                            return (
                                <Series
                                    key={aItem.id}
                                    pType={pType}
                                    pPanelOption={pPanelOption}
                                    pTableList={pTableList}
                                    pGetTables={pGetTables}
                                    pSeriesInfo={aItem}
                                    pSetPanelOption={pSetPanelOption}
                                ></Series>
                            );
                        })}
                    {pTableList.length !== 0 && pPanelOption.series.length < 10 && (
                        <div
                            onClick={() =>
                                pSetPanelOption((aPrev: any) => {
                                    return {
                                        ...aPrev,
                                        series: [...aPrev.series, { ...aPrev.series[aPrev.series.length - 1], id: getId(), color: sColorList[aPrev.series.length + 1] }],
                                    };
                                })
                            }
                            className="plus-wrap"
                            style={{
                                border: '1px solid #777777',
                                minHeight: '50px',
                                borderRadius: '4px',
                                padding: '8px',
                                display: 'flex',
                                justifyContent: 'center',
                                flexDirection: 'column',
                                alignItems: 'center',
                            }}
                        >
                            <PlusCircle color="#FDB532"></PlusCircle>
                        </div>
                    )}
                    {pTableList.length === 0 && (
                        <div
                            style={{
                                height: '100%',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            Please create a table.
                        </div>
                    )}
                </div>
                <div style={sTab === 'Query' ? { display: 'none' } : {}} className="body time-wrap">
                    <div className="time-form">
                        <div className="time-header">Time</div>
                        <div className="time-set-form">
                            <div className="date-picker">
                                <CheckBox
                                    onChange={(aEvent: any) => {
                                        pSetPanelOption((aPrev: any) => {
                                            return { ...aPrev, useCustomTime: Object.keys(aEvent.target).includes('checked') ? aEvent.target.checked : aEvent.target.value };
                                        });
                                    }}
                                    pDefaultChecked={pPanelOption.useCustomTime}
                                    pText={'use Custom Time'}
                                />
                                <div>
                                    From
                                    <DatePicker
                                        pTopPixel={55}
                                        pTimeValue={pPanelOption.timeRange.start}
                                        onChange={(date: any) => handleTime('start', date)}
                                        pSetApply={(date: any) => setUseTimePicker('start', date)}
                                    ></DatePicker>
                                </div>
                                <div>
                                    To
                                    <DatePicker
                                        pTopPixel={55}
                                        pTimeValue={pPanelOption.timeRange.end}
                                        onChange={(date: any) => handleTime('end', date)}
                                        pSetApply={(date: any) => setUseTimePicker('end', date)}
                                    ></DatePicker>
                                </div>
                            </div>
                            <div className="select-time-range">
                                <SelectTimeRanges onClick={handleQuickTime} />
                            </div>
                        </div>
                    </div>
                    <div className="time-divider"></div>
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
            </div>
        </div>
    );
};
export default CreatePanelFotter;