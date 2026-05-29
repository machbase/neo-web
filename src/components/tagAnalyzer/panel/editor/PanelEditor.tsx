import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Page } from '@/design-system/components';
import { EditTabPanelType, type PanelEditorConfig } from './EditorTypes';
import EditorAxesTab from './editTabs/EditorAxesTab';
import EditorDataTab from './editTabs/EditorDataTab';
import EditorDisplayTab from './editTabs/EditorDisplayTab';
import EditorGeneralTab from './editTabs/EditorGeneralTab';
import EditorTimeTab from './editTabs/EditorTimeTab';
import { EDITOR_TABS } from './EditorConstants';
import { hasInvalidPanelEditorAxisRange } from './PanelEditorValidation';
import styles from './PanelEditor.module.scss';
import type { PanelInfo } from '../../domain/PanelDomain';
import type { TimeRangeMs } from '../../domain/time/TimeTypes';
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
    pPanelInfo,
    pIsRawMode,
    pVisiblePanelRange,
}: {
    pOnSaveEditorConfig: (editorConfig: PanelEditorConfig) => void;
    pOnClose: () => void;
    pPanelInfo: PanelInfo;
    pIsRawMode: boolean;
    pVisiblePanelRange: TimeRangeMs;
}) => {
    const sInitialEditorConfig = useMemo(
        () => pPanelInfo,
        [pPanelInfo],
    );
    const sInitialEditorConfigKey = useMemo(
        () => createEditorConfigDirtyKey(sInitialEditorConfig),
        [sInitialEditorConfig],
    );
    const [sSelectedTab, setSelectedTab] = useState<EditTabPanelType>(
        EditTabPanelType.General,
    );
    const [sGeneralDraft, setGeneralDraft] = useState(
        sInitialEditorConfig.general,
    );
    const [sDataDraft, setDataDraft] = useState(sInitialEditorConfig.data);
    const [sAxesDraft, setAxesDraft] = useState(sInitialEditorConfig.axes);
    const [sDisplayDraft, setDisplayDraft] = useState(
        sInitialEditorConfig.display,
    );
    const [sTimeDraft, setTimeDraft] = useState(
        sInitialEditorConfig.time,
    );
    const [sAppliedEditorConfigKey, setAppliedEditorConfigKey] = useState(
        sInitialEditorConfigKey,
    );
    const sAppliedEditorConfigKeyRef = useRef(sInitialEditorConfigKey);
    const [sAvailableSourceTableNames, setAvailableSourceTableNames] = useState<string[]>([]);
    const sEditorConfig = useMemo<PanelEditorConfig>(
        () => ({
            ...sInitialEditorConfig,
            general: sGeneralDraft,
            data: sDataDraft,
            axes: sAxesDraft,
            display: sDisplayDraft,
            time: sTimeDraft,
        }),
        [
            sAxesDraft,
            sDataDraft,
            sDisplayDraft,
            sGeneralDraft,
            sInitialEditorConfig,
            sTimeDraft,
        ],
    );
    const sEditorConfigRef = useRef(sEditorConfig);
    sEditorConfigRef.current = sEditorConfig;
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
        setEditorDraft(sInitialEditorConfig);
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
        function syncExternalPanelChangesWhenDraftIsClean(): void {
            const sPreviousAppliedEditorConfigKey =
                sAppliedEditorConfigKeyRef.current;

            sAppliedEditorConfigKeyRef.current = sInitialEditorConfigKey;
            setAppliedEditorConfigKey(sInitialEditorConfigKey);

            if (
                createEditorConfigDirtyKey(sEditorConfigRef.current) ===
                sPreviousAppliedEditorConfigKey
            ) {
                setEditorDraft(sInitialEditorConfig);
            }
        }

        syncExternalPanelChangesWhenDraftIsClean();
    }, [sEditorConfigRef, sInitialEditorConfig, sInitialEditorConfigKey]);

    function setEditorDraft(config: PanelEditorConfig): void {
        setGeneralDraft(config.general);
        setDataDraft(config.data);
        setAxesDraft(config.axes);
        setDisplayDraft(config.display);
        setTimeDraft(config.time);
    }

    function updateTagSet(tagSet: PanelEditorConfig['data']['tag_set']): void {
        setDataDraft((prev) => ({ ...prev, tag_set: tagSet }));
    }

    function renderEditorTabContent() {
        if (!sEditorConfig.data.index_key) {
            throw new Error('Panel editor requires a panel index key.');
        }

        switch (sSelectedTab) {
            case EditTabPanelType.General:
                return (
                    <EditorGeneralTab
                        pGeneralConfig={sGeneralDraft}
                        pOnChangeGeneralConfig={setGeneralDraft}
                    />
                );
            case EditTabPanelType.Data:
                return (
                    <EditorDataTab
                        pDataDraft={sDataDraft}
                        pIsRawMode={pIsRawMode}
                        pOnChangeDataDraft={setDataDraft}
                        pAvailableSourceTableNames={sAvailableSourceTableNames}
                    />
                );
            case EditTabPanelType.Axes:
                return (
                    <EditorAxesTab
                        pAxesConfig={sEditorConfig.axes}
                        pTagSet={sEditorConfig.data.tag_set}
                        pIsRawMode={pIsRawMode}
                        pOnChangeAxesConfig={setAxesDraft}
                        pOnChangeTagSet={updateTagSet}
                    />
                );
            case EditTabPanelType.Display:
                return (
                    <EditorDisplayTab
                        pDisplayConfig={sEditorConfig.display}
                        pOnChangeDisplayConfig={setDisplayDraft}
                    />
                );
            case EditTabPanelType.Time:
                return (
                    <EditorTimeTab
                        pTimeConfig={sEditorConfig.time}
                        pVisiblePanelRange={pVisiblePanelRange}
                        pOnChangeTimeConfig={setTimeDraft}
                    />
                );
            default:
                throw new Error(`Unsupported panel editor tab: ${sSelectedTab}`);
        }
    }

    return (
        <div className={styles.editor}>
            <Page className={styles.editorPage}>
                <Page.Header>
                    <div className={styles.header}>
                        <div className={styles.headerMain}>
                            <h3 className={styles.title}>Edit panel</h3>
                            <Page.TabContainer style={{ margin: 0 }}>
                                <Page.TabList className={styles.tabList}>
                                    {EDITOR_TABS.map((item) => (
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
                        </div>
                        <div className={styles.actions}>
                            <div
                                title={sApplyButtonTitle}
                                className={styles.buttonRow}
                            >
                                <span
                                    className={[
                                        styles.dirtyMessage,
                                        !sHasEditorChanges && styles.dirtyMessageHidden,
                                    ]
                                        .filter(Boolean)
                                        .join(' ')}
                                >
                                    Update has not been applied.
                                </span>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={discardEditorChanges}
                                >
                                    Discard
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    disabled={!sCanApplyEditorChanges}
                                    onClick={saveEditorChanges}
                                >
                                    Apply
                                </Button>
                            </div>
                        </div>
                    </div>
                </Page.Header>

                <div className={styles.content}>{renderEditorTabContent()}</div>
            </Page>
        </div>
    );
};

export default PanelEditor;

