import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type AnimationEvent,
    type CSSProperties,
} from 'react';
import { Button, Page } from '@/design-system/components';
import InnerLine from '@/assets/image/img_chart_01.png';
import Scatter from '@/assets/image/img_chart_02.png';
import Line from '@/assets/image/img_chart_03.png';
import EditorAxesTab, { hasInvalidEditorAxes } from './editTabs/EditorAxesTab';
import EditorDataSettingTab, {
    hasInvalidEditorPixelsPerTick,
} from './editTabs/EditorDataSettingTab';
import EditorDataTab from './editTabs/EditorDataTab';
import EditorDisplayTab from './editTabs/EditorDisplayTab';
import EditorGeneralTab from './editTabs/EditorGeneralTab';
import EditorTimeTab from './editTabs/EditorTimeTab';
import styles from './PanelEditor.module.scss';
import type {
    PanelAxes,
    PanelDisplay,
    PanelEChartType,
    PanelInfo,
    PanelYAxis,
} from '../../domain/PanelDomain';
import { shouldUseNumericPanelRangeConfig } from '../../domain/SeriesDomain';
import type { TimeRangeMs } from '../../domain/time/model/TimeTypes';
import { fetchAvailableSourceTableNames } from '../../fetch/SourceTableNameFetcher';

export enum EditTabPanelType {
    General = 'General',
    Data = 'Data',
    DataSetting = 'Data Setting',
    Axes = 'Axes',
    Display = 'Display',
    Time = 'Time',
}

export type PanelYAxisDraft = PanelYAxis;

export type PanelSamplingDraft = PanelDisplay['mainChartSampling'];

export type PanelAxesDraft = PanelAxes;

export type PanelDisplayDraft = PanelDisplay;

export type PanelEditorConfig = PanelInfo;

export type PanelEditorAnimationState = 'opening' | 'closing';

type ChartTypeOption = {
    type: PanelEChartType;
    src?: string;
    alt: string;
};

export const EDITOR_X_AXIS_INPUT_STYLE: CSSProperties = {
    width: '96px',
    height: '30px',
};

export const EDITOR_AXIS_COMPACT_INPUT_STYLE: CSSProperties = {
    width: '48px',
};

export const EDITOR_AXIS_THRESHOLD_INPUT_STYLE: CSSProperties = {
    width: '80px',
};

export const EDITOR_RIGHT_AXIS_TRIGGER_STYLE: CSSProperties = {
    width: '200px',
};

export const CHART_TYPE_OPTIONS: ChartTypeOption[] = [
    { type: 'Zone', src: InnerLine, alt: 'Zone Chart' },
    { type: 'Dot', src: Scatter, alt: 'Dot Chart' },
    { type: 'Line', src: Line, alt: 'Line Chart' },
    { type: 'Custom', alt: 'Custom Chart' },
];

export const parseEditorNumber = (value: string): number | undefined => {
    return value === '' ? undefined : Number(value);
};

function normalizeConfigForDirtyCheck(
    config: PanelEditorConfig,
): PanelEditorConfig {
    return {
        ...config,
        timeRange: {
            ...config.timeRange,
            lastViewedRange: undefined,
        },
    };
}

function createEditorConfigDirtyKey(config: PanelEditorConfig): string {
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
    pOnApplyEditorConfig: (editorConfig: PanelEditorConfig) => void;
    pOnSaveEditorConfig: (editorConfig: PanelEditorConfig) => Promise<boolean>;
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
    const [sTimeRangeDraft, setTimeRangeDraft] = useState(
        sInitialEditorConfig.timeRange,
    );
    const [sAppliedEditorConfigKey, setAppliedEditorConfigKey] = useState(
        sInitialEditorConfigKey,
    );
    const [sHasAppliedUnsavedChanges, setHasAppliedUnsavedChanges] =
        useState(false);
    const [sSaveMessage, setSaveMessage] = useState<string | undefined>(undefined);
    const [sIsSaving, setIsSaving] = useState(false);
    const sAppliedEditorConfigKeyRef = useRef(sInitialEditorConfigKey);
    const [sAvailableSourceTableNames, setAvailableSourceTableNames] = useState<string[]>([]);
    const sEditorConfig = useMemo<PanelEditorConfig>(
        () => ({
            ...sInitialEditorConfig,
            title: sTitleDraft,
            mode: sModeDraft,
            query: sQueryDraft,
            axes: sAxesDraft,
            display: sDisplayDraft,
            timeRange: sTimeRangeDraft,
        }),
        [
            sAxesDraft,
            sDisplayDraft,
            sInitialEditorConfig,
            sModeDraft,
            sQueryDraft,
            sTimeRangeDraft,
            sTitleDraft,
        ],
    );
    const sEditorConfigRef = useRef(sEditorConfig);
    sEditorConfigRef.current = sEditorConfig;
    const sEditorConfigKey = useMemo(
        () => createEditorConfigDirtyKey(sEditorConfig),
        [sEditorConfig],
    );
    const sHasInvalidAxisRange = hasInvalidEditorAxes(
        sEditorConfig.axes,
        sEditorConfig.display.mainChartSampling,
    );
    const sHasInvalidPixelsPerTick = hasInvalidEditorPixelsPerTick(
        sEditorConfig.display,
    );
    const sHasInvalidEditorValues =
        sHasInvalidAxisRange || sHasInvalidPixelsPerTick;
    const sIsNumericXAxis = shouldUseNumericPanelRangeConfig(
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
        if (sHasInvalidEditorValues || sIsSaving) {
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
        setTitleDraft(config.title);
        setModeDraft(config.mode);
        setQueryDraft(config.query);
        setAxesDraft(config.axes);
        setDisplayDraft(config.display);
        setTimeRangeDraft(config.timeRange);
    }

    function updateTagSet(tagSet: PanelEditorConfig['query']['tagSet']): void {
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
                        pTimeRangeConfig={sTimeRangeDraft}
                        pIsRawMode={pIsRawMode}
                        pOnChangeTitle={setTitleDraft}
                        pOnChangeModeConfig={setModeDraft}
                        pOnChangeDisplayConfig={setDisplayDraft}
                        pOnChangeTimeRangeConfig={setTimeRangeDraft}
                    />
                );
            case EditTabPanelType.Data:
                return (
                    <EditorDataTab
                        pQueryDraft={sQueryDraft}
                        pIsRawMode={pIsRawMode}
                        pOnChangeQueryDraft={setQueryDraft}
                        pAvailableSourceTableNames={sAvailableSourceTableNames}
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
                        pTimeConfig={sEditorConfig.timeRange}
                        pIsNumericXAxis={sIsNumericXAxis}
                        pPanelRange={pPanelRange}
                        pOnChangeTimeConfig={setTimeRangeDraft}
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
                                    disabled={sHasInvalidEditorValues || sIsSaving}
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

