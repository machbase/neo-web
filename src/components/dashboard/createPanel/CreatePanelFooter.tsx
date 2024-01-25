import './CreatePanelFooter.scss';
import { Block } from './Block';
import { useState } from 'react';
import { PlusCircle } from '@/assets/icons/Icon';
import { refreshTimeList } from '@/utils/dashboardUtil';
import DatePicker from '@/components/datePicker/DatePicker';

import { SelectTimeRanges } from '@/components/tagAnalyzer/SelectTimeRanges';
import CheckBox from '@/components/inputs/CheckBox';
import { Select } from '@/components/inputs/Select';
import { generateUUID } from '@/utils';

const CreatePanelFooter = ({ pTableList, pType, pGetTables, pSetPanelOption, pPanelOption }: any) => {
    const sColorList = ['#73BF69', '#F2CC0C', '#8AB8FF', '#FF780A', '#F2495C', '#5794F2', '#B877D9', '#705DA0', '#37872D', '#FDA1FF', '#7B64FF', '#999999'];
    const [sTab, setTab] = useState('Query');
    const VALUE_LIMIT: number = 1;

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

    const HandleAddBlock = () => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                blockList: [
                    ...aPrev.blockList,
                    {
                        ...aPrev.blockList.at(-1),
                        id: generateUUID(),
                        color: sColorList[aPrev.blockList.length],
                        // values: [{ id: generateUUID(), alias: '', value: '', aggregator: 'avg' }],
                        // filter: [{ id: generateUUID(), column: '', value: '', operator: '=', useFilter: false }],
                    },
                ],
            };
        });
    };

    return (
        <div className="chart-footer-form">
            <div className="chart-footer-tab">
                <div className={sTab === 'Query' ? 'active-footer-tab' : 'inactive-footer-tab'} onClick={() => setTab('Query')}>
                    Query
                    <span className="series-count">{`${Number(pPanelOption.blockList.length)} / ${
                        pPanelOption.chartOptions?.tagLimit ? pPanelOption.chartOptions?.tagLimit : '12'
                    }`}</span>
                </div>
                {pTableList.length !== 0 && (
                    <div className={sTab === 'Time' ? 'active-footer-tab' : 'inactive-footer-tab'} onClick={() => setTab('Time')}>
                        Time
                    </div>
                )}
            </div>
            <div className="chart-footer">
                <div style={{ display: sTab === 'Time' ? 'none' : '' }} className="body">
                    {/* SET Block */}
                    {pTableList.length !== 0 &&
                        pPanelOption.blockList.map((aItem: any) => {
                            return (
                                <Block
                                    key={aItem.id}
                                    pType={pType}
                                    pPanelOption={pPanelOption}
                                    pTableList={pTableList}
                                    pGetTables={pGetTables}
                                    pBlockInfo={aItem}
                                    pSetPanelOption={pSetPanelOption}
                                    pValueLimit={VALUE_LIMIT}
                                />
                            );
                        })}
                    {/* ADD Block */}
                    {pTableList.length !== 0 && (
                        <div
                            onClick={HandleAddBlock}
                            className="plus-wrap"
                            style={pPanelOption.chartOptions?.tagLimit <= pPanelOption.blockList.length ? { opacity: 0.7, pointerEvents: 'none' } : {}}
                        >
                            <PlusCircle color="#FDB532" />
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
                                        pTimeValue={pPanelOption.timeRange.start ?? ''}
                                        onChange={(date: any) => handleTime('start', date)}
                                        pSetApply={(date: any) => setUseTimePicker('start', date)}
                                    />
                                </div>
                                <div>
                                    To
                                    <DatePicker
                                        pTopPixel={55}
                                        pTimeValue={pPanelOption.timeRange.end ?? ''}
                                        onChange={(date: any) => handleTime('end', date)}
                                        pSetApply={(date: any) => setUseTimePicker('end', date)}
                                    />
                                </div>
                            </div>
                            <div className="select-time-range">
                                <SelectTimeRanges onClick={handleQuickTime} />
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
            </div>
        </div>
    );
};
export default CreatePanelFooter;
