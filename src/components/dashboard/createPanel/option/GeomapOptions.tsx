import { Dropdown, Input, Checkbox, Page } from '@/design-system/components';
import { useEffect, useState } from 'react';

interface LiquidfillOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}

export const GeomapOptions = (props: LiquidfillOptionProps) => {
    const { pPanelOption, pSetPanelOption } = props;
    const [sValueList, setValueList] = useState<any>(undefined);
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
            <Page.Collapse title="Tooltip">
                <Page.ContentBlock pHoverNone style={{ padding: 0, gap: '8px', display: 'flex', flexDirection: 'column' }}>
                    <Checkbox
                        size="sm"
                        label="Time"
                        defaultChecked={pPanelOption.chartOptions?.tooltipTime ?? false}
                        onChange={(aEvent: any) => HandleOption(aEvent, 'tooltipTime')}
                    />
                    <Checkbox
                        size="sm"
                        label="Latitude, Longitude"
                        defaultChecked={pPanelOption.chartOptions?.tooltipCoor ?? false}
                        onChange={(aEvent: any) => HandleOption(aEvent, 'tooltipCoor')}
                    />
                </Page.ContentBlock>
            </Page.Collapse>
            <Page.Divi />
            <Page.Collapse title="Interval">
                <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                    <Dropdown.Root
                        label="Type"
                        options={sIntervalTypeList.map((option) => ({ label: option, value: option }))}
                        value={pPanelOption.chartOptions.intervalType || 'none'}
                        onChange={(value: string) => HandleOption({ target: { value } }, 'intervalType')}
                        fullWidth
                    >
                        <Dropdown.Trigger />
                        <Dropdown.Menu>
                            <Dropdown.List />
                        </Dropdown.Menu>
                    </Dropdown.Root>
                    <Input
                        label="Value"
                        type="number"
                        fullWidth
                        placeholder="auto"
                        value={pPanelOption.chartOptions.intervalValue ?? ''}
                        onChange={(aEvent) => HandleOption(aEvent, 'intervalValue')}
                    />
                </Page.ContentBlock>
            </Page.Collapse>
            <Page.Divi />
            <Page.Collapse title="Map option">
                <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                    <Checkbox
                        size="sm"
                        label="Use zoom control"
                        defaultChecked={pPanelOption.chartOptions?.useZoomControl ?? false}
                        onChange={(aEvent: any) => HandleOption(aEvent, 'useZoomControl')}
                    />
                    <Page.Divi />
                    <Page.Collapse pTrigger="Series">
                        <Page.ContentBlock pHoverNone style={{ display: 'flex', padding: 0, gap: '4px', flexFlow: 'wrap' }}>
                            {pPanelOption.blockList.map((block: any, idx: number) => {
                                return (
                                    <div key={block.id + 'opt-coor'} style={{ border: 'solid 1px #777777', borderRadius: '5px', width: '100%' }}>
                                        <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                                            <Dropdown.Root
                                                label="Latitude"
                                                options={(sValueList?.[idx] ?? []).map((option: string) => ({ label: option, value: option }))}
                                                value={pPanelOption.chartOptions?.coorLat?.[idx] >= 0 ? sValueList?.[idx]?.[pPanelOption.chartOptions?.coorLat?.[idx]] : ''}
                                                onChange={(value: string) => {
                                                    const targetIdx = sValueList?.[idx]?.indexOf(value);
                                                    HandleOption({ target: { idx: targetIdx } }, 'coorLat', idx);
                                                }}
                                                fullWidth
                                            >
                                                <Dropdown.Trigger />
                                                <Dropdown.Menu>
                                                    <Dropdown.List />
                                                </Dropdown.Menu>
                                            </Dropdown.Root>
                                            <Dropdown.Root
                                                label="Longitude"
                                                options={(sValueList?.[idx] ?? []).map((option: string) => ({ label: option, value: option }))}
                                                value={pPanelOption.chartOptions?.coorLon?.[idx] >= 0 ? sValueList?.[idx]?.[pPanelOption.chartOptions?.coorLon?.[idx]] : ''}
                                                onChange={(value: string) => {
                                                    const targetIdx = sValueList?.[idx]?.indexOf(value);
                                                    HandleOption({ target: { idx: targetIdx } }, 'coorLon', idx);
                                                }}
                                                fullWidth
                                            >
                                                <Dropdown.Trigger />
                                                <Dropdown.Menu>
                                                    <Dropdown.List />
                                                </Dropdown.Menu>
                                            </Dropdown.Root>
                                            <Dropdown.Root
                                                label={`Marker shape${
                                                    pPanelOption.chartOptions.marker?.[idx]?.shape === 'circleMarker'
                                                        ? ' (pixel)'
                                                        : pPanelOption.chartOptions.marker?.[idx]?.shape === 'circle'
                                                        ? ' (meter)'
                                                        : ''
                                                }`}
                                                options={sMarkerShapeList.map((option) => ({ label: option, value: option }))}
                                                value={pPanelOption.chartOptions.marker?.[idx]?.shape ?? 'circle'}
                                                onChange={(value: string) => HandleOption({ target: { value, name: 'customSelect' } }, 'marker', idx)}
                                                fullWidth
                                            >
                                                <Dropdown.Trigger />
                                                <Dropdown.Menu>
                                                    <Dropdown.List />
                                                </Dropdown.Menu>
                                            </Dropdown.Root>
                                            {pPanelOption.chartOptions.marker?.[idx]?.shape !== 'marker' && (
                                                <Input
                                                    label="Marker radius"
                                                    type="number"
                                                    fullWidth
                                                    value={pPanelOption.chartOptions.marker?.[idx]?.radius ?? 30}
                                                    onChange={(aEvent) => HandleOption(aEvent, 'marker', idx)}
                                                />
                                            )}
                                        </Page.ContentBlock>
                                    </div>
                                );
                            })}
                        </Page.ContentBlock>
                    </Page.Collapse>
                </Page.ContentBlock>
            </Page.Collapse>
        </div>
    );
};
