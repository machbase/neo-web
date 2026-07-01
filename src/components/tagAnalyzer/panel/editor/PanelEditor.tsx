import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type AnimationEvent,
} from 'react';
import { Button, Page, Toast } from '@/design-system/components';
import EditorAxesTab from './editTabs/EditorAxesTab';
import EditorDataSettingTab from './editTabs/EditorDataSettingTab';
import EditorDataTab from './editTabs/EditorDataTab';
import EditorDisplayTab from './editTabs/EditorDisplayTab';
import EditorGeneralTab from './editTabs/EditorGeneralTab';
import EditorTimeTab from './editTabs/EditorTimeTab';
import { hasInvalidEditorStructure } from './editTabs/EditorFieldUtils';
import styles from './PanelEditor.module.scss';
import type { PanelInfo } from '../../domain/panel/PanelConfig';
import { shouldUseNumericPanelRangeInput } from '../../domain/SeriesDomain';
import type { TimeRangeMs } from '../../domain/time/TimeTypes';

enum EditTabPanelType {
    General = 'General',
    Data = 'Data',
    DataSetting = 'Data Setting',
    Axes = 'Axes',
    Display = 'Display',
    Time = 'Time',
}

type PanelEditorAnimationState = 'opening' | 'closing';

function normalizeConfigForDirtyCheck(
    config: PanelInfo,
): PanelInfo {
    return {
        ...config,
        time: {
            ...config.time,
            lastViewedRange: undefined,
        },
    };
}

function createEditorConfigDirtyKey(config: PanelInfo): string {
    return JSON.stringify(normalizeConfigForDirtyCheck(config));
}

