import { ArrowDown, VscWarning } from '@/assets/icons/Icon';
import CheckBox from '@/components/inputs/CheckBox';
import { Input } from '@/components/inputs/Input';
import { Tooltip } from 'react-tooltip';
import './Axes.scss';

const Axes = ({ pPanelInfo, pSetCopyPanelInfo }: any) => {
    const getCheckboxValue = (aEvent: any, aType: string) => {
        if (aEvent.target.checked === true) {
            pSetCopyPanelInfo({ ...pPanelInfo, [aType]: 'Y' });
        } else {
            pSetCopyPanelInfo({ ...pPanelInfo, [aType]: 'N' });
        }
    };

    const setY2TagList = (aEvent: any) => {
        pSetCopyPanelInfo({
            ...pPanelInfo,
            tag_set: pPanelInfo.tag_set.map((aItem: any) => {
                return aEvent.target.value === aItem.key ? { ...aItem, use_y2: 'Y' } : aItem;
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

    return (
        <div className="axes-form">
            <div className="x-axis">
                <div className="x-axis-title">X-Axis</div>
                <div className="x-axis-tick-line pt-12">
                    <input defaultChecked={pPanelInfo.show_x_tickline === 'Y'} onChange={(aEvent: any) => getCheckboxValue(aEvent, 'show_x_tickline')} type="checkbox" />
                    <span>Displays the X-Axis tick line</span>
                </div>
                <div className="x-axis-pixels pt-12">
                    <span>Pixels between tick marks </span>
                    <div className="x-axis-pixels-body">
                        <div>
                            Raw
                            <Input
                                pWidth={150}
                                pHeight={24}
                                pType="number"
                                pValue={pPanelInfo.pixels_per_tick_raw}
                                pSetValue={() => null}
                                onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, pixels_per_tick_raw: aEvent.target.value })}
                            />
                        </div>
                        <div>
                            Calculation
                            <Input
                                pWidth={150}
                                pHeight={24}
                                pType="number"
                                pValue={pPanelInfo.pixels_per_tick}
                                pSetValue={() => null}
                                onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, pixels_per_tick: aEvent.target.value })}
                            />
                        </div>
                    </div>
                </div>
                <div className="x-axis-pixels pt-12 sampling-body">
                    <Tooltip anchorSelect={`.warning-tooltip`} content={'Resource usage can be overloaded.'} />
                    <span className={`warning-tooltip`}>
                        <VscWarning color="#FDB532"></VscWarning>
                        use Sampling
                    </span>
                    <div className="use-sampling">
                        <CheckBox
                            pDefaultChecked={pPanelInfo.use_sampling}
                            onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, use_sampling: aEvent.target.checked })}
                        ></CheckBox>
                        <Input
                            pWidth={150}
                            pHeight={24}
                            pType="number"
                            pIsDisabled={!pPanelInfo.use_sampling}
                            pValue={pPanelInfo.sampling_value}
                            pSetValue={() => null}
                            onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, sampling_value: aEvent.target.value })}
                        />
                    </div>
                </div>
            </div>
            <div className="y-axis">
                <div className="y-axis-title">Y-Axis</div>
                <div className="y-axis-scale-zero pt-12">
                    <input defaultChecked={pPanelInfo.zero_base === 'Y'} onChange={(aEvent: any) => getCheckboxValue(aEvent, 'zero_base')} type="checkbox" />
                    <span>The scale of the Y-axis start at zero</span>
                </div>
                <div className="y-axis-tick-line pt-12">
                    <input defaultChecked={pPanelInfo.show_y_tickline === 'Y'} onChange={(aEvent: any) => getCheckboxValue(aEvent, 'show_y_tickline')} type="checkbox" />
                    <span>Displays the Y-Axis tick line</span>
                </div>
                <div className="y-axis-custom-scale pt-12">
                    <span>Custom scale</span>
                    <span>
                        <Input
                            pWidth={48}
                            pHeight={30}
                            pType="number"
                            pValue={pPanelInfo.custom_min}
                            pSetValue={() => null}
                            onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, custom_min: aEvent.target.value })}
                        />
                        <span style={{ margin: '0 5px' }}>~</span>
                        <Input
                            pWidth={48}
                            pHeight={30}
                            pType="number"
                            pValue={pPanelInfo.custom_max}
                            pSetValue={() => null}
                            onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, custom_max: aEvent.target.value })}
                        />
                    </span>
                </div>
                <div className="y-axis-raw-custom-scale pt-12">
                    <span>Custom scale for raw data chart</span>
                    <span>
                        <Input
                            pWidth={48}
                            pHeight={30}
                            pType="number"
                            pValue={pPanelInfo.custom_drilldown_min}
                            pSetValue={() => null}
                            onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, custom_drilldown_min: aEvent.target.value })}
                        />
                        <span style={{ margin: '0 5px' }}>~</span>
                        <Input
                            pWidth={48}
                            pHeight={30}
                            pType="number"
                            pValue={pPanelInfo.custom_drilldown_max}
                            pSetValue={() => null}
                            onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, custom_drilldown_max: aEvent.target.value })}
                        />
                    </span>
                </div>
                <div className="y-axis-scale-zero pt-12 ucl-wrap">
                    <div className="ucl-inner">
                        <div className="ucl-form">
                            <input defaultChecked={pPanelInfo.use_ucl === 'Y'} onChange={(aEvent: any) => getCheckboxValue(aEvent, 'use_ucl')} type="checkbox" />
                            <span>use UCL</span>
                        </div>
                        <Input
                            pWidth={80}
                            pHeight={24}
                            pType="number"
                            pValue={pPanelInfo.ucl_value}
                            pIsDisabled={pPanelInfo.use_ucl === 'N'}
                            pSetValue={() => null}
                            onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, ucl_value: aEvent.target.value })}
                        />
                    </div>
                    <div className="ucl-inner">
                        <div className="ucl-form">
                            <input defaultChecked={pPanelInfo.use_lcl === 'Y'} onChange={(aEvent: any) => getCheckboxValue(aEvent, 'use_lcl')} type="checkbox" />
                            <span>use LCL</span>
                        </div>
                        <Input
                            pWidth={80}
                            pHeight={24}
                            pType="number"
                            pValue={pPanelInfo.lcl_value}
                            pIsDisabled={pPanelInfo.use_lcl === 'N'}
                            pSetValue={() => null}
                            onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, lcl_value: aEvent.target.value })}
                        />
                    </div>
                </div>
            </div>
            <div className="additional-y-axis">
                <div className="additional-y-axis-form">
                    <div className="aditional-box-form pt-12">
                        <input defaultChecked={pPanelInfo.use_right_y2 === 'Y'} onChange={(aEvent: any) => getCheckboxValue(aEvent, 'use_right_y2')} type="checkbox" />
                        <span>Set additional Y-axis</span>
                    </div>
                    <div className="scale-box-form pt-12">
                        <input
                            defaultChecked={pPanelInfo.zero_base2}
                            onChange={(aEvent: any) => getCheckboxValue(aEvent, 'zero_base2')}
                            disabled={pPanelInfo.use_right_y2 !== 'Y'}
                            type="checkbox"
                        />
                        <span>The scale of the Y-axis start at zero</span>
                    </div>
                    <div className="scale-tick-line-form pt-12">
                        <input
                            defaultChecked={pPanelInfo.show_y_tickline2}
                            disabled={pPanelInfo.use_right_y2 !== 'Y'}
                            onChange={(aEvent: any) => getCheckboxValue(aEvent, 'show_y_tickline2')}
                            type="checkbox"
                        />
                        <span>Displays the X-Axis tick line</span>
                    </div>
                    <div className="aditional-custom pt-12">
                        <span>Custom scale</span>
                        <span>
                            <Input
                                pWidth={48}
                                pHeight={30}
                                pType="number"
                                pValue={pPanelInfo.custom_min2}
                                pSetValue={() => null}
                                pIsDisabled={pPanelInfo.use_right_y2 !== 'Y'}
                                onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, custom_min2: aEvent.target.value })}
                            />
                            <span style={{ margin: '0 5px' }}>~</span>
                            <Input
                                pWidth={48}
                                pHeight={30}
                                pType="number"
                                pValue={pPanelInfo.custom_max2}
                                pSetValue={() => null}
                                pIsDisabled={pPanelInfo.use_right_y2 !== 'Y'}
                                onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, custom_max2: aEvent.target.value })}
                            />
                        </span>
                    </div>
                    <div className="aditional-custom pt-12">
                        <span>Custom scale for raw data chart</span>
                        <span>
                            <Input
                                pWidth={48}
                                pHeight={30}
                                pType="number"
                                pValue={pPanelInfo.custom_drilldown_min2}
                                pSetValue={() => null}
                                pIsDisabled={pPanelInfo.use_right_y2 !== 'Y'}
                                onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, custom_drilldown_min2: aEvent.target.value })}
                            />
                            <span style={{ margin: '0 5px' }}>~</span>
                            <Input
                                pWidth={48}
                                pHeight={30}
                                pType="number"
                                pValue={pPanelInfo.custom_drilldown_max2}
                                pSetValue={() => null}
                                pIsDisabled={pPanelInfo.use_right_y2 !== 'Y'}
                                onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, custom_drilldown_max2: aEvent.target.value })}
                            />
                        </span>
                    </div>
                    <div className="y-axis-scale-zero pt-12 ucl-wrap">
                        <div className="ucl-inner">
                            <div className="ucl-form">
                                <input defaultChecked={pPanelInfo.use_ucl2 === 'Y'} onChange={(aEvent: any) => getCheckboxValue(aEvent, 'use_ucl2')} type="checkbox" />
                                <span>use UCL</span>
                            </div>
                            <Input
                                pWidth={80}
                                pHeight={24}
                                pType="number"
                                pValue={pPanelInfo.ucl2_value}
                                pIsDisabled={pPanelInfo.use_ucl2 === 'N'}
                                pSetValue={() => null}
                                onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, ucl2_value: aEvent.target.value })}
                            />
                        </div>
                        <div className="ucl-inner">
                            <div className="ucl-form">
                                <input defaultChecked={pPanelInfo.use_lcl2 === 'Y'} onChange={(aEvent: any) => getCheckboxValue(aEvent, 'use_lcl2')} type="checkbox" />
                                <span>use LCL</span>
                            </div>
                            <Input
                                pWidth={80}
                                pHeight={24}
                                pType="number"
                                pValue={pPanelInfo.lcl2_value}
                                pIsDisabled={pPanelInfo.use_lcl2 === 'N'}
                                pSetValue={() => null}
                                onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, lcl2_value: aEvent.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="addition-input-form">
                    <div style={pPanelInfo.use_right_y2 !== 'Y' ? { opacity: '0.6' } : {}} className="addition-select-box">
                        <select
                            style={pPanelInfo.use_right_y2 !== 'Y' ? { opacity: '0.6' } : {}}
                            placeholder="Select a tag for the additional Y-axis"
                            onChange={setY2TagList}
                            disabled={pPanelInfo.use_right_y2 !== 'Y'}
                        >
                            <option value="none">Select a tag for the additional Y-axis.</option>
                            {pPanelInfo.tag_set.filter((aItem: any) => aItem.use_y2 === 'N').length > 0 &&
                                pPanelInfo.tag_set
                                    .filter((aItem: any) => aItem.use_y2 === 'N')
                                    .map((bItem: any) => {
                                        return (
                                            <option key={bItem.key} value={bItem.key}>
                                                {bItem.tagName}
                                            </option>
                                        );
                                    })}
                        </select>
                        <ArrowDown />
                    </div>
                    <div style={pPanelInfo.use_right_y2 !== 'Y' ? { opacity: '0.6' } : {}} className="selected-tag-list">
                        {pPanelInfo.tag_set.filter((aItem: any) => aItem.use_y2 === 'Y').length > 0 &&
                            pPanelInfo.tag_set
                                .filter((aItem: any) => aItem.use_y2 === 'Y')
                                .map((bItem: any) => {
                                    return (
                                        <div onClick={() => setRemoveY2TagList(bItem.key)} key={bItem.key}>
                                            {bItem.tagName}
                                        </div>
                                    );
                                })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Axes;
