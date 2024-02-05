// import { TextButton } from '@/components/buttons/TextButton';
import { Collapse } from '@/components/collapse/Collapse';
import CheckBox from '@/components/inputs/CheckBox';
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

    const HandleMinMax = (aTarget: string, aValue: number, aIndex: number) => {
        const sCurrentYAxis = JSON.parse(JSON.stringify(pYAxis));
        sCurrentYAxis[aIndex][aTarget] = aValue;
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
                <div key={aItem.type + aIndex}>
                    <div className="menu-style">
                        <div>Position</div>
                        <Select
                            pWidth={100}
                            pHeight={25}
                            pBorderRadius={4}
                            pInitValue={aItem.position}
                            onChange={(aEvent) => handleYAxisPosition(aEvent, aIndex)}
                            pOptions={sPositionList}
                        />
                    </div>
                    <div className="divider" />
                    <div className="menu-style">
                        <CheckBox
                            pText="Use min max"
                            pDefaultChecked={aItem.useMinMax ?? false}
                            onChange={(aEvent: any) => HandleMinMax('useMinMax', aEvent.target.checked, aIndex)}
                        />
                        <div>Min</div>
                        <Input
                            pType="number"
                            pWidth={50}
                            pHeight={25}
                            pBorderRadius={4}
                            pIsDisabled={!aItem.useMinMax}
                            pValue={aItem?.min ?? 0}
                            onChange={(aEvent: any) => HandleMinMax('min', aEvent.target.value, aIndex)}
                        />
                        <div>Max</div>
                        <Input
                            pType="number"
                            pWidth={50}
                            pHeight={25}
                            pBorderRadius={4}
                            pIsDisabled={!aItem.useMinMax}
                            pValue={aItem?.max ?? 0}
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