const PanelEditor = ({
    pOnApplyEditorConfig,
    pOnSaveEditorConfig,
    pOnClose,
    pOnAnimationEnd,
    pAnimationState,
    pPanelInfo,
    pIsRawMode,
    pPanelRange,
}: {
    pOnApplyEditorConfig: (editorConfig: PanelInfo) => void;
    pOnSaveEditorConfig: (editorConfig: PanelInfo) => Promise<boolean>;
    pOnClose: () => void;
    pOnAnimationEnd: () => void;
    pAnimationState: PanelEditorAnimationState;
    pPanelInfo: PanelInfo;
    pIsRawMode: boolean;
    pPanelRange: TimeRangeMs;
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
    const [sTitleDraft, setTitleDraft] = useState(sInitialEditorConfig.title);
    const [sModeDraft, setModeDraft] = useState(sInitialEditorConfig.mode);
    const [sQueryDraft, setQueryDraft] = useState(sInitialEditorConfig.query);
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
    const [sHasAppliedUnsavedChanges, setHasAppliedUnsavedChanges] =
        useState(false);
    const [sSaveMessage, setSaveMessage] = useState<string | undefined>(undefined);
    const [sIsSaving, setIsSaving] = useState(false);
    const [sHasInvalidTimeRangeInput, setHasInvalidTimeRangeInput] =
        useState(false);
    const sAppliedEditorConfigKeyRef = useRef(sInitialEditorConfigKey);
    const sEditorConfig = useMemo<PanelInfo>(
        () => ({
            ...sInitialEditorConfig,
            title: sTitleDraft,
            mode: sModeDraft,
            query: sQueryDraft,
            axes: sAxesDraft,
            display: sDisplayDraft,
            time: sTimeDraft,
        }),
        [
            sAxesDraft,
            sDisplayDraft,
            sInitialEditorConfig,
            sModeDraft,
            sQueryDraft,
            sTimeDraft,
            sTitleDraft,
        ],
    );
    const sEditorConfigRef = useRef(sEditorConfig);
    sEditorConfigRef.current = sEditorConfig;
    const sEditorConfigKey = useMemo(
        () => createEditorConfigDirtyKey(sEditorConfig),
        [sEditorConfig],
    );
    const sHasInvalidStructuralEditorValues = hasInvalidEditorStructure(
        sEditorConfig.axes,
        sEditorConfig.display,
    );
    const sHasInvalidEditorValues =
        sHasInvalidStructuralEditorValues || sHasInvalidTimeRangeInput;
    const sIsNumericXAxis = shouldUseNumericPanelRangeInput(
        sEditorConfig.query.tagSet,
    );
    const sHasEditorChanges = sEditorConfigKey !== sAppliedEditorConfigKey;
    const sCanApplyEditorChanges = sHasEditorChanges && !sHasInvalidEditorValues;
    const sStatusMessage = sSaveMessage ??
        (sHasEditorChanges
            ? 'Press Apply to apply this session only.'
            : undefined);
    const sShowRuntimeSaveMessage =
        !sStatusMessage && sHasAppliedUnsavedChanges;
    const sHasStatusMessage = Boolean(sStatusMessage) || sShowRuntimeSaveMessage;
    const sApplyButtonTitle = !sHasEditorChanges
        ? 'There are no changes to apply'
        : sHasInvalidEditorValues
        ? 'Fix invalid values before applying'
        : undefined;
    const sEditorClassName = [
        styles.editor,
        pAnimationState === 'closing'
            ? styles.editorClosing
            : styles.editorOpening,
    ].join(' ');

    const applyEditorChanges = () => {
        if (!sCanApplyEditorChanges) {
            return;
        }

        setSaveMessage(undefined);
        pOnApplyEditorConfig(sEditorConfig);
        sAppliedEditorConfigKeyRef.current = sEditorConfigKey;
        setAppliedEditorConfigKey(sEditorConfigKey);
        setHasAppliedUnsavedChanges(true);
    };

    const saveEditorChanges = async () => {
        if (sIsSaving) {
            return;
        }

        if (sHasInvalidTimeRangeInput) {
            Toast.error('Please check the entered time.');
            return;
        }

        if (sHasInvalidStructuralEditorValues) {
            return;
        }

        setIsSaving(true);
        setSaveMessage(undefined);
        const sDidSave = await pOnSaveEditorConfig(sEditorConfig).finally(() =>
            setIsSaving(false),
        );

        if (!sDidSave) {
            sAppliedEditorConfigKeyRef.current = sEditorConfigKey;
            setAppliedEditorConfigKey(sEditorConfigKey);
            setHasAppliedUnsavedChanges(true);
            return;
        }

        sAppliedEditorConfigKeyRef.current = sEditorConfigKey;
        setAppliedEditorConfigKey(sEditorConfigKey);
        setHasAppliedUnsavedChanges(false);
        setSaveMessage('Saved to TAZ.');
        pOnClose();
    };

    const discardEditorChanges = () => {
        setEditorDraft(sInitialEditorConfig);
        pOnClose();
    };

    function handleEditorAnimationEnd(
        event: AnimationEvent<HTMLDivElement>,
    ): void {
        if (event.currentTarget !== event.target) {
            return;
        }

        if (pAnimationState === 'closing') {
            pOnAnimationEnd();
        }
    }

    useEffect(() => {
        setSaveMessage(undefined);
    }, [sEditorConfigKey]);
    useEffect(() => {
        if (sIsNumericXAxis) {
            setHasInvalidTimeRangeInput(false);
        }
    }, [sIsNumericXAxis]);


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

    function setEditorDraft(config: PanelInfo): void {
        setTitleDraft(config.title);
        setModeDraft(config.mode);
        setQueryDraft(config.query);
        setAxesDraft(config.axes);
        setDisplayDraft(config.display);
        setTimeDraft(config.time);
    }

    function updateTagSet(tagSet: PanelInfo['query']['tagSet']): void {
        setQueryDraft((prev) => ({ ...prev, tagSet }));
    }

    function renderEditorTabContent() {
        if (!sEditorConfig.key) {
            throw new Error('Panel editor requires a panel index key.');
        }

        switch (sSelectedTab) {
            case EditTabPanelType.General:
                return (
                    <EditorGeneralTab
                        pTitle={sTitleDraft}
                        pModeConfig={sModeDraft}
                        pDisplayConfig={sDisplayDraft}
                        pTimeConfig={sTimeDraft}
                        pIsRawMode={pIsRawMode}
                        pOnChangeTitle={setTitleDraft}
                        pOnChangeModeConfig={setModeDraft}
                        pOnChangeDisplayConfig={setDisplayDraft}
                        pOnChangeTimeConfig={setTimeDraft}
                    />
                );
            case EditTabPanelType.Data:
                return (
                    <EditorDataTab
                        pQueryDraft={sQueryDraft}
                        pIsRawMode={pIsRawMode}
                        pOnChangeQueryDraft={setQueryDraft}
                    />
                );
            case EditTabPanelType.Axes:
                return (
                    <EditorAxesTab
                        pAxesConfig={sEditorConfig.axes}
                        pTagSet={sEditorConfig.query.tagSet}
                        pOnChangeAxesConfig={setAxesDraft}
                        pOnChangeTagSet={updateTagSet}
                    />
                );
            case EditTabPanelType.DataSetting:
                return (
                    <EditorDataSettingTab
                        pDisplayConfig={sEditorConfig.display}
                        pIsRawMode={pIsRawMode}
                        pIsNumericXAxis={sIsNumericXAxis}
                        pOnChangeDisplayConfig={setDisplayDraft}
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
                        pIsNumericXAxis={sIsNumericXAxis}
                        pPanelRange={pPanelRange}
                        pOnChangeTimeConfig={setTimeDraft}
                        pOnInvalidTimeInputChange={setHasInvalidTimeRangeInput}
                    />
                );
            default:
                throw new Error(`Unsupported panel editor tab: ${sSelectedTab}`);
        }
    }

    return (
        <div
            className={sEditorClassName}
            onAnimationEnd={handleEditorAnimationEnd}
        >
            <Page className={styles.editorPage}>
                <Page.Header>
                    <div className={styles.header}>
                        <div className={styles.headerMain}>
                            <h3 className={styles.title}>Edit panel</h3>
                            <Page.TabContainer style={{ margin: 0 }}>
                                <Page.TabList className={styles.tabList}>
                                    {Object.values(EditTabPanelType).map((item) => (
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
                                        sSaveMessage && styles.savedMessage,
                                        !sHasStatusMessage && styles.dirtyMessageHidden,
                                    ]
                                        .filter(Boolean)
                                        .join(' ')}
                                >
                                    {sStatusMessage ?? (
                                        <>
                                            <span>Applied to this session only.</span>
                                            <span>Save to TAZ to keep this change.</span>
                                        </>
                                    )}
                                </span>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={discardEditorChanges}
                                >
                                    Close
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    disabled={!sCanApplyEditorChanges}
                                    onClick={applyEditorChanges}
                                >
                                    Apply
                                </Button>
                                <Button
                                    variant="success"
                                    size="sm"
                                    disabled={sHasInvalidStructuralEditorValues || sIsSaving}
                                    onClick={() => void saveEditorChanges()}
                                >
                                    {sIsSaving ? 'Saving' : 'Save'}
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

