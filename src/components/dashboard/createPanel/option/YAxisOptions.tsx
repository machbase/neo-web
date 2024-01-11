import { TextButton } from '@/components/buttons/TextButton';
import { Collapse } from '@/components/collapse/Collapse';
import { Select } from '@/components/inputs/Select';
import { DefaultYAxisOption } from '@/utils/eChartHelper';

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

    const addRemoveYAixs = () => {
        const sCurrentYAxis = JSON.parse(JSON.stringify(pYAxis));
        if (sCurrentYAxis.length < 2) {
            sCurrentYAxis.push(DefaultYAxisOption);
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

    return (
        <Collapse title="yAxis">
            {pYAxis.map((aItem: any, aIndex: number) => (
                <div key={aItem.type + aIndex}>
                    <div>Position</div>
                    <Select
                        pIsFullWidth
                        pBorderRadius={4}
                        pInitValue={aItem.position}
                        pHeight={30}
                        onChange={(aEvent) => handleYAxisPosition(aEvent, aIndex)}
                        pOptions={sPositionList}
                    />
                    <div className="divider" />
                </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <TextButton
                    pText={pYAxis.length < 2 ? 'add' : 'remove'}
                    pWidth={70}
                    pHeight={25}
                    pBorderRadius={4}
                    pBorderColor="#989BA1"
                    pBackgroundColor="#323644"
                    onClick={addRemoveYAixs}
                />
            </div>
        </Collapse>
    );
};
