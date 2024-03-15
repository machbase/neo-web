// import { TextButton } from '@/components/buttons/TextButton';
import { Collapse } from '@/components/collapse/Collapse';
// import CheckBox from '@/components/inputs/CheckBox';
import { Input } from '@/components/inputs/Input';
import { Select } from '@/components/inputs/Select';
// import { DefaultYAxisOption } from '@/utils/eChartHelper';

interface XAxisOptionProps {
    pYAxis: any;
    pSetPanelOption: any;
}
// TODO according to tag count
export const YAxisOptions = (props: XAxisOptionProps) => {
    const { pYAxis, pSetPanelOption } = props;
    const sPositionList = ['left', 'right'];

    const sUnitList: { [key: string]: number | string | undefined; name: string; key: string; title: string; unit: string; decimals: number | undefined; squared: number }[] = [
        { name: 'value', key: 'value', title: '', unit: '', decimals: undefined, squared: 0 },

        { name: 'percent', key: 'percent', title: '%', unit: '', decimals: undefined, squared: 0 },
        // °C
        { name: 'temperature', key: 'temperature', title: 'Temperature (°C)', unit: '', decimals: 0, squared: 0 },
        // %H
        { name: 'humidity', key: 'humidity', title: 'Humidity (%H)', unit: '', decimals: 0, squared: 0 },
        // International Electrotechnical Commission
        { name: 'byte', key: 'byte (IEC)', title: 'byte (IEC)', unit: '', decimals: undefined, squared: 0 },
        // International System Units
        { name: 'byte', key: 'byte (SI)', title: 'byte (SI)', unit: '', decimals: undefined, squared: 0 },

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
        const sCurrentYAxis = JSON.parse(JSON.stringify(pYAxis));
        sCurrentYAxis[aIndex].position = aEvent.target.value;
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                yAxisOptions: sCurrentYAxis,
            };
        });
    };

    const handleYAxisOption = (aKey: string, aEvent: any, aIdx: number) => {
        const sCurrentYAxis = JSON.parse(JSON.stringify(pYAxis));
        if (aKey === 'key') {
            const sTargetLabel = sUnitList.find((unit) => unit[aKey] === aEvent.target.value);
            sCurrentYAxis[aIdx].label = sTargetLabel;
        } else {
            sCurrentYAxis[aIdx].label[aKey] = aEvent.target.value;
        }
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                yAxisOptions: sCurrentYAxis,
            };
        });
    };

    // const addRemoveYAixs = () => {
    //     const sCurrentYAxis = JSON.parse(JSON.stringify(pYAxis));
    //     if (sCurrentYAxis.length < 2) {
    //         sCurrentYAxis.push(DefaultYAxisOption);
    //     } else {
    //         sCurrentYAxis.pop();
    //     }
    //     pSetPanelOption((aPrev: any) => {
    //         return {
    //             ...aPrev,
    //             yAxisOptions: sCurrentYAxis,
    //         };
    //     });
    // };

    const HandleMinMax = (aTarget: string, aValue: number | string, aIndex: number) => {
        const sCurrentYAxis = JSON.parse(JSON.stringify(pYAxis));
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
            {pYAxis.map((aItem: any, aIndex: number) => (
                <div key={aItem.type + aIndex} style={{ border: 'solid 1px #777777', borderRadius: '5px', padding: '10px' }}>
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
                            pPlaceHolder={aItem?.label?.name === 'byte' ? 'auto' : 'none'}
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
                    {/* <CheckBox
                        pText="Custom min max"
                        pDefaultChecked={aItem.useMinMax ?? false}
                        onChange={(aEvent: any) => HandleMinMax('useMinMax', aEvent.target.checked, aIndex)}
                    /> */}
                    <div style={{ height: '10px' }} />
                    <div className="menu-style">
                        <div>Min</div>
                        <Input
                            pType="number"
                            pWidth={110}
                            pHeight={25}
                            pBorderRadius={4}
                            // pIsDisabled={!aItem.useMinMax}
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
                            // pIsDisabled={!aItem.useMinMax}
                            pPlaceHolder={'auto'}
                            pValue={aItem?.max ?? ''}
                            onChange={(aEvent: any) => HandleMinMax('max', aEvent.target.value, aIndex)}
                        />
                    </div>
                </div>
            ))}

            {/* <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <TextButton
                    pText={pYAxis.length < 2 ? 'add' : 'remove'}
                    pWidth={70}
                    pHeight={25}
                    pBorderRadius={4}
                    pBorderColor="#989BA1"
                    pBackgroundColor="#323644"
                    onClick={addRemoveYAixs}
                />
            </div> */}
        </Collapse>
    );
};
