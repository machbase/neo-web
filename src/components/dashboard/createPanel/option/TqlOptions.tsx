import { Dropdown, Page } from '@/design-system/components';
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
            <Page.Collapse title="Panel option">
                <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                    <Dropdown.Root
                        label="Theme"
                        options={ChartThemeList.map((option) => ({ label: option, value: option }))}
                        value={pPanelOption.theme}
                        onChange={(value: string) => handleCustomOption(value, 'theme')}
                        fullWidth
                    >
                        <Dropdown.Trigger />
                        <Dropdown.Menu>
                            <Dropdown.List />
                        </Dropdown.Menu>
                    </Dropdown.Root>
                </Page.ContentBlock>
            </Page.Collapse>
            <Page.Divi />
            <Page.Collapse title="Parameter variables">
                <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                    <Page.ContentText pContent="Time range" />
                    <Page.Space />
                    <Page.ContentText pContent="From" />
                    <Page.ContentDesc>{`{{from_str}}: date string (YYYY-MM-DD HH:MI:SS)`}</Page.ContentDesc>
                    <Page.ContentDesc>{`{{from_s}}: unix timestamp`}</Page.ContentDesc>
                    <Page.ContentDesc>{`{{from_ms}}: unix timestamp (milliseconds)`}</Page.ContentDesc>
                    <Page.ContentDesc>{`{{from_us}}: unix timestamp (microseconds)`}</Page.ContentDesc>
                    <Page.ContentDesc>{`{{from_ns}}: unix timestamp (nanoseconds)`}</Page.ContentDesc>
                    <Page.Space />
                    <Page.ContentText pContent="To" />
                    <Page.ContentDesc>{`{{to_str}}: date string (YYYY-MM-DD HH:MI:SS)`}</Page.ContentDesc>
                    <Page.ContentDesc>{`{{to_s}}: unix timestamp`}</Page.ContentDesc>
                    <Page.ContentDesc>{`{{to_ms}}: unix timestamp (milliseconds)`}</Page.ContentDesc>
                    <Page.ContentDesc>{`{{to_us}}: unix timestamp (microseconds)`}</Page.ContentDesc>
                    <Page.ContentDesc>{`{{to_ns}}: unix timestamp (nanoseconds)`}</Page.ContentDesc>
                    <Page.Space />
                    <Page.ContentText pContent="Period" />
                    <Page.ContentDesc>{`{{period}}: duration expression (ex: 10s)`}</Page.ContentDesc>
                    <Page.ContentDesc>{`{{period_value}}: period value (ex: 10)`}</Page.ContentDesc>
                    <Page.ContentDesc>{`{{period_unit}}: period unit (ex: sec)`}</Page.ContentDesc>
                </Page.ContentBlock>
            </Page.Collapse>
            <Page.Divi />
            <Page.Collapse title="Plugins">
                <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                    <Page.ContentDesc>For charts that use plugin, need to add the plugin to tql file.</Page.ContentDesc>
                    <Page.Space />
                    <div style={{ display: 'flex', flexDirection: 'column', color: '#b6b6b6' }}>
                        <Page.ContentText pContent="3D charts" />
                        <Page.ContentText pContent="CHART(" />
                        <Page.ContentText pContent='plugins("gl"),' style={{ color: '#179fff', fontWeight: 'bold', fontFamily: 'codicon', margin: '0 0 4px 16px' }} />
                        <Page.ContentText pContent="chartOption({" style={{ margin: '0 0 0 16px' }} />
                        <Page.ContentText pContent="..." />
                        <Page.Space />
                        <Page.ContentText pContent="Liquid fill" />
                        <Page.ContentText pContent="CHART(" />
                        <Page.ContentText pContent='plugins("liquidfill"),' style={{ color: '#179fff', fontWeight: 'bold', fontFamily: 'codicon', margin: '0 0 4px 16px' }} />
                        <Page.ContentText pContent="chartOption({" style={{ margin: '0 0 0 16px' }} />
                        <Page.ContentText pContent="..." />
                        <Page.Space />
                        <Page.ContentText pContent="Word cloud" />
                        <Page.ContentText pContent="CHART(" />
                        <Page.ContentText pContent='plugins("wordcloud"),' style={{ color: '#179fff', fontWeight: 'bold', fontFamily: 'codicon', margin: '0 0 4px 16px' }} />
                        <Page.ContentText pContent="chartOption({" style={{ margin: '0 0 0 16px' }} />
                        <Page.ContentText pContent="..." />
                    </div>
                </Page.ContentBlock>
            </Page.Collapse>
        </div>
    );
};
