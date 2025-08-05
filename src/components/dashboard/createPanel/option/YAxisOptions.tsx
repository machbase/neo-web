import { Close, PlusCircle } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { Collapse } from '@/components/collapse/Collapse';
import { BadgeSelect, BadgeSelectorItemType } from '@/components/inputs/BadgeSelector';
import CheckBox from '@/components/inputs/CheckBox';
import { Input } from '@/components/inputs/Input';
import { Select } from '@/components/inputs/Select';
import { E_CHART_TYPE } from '@/type/eChart';
import { ChartAxisUnits } from '@/utils/Chart/AxisConstants';
import { E_BLOCK_TYPE } from '@/utils/Chart/TransformDataParser';
import { getChartSeriesName } from '@/utils/dashboardUtil';
import { chartTypeConverter } from '@/utils/eChartHelper';
import { useMemo } from 'react';

interface XAxisOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}
// TODO according to tag count
export const YAxisOptions = (props: XAxisOptionProps) => {
    const { pPanelOption, pSetPanelOption } = props;
    const sPositionList = ['left', 'right'];

    const handleYAxisPosition = (aEvent: any, aIndex: number) => {
        const sCurrentYAxis = JSON.parse(JSON.stringify(pPanelOption.yAxisOptions));
        sCurrentYAxis[aIndex].position = aEvent.target.value;
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                yAxisOptions: sCurrentYAxis,
            };
        });
    };

    const handleYAxisOption = (aKey: string, aEvent: any, aIdx: number) => {
        const sCurrentYAxis = JSON.parse(JSON.stringify(pPanelOption.yAxisOptions));
        if (aKey === 'key') {
            const sTargetLabel = ChartAxisUnits.find((unit) => unit[aKey] === aEvent.target.value);
            sCurrentYAxis[aIdx].label = sTargetLabel;
        } else if (aKey === 'scale') sCurrentYAxis[aIdx][aKey] = !aEvent.target.checked;
        else if (aKey === 'offset') sCurrentYAxis[aIdx][aKey] = aEvent.target.value;
        else sCurrentYAxis[aIdx].label[aKey] = aEvent.target.value;

        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                yAxisOptions: sCurrentYAxis,
            };
        });
    };

    const handleUseSecondYAxis = (aItem: BadgeSelectorItemType) => {
        const sTmpUseSecondYAxis = JSON.parse(JSON.stringify(pPanelOption.yAxisOptions[1]));
        if (sTmpUseSecondYAxis.useBlockList.includes(aItem.idx)) {
            sTmpUseSecondYAxis.useBlockList = sTmpUseSecondYAxis.useBlockList.filter((useNum: number) => useNum !== aItem.idx);
        } else {
            sTmpUseSecondYAxis.useBlockList.push(aItem.idx);
        }
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                yAxisOptions: [aPrev.yAxisOptions[0], sTmpUseSecondYAxis],
            };
        });
    };

    const addRemoveYAixs = () => {
        const sCurrentYAxis = JSON.parse(JSON.stringify(pPanelOption.yAxisOptions));
        if (sCurrentYAxis.length < 2) {
            const sTmpDualYAxis = JSON.parse(JSON.stringify(sCurrentYAxis[0]));
            if (sCurrentYAxis[0].position === 'left') sTmpDualYAxis.position = 'right';
            else sTmpDualYAxis.position = 'left';
            sTmpDualYAxis.useBlockList = [];
            sCurrentYAxis.push(sTmpDualYAxis);
        } else {
            sCurrentYAxis.pop();
        }
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                yAxisOptions: sCurrentYAxis,
            };
        });
    };
    const getBlockList = useMemo((): any[] => {
        const sBaseXAxis = pPanelOption.xAxisOptions[0].useBlockList[0];
        const sTmpBlockList = JSON.parse(JSON.stringify(pPanelOption?.blockList));
        const sTmpTrxBlockList = JSON.parse(JSON.stringify(pPanelOption?.transformBlockList ?? []));
        if (chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.ADV_SCATTER) sTmpBlockList.splice(sBaseXAxis, 1);

        const sBlockResult =
            sTmpBlockList.map((block: any, idx: number) => {
                return {
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
                    type: E_BLOCK_TYPE.STD,
                };
            }) ?? [];

        const sTrxBlockResult = sTmpTrxBlockList?.map((trxB: any, idx: number) => {
            return {
                name: trxB?.alias,
                color: trxB?.color,
                idx: idx + 100,
                type: E_BLOCK_TYPE.TRX,
            };
        });

        return sBlockResult?.concat(sTrxBlockResult ?? []);
    }, [pPanelOption.blockList, pPanelOption?.transformBlockList, pPanelOption.xAxisOptions]);

    const HandleMinMax = (aTarget: string, aValue: number | string, aIndex: number) => {
        const sCurrentYAxis = JSON.parse(JSON.stringify(pPanelOption.yAxisOptions));
        sCurrentYAxis[aIndex][aTarget] = aValue;
        if (sCurrentYAxis[aIndex]['min'] && sCurrentYAxis[aIndex]['min'] !== '' && sCurrentYAxis[aIndex]['max'] && sCurrentYAxis[aIndex]['max'] !== '')
            sCurrentYAxis[aIndex]['useMinMax'] = true;
        else sCurrentYAxis[aIndex]['useMinMax'] = false;
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                yAxisOptions: sCurrentYAxis,
            };
        });
    };

    return (
        <>
            <div className="divider" />
            <Collapse title="yAxis">
                {pPanelOption.yAxisOptions.map((aItem: any, aIndex: number) => (
                    <div key={aItem.type + aIndex}>
                        <div style={{ border: 'solid 1px #777777', borderRadius: '5px', padding: '10px 0 10px 10px' }}>
                            {aIndex === 1 && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 10px 10px 0' }}>
                                    <IconButton pWidth={15} pHeight={15} pIcon={<Close />} onClick={addRemoveYAixs} />
                                </div>
                            )}
                            <div className="menu-style">
                                <div>Position</div>
                                <Select
                                    pWidth={100}
                                    pHeight={25}
                                    pBorderRadius={4}
                                    pInitValue={aItem.position}
                                    onChange={(aEvent) => handleYAxisPosition(aEvent, aIndex)}
                                    pOptions={sPositionList}
                                />
                            </div>
                            <Collapse title="Options">
                                <div className="menu-style">
                                    <div>Offset</div>
                                    <Input
                                        pType="number"
                                        pWidth={100}
                                        pHeight={25}
                                        pPlaceHolder="auto"
                                        pBorderRadius={4}
                                        pValue={aItem?.offset ?? ''}
                                        onChange={(aEvent) => handleYAxisOption('offset', aEvent, aIndex)}
                                    />
                                </div>
                                <div className="divider" />
                                <div className="menu-style">
                                    <div>Type</div>
                                    <Select
                                        pWidth={100}
                                        pHeight={25}
                                        pBorderRadius={4}
                                        pInitValue={aItem?.label?.key ?? 'value'}
                                        onChange={(aEvent) => handleYAxisOption('key', aEvent, aIndex)}
                                        pOptions={ChartAxisUnits.map((aUnit) => {
                                            return aUnit.key;
                                        })}
                                    />
                                </div>
                                <div className="menu-style">
                                    <div>Unit</div>
                                    <Input
                                        pType="text"
                                        pWidth={100}
                                        pHeight={25}
                                        pIsDisabled={aItem?.label?.name !== 'value'}
                                        pPlaceHolder={aItem?.label?.name === 'byte' || aItem?.label?.name === 'percent' ? 'auto' : 'none'}
                                        pBorderRadius={4}
                                        pValue={aItem?.label?.unit ?? ''}
                                        onChange={(aEvent) => handleYAxisOption('unit', aEvent, aIndex)}
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
                                        pValue={aItem?.label?.decimals ?? ''}
                                        onChange={(aEvent) => handleYAxisOption('decimals', aEvent, aIndex)}
                                    />
                                </div>
                                <div className="menu-style">
                                    <div>Name</div>
                                    <Input
                                        pType="text"
                                        pWidth={100}
                                        pHeight={25}
                                        pPlaceHolder="none"
                                        pBorderRadius={4}
                                        pValue={aItem?.label?.title ?? ''}
                                        onChange={(aEvent) => handleYAxisOption('title', aEvent, aIndex)}
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
                                        pValue={aItem?.min ?? ''}
                                        onChange={(aEvent: any) => HandleMinMax('min', aEvent.target.value, aIndex)}
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
                                        pValue={aItem?.max ?? ''}
                                        onChange={(aEvent: any) => HandleMinMax('max', aEvent.target.value, aIndex)}
                                    />
                                </div>
                                <div className="menu-style">
                                    <CheckBox pText="Start at zero" pDefaultChecked={!aItem?.scale} onChange={(aEvent: any) => handleYAxisOption('scale', aEvent, aIndex)} />
                                </div>
                            </Collapse>
                            {aIndex === 1 && (
                                <>
                                    <div className="divider" />
                                    <div>Series</div>
                                    <div style={{ padding: '8px 10px 0 0' }}>
                                        <BadgeSelect pSelectedList={pPanelOption.yAxisOptions[1]?.useBlockList || [0]} pList={getBlockList} pCallback={handleUseSecondYAxis} />
                                    </div>
                                </>
                            )}
                        </div>
                        <div style={{ height: '8px' }} />
                    </div>
                ))}

                <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '10px' }}>
                    {pPanelOption.yAxisOptions.length < 2 && <IconButton pWidth={25} pHeight={26} pIcon={<PlusCircle />} onClick={addRemoveYAixs} />}
                </div>
            </Collapse>
        </>
    );
};
