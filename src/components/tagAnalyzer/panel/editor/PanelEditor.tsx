import { useMemo, useState } from 'react';
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

import { PANEL_EDITOR_TABS, validatePanelEditorDraft, type PanelEditorTab } from './editorValidation';
import { Inline, Stack, Text } from '../../ui/Presentation';

export default function PanelEditor({
    pOnApplyEditorConfig,
    pOnClose,
    pPanelInfo,
    pHasUnsavedBoardChanges,
    pMainRange,
    pDataRange,
    pRollupTableList,
}: {
    pOnApplyEditorConfig: (editorConfig: PanelInfo) => void;
    pOnClose: () => void;
    pPanelInfo: PanelInfo;
    pHasUnsavedBoardChanges: boolean;
    pMainRange: AxisRange;
    pDataRange: AxisRange;
    pRollupTableList: RollupTableMap;
}) {
    const [sSelectedTab, setSelectedTab] = useState<PanelEditorTab>('General');
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
    const [sAppliedEditorConfigKey, setAppliedEditorConfigKey] = useState(() =>
        createEditorChangeKey(pPanelInfo),
    );
    const sEditorConfig = useMemo<PanelInfo>(
        () => ({ ...pPanelInfo, ...sEditorDraft }),
        [pPanelInfo, sEditorDraft],
    );
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
    const sTabMessages = validatePanelEditorDraft(sEditorConfig, {
        lockedAxisKind: sOriginalAxisKind,
        dataRange: pDataRange,
        mainRange: pMainRange,
        referenceTimeMs: Date.now(),
    });
    const sRangeInput = sEditorConfig.time.rangeInput;
    const sInvalidTab = PANEL_EDITOR_TABS.find(
        (tab) => sTabMessages[tab] !== undefined,
    );
    const sValidationMessage = sInvalidTab
        ? sTabMessages[sInvalidTab]
        : undefined;
    const sHasEditorChanges = sEditorConfigKey !== sAppliedEditorConfigKey;
    const sCanApplyEditorChanges = sHasEditorChanges && !sInvalidTab;
    const applyEditorChanges = () => {
        if (!sCanApplyEditorChanges) {
            return;
        }

        const sConfiguredRangeIsUnchanged =
            sRangeInput.start === pPanelInfo.time.rangeInput.start &&
            sRangeInput.end === pPanelInfo.time.rangeInput.end;
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
                rangeInput: sRangeInput,
                lastViewedRange:
                    sEditorConfig.time.useLastViewedRange &&
                    sConfiguredRangeIsUnchanged
                        ? sEditorConfig.time.lastViewedRange
                        : undefined,
            },
        });
        setAppliedEditorConfigKey(sEditorConfigKey);
    };

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

    return (
        <div
            data-testid="editor"
            data-state="open"
            className={styles.editor}
        >
            <Page className={styles.editorPage}>
                <Inline gap={12} justify="between" wrap className={styles.header}>
                    <Inline gap={12} className={styles.headerMain}>
                        <Text as="h3" variant="title" tone="default" className={styles.headerTitle}>Edit panel</Text>
                        <Inline className={styles.tabContainer}>
                            <Page.TabList className={styles.tabList}>
                                {PANEL_EDITOR_TABS.map((item) => {
                                    const sTabIsInvalid =
                                        sTabMessages[item] !== undefined;
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
                                                        ? `${item}: ${sTabMessages[item]}`
                                                        : undefined
                                                }
                                            >
                                                {item}
                                            </button>
                                        </Page.TabItem>
                                    );
                                })}
                            </Page.TabList>
                        </Inline>
                    </Inline>
                    <Inline
                        title={
                            !sHasEditorChanges
                                ? 'There are no changes to apply'
                                : sValidationMessage
                        }
                        className={styles.actions}
                    >
                        <Text
                            as="div"
                            variant="caption"
                            tone="warning"
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
                                    Changes applied to this session.
                                    <br />
                                    Save to TAZ to keep changes.
                                </>
                            )}
                        </Text>
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
                    </Inline>
                </Inline>

                <Stack className={styles.content}>
                    <EditorGeneralTab
                        pTitle={sTitleDraft}
                        pModeConfig={sModeDraft}
                        pDisplayConfig={sDisplayDraft}
                        pTimeConfig={sTimeDraft}
                        pOnChangeTitle={updateEditorDraft('title')}
                        pOnChangeModeConfig={updateEditorDraft('mode')}
                        pOnChangeDisplayConfig={updateEditorDraft('display')}
                        pOnChangeTimeConfig={updateEditorDraft('time')}
                        pIsActive={sSelectedTab === 'General'}
                    />
                    <EditorDataTab
                        pQueryDraft={sQueryDraft}
                        pRollupTableList={pRollupTableList}
                        pLockedAxisKind={sOriginalAxisKind}
                        pOnChangeQueryDraft={updateEditorDraft('query')}
                        pIsActive={sSelectedTab === 'Data'}
                    />
                    <EditorDataSettingTab
                        pDisplayConfig={sEditorConfig.display}
                        pIsRawMode={sModeDraft.isRaw}
                        pAxisKind={sAxisKind}
                        pDataValidationMessage={sTabMessages.Data}
                        pOnChangeDisplayConfig={updateEditorDraft('display')}
                        pIsActive={sSelectedTab === 'Data Setting'}
                    />
                    <EditorAxesTab
                        pAxesConfig={sEditorConfig.axes}
                        pTagSet={sEditorConfig.query.tagSet}
                        pOnChangeAxesConfig={updateEditorDraft('axes')}
                        pOnChangeTagSet={updateTagSet}
                        pIsActive={sSelectedTab === 'Axes'}
                    />
                    <EditorDisplayTab
                        pDisplayConfig={sEditorConfig.display}
                        pOnChangeDisplayConfig={updateEditorDraft('display')}
                        pIsActive={sSelectedTab === 'Display'}
                    />
                    <EditorTimeTab
                        pTimeConfig={sEditorConfig.time}
                        pAxisKind={sAxisKind}
                        pDataRange={pDataRange}
                        pIsValid={sTabMessages['Main Range'] === undefined}
                        pDataValidationMessage={sTabMessages.Data}
                        pOnChangeTimeConfig={updateEditorDraft('time')}
                        pIsActive={sSelectedTab === 'Main Range'}
                    />
                </Stack>
            </Page>
        </div>
    );
}

// -------------------- Local --------------------

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
