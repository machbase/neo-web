import CheckBox from '@/components/inputs/CheckBox';
import { Input } from '@/components/inputs/Input';
import { Select } from '@/components/inputs/Select';

interface LiquidfillOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}

export const LiquidfillOptions = (props: LiquidfillOptionProps) => {
    const { pPanelOption, pSetPanelOption } = props;
    const sShapeList = ['container', 'circle', 'rect', 'roundRect', 'triangle', 'diamond', 'pin', 'arrow'];

    const sMenuStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginRight: '10px',
        marginBottom: '5px',
    };

    const HandleOption = (aEvent: any, aKey: any) => {
        pSetPanelOption((prev: any) => {
            return {
                ...prev,
                chartOptions: {
                    ...prev.chartOptions,
                    [aKey]: aEvent.target.value,
                },
            };
        });
    };

    return (
        <div>
            <div style={{ ...sMenuStyle, zIndex: 999, overflow: 'none' }}>
                <span>Shape</span>
                <Select
                    pFontSize={12}
                    pWidth={100}
                    pBorderRadius={4}
                    pHeight={25}
                    pInitValue={pPanelOption.chartOptions?.shape}
                    onChange={(aEvent: any) => HandleOption(aEvent, 'shape')}
                    pOptions={sShapeList}
                />
            </div>
            <div style={{ height: '10px' }} />
            <div style={sMenuStyle}>
                <span>Amplitude</span>
                <Input
                    pType="number"
                    pWidth={100}
                    pHeight={25}
                    pBorderRadius={4}
                    pValue={pPanelOption.chartOptions?.amplitude ?? 0}
                    pSetValue={() => null}
                    onChange={(aEvent: any) => HandleOption(aEvent, 'amplitude')}
                />
            </div>
            <div style={{ height: '10px' }} />
            <div style={sMenuStyle}>
                <span>Min</span>
                <Input
                    pType="number"
                    pWidth={100}
                    pHeight={25}
                    pBorderRadius={4}
                    pValue={pPanelOption.chartOptions?.minData ?? 0}
                    pSetValue={() => null}
                    onChange={(aEvent: any) => HandleOption(aEvent, 'minData')}
                />
            </div>
            <div style={{ height: '10px' }} />
            <div style={sMenuStyle}>
                <span>Max</span>
                <Input
                    pType="number"
                    pWidth={100}
                    pHeight={25}
                    pBorderRadius={4}
                    pValue={pPanelOption.chartOptions?.maxData ?? 100}
                    pSetValue={() => null}
                    onChange={(aEvent: any) => HandleOption(aEvent, 'maxData')}
                />
            </div>
            <div style={{ height: '10px' }} />
            <div style={sMenuStyle}>
                <span>Font size</span>
                <Input
                    pType="number"
                    pWidth={100}
                    pHeight={25}
                    pBorderRadius={4}
                    pValue={pPanelOption.chartOptions?.fontSize ?? 50}
                    pSetValue={() => null}
                    onChange={(aEvent: any) => HandleOption(aEvent, 'fontSize')}
                />
            </div>
            <div style={{ height: '10px' }} />
            <CheckBox
                pText="WaveAnimation"
                pDefaultChecked={pPanelOption.chartOptions?.waveAnimation ?? false}
                onChange={(aEvent: any) => HandleOption({ target: { value: aEvent.target.checked } }, 'waveAnimation')}
            />
            <div style={{ height: '10px' }} />
            <CheckBox
                pText="Outline"
                pDefaultChecked={pPanelOption.chartOptions?.waveAnimation ?? false}
                onChange={(aEvent: any) => HandleOption({ target: { value: aEvent.target.checked } }, 'isOutline')}
            />
        </div>
    );
};
