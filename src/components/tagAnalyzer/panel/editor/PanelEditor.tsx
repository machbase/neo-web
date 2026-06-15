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
import type { TimeRangeMs } from '../../domain/time/TimeTypes';
import { fetchAvailableSourceTableNames } from '../../fetch/SourceTableNameFetcher';

export enum EditTabPanelType {
    General = 'General',
    Data = 'Data',
    Axes = 'Axes',
    Display = 'Display',
    Time = 'Time',
}

export type PanelYAxisDraft = PanelYAxis;

export type PanelSamplingDraft = PanelAxes['sampling'];

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
    const [sHasAppliedUnsavedChanges, setHasAppliedUnsavedChanges] =
        useState(false);
    const [sSaveMessage, setSaveMessage] = useState<string | undefined>(undefined);
    const [sIsSaving, setIsSaving] = useState(false);
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
    const sHasInvalidAxisRange = hasInvalidEditorAxes(sEditorConfig.axes);
    const sHasEditorChanges = sEditorConfigKey !== sAppliedEditorConfigKey;
    const sCanApplyEditorChanges = sHasEditorChanges && !sHasInvalidAxisRange;
    const sStatusMessage = sSaveMessage ??
        (sHasEditorChanges
            ? 'Press Apply to apply this session only.'
            : undefined);
    const sShowRuntimeSaveMessage =
        !sStatusMessage && sHasAppliedUnsavedChanges;
    const sHasStatusMessage = Boolean(sStatusMessage) || sShowRuntimeSaveMessage;
    const sApplyButtonTitle = !sHasEditorChanges
        ? 'There are no changes to apply'
        : sHasInvalidAxisRange
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
        if (sHasInvalidAxisRange || sIsSaving) {
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
                        pIsRawMode={pIsRawMode}
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
                        pPanelRange={pPanelRange}
                        pOnChangeTimeConfig={setTimeDraft}
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
                                    disabled={sHasInvalidAxisRange || sIsSaving}
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

