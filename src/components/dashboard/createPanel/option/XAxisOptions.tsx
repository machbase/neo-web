// import { TextButton } from '@/components/buttons/TextButton';
// import CheckBox from '@/components/inputs/CheckBox';
// import { DefaultXAxisOption } from '@/utils/eChartHelper';
// import { ChartXAxisTypeList } from '@/utils/constants';
import { Collapse } from '@/components/collapse/Collapse';
import { BadgeSelect, BadgeSelectorItemType } from '@/components/inputs/BadgeSelector';
import CheckBox from '@/components/inputs/CheckBox';
import { Input } from '@/components/inputs/Input';
import { Select } from '@/components/inputs/Select';
import { E_CHART_TYPE } from '@/type/eChart';
import { ChartAxisUnits } from '@/utils/Chart/AxisConstants';
import { getChartSeriesName } from '@/utils/dashboardUtil';
import { chartTypeConverter } from '@/utils/eChartHelper';
import { useMemo } from 'react';

interface XAxisOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}

export const XAxisOptions = (props: XAxisOptionProps) => {
    const { pPanelOption, pSetPanelOption } = props;
    const sIntervalTypeList = ['none', 'sec', 'min', 'hour'];

    const handleAxisInterval = (aType: string, aValue: number | string) => {
        pSetPanelOption((aPrev: any) => {
            const sResult = {
                ...aPrev,
                axisInterval: {
                    IntervalType: aType === 'none' ? '' : aType,
                    IntervalValue: aValue,
                },
            };
            // if (sResult.axisInterval.IntervalType !== '' && sResult.axisInterval.IntervalValue !== '') sResult.isAxisInterval = true;
            // else {
            //     sResult.axisInterval.IntervalType = '';
            //     sResult.axisInterval.IntervalValue = '';
            //     sResult.isAxisInterval = false;
            // }
            return sResult;
        });
    };

    const handleSeries = (aItem: BadgeSelectorItemType) => {
        const sTmpUseSecondXAxis = JSON.parse(JSON.stringify(pPanelOption.xAxisOptions[0]));
        if (sTmpUseSecondXAxis.useBlockList.includes(aItem.idx)) return;
        else sTmpUseSecondXAxis.useBlockList = [aItem.idx];

        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                xAxisOptions: [sTmpUseSecondXAxis],
            };
        });
    };

    const getBlockList = useMemo((): any[] => {
        return (
            pPanelOption?.blockList?.map((block: any, idx: number) => ({
                name: block.customFullTyping.use
                    ? 'custom'
                    : getChartSeriesName({
                          alias: block?.useCustom ? block?.values[0]?.alias : block?.alias,
                          table: block?.table,
                          column: block?.useCustom ? block?.values[0]?.value : block?.value,
                          aggregator: block?.useCustom ? block?.values[0]?.aggregator : block?.aggregator,
                      }),
                color: block.color,
                idx: idx,
            })) ?? []
        );
    }, [pPanelOption.blockList]);

    const HandleMinMax = (aTarget: string, aValue: number | string) => {
        const sCurrentXAxis = JSON.parse(JSON.stringify(pPanelOption.xAxisOptions));
        sCurrentXAxis[0][aTarget] = aValue;
        if (sCurrentXAxis[0]['min'] && sCurrentXAxis[0]['min'] !== '' && sCurrentXAxis[0]['max'] && sCurrentXAxis[0]['max'] !== '') sCurrentXAxis[0]['useMinMax'] = true;
        else sCurrentXAxis[0]['useMinMax'] = false;
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                xAxisOptions: sCurrentXAxis,
            };
        });
    };
    // const handleXAxisOption = (aKey: string, aEvent: any) => {
    //     const sCurrentXAxis = JSON.parse(JSON.stringify(pPanelOption.xAxisOptions));
    //     sCurrentXAxis[0][aKey] = !aEvent.target.checked;
    //     pSetPanelOption((aPrev: any) => {
    //         return {
    //             ...aPrev,
    //             xAxisOptions: sCurrentXAxis,
    //         };
    //     });
    // };
    const handleXAxisOption = (aKey: string, aEvent: any) => {
        const sCurrentXAxis = JSON.parse(JSON.stringify(pPanelOption.xAxisOptions));
        if (aKey === 'key') {
            const sTargetLabel = ChartAxisUnits.find((unit) => unit[aKey] === aEvent.target.value);
            sCurrentXAxis[0].label = sTargetLabel;
        } else if (aKey === 'unit' || aKey === 'decimals') sCurrentXAxis[0].label[aKey] = aEvent.target.value;
        else sCurrentXAxis[0][aKey] = !aEvent.target.checked;

        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                xAxisOptions: sCurrentXAxis,
            };
        });
    };

    // const changeAxisInterval = (aValue: boolean) => {
    //     pSetPanelOption((aPrev: any) => {
    //         return {
    //             ...aPrev,
    //             isAxisInterval: aValue,
    //         };
    //     });
    // };

    // const addRemoveXAixs = () => {
    //     const sCurrentXAxis = JSON.parse(JSON.stringify(pXAxis));
    //     if (sCurrentXAxis.length < 2) {
    //         sCurrentXAxis.push(DefaultXAxisOption);
    //     } else {
    //         sCurrentXAxis.pop();
    //     }
    //     pSetPanelOption((aPrev: any) => {
    //         return {
    //             ...aPrev,
    //             xAxisOptions: sCurrentXAxis,
    //         };
    //     });
    // };

    return (
        <>
            <div className="divider" />
            <Collapse title="xAxis">
                {/* {pXAxis.map((aItem: any, aIndex: number) => (
                <div key={aItem.type + aIndex}>
                    <div className="menu-style">
                        <div>Type</div>
                        <Select
                            pWidth={100}
                            pHeight={25}
                            pBorderRadius={4}
                            pInitValue={aItem.type}
                            onChange={(aEvent) => handleXAxisOption(aEvent, aIndex)}
                            pOptions={ChartXAxisTypeList}
                        />
                    </div>
                </div>
            ))} */}
                <div className="menu-style">
                    <span>Interval type</span>
                    <Select
                        pWidth={100}
                        pHeight={25}
                        pBorderRadius={4}
                        pNoneValue="none"
                        pInitValue={pPanelOption.axisInterval.IntervalType}
                        onChange={(aEvent) => handleAxisInterval(aEvent.target.value, pPanelOption.axisInterval.IntervalValue)}
                        pOptions={sIntervalTypeList}
                    />
                </div>
                <div className="menu-style">
                    <span>Interval value</span>
                    <Input
                        pType="number"
                        pWidth={100}
                        pHeight={25}
                        pBorderRadius={4}
                        pPlaceHolder={'auto'}
                        pValue={pPanelOption.axisInterval.IntervalValue.toString() ?? ''}
                        onChange={(aEvent) => handleAxisInterval(pPanelOption.axisInterval.IntervalType, aEvent.target.value)}
                    />
                </div>
                {chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.ADV_SCATTER && (
                    <Collapse title="Options">
                        <div className="menu-style">
                            <div>Type</div>
                            <Select
                                pWidth={100}
                                pHeight={25}
                                pBorderRadius={4}
                                pInitValue={pPanelOption?.xAxisOptions[0]?.label?.key ?? 'value'}
                                pOptions={ChartAxisUnits.map((aUnit) => {
                                    return aUnit.key;
                                })}
                                onChange={(aEvent) => handleXAxisOption('key', aEvent)}
                            />
                        </div>
                        <div className="menu-style">
                            <div>Unit</div>
                            <Input
                                pType="text"
                                pWidth={100}
                                pHeight={25}
                                pBorderRadius={4}
                                pValue={pPanelOption?.xAxisOptions[0]?.label?.unit ?? ''}
                                pPlaceHolder={pPanelOption?.xAxisOptions[0]?.label?.name === 'byte' || pPanelOption?.xAxisOptions[0]?.label?.name === 'percent' ? 'auto' : 'none'}
                                pIsDisabled={pPanelOption?.xAxisOptions[0]?.label?.name !== 'value'}
                                onChange={(aEvent) => handleXAxisOption('unit', aEvent)}
                            />
                        </div>
                        <div className="menu-style">
                            <div>Decimals</div>
                            <Input
                                pType="number"
                                pWidth={100}
                                pHeight={25}
                                pPlaceHolder="auto"
                                pBorderRadius={4}
                                pValue={pPanelOption?.xAxisOptions[0]?.label?.decimals ?? ''}
                                onChange={(aEvent) => handleXAxisOption('decimals', aEvent)}
                            />
                        </div>
                        <div className="divider" />
                        <div className="menu-style">
                            <div>Min</div>
                            <Input
                                pType="number"
                                pWidth={100}
                                pHeight={25}
                                pBorderRadius={4}
                                pPlaceHolder={'auto'}
                                pValue={pPanelOption?.xAxisOptions[0]?.min ?? ''}
                                onChange={(aEvent: any) => HandleMinMax('min', aEvent.target.value)}
                            />
                        </div>
                        <div className="menu-style">
                            <div>Max</div>
                            <Input
                                pType="number"
                                pWidth={100}
                                pHeight={25}
                                pBorderRadius={4}
                                pPlaceHolder={'auto'}
                                pValue={pPanelOption?.xAxisOptions[0]?.max ?? ''}
                                onChange={(aEvent: any) => HandleMinMax('max', aEvent.target.value)}
                            />
                        </div>
                        <div className="menu-style">
                            <CheckBox
                                pText="Start at zero"
                                pDefaultChecked={!pPanelOption?.xAxisOptions[0]?.scale}
                                onChange={(aEvent: any) => handleXAxisOption('scale', aEvent)}
                            />
                        </div>
                    </Collapse>
                )}
                {chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.ADV_SCATTER && (
                    <>
                        <div className="divider" />
                        <span>Series</span>
                        <BadgeSelect pSelectedList={pPanelOption?.xAxisOptions[0]?.useBlockList || [0]} pList={getBlockList} pCallback={handleSeries} />
                    </>
                )}

                {/* <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <TextButton
                    pText={pXAxis.length < 2 ? 'add' : 'remove'}
                    pWidth={70}
                    pHeight={25}
                    pBorderRadius={4}
                    pBorderColor="#989BA1"
                    pBackgroundColor="#323644"
                    onClick={addRemoveXAixs}
                />
            </div> */}
            </Collapse>
        </>
    );
};
