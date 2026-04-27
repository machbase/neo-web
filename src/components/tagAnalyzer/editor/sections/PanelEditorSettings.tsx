import EditorTabContent from './EditorTabContent';
import { Page } from '@/design-system/components';
import type {
    EditTabPanelType,
    PanelEditorSettingsProps,
} from '../EditorTypes';

/**
 * Renders the tabbed panel settings editor for general, data, axes, display, and time options.
 * Intent: Keep the settings layout and tab switching separate from the editor shell and preview pane.
 * @param {EditTabPanelType[]} pTabs The available editor tabs.
 * @param {EditTabPanelType} pSelectedTab The currently active tab.
 * @param {Dispatch<SetStateAction<EditTabPanelType>>} pSetSelectedTab Updates the active tab.
 * @param {PanelEditorConfig} pEditorConfig The current editor config.
 * @param {Dispatch<SetStateAction<PanelEditorConfig>>} pSetEditorConfig Updates the editor config.
 * @returns {JSX.Element}
 */
const PanelEditorSettings = ({
    pTabs,
    pSelectedTab,
    pSetSelectedTab,
    pEditorConfig,
    pSetEditorConfig,
    pTables,
}: PanelEditorSettingsProps) => {
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
                        {pTabs.map((item: EditTabPanelType) => (
                            <Page.TabItem
                                key={item}
                                active={pSelectedTab === item}
                                onClick={() => pSetSelectedTab(item)}
                                badge={undefined}
                                style={undefined}
                                className={undefined}
                            >
                                {item}
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
                    <EditorTabContent
                        selectedTabType={pSelectedTab}
                        editorConfig={pEditorConfig}
                        setEditorConfig={pSetEditorConfig}
                        tables={pTables}
                    />
                </Page.Body>
            </Page.DpRow>
        </Page>
    );
};

export default PanelEditorSettings;
