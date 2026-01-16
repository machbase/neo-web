import { VscWarning } from '@/assets/icons/Icon';
import { Input, Checkbox, Dropdown, Page } from '@/design-system/components';
import { Tooltip } from 'react-tooltip';

const Axes = ({ pPanelInfo, pSetCopyPanelInfo }: any) => {
    const getCheckboxValue = (aEvent: any, aType: string) => {
        if (aEvent.target.checked === true) {
            pSetCopyPanelInfo({ ...pPanelInfo, [aType]: 'Y' });
        } else {
            if (aType === 'use_right_y2')
                pSetCopyPanelInfo({
                    ...pPanelInfo,
                    [aType]: 'N',
                    tag_set: pPanelInfo.tag_set.map((tag: any) => {
                        return { ...tag, use_y2: 'N' };
                    }),
                });
            else pSetCopyPanelInfo({ ...pPanelInfo, [aType]: 'N' });
        }
    };

    const setY2TagList = (aValue: string) => {
        if (aValue === 'none') return;
        pSetCopyPanelInfo({
            ...pPanelInfo,
            tag_set: pPanelInfo.tag_set.map((aItem: any) => {
                return aValue === aItem.key ? { ...aItem, use_y2: 'Y' } : aItem;
            }),
        });
    };
    const setRemoveY2TagList = (aKey: any) => {
        pSetCopyPanelInfo({
            ...pPanelInfo,
            tag_set: pPanelInfo.tag_set.map((aItem: any) => {
                return aKey === aItem.key ? { ...aItem, use_y2: 'N' } : aItem;
            }),
        });
    };

    const y2TagOptions = [
        // { value: 'none', label: 'Select a tag for the additional Y-axis.' },
        ...pPanelInfo.tag_set
            .filter((aItem: any) => aItem.use_y2 === 'N')
            .map((bItem: any) => ({
                value: bItem.key,
                label: bItem?.alias && bItem?.alias !== '' ? bItem?.alias : `${bItem?.tagName}(${bItem?.calculationMode})`,
            })),
    ];

    return (
        <>
            <Page.DpRow style={{ flexWrap: 'wrap', justifyContent: 'start', alignItems: 'start' }}>
                <Page.ContentBlock pHoverNone style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'start', justifyContent: 'start' }}>
                    {/* X-Axis Section */}
                    <Page.ContentText pContent="X-Axis" />
                    <Checkbox
                        checked={pPanelInfo.show_x_tickline === 'Y'}
                        onChange={(aEvent: any) => getCheckboxValue(aEvent, 'show_x_tickline')}
                        label="Displays the X-Axis tick line"
                        size="sm"
                    />

                    <Page.ContentDesc>Pixels between tick marks</Page.ContentDesc>
                    <Page.DpRow style={{ padding: 0 }}>
                        <Input
                            label="Raw"
                            labelPosition="left"
                            type="number"
                            value={pPanelInfo.pixels_per_tick_raw}
                            onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, pixels_per_tick_raw: aEvent.target.value })}
                            size="md"
                            style={{ width: '150px', height: '30px' }}
                        />
                    </Page.DpRow>
                    <Page.DpRow style={{ padding: 0 }}>
                        <Input
                            label="Calculation"
                            labelPosition="left"
                            type="number"
                            value={pPanelInfo.pixels_per_tick}
                            onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, pixels_per_tick: aEvent.target.value })}
                            size="md"
                            style={{ width: '150px', height: '30px' }}
                        />
                    </Page.DpRow>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="warning-tooltip" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255, 255, 255, 0.5)' }}>
                            <VscWarning color="#FDB532" />
                            use Sampling
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Checkbox
                                checked={pPanelInfo.use_sampling}
                                onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, use_sampling: aEvent.target.checked })}
                                size="sm"
                            />
                            <Input
                                type="number"
                                disabled={!pPanelInfo.use_sampling}
                                value={pPanelInfo.sampling_value}
                                onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, sampling_value: aEvent.target.value })}
                                size="sm"
                                style={{ width: '150px' }}
                            />
                        </div>
                        <Tooltip anchorSelect={`.warning-tooltip`} content={'Resource usage can be overloaded.'} />
                    </div>
                </Page.ContentBlock>
                <Page.ContentBlock pHoverNone style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'start', justifyContent: 'start' }}>
                    {/* Y-Axis Section */}
                    <Page.ContentText pContent="Y-Axis" />
                    <Checkbox
                        checked={pPanelInfo.zero_base === 'Y'}
                        onChange={(aEvent: any) => getCheckboxValue(aEvent, 'zero_base')}
                        label="The scale of the Y-axis start at zero"
                        size="sm"
                    />

                    <Checkbox
                        checked={pPanelInfo.show_y_tickline === 'Y'}
                        onChange={(aEvent: any) => getCheckboxValue(aEvent, 'show_y_tickline')}
                        label="Displays the Y-Axis tick line"
                        size="sm"
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Page.ContentText pContent="Custom scale" />
                        <Input
                            type="number"
                            value={pPanelInfo.custom_min}
                            onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, custom_min: aEvent.target.value })}
                            size="sm"
                            style={{ width: '48px' }}
                        />
                        <span style={{ margin: '0 5px' }}>~</span>
                        <Input
                            type="number"
                            value={pPanelInfo.custom_max}
                            onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, custom_max: aEvent.target.value })}
                            size="sm"
                            style={{ width: '48px' }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Page.ContentText pContent="Custom scale for raw data chart" />
                        <Input
                            type="number"
                            value={pPanelInfo.custom_drilldown_min}
                            onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, custom_drilldown_min: aEvent.target.value })}
                            size="sm"
                            style={{ width: '48px' }}
                        />
                        <span style={{ margin: '0 5px' }}>~</span>
                        <Input
                            type="number"
                            value={pPanelInfo.custom_drilldown_max}
                            onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, custom_drilldown_max: aEvent.target.value })}
                            size="sm"
                            style={{ width: '48px' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Checkbox checked={pPanelInfo.use_ucl === 'Y'} onChange={(aEvent: any) => getCheckboxValue(aEvent, 'use_ucl')} label="use UCL" size="sm" />
                            <Input
                                type="number"
                                value={pPanelInfo.ucl_value}
                                disabled={pPanelInfo.use_ucl === 'N'}
                                onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, ucl_value: aEvent.target.value })}
                                size="sm"
                                style={{ width: '80px' }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Checkbox checked={pPanelInfo.use_lcl === 'Y'} onChange={(aEvent: any) => getCheckboxValue(aEvent, 'use_lcl')} label="use LCL" size="sm" />
                            <Input
                                type="number"
                                value={pPanelInfo.lcl_value}
                                disabled={pPanelInfo.use_lcl === 'N'}
                                onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, lcl_value: aEvent.target.value })}
                                size="sm"
                                style={{ width: '80px' }}
                            />
                        </div>
                    </div>
                </Page.ContentBlock>
                <Page.ContentBlock
                    pHoverNone
                    style={{ flexWrap: 'wrap', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'start', justifyContent: 'start' }}
                >
                    {/* Additional Y-Axis Section */}
                    <Page.ContentText pContent="Additional Y-Axis" />

                    <Checkbox
                        checked={pPanelInfo.use_right_y2 === 'Y'}
                        onChange={(aEvent: any) => getCheckboxValue(aEvent, 'use_right_y2')}
                        label="Set additional Y-axis"
                        size="sm"
                    />

                    <Checkbox
                        checked={pPanelInfo.zero_base2 === 'Y'}
                        onChange={(aEvent: any) => getCheckboxValue(aEvent, 'zero_base2')}
                        disabled={pPanelInfo.use_right_y2 !== 'Y'}
                        label="The scale of the Y-axis start at zero"
                        size="sm"
                    />

                    <Checkbox
                        checked={pPanelInfo.show_y_tickline2 === 'Y'}
                        onChange={(aEvent: any) => getCheckboxValue(aEvent, 'show_y_tickline2')}
                        disabled={pPanelInfo.use_right_y2 !== 'Y'}
                        label="Displays the Y-Axis tick line"
                        size="sm"
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: pPanelInfo.use_right_y2 !== 'Y' ? 0.6 : 1 }}>
                        <Page.ContentText pContent="Custom scale" />
                        <Input
                            type="number"
                            value={pPanelInfo.custom_min2}
                            disabled={pPanelInfo.use_right_y2 !== 'Y'}
                            onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, custom_min2: aEvent.target.value })}
                            size="sm"
                            style={{ width: '48px' }}
                        />
                        <span style={{ margin: '0 5px' }}>~</span>
                        <Input
                            type="number"
                            value={pPanelInfo.custom_max2}
                            disabled={pPanelInfo.use_right_y2 !== 'Y'}
                            onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, custom_max2: aEvent.target.value })}
                            size="sm"
                            style={{ width: '48px' }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: pPanelInfo.use_right_y2 !== 'Y' ? 0.6 : 1 }}>
                        <span style={{ minWidth: '100px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px' }}>Custom scale for raw data chart</span>
                        <Input
                            type="number"
                            value={pPanelInfo.custom_drilldown_min2}
                            disabled={pPanelInfo.use_right_y2 !== 'Y'}
                            onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, custom_drilldown_min2: aEvent.target.value })}
                            size="sm"
                            style={{ width: '48px' }}
                        />
                        <span style={{ margin: '0 5px' }}>~</span>
                        <Input
                            type="number"
                            value={pPanelInfo.custom_drilldown_max2}
                            disabled={pPanelInfo.use_right_y2 !== 'Y'}
                            onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, custom_drilldown_max2: aEvent.target.value })}
                            size="sm"
                            style={{ width: '48px' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Checkbox
                                disabled={pPanelInfo.use_right_y2 !== 'Y'}
                                checked={pPanelInfo.use_ucl2 === 'Y'}
                                onChange={(aEvent: any) => getCheckboxValue(aEvent, 'use_ucl2')}
                                label="use UCL"
                                size="sm"
                            />
                            <Input
                                type="number"
                                value={pPanelInfo.ucl2_value}
                                disabled={pPanelInfo.use_ucl2 === 'N' || pPanelInfo.use_right_y2 !== 'Y'}
                                onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, ucl2_value: aEvent.target.value })}
                                size="sm"
                                style={{ width: '80px' }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Checkbox
                                disabled={pPanelInfo.use_right_y2 !== 'Y'}
                                checked={pPanelInfo.use_lcl2 === 'Y'}
                                onChange={(aEvent: any) => getCheckboxValue(aEvent, 'use_lcl2')}
                                label="use LCL"
                                size="sm"
                            />
                            <Input
                                type="number"
                                value={pPanelInfo.lcl2_value}
                                disabled={pPanelInfo.use_lcl2 === 'N' || pPanelInfo.use_right_y2 !== 'Y'}
                                onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, lcl2_value: aEvent.target.value })}
                                size="sm"
                                style={{ width: '80px' }}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', opacity: pPanelInfo.use_right_y2 !== 'Y' ? 0.6 : 1 }}>
                        <Dropdown.Root options={y2TagOptions} value="none" onChange={setY2TagList} disabled={pPanelInfo.use_right_y2 !== 'Y'}>
                            <Dropdown.Trigger style={{ width: '200px' }} />
                            <Dropdown.Menu>
                                <Dropdown.List />
                            </Dropdown.Menu>
                        </Dropdown.Root>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {pPanelInfo.tag_set.filter((aItem: any) => aItem.use_y2 === 'Y').length > 0 &&
                                pPanelInfo.tag_set
                                    .filter((aItem: any) => aItem.use_y2 === 'Y')
                                    .map((bItem: any) => {
                                        return (
                                            <div
                                                onClick={() => setRemoveY2TagList(bItem.key)}
                                                key={bItem.key}
                                                style={{
                                                    padding: '4px 8px',
                                                    gap: '4px',
                                                    cursor: 'pointer',
                                                    borderRadius: '4px',
                                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                    borderLeft: `solid 2px ${bItem.color}`,
                                                }}
                                            >
                                                <span style={{ paddingLeft: '8px' }}>
                                                    {bItem?.alias && bItem?.alias !== '' ? bItem?.alias : `${bItem?.tagName}(${bItem?.calculationMode})`}
                                                </span>
                                            </div>
                                        );
                                    })}
                        </div>
                    </div>
                </Page.ContentBlock>
            </Page.DpRow>
        </>
    );
};

export default Axes;
