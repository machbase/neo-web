import { Collapse } from '@/components/collapse/Collapse';
import CheckBox from '@/components/inputs/CheckBox';
import { Input } from '@/components/inputs/Input';

interface GaugeOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}

export const GaugeOptions = (props: GaugeOptionProps) => {
    const { pPanelOption, pSetPanelOption } = props;

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
            <div className="menu-style">
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
            <div className="menu-style">
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
                <div className="menu-style">
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
                <CheckBox
                    pText="Show axis line style"
                    pDefaultChecked={pPanelOption.chartOptions?.isAxisLineStyleColor ?? false}
                    onChange={(aEvent: any) => handleGaugeOption(aEvent.target.checked, 'isAxisLineStyleColor')}
                />
                {pPanelOption.chartOptions?.isAxisLineStyleColor && (
                    <>
                        <div style={{ height: '10px' }} />
                        <Input
                            pType="text"
                            pHeight={25}
                            pWidth={350}
                            pBorderRadius={4}
                            pValue={pPanelOption.chartOptions?.axisLineStyleColor}
                            onChange={(aEvent: any) => handleGaugeOption(aEvent.target.value, 'axisLineStyleColor')}
                        />
                    </>
                )}
            </Collapse>
            <div className="divider" />
            <Collapse title="Anchor">
                <CheckBox
                    pText="Show Anchor"
                    pDefaultChecked={pPanelOption.chartOptions?.isAnchor ?? false}
                    onChange={(aEvent: any) => handleGaugeOption(aEvent.target.checked, 'isAnchor')}
                />
                <div style={{ height: '10px' }} />
                <div className="menu-style">
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
                <div className="menu-style">
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
                <div className="menu-style">
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
                <div className="menu-style">
                    <div>Decimal Places</div>
                    <Input
                        pType="number"
                        pHeight={25}
                        pWidth={50}
                        pBorderRadius={4}
                        pValue={pPanelOption.chartOptions?.gaugeValueLimit}
                        onChange={(aEvent: any) => handleGaugeOption(aEvent.target.value, 'gaugeValueLimit')}
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
