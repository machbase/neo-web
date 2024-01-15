import { Collapse } from '@/components/collapse/Collapse';
import CheckBox from '@/components/inputs/CheckBox';
import { Input } from '@/components/inputs/Input';

interface GaugeOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}

export const GaugeOptions = (props: GaugeOptionProps) => {
    const { pPanelOption, pSetPanelOption } = props;

    const sMenuStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginRight: '10px',
        marginBottom: '5px',
    };

    const handleGaugeOption = (aValue: string | boolean, aKey: string) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                chartOptions: {
                    ...aPrev.chartOptions,
                    [aKey]: aValue,
                },
            };
        });
    };

    return (
        <div>
            <div style={sMenuStyle}>
                <div>Min</div>
                <Input
                    pType="number"
                    pHeight={25}
                    pWidth={50}
                    pBorderRadius={4}
                    pValue={pPanelOption.chartOptions?.min}
                    onChange={(aEvent: any) => handleGaugeOption(aEvent.target.value, 'min')}
                />
            </div>
            <div style={sMenuStyle}>
                <div>Max</div>
                <Input
                    pType="number"
                    pHeight={25}
                    pWidth={50}
                    pBorderRadius={4}
                    pValue={pPanelOption.chartOptions?.max}
                    onChange={(aEvent: any) => handleGaugeOption(aEvent.target.value, 'max')}
                />
            </div>
            <div className="divider" />
            <Collapse title="Axis">
                <CheckBox
                    pText="Show Axis Tick"
                    pDefaultChecked={pPanelOption.chartOptions?.isAxisTick ?? false}
                    onChange={(aEvent: any) => handleGaugeOption(aEvent.target.checked, 'isAxisTick')}
                />
                <div style={{ height: '10px' }} />
                <div style={sMenuStyle}>
                    <div>Axis Label Distance</div>
                    <Input
                        pType="number"
                        pHeight={25}
                        pWidth={50}
                        pBorderRadius={4}
                        pValue={pPanelOption.chartOptions?.axisLabelDistance}
                        onChange={(aEvent: any) => handleGaugeOption(aEvent.target.value, 'axisLabelDistance')}
                    />
                </div>
            </Collapse>
            <div className="divider" />
            <Collapse title="Anchor">
                <CheckBox
                    pText="Show Anchor"
                    pDefaultChecked={pPanelOption.chartOptions?.isAnchor ?? false}
                    onChange={(aEvent: any) => handleGaugeOption(aEvent.target.checked, 'isAnchor')}
                />
                <div style={{ height: '10px' }} />
                <div style={sMenuStyle}>
                    <div>Anchor Size</div>
                    <Input
                        pType="number"
                        pHeight={25}
                        pWidth={50}
                        pBorderRadius={4}
                        pIsDisabled={!pPanelOption.chartOptions?.isAnchor}
                        pValue={pPanelOption.chartOptions?.anchorSize}
                        onChange={(aEvent: any) => handleGaugeOption(aEvent.target.value, 'anchorSize')}
                    />
                </div>
            </Collapse>
            <div className="divider" />
            <Collapse title="Value">
                <div style={sMenuStyle}>
                    <div>Font Size</div>
                    <Input
                        pType="number"
                        pHeight={25}
                        pWidth={50}
                        pBorderRadius={4}
                        pValue={pPanelOption.chartOptions?.valueFontSize}
                        onChange={(aEvent: any) => handleGaugeOption(aEvent.target.value, 'valueFontSize')}
                    />
                </div>
                <div style={sMenuStyle}>
                    <div>Value Center Offset</div>
                    <Input
                        pType="number"
                        pHeight={25}
                        pWidth={50}
                        pBorderRadius={4}
                        pValue={pPanelOption.chartOptions?.alignCenter}
                        onChange={(aEvent: any) => handleGaugeOption(aEvent.target.value, 'alignCenter')}
                    />
                </div>
                <CheckBox
                    pText="Active Animation"
                    pDefaultChecked={pPanelOption.chartOptions?.valueAnimation ?? false}
                    onChange={(aEvent: any) => handleGaugeOption(aEvent.target.checked, 'valueAnimation')}
                />
            </Collapse>
        </div>
    );
};
