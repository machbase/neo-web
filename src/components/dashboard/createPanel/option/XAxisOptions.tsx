import { TextButton } from '@/components/buttons/TextButton';
import { Collapse } from '@/components/collapse/Collapse';
import { Select } from '@/components/inputs/Select';
import { ChartXAxisTypeList } from '@/utils/constants';
import { DefaultXAxisOption } from '@/utils/eChartHelper';

interface XAxisOptionProps {
    pXAxis: any;
    pSetPanelOption: any;
}

export const XAxisOptions = (props: XAxisOptionProps) => {
    const { pXAxis, pSetPanelOption } = props;

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

    const addRemoveXAixs = () => {
        const sCurrentXAxis = JSON.parse(JSON.stringify(pXAxis));
        if (sCurrentXAxis.length < 2) {
            sCurrentXAxis.push(DefaultXAxisOption);
        } else {
            sCurrentXAxis.pop();
        }
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                xAxisOptions: sCurrentXAxis,
            };
        });
    };

    return (
        <Collapse title="xAxis">
            {pXAxis.map((aItem: any, aIndex: number) => (
                <div key={aItem.type + aIndex}>
                    <div>Type</div>
                    <Select
                        pIsFullWidth
                        pBorderRadius={4}
                        pInitValue={aItem.type}
                        pHeight={30}
                        onChange={(aEvent) => handleXAxisOption(aEvent, aIndex)}
                        pOptions={ChartXAxisTypeList}
                    />
                    <div className="divider" />
                </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <TextButton
                    pText={pXAxis.length < 2 ? 'add' : 'remove'}
                    pWidth={70}
                    pHeight={25}
                    pBorderRadius={4}
                    pBorderColor="#989BA1"
                    pBackgroundColor="#323644"
                    onClick={addRemoveXAixs}
                />
            </div>
        </Collapse>
    );
};
