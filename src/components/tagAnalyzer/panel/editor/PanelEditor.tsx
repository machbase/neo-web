import { useEffect, useState } from 'react';
import PanelEditorSettings from './sections/PanelEditorSettings';
import { Page } from '@/design-system/components';
import type {
    EditTabPanelType,
    PanelEditorConfig,
} from './EditorTypes';
import {
    mergeEditorConfigIntoPanelInfo,
} from './PanelEditorConfigConverter';
import { EDITOR_TABS } from './EditorConstants';
import type { PanelInfo } from '../../domain/PanelModel';
import { fetchAvailableSourceTableNames } from '../../fetch/SourceTableNameFetcher';

const PanelEditor = ({
    pInitialEditorConfig,
    pOnSavePanel,
    pOnClose,
    pPanelInfo,
    pIsRawMode,
}: {
    pInitialEditorConfig: PanelEditorConfig;
    pOnSavePanel: (panelInfo: PanelInfo) => void;
    pOnClose: () => void;
    pPanelInfo: PanelInfo;
    pIsRawMode: boolean;
}) => {
    const [sSelectedTab, setSelectedTab] = useState<EditTabPanelType>('General');
    const [sEditorConfig, setEditorConfig] = useState<PanelEditorConfig>(pInitialEditorConfig);
    const [sAvailableSourceTableNames, setAvailableSourceTableNames] = useState<string[]>([]);

    const saveEditorChanges = () => {
        pOnSavePanel(mergeEditorConfigIntoPanelInfo(pPanelInfo, sEditorConfig));
    };

    const discardEditorChanges = () => {
        setEditorConfig(pInitialEditorConfig);
        pOnClose();
    };

    useEffect(() => {
        setEditorConfig(pInitialEditorConfig);
        setSelectedTab('General');
    }, [pInitialEditorConfig]);

    useEffect(() => {
        let sIsActive = true;

        void (async () => {
            const sSourceTableNames = await fetchAvailableSourceTableNames().catch(
                () => undefined,
            );

            if (!sIsActive) {
                return;
            }

            setAvailableSourceTableNames(sSourceTableNames ?? []);
        })();

        return () => {
            sIsActive = false;
        };
    }, []);

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
            <Page style={{ width: '100%' }}>
                <Page.Header>
                    <Page.DpRow>
                        Edit panel
                    </Page.DpRow>
                    <Page.DpRow>
                        <Page.TextButton
                            pText="Discard"
                            pType="DELETE"
                            pCallback={discardEditorChanges}
                            pWidth="75px"
                            mb="0px"
                            mr="4px"
                        />
                        <Page.TextButton
                            pText="Save"
                            pType="CREATE"
                            pCallback={saveEditorChanges}
                            pWidth="65px"
                            mb="0px"
                            mr="4px"
                        />
                    </Page.DpRow>
                </Page.Header>

                <PanelEditorSettings
                    pTabs={[...EDITOR_TABS]}
                    pSelectedTab={sSelectedTab}
                    pSetSelectedTab={setSelectedTab}
                    pEditorConfig={sEditorConfig}
                    pSetEditorConfig={setEditorConfig}
                    pAvailableSourceTableNames={sAvailableSourceTableNames}
                    pIsRawMode={pIsRawMode}
                />
            </Page>
        </div>
    );
};

export default PanelEditor;

