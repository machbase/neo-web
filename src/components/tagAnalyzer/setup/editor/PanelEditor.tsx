import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Button,
    Page,
} from '@/design-system/components';
import EditorAxesTab from './tabs/EditorAxesTab';
import EditorDataSettingTab, {
    type PanelDataLoadMetrics,
} from './tabs/EditorDataSettingTab';
import EditorDataTab from './tabs/EditorDataTab';
import EditorDisplayTab from './tabs/EditorDisplayTab';
import EditorGeneralTab from './tabs/EditorGeneralTab';
import EditorTimeTab from './tabs/EditorTimeTab';
import { cx, hasInvalidEditorStructure } from './tabs/EditorFieldUtils';
import styles from './PanelEditor.module.scss';
import type { PanelInfo } from '../../model';
import {
    shouldUseNumericPanelRangeInput,
    type RollupTableMap,
} from '../../seriesModel';
import type { AxisRange } from '../../range/rangeModel';
import { normalizePanelRangeInputForAxis } from '../../range/format/rangeFormat';

enum PanelEditorTab {
    General = 'General',
    Data = 'Data',
    DataSetting = 'Data Setting',
    Axes = 'Axes',
    Display = 'Display',
    PanelRange = 'Panel Range',
}

type PanelEditorAnimationState = 'opening' | 'closing';
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
    pOnAnimationEnd,
    pAnimationState,
    pPanelInfo,
    pIsRawMode,
    pHasUnsavedBoardChanges,
    pPanelRange,
    pDataRange,
    pRollupTableList,
    pDataSettingMetrics,
}: {
    pOnApplyEditorConfig: (editorConfig: PanelInfo) => void;
    pOnClose: () => void;
    pOnAnimationEnd: () => void;
    pAnimationState: PanelEditorAnimationState;
    pPanelInfo: PanelInfo;
    pIsRawMode: boolean;
    pHasUnsavedBoardChanges: boolean;
    pPanelRange: AxisRange;
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
    const sIsNumericXAxis = shouldUseNumericPanelRangeInput(
        sEditorConfig.query.tagSet,
    );
    const sOriginalIsNumericXAxis = shouldUseNumericPanelRangeInput(
        pPanelInfo.query.tagSet,
    );
    const sNormalizedRangeInput = normalizePanelRangeInputForAxis(
        sEditorConfig.time.rangeInput,
        sIsNumericXAxis,
        pDataRange,
    );
    const sUsesOriginalRangeInput =
        sEditorConfig.time.rangeInput.start ===
            pPanelInfo.time.rangeInput.start &&
        sEditorConfig.time.rangeInput.end === pPanelInfo.time.rangeInput.end;
    const sClearsRangeAfterAxisKindChange =
        sNormalizedRangeInput === undefined &&
        sIsNumericXAxis !== sOriginalIsNumericXAxis &&
        sUsesOriginalRangeInput;
    const sRangeInputToApply =
        sNormalizedRangeInput ??
        (sClearsRangeAfterAxisKindChange ? EMPTY_RANGE_INPUT : undefined);
    const sTimeConfigForEditor = sClearsRangeAfterAxisKindChange
        ? { ...sEditorConfig.time, rangeInput: EMPTY_RANGE_INPUT }
        : sEditorConfig.time;
    const sHasInvalidEditorValues =
        hasInvalidEditorStructure(
            sEditorConfig.axes,
            sEditorConfig.display,
        ) || sRangeInputToApply === undefined;
    const sHasEditorChanges = sEditorConfigKey !== sAppliedEditorConfigKey;
    const sCanApplyEditorChanges = sHasEditorChanges && !sHasInvalidEditorValues;
    const applyEditorChanges = () => {
        if (!sCanApplyEditorChanges || !sRangeInputToApply) {
            return;
        }

        pOnApplyEditorConfig({
            ...sEditorConfig,
            time: {
                ...sEditorConfig.time,
                rangeInput: sRangeInputToApply,
            },
        });
        sAppliedEditorConfigKeyRef.current = sEditorConfigKey;
        setAppliedEditorConfigKey(sEditorConfigKey);
    };

    const discardEditorChanges = () => {
        resetEditorDraft(pPanelInfo);
        pOnClose();
    };

    useEffect(() => {
        const sPreviousAppliedEditorConfigKey =
            sAppliedEditorConfigKeyRef.current;

        sAppliedEditorConfigKeyRef.current = sInitialEditorConfigKey;
        setAppliedEditorConfigKey(sInitialEditorConfigKey);

        if (
            createEditorChangeKey(sEditorConfigRef.current) ===
            sPreviousAppliedEditorConfigKey
        ) {
            resetEditorDraft(pPanelInfo);
        }
    }, [pPanelInfo, sInitialEditorConfigKey]);

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
                        pIsRawMode={pIsRawMode}
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
                return (
                    <EditorDataSettingTab
                        pDisplayConfig={sEditorConfig.display}
                        pDataMetrics={pDataSettingMetrics}
                        pIsRawMode={pIsRawMode}
                        pIsNumericXAxis={sIsNumericXAxis}
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
            case PanelEditorTab.PanelRange:
                return (
                    <EditorTimeTab
                        pTimeConfig={sTimeConfigForEditor}
                        pIsNumericXAxis={sIsNumericXAxis}
                        pIsRangeInputValid={
                            sRangeInputToApply !== undefined
                        }
                        pPanelRange={pPanelRange}
                        pOnChangeTimeConfig={updateEditorDraft('time')}
                    />
                );
            default:
                throw new Error(`Unsupported panel editor tab: ${sSelectedTab}`);
        }
    }

    return (
        <div
            className={cx(
                styles.editor,
                pAnimationState === 'closing'
                    ? styles.editorClosing
                    : styles.editorOpening,
            )}
            onAnimationEnd={(event) => {
                if (
                    event.currentTarget === event.target &&
                    pAnimationState === 'closing'
                ) {
                    pOnAnimationEnd();
                }
            }}
        >
            <Page className={styles.editorPage}>
                <Page.Header>
                    <div className={styles.header}>
                        <div className={styles.headerMain}>
                            <h3 className={styles.title}>Edit panel</h3>
                            <Page.TabContainer style={{ margin: 0 }}>
                                <Page.TabList className={styles.tabList}>
                                    {Object.values(PanelEditorTab).map((item) => (
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
                                title={
                                    !sHasEditorChanges
                                        ? 'There are no changes to apply'
                                        : sHasInvalidEditorValues
                                        ? 'Fix invalid values before applying'
                                        : undefined
                                }
                                className={styles.buttonRow}
                            >
                                <span
                                    className={cx(
                                        styles.notAppliedMessage,
                                        !sHasEditorChanges &&
                                            !pHasUnsavedBoardChanges &&
                                            styles.notAppliedMessageHidden,
                                    )}
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

