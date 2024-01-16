import './CreatePanelFooter.scss';
import Series from './Series';
import { useState, useEffect } from 'react';
import { PlusCircle } from '@/assets/icons/Icon';
import { refreshTimeList } from '@/utils/dashboardUtil';
import DatePicker from '@/components/datePicker/DatePicker';

import { SelectTimeRanges } from '@/components/tagAnalyzer/SelectTimeRanges';
import CheckBox from '@/components/inputs/CheckBox';
import { Select } from '@/components/inputs/Select';
import { generateUUID } from '@/utils';

const CreatePanelFooter = ({ pTableList, pType, pGetTables, pSetPanelOption, pPanelOption }: any) => {
    const sColorList = ['#73BF69', '#F2CC0C', '#8AB8FF', '#FF780A', '#F2495C', '#5794F2', '#B877D9', '#705DA0', '#37872D', '#FADE2A'];
    const [sTab, setTab] = useState('Query');
    const [sBlockLimit, setBlockLimit] = useState<number>(0);
    const [sValueLimit, setValueLimit] = useState<number>(0);

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

    const CheckQueryBlock = (aTableList: any) => {
        const sTmpValueLimit = aTableList.reduce((preV: any, curV: any) => {
            return preV || curV.type === 'tag' ? 1 : 0;
        }, 0);
        const sTmpBlockLimit = aTableList.reduce((preV: any, curV: any) => {
            return preV || curV.values.length > 1 ? 1 : 0;
        }, 0);
        if (!sTmpValueLimit && !sTmpBlockLimit && aTableList.length > 1) setValueLimit(1);
        else setValueLimit(sTmpValueLimit);
        setBlockLimit(sTmpBlockLimit);
    };

    useEffect(() => {
        if (pPanelOption && pPanelOption.tagTableInfo && pPanelOption.tagTableInfo.length > 0) CheckQueryBlock(pPanelOption.tagTableInfo);
    }, [pPanelOption]);

    return (
        <div className="chart-footer-form">
            <div className="chart-footer-tab">
                <div className={sTab === 'Query' ? 'active-footer-tab' : 'inactive-footer-tab'} onClick={() => setTab('Query')}>
                    Query
                    <span className="series-count">{Number(pPanelOption.tagTableInfo.length)}</span>
                </div>
                {pTableList.length !== 0 && (
                    <div className={sTab === 'Time' ? 'active-footer-tab' : 'inactive-footer-tab'} onClick={() => setTab('Time')}>
                        Time
                    </div>
                )}
            </div>
            <div className="chart-footer">
                <div style={{ display: sTab === 'Time' ? 'none' : '' }} className="body">
                    {pTableList.length !== 0 &&
                        pPanelOption.tagTableInfo.map((aItem: any) => {
                            return (
                                <Series
                                    key={aItem.id}
                                    pType={pType}
                                    pPanelOption={pPanelOption}
                                    pTableList={pTableList}
                                    pGetTables={pGetTables}
                                    pTagTableInfo={aItem}
                                    pSetPanelOption={pSetPanelOption}
                                    pValueLimit={sValueLimit}
                                />
                            );
                        })}
                    {pTableList.length !== 0 && pPanelOption.tagTableInfo.length < 10 && (
                        <div
                            onClick={() =>
                                pSetPanelOption((aPrev: any) => {
                                    return {
                                        ...aPrev,
                                        tagTableInfo: [
                                            ...aPrev.tagTableInfo,
                                            { ...aPrev.tagTableInfo[aPrev.tagTableInfo.length - 1], id: generateUUID(), color: sColorList[aPrev.tagTableInfo.length + 1] },
                                        ],
                                    };
                                })
                            }
                            style={sBlockLimit === 1 ? { pointerEvents: 'none', opacity: 0.3 } : {}}
                            className="plus-wrap"
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
                                    ></DatePicker>
                                </div>
                                <div>
                                    To
                                    <DatePicker
                                        pTopPixel={55}
                                        pTimeValue={pPanelOption.timeRange.end ?? ''}
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
