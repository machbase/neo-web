import EditTab from './EditTab';
import { Page } from '@/design-system/components';
import type { TagAnalyzerEditTab } from '../../TagAnalyzerEditType';

// Renders the tabbed panel settings editor for general, data, axes, display, and time options.
// It keeps the settings-layout and tab switching separate from the editor shell and preview pane.
const PanelEditorSettings = ({
    pTabs,
    pSelectedTab,
    pSetSelectedTab,
    pPanelInfo,
    pSetCopyPanelInfo,
}: any) => {
    return (
        <Page style={{ height: '100%' }}>
            <Page.DpRow style={{ height: '100%', padding: '8px 16px', flexDirection: 'column', justifyContent: 'start', alignItems: 'start' }}>
                <Page.TabContainer>
                    <Page.TabList>
                        {pTabs.map((aItem: string) => (
                            <Page.TabItem key={aItem} active={pSelectedTab === aItem} onClick={() => pSetSelectedTab(aItem)}>
                                {aItem}
                            </Page.TabItem>
                        ))}
                    </Page.TabList>
                </Page.TabContainer>
                <Page.Body style={{ display: 'flex', flexDirection: 'column', borderRadius: '4px', border: '1px solid #b8c8da41', padding: '6px', gap: '8px' }}>
                    <EditTab pSelectedTab={pSelectedTab as TagAnalyzerEditTab} pPanelInfo={pPanelInfo} pSetCopyPanelInfo={pSetCopyPanelInfo} />
                </Page.Body>
            </Page.DpRow>
        </Page>
    );
};

export default PanelEditorSettings;
