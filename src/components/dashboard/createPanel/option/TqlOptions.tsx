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
                            <span>$from_ms: unix timestamp (milliseconds)</span>
                            <span>$from_us: unix timestamp (microseconds)</span>
                            <span>$from_ns: unix timestamp (nanoseconds)</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', margin: '8px' }}>
                            <span style={{ color: 'white' }}>To</span>
                            <span>$to_str: date string (YYYY-MM-DD HH:MI:SS)</span>
                            <span>$to_s: unix timestamp</span>
                            <span>$to_ms: unix timestamp (milliseconds)</span>
                            <span>$to_us: unix timestamp (microseconds)</span>
                            <span>$to_ns: unix timestamp (nanoseconds)</span>
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
            <div className="divider" />
            <Collapse title="Plugins" isOpen>
                <div style={{ display: 'flex', flexDirection: 'column', cursor: 'default' }}>
                    <span>For charts that use plugin, need to add the plugin to tql file.</span>
                    <div style={{ display: 'flex', flexDirection: 'column', color: '#b6b6b6' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', margin: '8px' }}>
                            <span style={{ color: 'white' }}>3D charts</span>
                            <span>{`CHART(`}</span>
                            <span style={{ color: '#179fff', fontWeight: 'bold', fontFamily: 'codicon', margin: '0 0 4px 16px' }}>plugins("gl"),</span>
                            <span style={{ margin: '0 0 0 16px' }}>{`chartOption({`}</span>
                            <span>{`...`}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', margin: '8px' }}>
                            <span style={{ color: 'white' }}>Liquid fill</span>
                            <span>{`CHART(`}</span>
                            <span style={{ color: '#179fff', fontWeight: 'bold', fontFamily: 'codicon', margin: '0 0 4px 16px' }}>plugins("liquidfill"),</span>
                            <span style={{ margin: '0 0 0 16px' }}>{`chartOption({`}</span>
                            <span>{`...`}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', margin: '8px' }}>
                            <span style={{ color: 'white' }}>Word cloud</span>
                            <span>{`CHART(`}</span>
                            <span style={{ color: '#179fff', fontWeight: 'bold', fontFamily: 'codicon', margin: '0 0 4px 16px' }}>plugins("wordcloud"),</span>
                            <span style={{ margin: '0 0 0 16px' }}>{`chartOption({`}</span>
                            <span>{`...`}</span>
                        </div>
                    </div>
                </div>
            </Collapse>
        </div>
    );
};
