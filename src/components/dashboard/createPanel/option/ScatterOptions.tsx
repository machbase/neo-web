import CheckBox from '@/components/inputs/CheckBox';
import { Input } from '@/components/inputs/Input';

interface ScatterOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}

export const ScatterOptions = (props: ScatterOptionProps) => {
    const { pPanelOption, pSetPanelOption } = props;

    const handleScatterOption = (aEvent: any, aKey: any, aIsCheckbox: boolean) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                chartOptions: {
                    ...aPrev.chartOptions,
                    [aKey]: aIsCheckbox ? aEvent.target.checked : aEvent.target.value,
                },
            };
        });
    };

    return (
        <div>
            <CheckBox
                pText="Large Data Mode"
                pDefaultChecked={pPanelOption.chartOptions?.isLarge ?? false}
                onChange={(aEvent: any) => handleScatterOption(aEvent, 'isLarge', true)}
            />
            <div style={{ height: '10px' }} />
            <div className="menu-style">
                <span>Symbol Size</span>
                <Input
                    pWidth={50}
                    pHeight={25}
                    pBorderRadius={4}
                    pValue={pPanelOption.chartOptions?.symbolSize}
                    onChange={(aEvent: any) => handleScatterOption(aEvent, 'symbolSize', false)}
                />
            </div>
        </div>
    );
};
