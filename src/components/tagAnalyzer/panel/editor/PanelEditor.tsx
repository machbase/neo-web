import { useEffect, useState } from 'react';
import PanelEditorSettings from './sections/PanelEditorSettings';
import { Page } from '@/design-system/components';
import type {
    EditTabPanelType,
    PanelEditorConfig,
    PanelEditorProps,
} from './EditorTypes';
import {
    mergeEditorConfigIntoPanelInfo,
} from './PanelEditorConfigConverter';
import { EDITOR_TABS } from './EditorConstants';

/**
 * Renders the inline editor shell for one panel.
 * Intent: Keep the inline editor workflow attached to the panel being edited.
 * @param {PanelEditorConfig} pInitialEditorConfig The initial editor draft state.
 * @param {(panelInfo: import('../utils/panelModelTypes').PanelInfo) => void} pOnSavePanel Saves the current panel snapshot.
 * @param {import('../utils/panelModelTypes').PanelInfo} pPanelInfo The panel being edited.
 * @returns {JSX.Element}
 */
const PanelEditor = ({
    pInitialEditorConfig,
    pOnSavePanel,
    pPanelInfo,
    pTables,
}: PanelEditorProps) => {
    const [sSelectedTab, setSelectedTab] = useState<EditTabPanelType>('General');
    const [sEditorConfig, setEditorConfig] = useState<PanelEditorConfig>(pInitialEditorConfig);
    const [sIsCollapsed, setIsCollapsed] = useState(false);

    /**
     * Saves the current editor draft back into the selected board panel.
     * Intent: Keep the inline editor explicit by saving exactly what is shown in the form.
     * @returns {void}
     */
    const saveEditorChanges = () => {
        pOnSavePanel(mergeEditorConfigIntoPanelInfo(pPanelInfo, sEditorConfig));
    };

    /**
     * Restores the editor fields from the current saved panel state.
     * Intent: Let discard reload the latest persisted panel values without closing the editor.
     * @returns {void}
     */
    const discardEditorChanges = () => {
        setEditorConfig(pInitialEditorConfig);
    };

    useEffect(() => {
        setEditorConfig(pInitialEditorConfig);
        setSelectedTab('General');
    }, [pInitialEditorConfig]);

    return (
        <div
            style={{
                width: '100%',
                marginTop: '16px',
                border: '0.5px solid #454545',
                borderRadius: '8px',
                backgroundColor: 'var(--color-background-primary)',
                overflow: 'hidden',
            }}
        >
            <Page style={{ width: '100%' }} pRef={undefined} className={undefined}>
                <Page.Header>
                    <Page.DpRow style={undefined} className={undefined}>
                        Edit panel
                    </Page.DpRow>
                    <Page.DpRow style={undefined} className={undefined}>
                        <Page.TextButton
                            pText={sIsCollapsed ? 'Expand' : 'Collapse'}
                            pType="DEFAULT"
                            pCallback={() => setIsCollapsed((prev) => !prev)}
                            pWidth="85px"
                            mb="0px"
                            mr="4px"
                            pIsDisable={undefined}
                            onMouseOut={undefined}
                            mt={undefined}
                            pLoad={undefined}
                            pIcon={undefined}
                        />
                        <Page.TextButton
                            pText="Discard"
                            pType="DELETE"
                            pCallback={discardEditorChanges}
                            pWidth="75px"
                            mb="0px"
                            mr="4px"
                            pIsDisable={undefined}
                            onMouseOut={undefined}
                            mt={undefined}
                            pLoad={undefined}
                            pIcon={undefined}
                        />
                        <Page.TextButton
                            pText="Save"
                            pType="CREATE"
                            pCallback={saveEditorChanges}
                            pWidth="65px"
                            mb="0px"
                            mr="4px"
                            pIsDisable={undefined}
                            onMouseOut={undefined}
                            mt={undefined}
                            pLoad={undefined}
                            pIcon={undefined}
                        />
                    </Page.DpRow>
                </Page.Header>

                {!sIsCollapsed && (
                    <>
                        <PanelEditorSettings
                            pTabs={[...EDITOR_TABS]}
                            pSelectedTab={sSelectedTab}
                            pSetSelectedTab={setSelectedTab}
                            pEditorConfig={sEditorConfig}
                            pSetEditorConfig={setEditorConfig}
                            pTables={pTables}
                        />
                    </>
                )}
            </Page>
        </div>
    );
};

export default PanelEditor;

