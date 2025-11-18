import { IconButton } from '@/components/buttons/IconButton';
import { Collapse } from '@/components/collapse/Collapse';
import { Input } from '@/components/inputs/Input';
import { Select } from '@/components/inputs/Select';
import useOutsideClick from '@/hooks/useOutsideClick';
import { useEffect, useMemo, useRef, useState } from 'react';
import CompactPicker from 'react-color/lib/components/compact/Compact';
import { MultiColorPkr } from './MultiColorPkr';
import { PlusCircle } from '@/assets/icons/Icon';
import { BadgeSelect, BadgeSelectorItemType } from '@/components/inputs/BadgeSelector';
import { getChartSeriesName } from '@/utils/dashboardUtil';
import { E_BLOCK_TYPE } from '@/utils/Chart/TransformDataParser';
import { ChartThemeTextColor } from '@/utils/constants';

interface ChartOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}

export const TextOptions = (props: ChartOptionProps) => {
    const { pPanelOption, pSetPanelOption } = props;
    const sChartColorPickerRef = useRef<any>(null);
    const sColorPickerRef = useRef<any>(null);
    const [sIsChartColorPicker, setIsChartColorPicker] = useState<boolean>(false);
    const [sIsColorPicker, setIsColorPicker] = useState<boolean>(false);

    useOutsideClick(sColorPickerRef, () => setIsColorPicker(false));
    useOutsideClick(sChartColorPickerRef, () => setIsChartColorPicker(false));

    // Apply theme color to text option and chart option when theme changes or panel type changes to text
    useEffect(() => {
        if (pPanelOption.type === 'Text') {
            const sThemeColor = ChartThemeTextColor[pPanelOption.theme as keyof typeof ChartThemeTextColor] || '#333333';
            pSetPanelOption((aPrev: any) => {
                return {
                    ...aPrev,
                    chartOptions: {
                        ...aPrev.chartOptions,
                        color: [[pPanelOption.chartOptions?.color?.[0]?.[0] ?? 0, sThemeColor]],
                        chartColor: sThemeColor,
                    },
                };
            });
        }
    }, [pPanelOption.theme]);

    const getBlockList = useMemo((): any[] => {
        const sTmpBlockList = JSON.parse(JSON.stringify(pPanelOption?.blockList));
        const sTmpTrxBlockList = JSON.parse(JSON.stringify(pPanelOption?.transformBlockList ?? []));

        const sBlockResult =
            sTmpBlockList?.map((block: any, idx: number) => {
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
                name: !!trxB?.alias ? trxB?.alias : `TRANSFORM_VALUE(${idx})`,
                color: trxB?.color,
                idx: idx + 100,
                type: E_BLOCK_TYPE.TRX,
            };
        });

        return sBlockResult?.concat(sTrxBlockResult ?? []);
    }, [pPanelOption?.blockList, pPanelOption?.transformBlockList]);

    const handleSeriesOption = (aKey: string, aItem: BadgeSelectorItemType) => {
        let sTargetItem: undefined | number = aItem.idx;

        if (sTargetItem === pPanelOption?.chartOptions?.[aKey]?.[0]) sTargetItem = undefined;

        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                chartOptions: {
                    ...aPrev.chartOptions,
                    [aKey]: [sTargetItem],
                },
            };
        });
    };

    const HandleOption = (aEvent: any, aKey: any) => {
        pSetPanelOption((prev: any) => {
            return {
                ...prev,
                chartOptions: {
                    ...prev.chartOptions,
                    [aKey]: aEvent.target.value,
                },
            };
        });
    };

    const HandleItem = (key: string, idx: number) => {
        const sNewList = JSON.parse(JSON.stringify(pPanelOption.chartOptions.color));
        if (key === 'add') sNewList.push([0, sNewList.at(-1)[1]]);
        else sNewList.splice(idx, 1);

        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                chartOptions: {
                    ...aPrev.chartOptions,
                    color: sNewList,
                },
            };
        });
    };

    const HandleItemColor = (key: string, target: any, idx: number) => {
        const sTmpColorList = pPanelOption.chartOptions.color.map((aColorItem: any, aIdx: number) => {
            if (aIdx === idx) {
                if (key === 'l') return [target, aColorItem[1]];
                else return [aColorItem[0], target];
            } else return aColorItem;
        });

        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                chartOptions: {
                    ...aPrev.chartOptions,
                    color: sTmpColorList,
                },
            };
        });
    };

    return (
        <div className="text-options-wrap">
            <Collapse title="Text option" isOpen>
                <div className="menu-style">
                    <span>Font size</span>
                    <Input
                        pType="number"
                        pWidth={100}
                        pHeight={25}
                        pBorderRadius={4}
                        pValue={pPanelOption.chartOptions?.fontSize ?? 50}
                        pSetValue={() => null}
                        onChange={(aEvent: any) => HandleOption(aEvent, 'fontSize')}
                    />
                </div>
                <div className="menu-style">
                    <span>Unit</span>
                    <Input
                        pType="text"
                        pWidth={100}
                        pHeight={25}
                        pBorderRadius={4}
                        pValue={pPanelOption.chartOptions?.unit ?? ''}
                        pSetValue={() => null}
                        onChange={(aEvent: any) => HandleOption(aEvent, 'unit')}
                    />
                </div>
                <div className="menu-style">
                    <span>Digit</span>
                    <Input
                        pType="number"
                        pWidth={100}
                        pHeight={25}
                        pBorderRadius={4}
                        pValue={pPanelOption.chartOptions?.digit ?? 0}
                        pSetValue={() => null}
                        onChange={(aEvent: any) => HandleOption(aEvent, 'digit')}
                    />
                </div>
                <div className="divider" />
                <Collapse title="Color">
                    <>
                        {pPanelOption.chartOptions?.color.map((aAxisColor: any, aIdx: number) => {
                            if (aIdx === 0)
                                return (
                                    <div key={aIdx} ref={sColorPickerRef}>
                                        <div className="menu-style" style={{ position: 'relative' }}>
                                            <span>Default</span>
                                            <IconButton
                                                pWidth={20}
                                                pHeight={20}
                                                pIcon={
                                                    <div
                                                        style={{
                                                            width: '14px',
                                                            cursor: 'pointer',
                                                            height: '14px',
                                                            marginRight: '4px',
                                                            borderRadius: '50%',
                                                            backgroundColor: pPanelOption.chartOptions?.color[0][1] as string,
                                                        }}
                                                    ></div>
                                                }
                                                onClick={() => setIsColorPicker(!sIsColorPicker)}
                                            />
                                        </div>
                                        <>
                                            {sIsColorPicker && (
                                                <div className="color-picker">
                                                    <CompactPicker
                                                        color={pPanelOption.chartOptions?.color[0][1] as string}
                                                        onChangeComplete={(aInfo: any) => {
                                                            HandleItemColor('r', aInfo.hex, 0);
                                                        }}
                                                    />
                                                </div>
                                            )}
                                            {pPanelOption.chartOptions?.color.length === 1 && (
                                                <div className="menu-style" style={{ justifyContent: 'end', flexGrow: 1 }}>
                                                    <div />
                                                    <IconButton pWidth={25} pHeight={26} pIcon={<PlusCircle />} onClick={() => HandleItem('add', 1)} />
                                                </div>
                                            )}
                                        </>
                                    </div>
                                );

                            return (
                                <div key={aIdx}>
                                    <MultiColorPkr
                                        alwayRmBtn
                                        prefix="Over"
                                        aIdx={aIdx}
                                        aAxisColor={aAxisColor}
                                        HandleItemColor={HandleItemColor}
                                        HandleItem={HandleItem}
                                        itemLen={pPanelOption.chartOptions?.color.length}
                                    />
                                </div>
                            );
                        })}
                    </>
                </Collapse>
                <>
                    <div className="divider" />
                    <span>Series</span>
                    <div style={{ padding: '8px 10px 0 0' }}>
                        <BadgeSelect pSelectedList={pPanelOption?.chartOptions?.textSeries} pList={getBlockList} pCallback={(item) => handleSeriesOption('textSeries', item)} />
                    </div>
                </>
            </Collapse>
            <div className="divider" />
            <Collapse title="Chart option" isOpen>
                <div className="menu-style">
                    <span>Type</span>
                    <Select
                        pWidth={100}
                        pHeight={25}
                        pBorderRadius={4}
                        pFontSize={12}
                        pInitValue={pPanelOption.chartOptions?.chartType}
                        onChange={(aEvent: any) => HandleOption(aEvent, 'chartType')}
                        pOptions={['line', 'bar', 'scatter']}
                    />
                </div>
                {pPanelOption.chartOptions?.chartType === 'line' && (
                    <div className="menu-style">
                        <span>Opacity (0 ~ 1)</span>
                        <Input
                            pType="number"
                            pWidth={100}
                            pHeight={25}
                            pMin={0}
                            pMax={1}
                            pBorderRadius={4}
                            pValue={pPanelOption.chartOptions?.fillOpacity}
                            onChange={(aEvent: any) => HandleOption(aEvent, 'fillOpacity')}
                        />
                    </div>
                )}
                {pPanelOption.chartOptions?.chartType !== 'bar' && (
                    <div className="menu-style">
                        <div>Symbol size</div>
                        <Input
                            pType="number"
                            pHeight={25}
                            pWidth={100}
                            pBorderRadius={4}
                            pValue={pPanelOption.chartOptions?.symbolSize}
                            onChange={(aEvent: any) => HandleOption(aEvent, 'symbolSize')}
                        />
                    </div>
                )}
                <div className="menu-style" ref={sChartColorPickerRef} style={{ position: 'relative' }}>
                    <span>Color</span>
                    <IconButton
                        pWidth={20}
                        pHeight={20}
                        pIcon={
                            <div
                                style={{
                                    width: '14px',
                                    cursor: 'inherit',
                                    height: '14px',
                                    marginRight: '4px',
                                    borderRadius: '50%',
                                    backgroundColor: pPanelOption.chartOptions?.chartColor as string,
                                }}
                            ></div>
                        }
                        onClick={() => setIsChartColorPicker(!sIsChartColorPicker)}
                    />
                    {sIsChartColorPicker && (
                        <div className="color-picker">
                            <CompactPicker
                                color={pPanelOption.chartOptions?.chartColor as string}
                                onChangeComplete={(aInfo: any) => {
                                    HandleOption({ target: { value: aInfo.hex } }, 'chartColor');
                                }}
                            />
                        </div>
                    )}
                </div>
                <>
                    <div className="divider" />
                    <span>Series</span>
                    <div style={{ padding: '8px 10px 0 0' }}>
                        <BadgeSelect pSelectedList={pPanelOption?.chartOptions?.chartSeries} pList={getBlockList} pCallback={(item) => handleSeriesOption('chartSeries', item)} />
                    </div>
                </>
            </Collapse>
        </div>
    );
};
