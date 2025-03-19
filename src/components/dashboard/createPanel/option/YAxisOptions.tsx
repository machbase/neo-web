import { Close, PlusCircle } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { Collapse } from '@/components/collapse/Collapse';
import CheckBox from '@/components/inputs/CheckBox';
import { Input } from '@/components/inputs/Input';
import { MultipleSelect } from '@/components/inputs/MultiSelector';
import { Select } from '@/components/inputs/Select';

interface XAxisOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}
// TODO according to tag count
export const YAxisOptions = (props: XAxisOptionProps) => {
    const { pPanelOption, pSetPanelOption } = props;
    const sPositionList = ['left', 'right'];

    const sUnitList: { [key: string]: number | string | undefined; name: string; key: string; title: string; unit: string; decimals: number | undefined; squared: number }[] = [
        { name: 'value', key: 'value', title: '', unit: '', decimals: undefined, squared: 0 },
        // °C
        { name: 'temperature', key: 'temperature', title: '', unit: '', decimals: 0, squared: 0 },
        // %H
        { name: 'humidity', key: 'humidity', title: '', unit: '', decimals: 0, squared: 0 },
        { name: 'percent', key: 'percent', title: '', unit: '%', decimals: undefined, squared: -2 },
        // International Electrotechnical Commission
        { name: 'byte', key: 'byte (IEC)', title: '', unit: '', decimals: undefined, squared: 0 },
        // International System Units
        { name: 'byte', key: 'byte (SI)', title: '', unit: '', decimals: undefined, squared: 0 },

        { name: 'milli', key: 'milli (m)', title: '', unit: 'm', decimals: undefined, squared: -3 },
        { name: 'micro', key: 'micro (μ)', title: '', unit: 'μ', decimals: undefined, squared: -6 },
        { name: 'nano', key: 'nano (n)', title: '', unit: 'n', decimals: undefined, squared: -9 },
        { name: 'pico', key: 'pico (p)', title: '', unit: 'p', decimals: undefined, squared: -12 },
        // { name: 'femto', key: 'femto (f)', unit: 'f', decimals: undefined, squared: -15 },
        // { name: 'atto', key: 'atto (a)', unit: 'a', decimals: undefined, squared: -18 },
        // { name: 'zepto', key: 'zepto (z)', unit: 'z', decimals: undefined, squared: -21 },
        // { name: 'yocto', key: 'yocto (y)', unit: 'y', decimals: undefined, squared: -24 },

        { name: 'kilo', key: 'kilo (K)', title: '', unit: 'K', decimals: undefined, squared: 3 },
        { name: 'mega', key: 'mega (M)', title: '', unit: 'M', decimals: undefined, squared: 6 },
        { name: 'giga', key: 'giga (G)', title: '', unit: 'G', decimals: undefined, squared: 9 },
        { name: 'tera', key: 'tera (T)', title: '', unit: 'T', decimals: undefined, squared: 12 },
        // { name: 'peta', key: 'peta (P)', unit: 'P', decimals: undefined, squared: 15 },
        // { name: 'exa', key: 'exa (E)', unit: 'E', decimals: undefined, squared: 18 },
        // { name: 'zetta', key: 'zetta (Z)', unit: 'Z', decimals: undefined, squared: 21 },
        // { name: 'yotta', key: 'yotta (Y)', unit: 'Y', decimals: undefined, squared: 24 },
    ];

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
            const sTargetLabel = sUnitList.find((unit) => unit[aKey] === aEvent.target.value);
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

    const handleUseSecondYAxis = (blockIndex: number) => {
        const sTmpUseSecondYAxis = JSON.parse(JSON.stringify(pPanelOption.yAxisOptions[1]));
        if (sTmpUseSecondYAxis.useBlockList.includes(blockIndex)) {
            sTmpUseSecondYAxis.useBlockList = sTmpUseSecondYAxis.useBlockList.filter((useNum: number) => useNum !== blockIndex);
        } else {
            sTmpUseSecondYAxis.useBlockList.push(blockIndex);
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
        <Collapse title="yAxis">
            {pPanelOption.yAxisOptions.map((aItem: any, aIndex: number) => (
                <div key={aItem.type + aIndex} style={{ border: 'solid 1px #777777', borderRadius: '5px', padding: '10px 0 10px 10px' }}>
                    {aIndex === 1 && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 10px 10px 0' }}>
                            <IconButton pWidth={25} pHeight={26} pIcon={<Close />} onClick={addRemoveYAixs} />
                        </div>
                    )}
                    <div className="menu-style">
                        <div>Position</div>
                        <Select
                            pWidth={110}
                            pHeight={25}
                            pBorderRadius={4}
                            pInitValue={aItem.position}
                            onChange={(aEvent) => handleYAxisPosition(aEvent, aIndex)}
                            pOptions={sPositionList}
                        />
                    </div>
                    <div className="menu-style">
                        <div>Offset</div>
                        <Input
                            pType="number"
                            pWidth={110}
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
                            pWidth={110}
                            pHeight={25}
                            pBorderRadius={4}
                            pInitValue={aItem?.label?.key ?? 'value'}
                            onChange={(aEvent) => handleYAxisOption('key', aEvent, aIndex)}
                            pOptions={sUnitList.map((aUnit) => {
                                return aUnit.key;
                            })}
                        />
                    </div>
                    <div className="menu-style">
                        <div>Unit</div>
                        <Input
                            pType="text"
                            pWidth={110}
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
                            pWidth={110}
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
                            pWidth={110}
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
                            pWidth={110}
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
                            pWidth={110}
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
                    {aIndex === 1 && (
                        <>
                            <div className="divider" />
                            <div>Series</div>
                            <MultipleSelect pPanelOption={pPanelOption} pSetBlockList={handleUseSecondYAxis} />
                        </>
                    )}
                </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '10px' }}>
                {pPanelOption.yAxisOptions.length < 2 && <IconButton pWidth={25} pHeight={26} pIcon={<PlusCircle />} onClick={addRemoveYAixs} />}
            </div>
        </Collapse>
    );
};
