import { Collapse } from '@/components/collapse/Collapse';
import { Select } from '@/components/inputs/Select';
import { generateUUID } from '@/utils';
import { ChartThemeList } from '@/utils/constants';

interface GaugeOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}

export const TqlOptions = (props: GaugeOptionProps) => {
    const { pPanelOption, pSetPanelOption } = props;

    const handleCustomOption = (aValue: string | boolean, aKey: string) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                id: generateUUID(),
                [aKey]: aValue,
            };
        });
    };

    return (
        <div>
            <Collapse title="Panel option" isOpen>
                <div className="menu-style">
                    <span>Theme</span>
                    <Select
                        pWidth={100}
                        pHeight={25}
                        pFontSize={14}
                        pBorderRadius={4}
                        pInitValue={pPanelOption.theme}
                        onChange={(aEvent: any) => handleCustomOption(aEvent.target.value, 'theme')}
                        pOptions={ChartThemeList}
                    />
                </div>
            </Collapse>
            <div className="divider" />
            <Collapse title="Parameter variables" isOpen>
                <div style={{ display: 'flex', flexDirection: 'column', cursor: 'default' }}>
                    <span>Time range</span>
                    <div style={{ display: 'flex', flexDirection: 'column', color: '#b6b6b6' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', margin: '8px' }}>
                            <span style={{ color: 'white' }}>From</span>
                            <span>$from_str: date string (YYYY-MM-DD HH:MI:SS)</span>
                            <span>$from_s: unix timestamp </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', margin: '8px' }}>
                            <span style={{ color: 'white' }}>To</span>
                            <span>$to_str: date string (YYYY-MM-DD HH:MI:SS)</span>
                            <span>$to_s: unix timestamp</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', margin: '8px' }}>
                            <span style={{ color: 'white' }}>Period</span>
                            <span>$period: duration expression (ex: 10s) </span>
                            <span>$period_value: period value (ex: 10)</span>
                            <span>$period_unit: period unit (ex: sec)</span>
                        </div>
                    </div>
                </div>
            </Collapse>
        </div>
    );
};