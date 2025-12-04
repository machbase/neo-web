import CheckBox from '@/components/inputs/CheckBox';
import { Input } from '@/components/inputs/Input';
import { Select } from '@/components/inputs/Select';
import { ChartSymbolList } from '@/utils/constants';

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
                pText="Large data mode"
                pDefaultChecked={pPanelOption.chartOptions?.isLarge ?? false}
                onChange={(aEvent: any) => handleScatterOption(aEvent, 'isLarge', true)}
            />
            <div className="divider" />
            <span>Symbol</span>
            <div style={{ height: '10px' }} />
            <div className="menu-style">
                <span>Type</span>
                <Select
                    pWidth={'100%'}
                    pHeight={25}
                    pBorderRadius={4}
                    pFontSize={12}
                    pInitValue={pPanelOption.chartOptions?.symbol}
                    onChange={(aEvent: any) => handleScatterOption(aEvent, 'symbol', false)}
                    pOptions={ChartSymbolList}
                />
            </div>
            <div className="menu-style">
                <span>Size</span>
                <Input
                    pWidth={'100%'}
                    pHeight={25}
                    pBorderRadius={4}
                    pValue={pPanelOption.chartOptions?.symbolSize}
                    onChange={(aEvent: any) => handleScatterOption(aEvent, 'symbolSize', false)}
                />
            </div>
        </div>
    );
};
