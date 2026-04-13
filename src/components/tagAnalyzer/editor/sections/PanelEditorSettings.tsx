import EditTab from './EditTab';
import { Page } from '@/design-system/components';
import type { Dispatch, SetStateAction } from 'react';
import type { EditTabPanelType, TagAnalyzerPanelEditorConfig } from '../PanelEditorTypes';

// Renders the tabbed panel settings editor for general, data, axes, display, and time options.
// It keeps the settings-layout and tab switching separate from the editor shell and preview pane.
const PanelEditorSettings = ({
    pTabs,
    pSelectedTab,
    pSetSelectedTab,
    pEditorConfig,
    pSetEditorConfig,
}: {
    pTabs: EditTabPanelType[];
    pSelectedTab: EditTabPanelType;
    pSetSelectedTab: Dispatch<SetStateAction<EditTabPanelType>>;
    pEditorConfig: TagAnalyzerPanelEditorConfig;
    pSetEditorConfig: Dispatch<SetStateAction<TagAnalyzerPanelEditorConfig>>;
}) => {
    return (
        <Page style={{ height: '100%' }} pRef={undefined} className={undefined}>
            <Page.DpRow
                style={{
                    height: '100%',
                    padding: '8px 16px',
                    flexDirection: 'column',
                    justifyContent: 'start',
                    alignItems: 'start',
                }}
                className={undefined}
            >
                <Page.TabContainer style={undefined} className={undefined}>
                    <Page.TabList style={undefined} className={undefined}>
                        {pTabs.map((aItem: EditTabPanelType) => (
                            <Page.TabItem
                                key={aItem}
                                active={pSelectedTab === aItem}
                                onClick={() => pSetSelectedTab(aItem)}
                                badge={undefined}
                                style={undefined}
                                className={undefined}
                            >
                                {aItem}
                            </Page.TabItem>
                        ))}
                    </Page.TabList>
                </Page.TabContainer>
                <Page.Body
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '4px',
                        border: '1px solid #b8c8da41',
                        padding: '6px',
                        gap: '8px',
                    }}
                    pSpyder={undefined}
                    pSpyderChildren={undefined}
                    fixed={undefined}
                    fullHeight={undefined}
                    className={undefined}
                    scrollButtons={undefined}
                    footer={undefined}
                >
                    <EditTab
                        selectedTabType={pSelectedTab}
                        editorConfig={pEditorConfig}
                        setEditorConfig={pSetEditorConfig}
                    />
                </Page.Body>
            </Page.DpRow>
        </Page>
    );
};

export default PanelEditorSettings;
