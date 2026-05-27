import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Page } from '@/design-system/components';
import type {
    EditTabPanelType,
    PanelEditorConfig,
} from './EditorTypes';
import EditorAxesTab from './editTabs/EditorAxesTab';
import EditorDataTab from './editTabs/EditorDataTab';
import EditorDisplayTab from './editTabs/EditorDisplayTab';
import EditorGeneralTab from './editTabs/EditorGeneralTab';
import EditorTimeTab from './editTabs/EditorTimeTab';
import {
    convertPanelStateToEditorConfig,
} from './PanelEditorConfigConverter';
import { EDITOR_TABS } from './EditorConstants';
import { hasInvalidPanelEditorAxisRange } from './PanelEditorValidation';
import styles from './PanelEditor.module.scss';
import type {
    PanelAxes,
    PanelData,
    PanelDisplay,
    PanelMeta,
    PanelTime,
} from '../../domain/PanelDomain';
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
    pPanelMeta,
    pPanelData,
    pPanelTime,
    pPanelAxes,
    pPanelDisplay,
    pIsRawMode,
    pVisiblePanelRange,
}: {
    pOnSaveEditorConfig: (editorConfig: PanelEditorConfig) => void;
    pOnClose: () => void;
    pPanelMeta: PanelMeta;
    pPanelData: PanelData;
    pPanelTime: PanelTime;
    pPanelAxes: PanelAxes;
    pPanelDisplay: PanelDisplay;
    pIsRawMode: boolean;
    pVisiblePanelRange: TimeRangeMs;
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

    function updateEditorSection<K extends keyof PanelEditorConfig>(
        section: K,
        config: PanelEditorConfig[K],
    ): void {
        setEditorConfig((prev) => ({ ...prev, [section]: config }));
    }

    function updateTagSet(tagSet: PanelEditorConfig['data']['tag_set']): void {
        setEditorConfig((prev) => ({
            ...prev,
            data: { ...prev.data, tag_set: tagSet },
        }));
    }

    function renderEditorTabContent() {
        if (!sEditorConfig.data.index_key) {
            throw new Error('Panel editor requires a panel index key.');
        }

        switch (sSelectedTab) {
            case 'General':
                return (
                    <EditorGeneralTab
                        pGeneralConfig={sEditorConfig.general}
                        pOnChangeGeneralConfig={(config) =>
                            updateEditorSection('general', config)
                        }
                    />
                );
            case 'Data':
                return (
                    <EditorDataTab
                        pDataConfig={sEditorConfig.data}
                        pIsRawMode={pIsRawMode}
                        pOnChangeTagSet={updateTagSet}
                        pAvailableSourceTableNames={sAvailableSourceTableNames}
                    />
                );
            case 'Axes':
                return (
                    <EditorAxesTab
                        pAxesConfig={sEditorConfig.axes}
                        pTagSet={sEditorConfig.data.tag_set}
                        pIsRawMode={pIsRawMode}
                        pOnChangeAxesConfig={(config) =>
                            updateEditorSection('axes', config)
                        }
                        pOnChangeTagSet={updateTagSet}
                    />
                );
            case 'Display':
                return (
                    <EditorDisplayTab
                        pDisplayConfig={sEditorConfig.display}
                        pOnChangeDisplayConfig={(config) =>
                            updateEditorSection('display', config)
                        }
                    />
                );
            case 'Time':
                return (
                    <EditorTimeTab
                        pTimeConfig={sEditorConfig.time}
                        pVisiblePanelRange={pVisiblePanelRange}
                        pOnChangeTimeConfig={(config) =>
                            updateEditorSection('time', config)
                        }
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

