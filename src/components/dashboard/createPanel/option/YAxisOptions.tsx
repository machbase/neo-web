import { Close, PlusCircle } from '@/assets/icons/Icon';
import { HierarchicalCombobox, Dropdown, Input, Checkbox, Page, Button, BadgeSelect, type BadgeSelectItem, ColorPicker } from '@/design-system/components';
import { E_CHART_TYPE } from '@/type/eChart';
import { findUnitById, UNITS } from '@/utils/Chart/AxisConstants';
import { E_BLOCK_TYPE } from '@/utils/Chart/TransformDataParser';
import { getChartSeriesName } from '@/utils/dashboardUtil';
import { chartTypeConverter } from '@/utils/eChartHelper';
import { useMemo } from 'react';

interface XAxisOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}
const AllowedThresholdType = ['line', 'bar', 'scatter'];

export const YAxisOptions = (props: XAxisOptionProps) => {
    const { pPanelOption, pSetPanelOption } = props;
    const sPositionList = ['left', 'right'];
    const sUseThreshold = AllowedThresholdType.includes((pPanelOption?.type as string)?.toLowerCase());

    const handleYAxisPosition = (value: string, aIndex: number) => {
        const sCurrentYAxis = JSON.parse(JSON.stringify(pPanelOption.yAxisOptions));
        sCurrentYAxis[aIndex].position = value;
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                yAxisOptions: sCurrentYAxis,
            };
        });
    };

    const handleYAxisOption = (aKey: string, aEvent: any, aIdx: number) => {
        const sCurrentYAxis = JSON.parse(JSON.stringify(pPanelOption.yAxisOptions));
        if (aKey === 'unit') {
            const sTargetUnit = findUnitById(aEvent);
            sCurrentYAxis[aIdx].unit = sTargetUnit;
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

    const handleUseSecondYAxis = (aItem: BadgeSelectItem) => {
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
                name: trxB?.alias ? trxB?.alias : `TRANSFORM_VALUE(${idx})`,
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

    const addThreshold = (aIndex: number) => {
        const sCurrentYAxis = JSON.parse(JSON.stringify(pPanelOption.yAxisOptions));
        if (!sCurrentYAxis[aIndex].thresholds) {
            sCurrentYAxis[aIndex].thresholds = [];
        }
        sCurrentYAxis[aIndex].thresholds.push({ color: '#FF0000', value: 0 });
        pSetPanelOption((aPrev: any) => ({
            ...aPrev,
            yAxisOptions: sCurrentYAxis,
        }));
    };

    const removeThreshold = (aIndex: number, thresholdIndex: number) => {
        const sCurrentYAxis = JSON.parse(JSON.stringify(pPanelOption.yAxisOptions));
        sCurrentYAxis[aIndex].thresholds.splice(thresholdIndex, 1);
        pSetPanelOption((aPrev: any) => ({
            ...aPrev,
            yAxisOptions: sCurrentYAxis,
        }));
    };

    const handleThresholdChange = (aIndex: number, thresholdIndex: number, key: 'color' | 'value', value: string | number) => {
        const sCurrentYAxis = JSON.parse(JSON.stringify(pPanelOption.yAxisOptions));
        sCurrentYAxis[aIndex].thresholds[thresholdIndex][key] = value;
        pSetPanelOption((aPrev: any) => ({
            ...aPrev,
            yAxisOptions: sCurrentYAxis,
        }));
    };

    return (
        <>
            <Page.Divi />
            <Page.Collapse title="yAxis">
                {pPanelOption.yAxisOptions.map((aItem: any, aIndex: number) => (
                    <Page.ContentBlock pHoverNone key={aItem.type + aIndex} style={{ flex: 1, border: 'solid 1px #454545', borderRadius: '4px' }}>
                        {aIndex === 1 && <Button size="icon" variant="ghost" icon={<Close />} onClick={addRemoveYAixs} />}
                        <Input
                            label="Name"
                            type="text"
                            fullWidth
                            placeholder="none"
                            value={aItem?.label?.title ?? ''}
                            onChange={(aEvent) => handleYAxisOption('title', aEvent, aIndex)}
                        />
                        <Page.Space />
                        <Dropdown.Root
                            label="Position"
                            options={sPositionList.map((option) => ({ label: option, value: option }))}
                            value={aItem.position}
                            onChange={(value: string) => handleYAxisPosition(value, aIndex)}
                            fullWidth
                        >
                            <Dropdown.Trigger />
                            <Dropdown.Menu>
                                <Dropdown.List />
                            </Dropdown.Menu>
                        </Dropdown.Root>
                        <Page.Space />
                        <Input
                            label="Offset"
                            type="number"
                            fullWidth
                            placeholder="auto"
                            value={aItem?.offset ?? ''}
                            onChange={(aEvent) => handleYAxisOption('offset', aEvent, aIndex)}
                        />
                        <Page.Divi />
                        {/* TICK  */}
                        <Page.Collapse title="Tick options" size="sm">
                            <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                                <HierarchicalCombobox.Root
                                    label="Unit"
                                    value={aItem?.unit?.id ?? ''}
                                    categories={UNITS}
                                    onChange={(value) => handleYAxisOption('unit', value, aIndex)}
                                >
                                    <HierarchicalCombobox.Input />
                                    <HierarchicalCombobox.Menu>
                                        <HierarchicalCombobox.List emptyMessage="No units available" />
                                    </HierarchicalCombobox.Menu>
                                </HierarchicalCombobox.Root>
                                <Page.Space />
                                <Input
                                    label="Decimals"
                                    type="number"
                                    fullWidth
                                    placeholder="auto"
                                    value={aItem?.label?.decimals ?? ''}
                                    onChange={(aEvent) => handleYAxisOption('decimals', aEvent, aIndex)}
                                />
                                <Page.Space />
                                <Input
                                    label="Min"
                                    type="number"
                                    fullWidth
                                    placeholder="auto"
                                    value={aItem?.min ?? ''}
                                    onChange={(aEvent: any) => HandleMinMax('min', aEvent.target.value, aIndex)}
                                />
                                <Page.Space />
                                <Input
                                    label="Max"
                                    type="number"
                                    fullWidth
                                    placeholder="auto"
                                    value={aItem?.max ?? ''}
                                    onChange={(aEvent: any) => HandleMinMax('max', aEvent.target.value, aIndex)}
                                />
                                <Page.Space />
                                <Checkbox size="sm" label="Start at zero" defaultChecked={!aItem?.scale} onChange={(aEvent: any) => handleYAxisOption('scale', aEvent, aIndex)} />
                            </Page.ContentBlock>
                        </Page.Collapse>
                        {/* Threshold  */}
                        {sUseThreshold ? (
                            <>
                                <Page.Divi />
                                <Page.Collapse title="Thresholds" size="sm">
                                    <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                                        <Button fullWidth variant="secondary" icon={<PlusCircle size={16} />} onClick={() => addThreshold(aIndex)}>
                                            Add threshold
                                        </Button>
                                        {aItem.thresholds?.map((threshold: { color: string; value: number }, tIdx: number) => (
                                            <div key={tIdx} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                                                <Input
                                                    type="number"
                                                    fullWidth
                                                    value={threshold.value}
                                                    onChange={(e) => handleThresholdChange(aIndex, tIdx, 'value', Number(e.target.value))}
                                                />
                                                <ColorPicker color={threshold.color} onChange={(color) => handleThresholdChange(aIndex, tIdx, 'color', color)} />
                                                <Button size="icon" variant="ghost" icon={<Close />} onClick={() => removeThreshold(aIndex, tIdx)} />
                                            </div>
                                        ))}
                                    </Page.ContentBlock>
                                </Page.Collapse>
                            </>
                        ) : null}
                        {aIndex === 1 && (
                            <>
                                <Page.Divi />
                                <BadgeSelect label="Series" selectedList={pPanelOption.yAxisOptions[1]?.useBlockList || [0]} list={getBlockList} onChange={handleUseSecondYAxis} />
                            </>
                        )}
                        <Page.Space />
                    </Page.ContentBlock>
                ))}
                <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                    {pPanelOption.yAxisOptions.length < 2 && <Button size="icon" variant="ghost" icon={<PlusCircle size={16} />} onClick={addRemoveYAixs} />}
                </Page.ContentBlock>
            </Page.Collapse>
        </>
    );
};
