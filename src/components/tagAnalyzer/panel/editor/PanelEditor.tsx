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
import styles from './PanelEditor.module.scss';
import {
    hasInvalidPanelSettings,
    type PanelInfo,
} from '../panelModel';
import type { PanelDataLoadMetrics } from '../internal/panelData';
import {
    getSeriesListAxisKind,
    MIXED_X_AXIS_KIND_WARNING,
    type RollupTableMap,
} from '../../seriesModel';
import {
    isRangeExpressionEmpty,
    type AxisRange,
} from '../../range/rangeModel';
import { resolveRangeInput } from '../../range/rangeInput';

enum PanelEditorTab {
    General = 'General',
    Data = 'Data',
    DataSetting = 'Data Setting',
    Axes = 'Axes',
    Display = 'Display',
    MainRange = 'Main Range',
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
    pHasUnsavedBoardChanges,
    pMainRange,
    pDataRange,
    pRollupTableList,
    pDataSettingMetrics,
}: {
    pOnApplyEditorConfig: (editorConfig: PanelInfo) => void;
    pOnClose: () => void;
    pOnAnimationEnd: () => void;
    pAnimationState: PanelEditorAnimationState;
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
    const sSeriesValidationMessage =
        sEditorConfig.query.tagSet.length === 0
            ? 'Add at least one series.'
            : sAxisKind === undefined
              ? MIXED_X_AXIS_KIND_WARNING
              : undefined;
    const sRangeInput = sEditorConfig.time.rangeInput;
    const sIsRangeInputEmpty = isRangeExpressionEmpty(sRangeInput);
    const sIsRangeInputValid =
        sAxisKind === undefined ||
        sIsRangeInputEmpty ||
        resolveRangeInput(
            sRangeInput,
            sAxisKind,
            pDataRange,
            pMainRange,
        ) !== undefined;
    const sUsesOriginalRangeInput =
        sEditorConfig.time.rangeInput.start ===
            pPanelInfo.time.rangeInput.start &&
        sEditorConfig.time.rangeInput.end === pPanelInfo.time.rangeInput.end;
    const sClearsRangeAfterAxisKindChange =
        sAxisKind !== undefined &&
        sOriginalAxisKind !== undefined &&
        !sIsRangeInputValid &&
        sAxisKind !== sOriginalAxisKind &&
        sUsesOriginalRangeInput;
    const sRangeInputToApply =
        sIsRangeInputValid
            ? sRangeInput
            : sClearsRangeAfterAxisKindChange
              ? EMPTY_RANGE_INPUT
              : undefined;
    const sTimeConfigForEditor = sClearsRangeAfterAxisKindChange
        ? { ...sEditorConfig.time, rangeInput: EMPTY_RANGE_INPUT }
        : sEditorConfig.time;
    const sValidationMessage =
        sEditorConfig.title.trim() === ''
            ? 'Enter a panel title.'
            : sSeriesValidationMessage ??
              (hasInvalidPanelSettings(
                  sEditorConfig.axes,
                  sEditorConfig.display,
              )
                  ? 'Review the invalid editor settings.'
                  : sRangeInputToApply === undefined
                    ? 'Enter a valid range.'
                    : undefined);
    const sHasInvalidEditorValues = sValidationMessage !== undefined;
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
                if (sAxisKind === undefined) {
                    return (
                        <span className={styles.fieldError}>
                            {sSeriesValidationMessage}
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
                if (sAxisKind === undefined) {
                    return (
                        <span className={styles.fieldError}>
                            {sSeriesValidationMessage}
                        </span>
                    );
                }
                return (
                    <EditorTimeTab
                        pTimeConfig={sTimeConfigForEditor}
                        pAxisKind={sAxisKind}
                        pIsRangeInputValid={
                            sRangeInputToApply !== undefined
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
            className={[
                styles.editor,
                pAnimationState === 'closing'
                    ? styles.editorClosing
                    : styles.editorOpening,
            ]
                .filter(Boolean)
                .join(' ')}
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
                                        : sValidationMessage
                                }
                                className={styles.buttonRow}
                            >
                                <span
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

