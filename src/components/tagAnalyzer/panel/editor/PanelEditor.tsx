import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Button,
    Page,
} from '@/design-system/components';
import EditorAxesTab from './tabs/EditorAxesTab';
import EditorDataSettingTab from './tabs/EditorDataSettingTab';
import EditorDataTab from './tabs/EditorDataTab';
import EditorDisplayTab from './tabs/EditorDisplayTab';
import EditorGeneralTab from './tabs/EditorGeneralTab';
import EditorTimeTab from './tabs/EditorTimeTab';
import {
    validateAxesTab,
    validateDataSettingTab,
    validateDataTab,
    validateDisplayTab,
    validateGeneralTab,
    validateMainRangeTab,
} from './tabs/tabValidation';
import styles from './PanelEditor.module.scss';
import { type PanelInfo } from '../panelModel';
import type { PanelDataLoadMetrics } from '../internal/panelData';
import {
    getSeriesListAxisKind,
    type RollupTableMap,
} from '../../seriesModel';
import { type AxisRange } from '../../range/rangeModel';

enum PanelEditorTab {
    General = 'General',
    Data = 'Data',
    DataSetting = 'Data Setting',
    Axes = 'Axes',
    Display = 'Display',
    MainRange = 'Main Range',
}

const PANEL_EDITOR_TAB_TEST_IDS: Record<PanelEditorTab, string> = {
    [PanelEditorTab.General]: 'editor-tab-general',
    [PanelEditorTab.Data]: 'editor-tab-data',
    [PanelEditorTab.DataSetting]: 'editor-tab-data-setting',
    [PanelEditorTab.Axes]: 'editor-tab-axes',
    [PanelEditorTab.Display]: 'editor-tab-display',
    [PanelEditorTab.MainRange]: 'editor-tab-main-range',
};

const EMPTY_RANGE_INPUT = { start: '', end: '' };
type PanelEditorDraft = Pick<
    PanelInfo,
    'title' | 'mode' | 'query' | 'axes' | 'display' | 'time'
>;

function createEditorDraft(config: PanelInfo): PanelEditorDraft {
    const { title, mode, query, axes, display, time } = config;
    return { title, mode, query, axes, display, time };
}

function createEditorChangeKey(config: PanelInfo): string {
    const { time, ...draft } = createEditorDraft(config);
    return JSON.stringify({
        key: config.key,
        ...draft,
        highlights: config.highlights,
        annotations: config.annotations,
        time: { ...time, lastViewedRange: undefined },
    });
}

