import { Collapse } from '@/components/collapse/Collapse';
import CheckBox from '@/components/inputs/CheckBox';
import { Input } from '@/components/inputs/Input';
import { Select } from '@/components/inputs/Select';
import { useEffect, useState } from 'react';

interface LiquidfillOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}

export const GeomapOptions = (props: LiquidfillOptionProps) => {
    const { pPanelOption, pSetPanelOption } = props;
    const [sValueList, setValueList] = useState(undefined);
    const sIntervalTypeList = ['none', 'sec', 'min', 'hour'];
    const sMarkerShapeList = ['marker', 'circleMarker', 'circle'];

    const HandleOption = (aEvent: any, aKey: any, idx?: number) => {
        let sApplyValue = undefined;
        if (Object.prototype.hasOwnProperty.call(aEvent.target, 'checked')) sApplyValue = aEvent.target.checked;
        else sApplyValue = aEvent.target.value;

        if (aKey === 'coorLat' || aKey === 'coorLon') {
            const sTmpCoor = JSON.parse(JSON.stringify(pPanelOption.chartOptions[aKey]));
            sTmpCoor.splice(idx, 1, aEvent?.target.idx);
            sApplyValue = sTmpCoor;
        }
        if (aKey === 'marker') {
            const sTmpMarker = JSON.parse(JSON.stringify(pPanelOption.chartOptions[aKey]));
            if (aEvent.target?.name === 'customSelect') sTmpMarker[idx as number] = { ...sTmpMarker[idx as number], shape: sApplyValue };
            else sTmpMarker[idx as number] = { ...sTmpMarker[idx as number], radius: sApplyValue };
            sApplyValue = sTmpMarker;
        }

        pSetPanelOption((prev: any) => {
            return {
                ...prev,
                chartOptions: {
                    ...prev.chartOptions,
                    [aKey]: sApplyValue,
                },
            };
        });
    };

    useEffect(() => {
        const sTmpValueList: any = [];
        pPanelOption.blockList.map((block: any) => {
            sTmpValueList.push(
                block.values.map((value: any) => {
                    return value.alias !== '' ? value.alias : value.aggregator + '(' + value.value + ')';
                })
            );
        });
        setValueList(sTmpValueList);
    }, [pPanelOption.blockList]);

    return (
        <div className="text-options-wrap">
            <Collapse title="Tooltip" isOpen>
                <div className="menu-style">
                    <CheckBox pText="Time" pDefaultChecked={pPanelOption.chartOptions?.tooltipTime ?? false} onChange={(aEvent: any) => HandleOption(aEvent, 'tooltipTime')} />
                </div>
                <div className="menu-style">
                    <CheckBox
                        pText="Latitude, Longitude"
                        pDefaultChecked={pPanelOption.chartOptions?.tooltipCoor ?? false}
                        onChange={(aEvent: any) => HandleOption(aEvent, 'tooltipCoor')}
                    />
                </div>
            </Collapse>
            <div className="divider" />
            <Collapse title="Interval" isOpen>
                <div className="menu-style">
                    <span>Type</span>
                    <Select
                        pWidth={100}
                        pHeight={25}
                        pBorderRadius={4}
                        pNoneValue="none"
                        pInitValue={pPanelOption.chartOptions.intervalType ?? ''}
                        onChange={(aEvent) => HandleOption(aEvent, 'intervalType')}
                        pOptions={sIntervalTypeList}
                    />
                </div>
                <div className="menu-style">
                    <span>Value</span>
                    <Input
                        pType="number"
                        pWidth={100}
                        pHeight={25}
                        pBorderRadius={4}
                        pPlaceHolder={'auto'}
                        pValue={pPanelOption.chartOptions.intervalValue ?? ''}
                        onChange={(aEvent) => HandleOption(aEvent, 'intervalValue')}
                    />
                </div>
            </Collapse>
            <div className="divider" />
            <Collapse title="Map option" isOpen>
                {pPanelOption.blockList.map((block: any, idx: number) => {
                    return (
                        <div key={block.id + 'opt-coor'} className="opt-coor-wrap">
                            <div style={{ border: 'solid 1px #777777', borderRadius: '5px', padding: '8px 0 3px 8px' }}>
                                <div className="menu-style">
                                    <span>Latitude</span>
                                    <Select
                                        pIsToolTip
                                        pWidth={100}
                                        pHeight={25}
                                        pBorderRadius={4}
                                        pInitValue={pPanelOption.chartOptions?.coorLat?.[idx] >= 0 ? sValueList?.[idx]?.[pPanelOption.chartOptions?.coorLat?.[idx]] : ''}
                                        onChange={(aEvent) => HandleOption(aEvent, 'coorLat', idx)}
                                        pOptions={sValueList?.[idx] ?? []}
                                    />
                                </div>
                                <div className="menu-style">
                                    <span>Longitude</span>
                                    <Select
                                        pIsToolTip
                                        pWidth={100}
                                        pHeight={25}
                                        pBorderRadius={4}
                                        pInitValue={pPanelOption.chartOptions?.coorLon?.[idx] >= 0 ? sValueList?.[idx]?.[pPanelOption.chartOptions?.coorLon?.[idx]] : ''}
                                        onChange={(aEvent) => HandleOption(aEvent, 'coorLon', idx)}
                                        pOptions={sValueList?.[idx] ?? []}
                                    />
                                </div>
                                <div className="menu-style">
                                    <span>
                                        Marker shape{pPanelOption.chartOptions.marker?.[idx]?.shape === 'circleMarker' && ' (pixel)'}
                                        {pPanelOption.chartOptions.marker?.[idx]?.shape === 'circle' && ' (meter)'}
                                    </span>
                                    <Select
                                        pWidth={100}
                                        pHeight={25}
                                        pBorderRadius={4}
                                        pInitValue={pPanelOption.chartOptions.marker?.[idx]?.shape ?? 'circle'}
                                        onChange={(aEvent) => HandleOption(aEvent, 'marker', idx)}
                                        pOptions={sMarkerShapeList}
                                    />
                                </div>
                                {pPanelOption.chartOptions.marker?.[idx]?.shape !== 'marker' && (
                                    <div className="menu-style">
                                        <span>Marker radius</span>
                                        <Input
                                            pType="number"
                                            pWidth={100}
                                            pHeight={25}
                                            pBorderRadius={4}
                                            pValue={pPanelOption.chartOptions.marker?.[idx]?.radius ?? 30}
                                            onChange={(aEvent) => HandleOption(aEvent, 'marker', idx)}
                                        />
                                    </div>
                                )}
                            </div>
                            <div style={{ height: '10px' }} />
                        </div>
                    );
                })}
            </Collapse>
        </div>
    );
};
