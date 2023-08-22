import { ArrowDown } from '@/assets/icons/Icon';
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
                <div className="x-axis-tick-line">
                    <input defaultChecked={pPanelInfo.show_x_tickline === 'Y'} onChange={(aEvent: any) => getCheckboxValue(aEvent, 'show_x_tickline')} type="checkbox" />
                    <span>Displays the X-Axis tick line</span>
                </div>
                <div className="x-axis-pixels">
                    <span>Pixels between tick marks </span>
                    <input
                        type="number"
                        defaultValue={pPanelInfo.pixels_per_tick}
                        onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, pixels_per_tick: aEvent.target.value })}
                    />
                </div>
            </div>
            <div className="y-axis">
                <div className="y-axis-title">Y-Axis</div>
                <div className="y-axis-scale-zero">
                    <input defaultChecked={pPanelInfo.zero_base === 'Y'} onChange={(aEvent: any) => getCheckboxValue(aEvent, 'zero_base')} type="checkbox" />
                    <span>The scale of the Y-axis start at zero</span>
                </div>
                <div className="y-axis-tick-line">
                    <input defaultChecked={pPanelInfo.show_y_tickline === 'Y'} onChange={(aEvent: any) => getCheckboxValue(aEvent, 'show_y_tickline')} type="checkbox" />
                    <span>Displays the Y-Axis tick line</span>
                </div>
                <div className="y-axis-custom-scale">
                    <span>Custom scale</span>
                    <span>
                        <input
                            defaultValue={pPanelInfo.custom_min}
                            onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, custom_min: aEvent.target.value })}
                            type="number"
                        />
                        ~
                        <input
                            defaultValue={pPanelInfo.custom_max}
                            onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, custom_max: aEvent.target.value })}
                            type="number"
                        />
                    </span>
                </div>
                <div className="y-axis-raw-custom-scale">
                    <span>Custom scale for raw data chart</span>
                    <span>
                        <input
                            defaultValue={pPanelInfo.custom_drilldown_min}
                            onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, custom_drilldown_min: aEvent.target.value })}
                            type="number"
                        />
                        ~
                        <input
                            defaultValue={pPanelInfo.custom_drilldown_max}
                            onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, custom_drilldown_max: aEvent.target.value })}
                            type="number"
                        />
                    </span>
                </div>
            </div>
            <div className="additional-y-axis">
                <div className="additional-y-axis-form">
                    <div className="aditional-box-form">
                        <input defaultChecked={pPanelInfo.use_right_y2 === 'Y'} onChange={(aEvent: any) => getCheckboxValue(aEvent, 'use_right_y2')} type="checkbox" />
                        <span>Set additional Y-axis</span>
                    </div>
                    <div className="scale-box-form">
                        <input
                            defaultChecked={pPanelInfo.zero_base2}
                            onChange={(aEvent: any) => getCheckboxValue(aEvent, 'zero_base2')}
                            disabled={pPanelInfo.use_right_y2 !== 'Y'}
                            type="checkbox"
                        />
                        <span>The scale of the Y-axis start at zero</span>
                    </div>
                    <div className="scale-tick-line-form">
                        <input
                            defaultChecked={pPanelInfo.show_y_tickline2}
                            disabled={pPanelInfo.use_right_y2 !== 'Y'}
                            onChange={(aEvent: any) => getCheckboxValue(aEvent, 'show_y_tickline2')}
                            type="checkbox"
                        />
                        <span>Displays the X-Axis tick line</span>
                    </div>
                    <div className="aditional-custom">
                        <span>Custom scale</span>
                        <span>
                            <input
                                defaultValue={pPanelInfo.custom_min2}
                                disabled={pPanelInfo.use_right_y2 !== 'Y'}
                                style={pPanelInfo.use_right_y2 !== 'Y' ? { backgroundColor: '#A7A7AC' } : {}}
                                onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, custom_min2: aEvent.target.value })}
                                type="number"
                            />
                            ~
                            <input
                                defaultValue={pPanelInfo.custom_max2}
                                style={pPanelInfo.use_right_y2 !== 'Y' ? { backgroundColor: '#A7A7AC' } : {}}
                                disabled={pPanelInfo.use_right_y2 !== 'Y'}
                                onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, custom_max2: aEvent.target.value })}
                                type="number"
                            />
                        </span>
                    </div>
                    <div className="aditional-custom">
                        <span>Custom scale for raw data chart</span>
                        <span>
                            <input
                                defaultValue={pPanelInfo.custom_drilldown_min2}
                                style={pPanelInfo.use_right_y2 !== 'Y' ? { backgroundColor: '#A7A7AC' } : {}}
                                onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, custom_drilldown_min2: aEvent.target.value })}
                                disabled={pPanelInfo.use_right_y2 !== 'Y'}
                                type="number"
                            />
                            ~
                            <input
                                defaultValue={pPanelInfo.custom_drilldown_max2}
                                style={pPanelInfo.use_right_y2 !== 'Y' ? { backgroundColor: '#A7A7AC' } : {}}
                                onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, custom_drilldown_max2: aEvent.target.value })}
                                disabled={pPanelInfo.use_right_y2 !== 'Y'}
                                type="number"
                            />
                        </span>
                    </div>
                </div>
                <div className="addition-input-form">
                    <div style={pPanelInfo.use_right_y2 !== 'Y' ? { backgroundColor: '#A7A7AC' } : {}} className="addition-select-box">
                        <select
                            style={pPanelInfo.use_right_y2 !== 'Y' ? { backgroundColor: '#A7A7AC' } : {}}
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
                        <ArrowDown></ArrowDown>
                    </div>
                    <div style={pPanelInfo.use_right_y2 !== 'Y' ? { backgroundColor: '#A7A7AC' } : {}} className="selected-tag-list">
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
