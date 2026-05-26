import { useEffect, useMemo, useRef, useState } from 'react';
import PanelEditorSettings from './sections/PanelEditorSettings';
import { Page } from '@/design-system/components';
import type {
    EditTabPanelType,
    PanelEditorConfig,
} from './EditorTypes';
import {
    convertPanelStateToEditorConfig,
} from './PanelEditorConfigConverter';
import { EDITOR_TABS } from './EditorConstants';
import { hasInvalidPanelEditorAxisRange } from './PanelEditorValidation';
import type {
    PanelAxes,
    PanelData,
    PanelDisplay,
    PanelMeta,
    PanelTime,
} from '../../domain/PanelDomain';
import { fetchAvailableSourceTableNames } from '../../fetch/SourceTableNameFetcher';

function normalizeConfigForDirtyCheck(
    config: PanelEditorConfig,
): PanelEditorConfig {
    return {
        ...config,
        general: {
            ...config.general,
            last_viewed_range: undefined,
        },
    };
}

function createEditorConfigDirtyKey(config: PanelEditorConfig): string {
    return JSON.stringify(normalizeConfigForDirtyCheck(config));
}

const PanelEditor = ({
    pOnSaveEditorConfig,
    pOnClose,
    pPanelMeta,
    pPanelData,
    pPanelTime,
    pPanelAxes,
    pPanelDisplay,
    pIsRawMode,
}: {
    pOnSaveEditorConfig: (editorConfig: PanelEditorConfig) => void;
    pOnClose: () => void;
    pPanelMeta: PanelMeta;
    pPanelData: PanelData;
    pPanelTime: PanelTime;
    pPanelAxes: PanelAxes;
    pPanelDisplay: PanelDisplay;
    pIsRawMode: boolean;
}) => {
    const sInitialEditorConfig = useMemo(
        () =>
            convertPanelStateToEditorConfig({
                meta: pPanelMeta,
                data: pPanelData,
                time: pPanelTime,
                axes: pPanelAxes,
                display: pPanelDisplay,
            }),
        [pPanelAxes, pPanelData, pPanelDisplay, pPanelMeta, pPanelTime],
    );
    const sInitialEditorConfigKey = useMemo(
        () => createEditorConfigDirtyKey(sInitialEditorConfig),
        [sInitialEditorConfig],
    );
    const [sSelectedTab, setSelectedTab] = useState<EditTabPanelType>('General');
    const [sEditorConfig, setEditorConfig] = useState<PanelEditorConfig>(
        sInitialEditorConfig,
    );
    const [sAppliedEditorConfigKey, setAppliedEditorConfigKey] = useState(
        sInitialEditorConfigKey,
    );
    const sAppliedEditorConfigKeyRef = useRef(sInitialEditorConfigKey);
    const [sAvailableSourceTableNames, setAvailableSourceTableNames] = useState<string[]>([]);
    const sEditorConfigKey = useMemo(
        () => createEditorConfigDirtyKey(sEditorConfig),
        [sEditorConfig],
    );
    const sHasInvalidAxisRange = hasInvalidPanelEditorAxisRange(sEditorConfig);
    const sHasEditorChanges = sEditorConfigKey !== sAppliedEditorConfigKey;
    const sCanApplyEditorChanges = sHasEditorChanges && !sHasInvalidAxisRange;
    const sApplyButtonTitle = !sHasEditorChanges
        ? 'There is no update'
        : sHasInvalidAxisRange
        ? 'Fix invalid values before applying'
        : undefined;

    const saveEditorChanges = () => {
        if (!sCanApplyEditorChanges) {
            return;
        }

        pOnSaveEditorConfig(sEditorConfig);
        sAppliedEditorConfigKeyRef.current = sEditorConfigKey;
        setAppliedEditorConfigKey(sEditorConfigKey);
    };

    const discardEditorChanges = () => {
        setEditorConfig(sInitialEditorConfig);
        pOnClose();
    };

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

    useEffect(() => {
        const sPreviousAppliedEditorConfigKey = sAppliedEditorConfigKeyRef.current;

        sAppliedEditorConfigKeyRef.current = sInitialEditorConfigKey;
        setAppliedEditorConfigKey(sInitialEditorConfigKey);
        setEditorConfig((currentEditorConfig) =>
            createEditorConfigDirtyKey(currentEditorConfig) === sPreviousAppliedEditorConfigKey
                ? sInitialEditorConfig
                : currentEditorConfig,
        );
    }, [sInitialEditorConfig, sInitialEditorConfigKey]);

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
                    <Page.DpRow
                        style={{
                            flex: 1,
                            minWidth: 0,
                            alignItems: 'center',
                            gap: '12px',
                            flexWrap: 'wrap',
                        }}
                    >
                        <span>Edit panel</span>
                        <Page.TabContainer style={{ margin: 0 }}>
                            <Page.TabList style={{ flexWrap: 'wrap' }}>
                                {EDITOR_TABS.map((item: EditTabPanelType) => (
                                    <Page.TabItem
                                        key={item}
                                        active={sSelectedTab === item}
                                        onClick={() => setSelectedTab(item)}
                                    >
                                        {item}
                                    </Page.TabItem>
                                ))}
                            </Page.TabList>
                        </Page.TabContainer>
                    </Page.DpRow>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: '4px',
                            minWidth: '154px',
                        }}
                    >
                        <div
                            title={sApplyButtonTitle}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}
                        >
                            <Page.TextButton
                                pText="Discard"
                                pType="DELETE"
                                pCallback={discardEditorChanges}
                                pWidth="75px"
                                mb="0px"
                                mr="4px"
                            />
                            <Page.TextButton
                                pText="Apply"
                                pType="CREATE"
                                pCallback={saveEditorChanges}
                                pIsDisable={!sCanApplyEditorChanges}
                                pWidth="65px"
                                mb="0px"
                                mr="0px"
                            />
                        </div>
                        <span
                            style={{
                                minHeight: '14px',
                                maxWidth: '190px',
                                color: '#fdb532',
                                fontSize: '11px',
                                lineHeight: '14px',
                                visibility: sHasEditorChanges ? 'visible' : 'hidden',
                            }}
                        >
                            Update has not been applied.
                        </span>
                    </div>
                </Page.Header>

                <PanelEditorSettings
                    pSelectedTab={sSelectedTab}
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

