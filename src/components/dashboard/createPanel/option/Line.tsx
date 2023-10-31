import { Delete, PlusCircle } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import CheckBox from '@/components/inputs/CheckBox';
import { Input } from '@/components/inputs/Input';
import { Select } from '@/components/inputs/Select';
import { getId } from '@/utils';
import './Line.scss';

const Line = ({ pPanelOption, pChangedOption, pSetPanelOption }: any) => {
    const changeValueOption = (aKey: string, aData: any, aId: string) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                markArea: aPrev.markArea.map((aItem: any) => {
                    return aItem.id === aId
                        ? {
                              ...aItem,
                              [aKey]: aData,
                          }
                        : aItem;
                }),
            };
        });
    };

    const deleteMarkArea = (aId: string) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                markArea: aPrev.markArea.filter((aItem: any) => aItem.id !== aId),
            };
        });
    };

    return (
        <div className="line-wrap">
            <div className="row title">Theme</div>
            <div className="row">
                <Select
                    pFontSize={13}
                    pWidth={'100%'}
                    pBorderRadius={4}
                    pInitValue={pPanelOption.theme}
                    pHeight={30}
                    onChange={(aEvent: any) => pChangedOption(aEvent, 'theme')}
                    pOptions={['chalk', 'essos', 'infographic', 'macarons', 'purple-passion', 'roma', 'romantic', 'shine', 'vintage', 'walden', 'westeros', 'wonderland']}
                />
            </div>
            <div className="row title">Data Zoom</div>
            <div className="row">
                <CheckBox onChange={(aEvent: any) => pChangedOption(aEvent, 'useDataZoom')} pDefaultChecked={pPanelOption.useDataZoom} pText={'use Data Zoom'}></CheckBox>
            </div>

            <div className="row">
                Type
                <Select
                    pIsDisabled={!pPanelOption.useDataZoom}
                    pFontSize={13}
                    pWidth={'100%'}
                    pBorderRadius={4}
                    pInitValue={pPanelOption.dataZoomType}
                    pHeight={30}
                    onChange={(aEvent: any) => pChangedOption(aEvent, 'dataZoomType')}
                    pOptions={['slider', 'inside']}
                />
            </div>
            <div className="row">
                Min
                <Input
                    pIsDisabled={!pPanelOption.useDataZoom}
                    pWidth={'100%'}
                    pHeight={28}
                    pType="number"
                    pValue={pPanelOption.dataZoomMin}
                    pSetValue={() => null}
                    pBorderRadius={4}
                    onChange={(aEvent: any) => pChangedOption(aEvent, 'dataZoomMin')}
                />
            </div>
            <div className="row">
                Max
                <Input
                    pIsDisabled={!pPanelOption.useDataZoom}
                    pWidth={'100%'}
                    pHeight={28}
                    pType="number"
                    pValue={pPanelOption.dataZoomMax}
                    pSetValue={() => null}
                    pBorderRadius={4}
                    onChange={(aEvent: any) => pChangedOption(aEvent, 'dataZoomMax')}
                />
            </div>

            <div className="row title">
                Mark Area
                <IconButton
                    pWidth={25}
                    pHeight={26}
                    pIcon={<PlusCircle></PlusCircle>}
                    onClick={() => {
                        pSetPanelOption((aPrev: any) => {
                            return { ...aPrev, markArea: [...aPrev.markArea, { id: getId(), coord0: 'now+1s', coord: 'now+2s', label: 'Error', opacity: '1' }] };
                        });
                    }}
                ></IconButton>
            </div>
            <div className="row">
                <CheckBox onChange={(aEvent: any) => pChangedOption(aEvent, 'useMarkArea')} pDefaultChecked={pPanelOption.useMarkArea} pText={'use Mark Area'}></CheckBox>
            </div>
            <div className="row">
                {pPanelOption.markArea.map((aItem: any) => {
                    return (
                        <div key={aItem.id} className="mark-area-option">
                            <div className="row">
                                <span>
                                    Start
                                    <Input
                                        pIsDisabled={!pPanelOption.useMarkArea}
                                        pWidth={'calc(100% - 50px)'}
                                        pHeight={28}
                                        pType="text"
                                        pValue={aItem.coord0}
                                        pSetValue={() => null}
                                        pBorderRadius={4}
                                        onChange={(aEvent: any) => changeValueOption('coord0', aEvent.target.value, aItem.id)}
                                    />
                                </span>
                                <span>
                                    End
                                    <Input
                                        pIsDisabled={!pPanelOption.useMarkArea}
                                        pWidth={'calc(100% - 40px)'}
                                        pHeight={28}
                                        pType="text"
                                        pValue={aItem.coord1}
                                        pSetValue={() => null}
                                        pBorderRadius={4}
                                        onChange={(aEvent: any) => changeValueOption('coord1', aEvent.target.value, aItem.id)}
                                    />
                                </span>
                                <span>
                                    <IconButton
                                        pDisabled={pPanelOption.markArea.length === 1 || !pPanelOption.useMarkArea}
                                        pWidth={25}
                                        pHeight={26}
                                        pIcon={<Delete></Delete>}
                                        onClick={() => deleteMarkArea(aItem.id)}
                                    ></IconButton>
                                </span>
                            </div>
                            Label
                            <Input
                                pIsDisabled={!pPanelOption.useMarkArea}
                                pWidth={'100%'}
                                pHeight={28}
                                pType="text"
                                pValue={aItem.label}
                                pSetValue={() => null}
                                pBorderRadius={4}
                                onChange={(aEvent: any) => changeValueOption('label', aEvent.target.value, aItem.id)}
                            />
                            Color
                            <Input
                                pIsDisabled={!pPanelOption.useMarkArea}
                                pWidth={'100%'}
                                pHeight={28}
                                pType="text"
                                pValue={aItem.color}
                                pSetValue={() => null}
                                pBorderRadius={4}
                                onChange={(aEvent: any) => changeValueOption('color', aEvent.target.value, aItem.id)}
                            />
                            Opacity
                            <Input
                                pIsDisabled={!pPanelOption.useMarkArea}
                                pWidth={'100%'}
                                pHeight={28}
                                pType="number"
                                pValue={aItem.opacity}
                                pSetValue={() => null}
                                pBorderRadius={4}
                                onChange={(aEvent: any) => changeValueOption('opacity', aEvent.target.value, aItem.id)}
                            />
                            <div className="divider" style={{ margin: '12px 3px' }}></div>
                        </div>
                    );
                })}
            </div>
            {/* <div className="row title">X-axis</div>
            <div className="row">
            </div>
            <div className="row">
                Pixels between tick marks
                <Input
                    pWidth={'100%'}
                    pHeight={28}
                    pType="number"
                    pValue={pPanelOption.pixelsPerTick}
                    pSetValue={() => null}
                    pBorderRadius={4}
                    onChange={(aEvent: any) => pChangedOption(aEvent, 'pixelsPerTick')}
                />
            </div>
            <div className="row title">Y-axis</div>
            <div className="row">
                <CheckBox
                    onChange={(aEvent: any) => {
                        pChangedOption(aEvent, 'showYTickline');
                    }}
                    pDefaultChecked={pPanelOption.showYTickline}
                    pText={'Displays the Y-Axis tick line'}
                ></CheckBox>
            </div>
            <div className="row">
                <CheckBox
                    onChange={(aEvent: any) => {
                        pChangedOption(aEvent, 'zeroBase');
                    }}
                    pDefaultChecked={pPanelOption.zeroBase}
                    pText={'The scale of the Y-axis start at zero'}
                ></CheckBox>
            </div>
            <div className="row ">
                Custom scale
                <div className="scale-form">
                    <Input
                        pWidth={'40%'}
                        pHeight={28}
                        pType="number"
                        pValue={pPanelOption.useCustomMin}
                        pSetValue={() => null}
                        pBorderRadius={4}
                        onChange={(aEvent: any) => pChangedOption(aEvent, 'useCustomMin')}
                    />
                    ~
                    <Input
                        pWidth={'40%'}
                        pHeight={28}
                        pType="number"
                        pValue={pPanelOption.useCustomMax}
                        pSetValue={() => null}
                        pBorderRadius={4}
                        onChange={(aEvent: any) => pChangedOption(aEvent, 'useCustomMax')}
                    />
                </div>
            </div>
            <div className="row title">Y-axis-Right</div>
            <div className="row">
                <CheckBox
                    onChange={(aEvent: any) => {
                        pChangedOption(aEvent, 'useRightYaxis');
                    }}
                    pDefaultChecked={pPanelOption.useRightYaxis}
                    pText={'Use Y-axis-Right'}
                ></CheckBox>
            </div>
            <div className="row">
                <CheckBox
                    onChange={(aEvent: any) => {
                        pChangedOption(aEvent, 'showYaxisRightTickline');
                    }}
                    pIsDisabled={!pPanelOption.useRightYaxis}
                    pDefaultChecked={pPanelOption.showYaxisRightTickline}
                    pText={'Displays the X-Axis tick line'}
                ></CheckBox>
            </div>
            <div className="row">
                <CheckBox
                    onChange={(aEvent: any) => {
                        pChangedOption(aEvent, 'zeroBaseRightYaxis');
                    }}
                    pIsDisabled={!pPanelOption.useRightYaxis}
                    pDefaultChecked={pPanelOption.zeroBaseRightYaxis}
                    pText={'The scale of the Y-axis-Right start at zero'}
                ></CheckBox>
            </div>

            <div className="row title">Display</div>
            <div className="row">
                <CheckBox
                    onChange={(aEvent: any) => {
                        pChangedOption(aEvent, 'showPoint');
                    }}
                    pDefaultChecked={pPanelOption.showPoint}
                    pText={'Display data points in the line chart'}
                ></CheckBox>
            </div>
            <div className="row">
                Line Thickness
                <Input
                    pWidth={'100%'}
                    pHeight={28}
                    pType="number"
                    pValue={pPanelOption.lineWidth}
                    pSetValue={() => null}
                    pBorderRadius={4}
                    onChange={(aEvent: any) => pChangedOption(aEvent, 'lineWidth')}
                />
            </div> */}
        </div>
    );
};

export default Line;
