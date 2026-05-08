import EditorTabContent from './EditorTabContent';
import { Page } from '@/design-system/components';
import type { Dispatch, SetStateAction } from 'react';
import type {
    EditTabPanelType,
    PanelEditorConfig,
} from '../EditorTypes';

const PanelEditorSettings = ({
    pTabs,
    pSelectedTab,
    pSetSelectedTab,
    pEditorConfig,
    pSetEditorConfig,
    pAvailableSourceTableNames,
    pIsRawMode,
}: {
    pTabs: EditTabPanelType[];
    pSelectedTab: EditTabPanelType;
    pSetSelectedTab: Dispatch<SetStateAction<EditTabPanelType>>;
    pEditorConfig: PanelEditorConfig;
    pSetEditorConfig: Dispatch<SetStateAction<PanelEditorConfig>>;
    pAvailableSourceTableNames: string[];
    pIsRawMode: boolean;
}) => {
    return (
        <Page style={{ height: '100%' }}>
            <Page.DpRow
                style={{
                    height: '100%',
                    padding: '8px 16px',
                    flexDirection: 'column',
                    justifyContent: 'start',
                    alignItems: 'start',
                }}
            >
                <Page.TabContainer>
                    <Page.TabList>
                        {pTabs.map((item: EditTabPanelType) => (
                            <Page.TabItem
                                key={item}
                                active={pSelectedTab === item}
                                onClick={() => pSetSelectedTab(item)}
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
                >
                    <EditorTabContent
                        selectedTabType={pSelectedTab}
                        editorConfig={pEditorConfig}
                        setEditorConfig={pSetEditorConfig}
                        availableSourceTableNames={pAvailableSourceTableNames}
                        isRawMode={pIsRawMode}
                    />
                </Page.Body>
            </Page.DpRow>
        </Page>
    );
};

export default PanelEditorSettings;