const PanelEditor = ({
    pOnApplyEditorConfig,
    pOnClose,
    pIsOpen,
    pPanelInfo,
    pHasUnsavedBoardChanges,
    pMainRange,
    pDataRange,
    pRollupTableList,
    pDataSettingMetrics,
}: {
    pOnApplyEditorConfig: (editorConfig: PanelInfo) => void;
    pOnClose: () => void;
    pIsOpen: boolean;
    pPanelInfo: PanelInfo;
    pHasUnsavedBoardChanges: boolean;
    pMainRange: AxisRange;
    pDataRange: AxisRange;
    pRollupTableList: RollupTableMap;
    pDataSettingMetrics: PanelDataLoadMetrics;
}) => {
    const sInitialEditorConfigKey = useMemo(
        () => createEditorChangeKey(pPanelInfo),
        [pPanelInfo],
    );
    const [sSelectedTab, setSelectedTab] = useState<PanelEditorTab>(
        PanelEditorTab.General,
    );
    const [sEditorDraft, setEditorDraft] = useState(() =>
        createEditorDraft(pPanelInfo),
    );
    const {
        title: sTitleDraft,
        mode: sModeDraft,
        query: sQueryDraft,
        display: sDisplayDraft,
        time: sTimeDraft,
    } = sEditorDraft;
    const [sAppliedEditorConfigKey, setAppliedEditorConfigKey] = useState(
        sInitialEditorConfigKey,
    );
    const sAppliedEditorConfigKeyRef = useRef(sInitialEditorConfigKey);
    const sEditorConfig = useMemo<PanelInfo>(
        () => ({ ...pPanelInfo, ...sEditorDraft }),
        [pPanelInfo, sEditorDraft],
    );
    const sEditorConfigRef = useRef(sEditorConfig);
    sEditorConfigRef.current = sEditorConfig;
    const sEditorConfigKey = useMemo(
        () => createEditorChangeKey(sEditorConfig),
        [sEditorConfig],
    );
    const sAxisKind = getSeriesListAxisKind(
        sEditorConfig.query.tagSet,
    );
    const sOriginalAxisKind = getSeriesListAxisKind(
        pPanelInfo.query.tagSet,
    );
    const sRangeInput = sEditorConfig.time.rangeInput;
    const sRangeValidationMessage = validateMainRangeTab(
        sRangeInput,
        sAxisKind,
        pDataRange,
        pMainRange,
    );
    const sUsesOriginalRangeInput =
        sEditorConfig.time.rangeInput.start ===
            pPanelInfo.time.rangeInput.start &&
        sEditorConfig.time.rangeInput.end === pPanelInfo.time.rangeInput.end;
    const sClearsRangeAfterAxisKindChange =
        sAxisKind !== undefined &&
        sOriginalAxisKind !== undefined &&
        sRangeValidationMessage !== undefined &&
        sAxisKind !== sOriginalAxisKind &&
        sUsesOriginalRangeInput;
    const sRangeInputToApply =
        sRangeValidationMessage === undefined
            ? sRangeInput
            : sClearsRangeAfterAxisKindChange
              ? EMPTY_RANGE_INPUT
              : undefined;
    const sTimeConfigForEditor = sClearsRangeAfterAxisKindChange
        ? { ...sEditorConfig.time, rangeInput: EMPTY_RANGE_INPUT }
        : sEditorConfig.time;
    const sTabValidation: Record<PanelEditorTab, string | undefined> = {
        [PanelEditorTab.General]: validateGeneralTab(sEditorConfig.title),
        [PanelEditorTab.Data]: validateDataTab(sEditorConfig.query.tagSet),
        [PanelEditorTab.DataSetting]: validateDataSettingTab(
            sEditorConfig.display,
        ),
        [PanelEditorTab.Axes]: validateAxesTab(sEditorConfig.axes),
        [PanelEditorTab.Display]: validateDisplayTab(sEditorConfig.display),
        [PanelEditorTab.MainRange]:
            sRangeInputToApply === undefined
                ? sRangeValidationMessage
                : undefined,
    };
    const sValidationMessage = Object.values(sTabValidation).find(
        (message) => message !== undefined,
    );
    const sHasInvalidEditorValues = sValidationMessage !== undefined;
    const sHasEditorChanges = sEditorConfigKey !== sAppliedEditorConfigKey;
    const sCanApplyEditorChanges = sHasEditorChanges && !sHasInvalidEditorValues;
    const applyEditorChanges = () => {
        if (!sCanApplyEditorChanges || !sRangeInputToApply) {
            return;
        }

        const sConfiguredRangeIsUnchanged =
            sRangeInputToApply.start === pPanelInfo.time.rangeInput.start &&
            sRangeInputToApply.end === pPanelInfo.time.rangeInput.end;
        pOnApplyEditorConfig({
            ...sEditorConfig,
            query: {
                ...sEditorConfig.query,
                tagSet: sEditorConfig.axes.rightY.enabled
                    ? sEditorConfig.query.tagSet
                    : sEditorConfig.query.tagSet.map((series) => ({
                          ...series,
                          useSecondaryAxis: false,
                      })),
            },
            time: {
                ...sEditorConfig.time,
                rangeInput: sRangeInputToApply,
                lastViewedRange:
                    sEditorConfig.time.useLastViewedRange &&
                    sConfiguredRangeIsUnchanged
                        ? sEditorConfig.time.lastViewedRange
                        : undefined,
            },
        });
        sAppliedEditorConfigKeyRef.current = sEditorConfigKey;
        setAppliedEditorConfigKey(sEditorConfigKey);
    };

    useEffect(() => {
        const sPreviousAppliedEditorConfigKey =
            sAppliedEditorConfigKeyRef.current;

        sAppliedEditorConfigKeyRef.current = sInitialEditorConfigKey;
        setAppliedEditorConfigKey(sInitialEditorConfigKey);

        if (
            !pIsOpen ||
            createEditorChangeKey(sEditorConfigRef.current) ===
                sPreviousAppliedEditorConfigKey
        ) {
            resetEditorDraft(pPanelInfo);
        }
        if (!pIsOpen) {
            setSelectedTab(PanelEditorTab.General);
        }
    }, [pIsOpen, pPanelInfo, sInitialEditorConfigKey]);

    function resetEditorDraft(config: PanelInfo): void {
        setEditorDraft(createEditorDraft(config));
    }

    function updateEditorDraft<K extends keyof PanelEditorDraft>(
        field: K,
    ): (value: PanelEditorDraft[K]) => void {
        return (value) =>
            setEditorDraft((draft) => ({ ...draft, [field]: value }));
    }

    function updateTagSet(tagSet: PanelInfo['query']['tagSet']): void {
        setEditorDraft((draft) => ({
            ...draft,
            query: { ...draft.query, tagSet },
        }));
    }

    function renderEditorTabContent() {
        if (!sEditorConfig.key) {
            throw new Error('Panel editor requires a panel index key.');
        }

        switch (sSelectedTab) {
            case PanelEditorTab.General:
                return (
                    <EditorGeneralTab
                        pTitle={sTitleDraft}
                        pModeConfig={sModeDraft}
                        pDisplayConfig={sDisplayDraft}
                        pTimeConfig={sTimeDraft}
                        pOnChangeTitle={updateEditorDraft('title')}
                        pOnChangeModeConfig={updateEditorDraft('mode')}
                        pOnChangeDisplayConfig={updateEditorDraft('display')}
                        pOnChangeTimeConfig={updateEditorDraft('time')}
                    />
                );
            case PanelEditorTab.Data:
                return (
                    <EditorDataTab
                        pQueryDraft={sQueryDraft}
                        pRollupTableList={pRollupTableList}
                        pOnChangeQueryDraft={updateEditorDraft('query')}
                    />
                );
            case PanelEditorTab.Axes:
                return (
                    <EditorAxesTab
                        pAxesConfig={sEditorConfig.axes}
                        pTagSet={sEditorConfig.query.tagSet}
                        pOnChangeAxesConfig={updateEditorDraft('axes')}
                        pOnChangeTagSet={updateTagSet}
                    />
                );
            case PanelEditorTab.DataSetting:
                if (
                    sTabValidation[PanelEditorTab.Data] ||
                    sAxisKind === undefined
                ) {
                    return (
                        <span className={styles.fieldError}>
                            {sTabValidation[PanelEditorTab.Data]}
                        </span>
                    );
                }
                return (
                    <EditorDataSettingTab
                        pDisplayConfig={sEditorConfig.display}
                        pDataMetrics={pDataSettingMetrics}
                        pIsRawMode={sModeDraft.isRaw}
                        pAxisKind={sAxisKind}
                        pOnChangeDisplayConfig={updateEditorDraft('display')}
                    />
                );
            case PanelEditorTab.Display:
                return (
                    <EditorDisplayTab
                        pDisplayConfig={sEditorConfig.display}
                        pOnChangeDisplayConfig={updateEditorDraft('display')}
                    />
                );
            case PanelEditorTab.MainRange:
                if (
                    sTabValidation[PanelEditorTab.Data] ||
                    sAxisKind === undefined
                ) {
                    return (
                        <span className={styles.fieldError}>
                            {sTabValidation[PanelEditorTab.Data]}
                        </span>
                    );
                }
                return (
                    <EditorTimeTab
                        pTimeConfig={sTimeConfigForEditor}
                        pAxisKind={sAxisKind}
                        pValidationMessage={
                            sTabValidation[PanelEditorTab.MainRange]
                        }
                        pMainRange={pMainRange}
                        pOnChangeTimeConfig={updateEditorDraft('time')}
                    />
                );
            default:
                throw new Error(`Unsupported panel editor tab: ${sSelectedTab}`);
        }
    }

    return (
        <div
            data-testid="editor"
            data-state={pIsOpen ? 'open' : 'closed'}
            aria-hidden={!pIsOpen}
            {...(!pIsOpen && { inert: '' })}
            className={styles.editor}
        >
            <Page className={styles.editorPage}>
                <Page.Header>
                    <div className={styles.header}>
                        <div className={styles.headerMain}>
                            <h3 className={styles.title}>Edit panel</h3>
                            <Page.TabContainer style={{ margin: 0 }}>
                                <Page.TabList className={styles.tabList}>
                                    {Object.values(PanelEditorTab).map((item) => {
                                        const sTabValidationMessage =
                                            sTabValidation[item];
                                        return (
                                            <Page.TabItem
                                                key={item}
                                                active={sSelectedTab === item}
                                                className={
                                                    sTabValidationMessage
                                                        ? styles.invalidTab
                                                        : undefined
                                                }
                                                onClick={() => setSelectedTab(item)}
                                            >
                                                <button
                                                    type="button"
                                                    className={styles.tabButton}
                                                    data-testid={
                                                        PANEL_EDITOR_TAB_TEST_IDS[
                                                            item
                                                        ]
                                                    }
                                                    aria-pressed={
                                                        sSelectedTab === item
                                                    }
                                                    aria-invalid={
                                                        sTabValidationMessage
                                                            ? true
                                                            : undefined
                                                    }
                                                    aria-label={
                                                        sTabValidationMessage
                                                            ? `${item}, invalid settings`
                                                            : item
                                                    }
                                                    title={
                                                        sTabValidationMessage
                                                            ? `${item}: ${sTabValidationMessage}`
                                                            : undefined
                                                    }
                                                >
                                                    {item}
                                                </button>
                                            </Page.TabItem>
                                        );
                                    })}
                                </Page.TabList>
                            </Page.TabContainer>
                        </div>
                        <div className={styles.actions}>
                            <div
                                title={
                                    !sHasEditorChanges
                                        ? 'There are no changes to apply'
                                        : sValidationMessage
                                }
                                className={styles.buttonRow}
                            >
                                <span
                                    data-testid="editor-status"
                                    className={[
                                        styles.notAppliedMessage,
                                        !sHasEditorChanges &&
                                            !pHasUnsavedBoardChanges &&
                                            styles.notAppliedMessageHidden,
                                    ]
                                        .filter(Boolean)
                                        .join(' ')}
                                >
                                    {sHasEditorChanges ? (
                                        'You have unapplied changes.'
                                    ) : (
                                        <>
                                            <span>Changes applied to this session.</span>
                                            <span>Save to TAZ to keep changes.</span>
                                        </>
                                    )}
                                </span>
                                <Button
                                    data-testid="editor-close"
                                    variant="danger"
                                    size="sm"
                                    onClick={pOnClose}
                                >
                                    Close
                                </Button>
                                <Button
                                    data-testid="editor-apply"
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

