import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type AnimationEvent,
} from 'react';
import { Button, Page } from '@/design-system/components';
import EditorAxesTab from './editTabs/EditorAxesTab';
import EditorDataSettingTab from './editTabs/EditorDataSettingTab';
import EditorDataTab from './editTabs/EditorDataTab';
import EditorDisplayTab from './editTabs/EditorDisplayTab';
import EditorGeneralTab from './editTabs/EditorGeneralTab';
import EditorTimeTab from './editTabs/EditorTimeTab';
import { hasInvalidEditorStructure } from './editTabs/EditorFieldUtils';
import styles from './PanelEditor.module.scss';
import type { PanelInfo } from '../../domain/panel/PanelInfo';
import { shouldUseNumericPanelRangeInput } from '../../domain/SeriesDomain';
import type { RollupTableMap } from '../../fetch/panelData/PanelDataFetchTypes';
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

function normalizeConfigForNotAppliedCheck(
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

function createNotAppliedCheckKey(config: PanelInfo): string {
    return JSON.stringify(normalizeConfigForNotAppliedCheck(config));
}

const PanelEditor = ({
    pOnApplyEditorConfig,
    pOnClose,
    pOnAnimationEnd,
    pAnimationState,
    pPanelInfo,
    pIsRawMode,
    pHasUnsavedBoardChanges,
    pPanelRange,
    pRollupTableList,
}: {
    pOnApplyEditorConfig: (editorConfig: PanelInfo) => void;
    pOnClose: () => void;
    pOnAnimationEnd: () => void;
    pAnimationState: PanelEditorAnimationState;
    pPanelInfo: PanelInfo;
    pIsRawMode: boolean;
    pHasUnsavedBoardChanges: boolean;
    pPanelRange: TimeRangeMs;
    pRollupTableList: RollupTableMap;
}) => {
    const sInitialEditorConfig = pPanelInfo;
    const sInitialEditorConfigKey = useMemo(
        () => createNotAppliedCheckKey(sInitialEditorConfig),
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
        () => createNotAppliedCheckKey(sEditorConfig),
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
    const sStatusMessage = sHasEditorChanges
        ? 'Press Apply to apply the change.'
        : undefined;
    const sShowRuntimeSaveMessage = !sStatusMessage && pHasUnsavedBoardChanges;
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

        pOnApplyEditorConfig(sEditorConfig);
        sAppliedEditorConfigKeyRef.current = sEditorConfigKey;
        setAppliedEditorConfigKey(sEditorConfigKey);
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
                createNotAppliedCheckKey(sEditorConfigRef.current) ===
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
                        pRollupTableList={pRollupTableList}
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
                                        styles.notAppliedMessage,
                                        !sHasStatusMessage && styles.notAppliedMessageHidden,
                                    ]
                                        .filter(Boolean)
                                        .join(' ')}
                                >
                                    {sStatusMessage ?? (
                                        <>
                                            <span>Changes applied to this session.</span>
                                            <span>Save to TAZ to keep changes.</span>
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

