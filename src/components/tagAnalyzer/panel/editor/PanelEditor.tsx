import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { type PanelInfo } from '../panelModel';
import {
    getSeriesListAxisKind,
    type RollupTableMap,
} from '../../seriesModel';
import { type AxisRange } from '../../range/rangeModel';

type TabValidity = { isValid: boolean; message?: string };

const PANEL_EDITOR_TABS = [
    'General',
    'Data',
    'Data Setting',
    'Axes',
    'Display',
    'Main Range',
] as const;
type PanelEditorTab = (typeof PANEL_EDITOR_TABS)[number];

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
}: {
    pOnApplyEditorConfig: (editorConfig: PanelInfo) => void;
    pOnClose: () => void;
    pIsOpen: boolean;
    pPanelInfo: PanelInfo;
    pHasUnsavedBoardChanges: boolean;
    pMainRange: AxisRange;
    pDataRange: AxisRange;
    pRollupTableList: RollupTableMap;
}) => {
    const sInitialEditorConfigKey = useMemo(
        () => createEditorChangeKey(pPanelInfo),
        [pPanelInfo],
    );
    const [sSelectedTab, setSelectedTab] = useState<PanelEditorTab>('General');
    const sRenderedTab = pIsOpen ? sSelectedTab : 'General';
    const [sEditorDraft, setEditorDraft] = useState(() =>
        createEditorDraft(pPanelInfo),
    );
    const [sTabValidity, setTabValidity] = useState<
        Partial<Record<PanelEditorTab, TabValidity>>
    >({});
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
    const sRangeIsInvalid =
        sTabValidity['Main Range']?.isValid === false;
    const sRangeInputToApply = sRangeIsInvalid ? undefined : sRangeInput;
    const sInvalidTab = PANEL_EDITOR_TABS.find(
        (tab) => sTabValidity[tab]?.isValid === false,
    );
    const sValidationMessage = sInvalidTab
        ? sTabValidity[sInvalidTab]?.message
        : undefined;
    const sIsEditorValid = PANEL_EDITOR_TABS.every(
        (tab) => sTabValidity[tab]?.isValid === true,
    );
    const sHasEditorChanges = sEditorConfigKey !== sAppliedEditorConfigKey;
    const sCanApplyEditorChanges = sHasEditorChanges && sIsEditorValid;
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
            setSelectedTab('General');
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

    const reportValidity = useCallback(
        (tab: PanelEditorTab, isValid: boolean, message?: string) =>
            setTabValidity((current) => {
                const previous = current[tab];
                return previous?.isValid === isValid &&
                    previous.message === message
                    ? current
                    : { ...current, [tab]: { isValid, message } };
            }),
        [],
    );

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
                                    {PANEL_EDITOR_TABS.map((item) => {
                                        const sTabIsInvalid =
                                            sTabValidity[item]?.isValid === false;
                                        return (
                                            <Page.TabItem
                                                key={item}
                                                active={sSelectedTab === item}
                                                className={
                                                    sTabIsInvalid
                                                        ? styles.invalidTab
                                                        : undefined
                                                }
                                                onClick={() => setSelectedTab(item)}
                                            >
                                                <button
                                                    type="button"
                                                    className={styles.tabButton}
                                                    data-testid={`editor-tab-${item.toLowerCase().replace(' ', '-')}`}
                                                    aria-pressed={
                                                        sSelectedTab === item
                                                    }
                                                    aria-invalid={
                                                        sTabIsInvalid
                                                            ? true
                                                            : undefined
                                                    }
                                                    aria-label={
                                                        sTabIsInvalid
                                                            ? `${item}, invalid settings`
                                                            : item
                                                    }
                                                    title={
                                                        sTabIsInvalid
                                                            ? `${item}: ${sTabValidity[item]?.message}`
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

                <div className={styles.content}>
                    <EditorGeneralTab
                        pTitle={sTitleDraft}
                        pModeConfig={sModeDraft}
                        pDisplayConfig={sDisplayDraft}
                        pTimeConfig={sTimeDraft}
                        pOnChangeTitle={updateEditorDraft('title')}
                        pOnChangeModeConfig={updateEditorDraft('mode')}
                        pOnChangeDisplayConfig={updateEditorDraft('display')}
                        pOnChangeTimeConfig={updateEditorDraft('time')}
                        pReportValidity={reportValidity}
                        pIsActive={sRenderedTab === 'General'}
                    />
                    <EditorDataTab
                        pQueryDraft={sQueryDraft}
                        pRollupTableList={pRollupTableList}
                        pLockedAxisKind={sOriginalAxisKind}
                        pOnChangeQueryDraft={updateEditorDraft('query')}
                        pReportValidity={reportValidity}
                        pIsActive={sRenderedTab === 'Data'}
                    />
                    <EditorDataSettingTab
                        pDisplayConfig={sEditorConfig.display}
                        pIsRawMode={sModeDraft.isRaw}
                        pAxisKind={sAxisKind}
                        pDataValidationMessage={sTabValidity.Data?.message}
                        pOnChangeDisplayConfig={updateEditorDraft('display')}
                        pReportValidity={reportValidity}
                        pIsActive={sRenderedTab === 'Data Setting'}
                    />
                    <EditorAxesTab
                        pAxesConfig={sEditorConfig.axes}
                        pTagSet={sEditorConfig.query.tagSet}
                        pOnChangeAxesConfig={updateEditorDraft('axes')}
                        pOnChangeTagSet={updateTagSet}
                        pReportValidity={reportValidity}
                        pIsActive={sRenderedTab === 'Axes'}
                    />
                    <EditorDisplayTab
                        pDisplayConfig={sEditorConfig.display}
                        pOnChangeDisplayConfig={updateEditorDraft('display')}
                        pReportValidity={reportValidity}
                        pIsActive={sRenderedTab === 'Display'}
                    />
                    <EditorTimeTab
                        pTimeConfig={sEditorConfig.time}
                        pAxisKind={sAxisKind}
                        pDataRange={pDataRange}
                        pMainRange={pMainRange}
                        pDataValidationMessage={sTabValidity.Data?.message}
                        pOnChangeTimeConfig={updateEditorDraft('time')}
                        pReportValidity={reportValidity}
                        pIsActive={sRenderedTab === 'Main Range'}
                    />
                </div>
            </Page>
        </div>
    );
};

export default PanelEditor;

