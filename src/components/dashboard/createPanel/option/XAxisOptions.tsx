// import { TextButton } from '@/components/buttons/TextButton';
import { Collapse } from '@/components/collapse/Collapse';
import CheckBox from '@/components/inputs/CheckBox';
import { Input } from '@/components/inputs/Input';
import { Select } from '@/components/inputs/Select';
import { ChartXAxisTypeList } from '@/utils/constants';
// import { DefaultXAxisOption } from '@/utils/eChartHelper';

interface XAxisOptionProps {
    pXAxis: any;
    pSetPanelOption: any;
    pAxisInterval: { IntervalType: string; IntervalValue: number };
    pIsAxisInterval: boolean;
}

export const XAxisOptions = (props: XAxisOptionProps) => {
    const { pXAxis, pSetPanelOption, pAxisInterval, pIsAxisInterval } = props;
    const sIntervalTypeList = ['sec', 'min', 'hour'];

    const handleXAxisOption = (aEvent: any, aIndex: number) => {
        const sCurrentXAxis = JSON.parse(JSON.stringify(pXAxis));
        sCurrentXAxis[aIndex].type = aEvent.target.value;
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                xAxisOptions: sCurrentXAxis,
            };
        });
    };

    const handleAxisInterval = (aType: string, aValue: number) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                axisInterval: {
                    IntervalType: aType,
                    IntervalValue: aValue,
                },
            };
        });
    };

    const changeAxisInterval = (aValue: boolean) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                isAxisInterval: aValue,
            };
        });
    };

    // const addRemoveXAixs = () => {
    //     const sCurrentXAxis = JSON.parse(JSON.stringify(pXAxis));
    //     if (sCurrentXAxis.length < 2) {
    //         sCurrentXAxis.push(DefaultXAxisOption);
    //     } else {
    //         sCurrentXAxis.pop();
    //     }
    //     pSetPanelOption((aPrev: any) => {
    //         return {
    //             ...aPrev,
    //             xAxisOptions: sCurrentXAxis,
    //         };
    //     });
    // };

    return (
        <Collapse title="xAxis">
            {pXAxis.map((aItem: any, aIndex: number) => (
                <div key={aItem.type + aIndex}>
                    <div className="menu-style">
                        <div>Type</div>
                        <Select
                            pWidth={100}
                            pHeight={25}
                            pBorderRadius={4}
                            pInitValue={aItem.type}
                            onChange={(aEvent) => handleXAxisOption(aEvent, aIndex)}
                            pOptions={ChartXAxisTypeList}
                        />
                        {/* <div className="divider" /> */}
                    </div>
                </div>
            ))}
            {pXAxis[0].type === 'time' ? (
                <>
                    <div className="divider" />
                    <Collapse title="Interval" isOpen>
                        <CheckBox onChange={(aEvent: any) => changeAxisInterval(aEvent.target.checked)} pDefaultChecked={pIsAxisInterval} pText={'Setting axis interval'} />
                        <div className="menu-style">
                            <span>Type</span>
                            <Select
                                pWidth={100}
                                pHeight={25}
                                pBorderRadius={4}
                                pIsDisabled={!pIsAxisInterval}
                                pInitValue={pAxisInterval.IntervalType}
                                onChange={(aEvent) => handleAxisInterval(aEvent.target.value, pAxisInterval.IntervalValue)}
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
                                pIsDisabled={!pIsAxisInterval}
                                pValue={pAxisInterval.IntervalValue.toString()}
                                onChange={(aEvent) => handleAxisInterval(pAxisInterval.IntervalType, Number(aEvent.target.value))}
                            />
                        </div>
                    </Collapse>
                </>
            ) : null}

            {/* <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <TextButton
                    pText={pXAxis.length < 2 ? 'add' : 'remove'}
                    pWidth={70}
                    pHeight={25}
                    pBorderRadius={4}
                    pBorderColor="#989BA1"
                    pBackgroundColor="#323644"
                    onClick={addRemoveXAixs}
                />
            </div> */}
        </Collapse>
    );
};
