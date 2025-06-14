import './CreatePanelFooter.scss';
import { Block } from './Block';
import { useEffect, useState } from 'react';
import { PlusCircle, VscTrash } from '@/assets/icons/Icon';
import { refreshTimeList } from '@/utils/dashboardUtil';
import DatePicker from '@/components/datePicker/DatePicker';
import { SelectTimeRanges } from '@/components/tagAnalyzer/SelectTimeRanges';
import { Select } from '@/components/inputs/Select';
import { generateUUID } from '@/utils';
import { IconButton } from '@/components/buttons/IconButton';
import { TqlBlock } from './TqlBlock';
import { getTagColor, getUseColorList } from '@/utils/helpers/tags';
import { Transform } from './Transform';
import { chartTypeConverter } from '@/utils/eChartHelper';
import { ChartType, E_CHART_TYPE } from '@/type/eChart';
import { ALLOWED_TRX_CHART_TYPE, CheckAllowedTransformChartType, E_ALLOW_CHART_TYPE } from '@/utils/Chart/TransformDataParser';

type FOOTER_MENU_TYPE = 'Query' | 'Transform' | 'Time';

const CreatePanelFooter = ({ pTableList, pType, pGetTables, pSetPanelOption, pPanelOption }: any) => {
    const [sTab, setTab] = useState<FOOTER_MENU_TYPE>('Query');

    const setUseTimePicker = (aKey: string, aValue: any) => {
        pSetPanelOption((aPrev: any) => {
            return { ...aPrev, timeRange: { ...aPrev.timeRange, [aKey]: aValue } };
        });
    };
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
        pSetPanelOption((aPrev: any) => {
            return { ...aPrev, useCustomTime: sUseCustomTime, timeRange: sTimeRange };
        });
    };
    const handleQuickTime = (aValue: any) => {
        pSetPanelOption((aPrev: any) => {
            return { ...aPrev, useCustomTime: true, timeRange: { ...aPrev.timeRange, start: aValue.value[0], end: aValue.value[1] } };
        });
    };
    const HandleAddBlock = () => {
        pSetPanelOption((aPrev: any) => {
            const sTmpPanelOpt = JSON.parse(
                JSON.stringify({
                    ...aPrev,
                    blockList: [
                        ...aPrev.blockList,
                        {
                            ...aPrev.blockList.at(-1),
                            id: generateUUID(),
                            color: getTagColor(getUseColorList(aPrev.blockList)),
                            math: '',
                            alias: '',
                            values: aPrev.blockList.at(-1).values.map((val: any) => {
                                return { ...val, id: generateUUID(), alias: '' };
                            }),
                        },
                    ],
                })
            );

            if (aPrev.type === 'Geomap')
                sTmpPanelOpt.chartOptions = {
                    ...sTmpPanelOpt.chartOptions,
                    coorLat: sTmpPanelOpt.chartOptions.coorLat.concat([0]),
                    coorLon: sTmpPanelOpt.chartOptions.coorLon.concat([1]),
                    marker: sTmpPanelOpt.chartOptions.marker.concat({ shape: 'circle', radius: 150 }),
                };
            return sTmpPanelOpt;
        });
    };

    useEffect(() => {
        if (!ALLOWED_TRX_CHART_TYPE.includes(chartTypeConverter(pPanelOption.type) as E_CHART_TYPE & E_ALLOW_CHART_TYPE)) setTab('Query');
    }, [pPanelOption.type]);

    return (
        <div className="chart-footer-form">
            {pPanelOption.type !== 'Tql chart' && (
                <>
                    <div className="chart-footer-tab">
                        <div>
                            <div className={sTab === 'Query' ? 'active-footer-tab' : 'inactive-footer-tab'} onClick={() => setTab('Query')}>
                                Query
                                <span className="series-count">{`${Number(pPanelOption.blockList.length)}`}</span>
                            </div>
                            {CheckAllowedTransformChartType(chartTypeConverter(pPanelOption.type) as ChartType) && (
                                <div className={sTab === 'Transform' ? 'active-footer-tab' : 'inactive-footer-tab'} onClick={() => setTab('Transform')}>
                                    Transform
                                    <span className="series-count">{`${Number(pPanelOption?.transformBlockList?.length ?? 0)}`}</span>
                                </div>
                            )}
                            {pTableList.length !== 0 && (
                                <div className={sTab === 'Time' ? 'active-footer-tab' : 'inactive-footer-tab'} onClick={() => setTab('Time')}>
                                    Time
                                </div>
                            )}
                        </div>
                        <div className="chart-footer-tab-r">
                            <span>Total</span>
                            <span className="series-count w-30">{`${Number((pPanelOption.transformBlockList?.length ?? 0) + (pPanelOption.blockList?.length ?? 0))} / ${Number(
                                pPanelOption.chartOptions?.tagLimit ?? 0
                            )}`}</span>
                        </div>
                    </div>
                    <div className="chart-footer">
                        <div style={sTab === 'Query' ? {} : { display: 'none' }} className="body">
                            {/* SET Block */}
                            {pTableList.length !== 0 &&
                                pPanelOption.blockList.map((aItem: any, aIdx: number) => {
                                    return (
                                        <Block
                                            key={aItem.id}
                                            pBlockOrder={aIdx}
                                            pType={pType}
                                            pPanelOption={pPanelOption}
                                            pTableList={pTableList}
                                            pGetTables={pGetTables}
                                            pBlockInfo={aItem}
                                            pSetPanelOption={pSetPanelOption}
                                        />
                                    );
                                })}
                            {/* ADD Block */}
                            {pTableList.length !== 0 && (
                                <div
                                    onClick={HandleAddBlock}
                                    className="plus-wrap"
                                    style={
                                        (pPanelOption.chartOptions?.tagLimit
                                            ? pPanelOption.chartOptions?.tagLimit -
                                              (CheckAllowedTransformChartType(chartTypeConverter(pPanelOption.type) as ChartType)
                                                  ? pPanelOption?.transformBlockList?.length ?? 0
                                                  : 0)
                                            : 12 -
                                              (CheckAllowedTransformChartType(chartTypeConverter(pPanelOption.type) as ChartType)
                                                  ? pPanelOption?.transformBlockList?.length ?? 0
                                                  : 0)) <= pPanelOption.blockList.length
                                            ? { opacity: 0.7, pointerEvents: 'none' }
                                            : {}
                                    }
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
                        {sTab === 'Transform' && (
                            <div className="body">
                                <Transform pPanelOption={pPanelOption} pSetPanelOption={pSetPanelOption} />
                            </div>
                        )}
                        <div style={sTab === 'Time' ? {} : { display: 'none' }} className="body time-wrap">
                            <div className="time-form">
                                <div className="time-header">Custom time range</div>
                                <div className="time-set-form">
                                    <div className="date-picker">
                                        <div>
                                            From
                                            <DatePicker
                                                pAutoFocus
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
                </>
            )}
            {pPanelOption.type === 'Tql chart' && <TqlBlock pPanelOption={pPanelOption} pSetPanelOption={pSetPanelOption} />}
        </div>
    );
};
export default CreatePanelFooter;
