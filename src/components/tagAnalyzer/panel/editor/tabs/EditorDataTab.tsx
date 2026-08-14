import { useEffect, useLayoutEffect, useState } from 'react';
import { BiSolidChart, PlusCircle, Close } from '@/assets/icons/Icon';
import { Input, ColorPicker, Button, Dropdown } from '@/design-system/components';
import { Modal } from '@/design-system/components/Modal';
import {
    PanelSeriesEditor,
    X_AXIS_KIND_CHANGE_WARNING,
} from '../../series/PanelSeriesEditor';
import type { PanelInfo } from '../../panelModel';
import type { AxisKind } from '../../../range/rangeModel';
import {
    getPanelSeriesDisplayColor,
    normalizePanelSeriesCalculationMode,
    getSeriesListAxisKind,
    MIXED_X_AXIS_KIND_WARNING,
    TAG_ANALYZER_AGGREGATION_MODE_OPTIONS,
    type PanelSeriesDefinition,
    type RollupTableMap,
    updatePanelSeriesCalculationMode,
} from '../../../seriesModel';
import styles from '../PanelEditorTab.module.scss';
import seriesStyles from '../../series/PanelSeriesEditor.module.scss';

const EditorDataTab = ({
    pQueryDraft,
    pRollupTableList,
    pLockedAxisKind,
    pOnChangeQueryDraft,
    pReportValidity,
    pIsActive,
}: {
    pQueryDraft: PanelInfo['query'];
    pRollupTableList: RollupTableMap;
    pLockedAxisKind: AxisKind | undefined;
    pOnChangeQueryDraft: (queryDraft: PanelInfo['query']) => void;
    pReportValidity: (tab: 'Data', isValid: boolean, message?: string) => void;
    pIsActive: boolean;
}) => {
    const [sSeriesDraft, setSeriesDraft] = useState<
        PanelSeriesDefinition[] | undefined
    >();
    const [sSeriesFooterMessage, setSeriesFooterMessage] =
        useState<string | undefined>();
    const sDraftAxisKind = getSeriesListAxisKind(pQueryDraft.tagSet);
    const sValidationMessage =
        pQueryDraft.tagSet.length === 0
            ? 'Add at least one series.'
            : sDraftAxisKind === undefined
              ? MIXED_X_AXIS_KIND_WARNING
              : pLockedAxisKind && sDraftAxisKind !== pLockedAxisKind
                ? X_AXIS_KIND_CHANGE_WARNING
              : undefined;
    useLayoutEffect(() => {
        pReportValidity('Data', !sValidationMessage, sValidationMessage);
    }, [pReportValidity, sValidationMessage]);
    useEffect(() => {
        if (!pIsActive) {
            setSeriesDraft(undefined);
            setSeriesFooterMessage(undefined);
        }
    }, [pIsActive]);
    if (!pIsActive) return null;

    const setTagSet = (tagSet: PanelSeriesDefinition[]) => {
        pOnChangeQueryDraft({ ...pQueryDraft, tagSet });
    };

    function closeSeriesModal(): void {
        setSeriesDraft(undefined);
        setSeriesFooterMessage(undefined);
    }

    function applySeriesSelection(): void {
        if (!sSeriesDraft) return;
        const sNextAxisKind = getSeriesListAxisKind(sSeriesDraft);
        if (
            pLockedAxisKind &&
            sNextAxisKind &&
            sNextAxisKind !== pLockedAxisKind
        ) {
            setSeriesFooterMessage(X_AXIS_KIND_CHANGE_WARNING);
            return;
        }
        setTagSet(sSeriesDraft);
        closeSeriesModal();
    }

    return (
        <>
            {pQueryDraft.tagSet.map((item, seriesIndex) => {
                    const sSeriesColor = getPanelSeriesDisplayColor(item, seriesIndex);
                    const updateItem = (nextItem: PanelSeriesDefinition) =>
                        setTagSet(
                            pQueryDraft.tagSet.map((series) =>
                                series.key === item.key ? nextItem : series,
                            ),
                        );
                    const patchItem = (patch: Partial<PanelSeriesDefinition>) =>
                        updateItem({ ...item, ...patch });

                    return (
                        <div
                            key={item.key}
                            role="group"
                            aria-label={`${item.sourceTagName} (${item.table}) series`}
                            className={styles.editorCard}
                        >
                            <div className={styles.editorWrappedRow}>
                                <div
                                    className={styles.editorSeriesIdentity}
                                >
                                    <span
                                        className={styles.editorSeriesTagName}
                                        title={`${item.sourceTagName} (${item.table})`}
                                    >
                                        {item.sourceTagName}
                                    </span>
                                    <div
                                        className={[
                                            styles.editorField,
                                            styles.editorAliasField,
                                        ].join(' ')}
                                    >
                                        <span className={styles.editorFieldLabel}>
                                            Alias
                                        </span>
                                        <Input
                                            aria-label="Alias"
                                            title={item.alias}
                                            value={item.alias}
                                            onChange={(event) =>
                                                patchItem({ alias: event.target.value })
                                            }
                                            size="sm"
                                            className={styles.editorAliasInput}
                                            style={{ height: '30px' }}
                                        />
                                    </div>
                                </div>
                                <div className={styles.editorField}>
                                    <span className={styles.editorFieldLabel}>
                                        Calculation mode
                                    </span>
                                    <div className={styles.editorNarrowControl}>
                                        <Dropdown.Root
                                            options={
                                                TAG_ANALYZER_AGGREGATION_MODE_OPTIONS
                                            }
                                            value={item.calculationMode}
                                            onChange={(value) => {
                                                const sMode =
                                                    normalizePanelSeriesCalculationMode(
                                                        value,
                                                    );
                                                if (sMode) {
                                                    updateItem(
                                                        updatePanelSeriesCalculationMode(
                                                            item,
                                                            sMode,
                                                        ),
                                                    );
                                                }
                                            }}
                                        >
                                            <Dropdown.Trigger
                                                className={
                                                    styles.editorSelectTrigger
                                                }
                                            />
                                            <Dropdown.Menu>
                                                <Dropdown.List />
                                            </Dropdown.Menu>
                                        </Dropdown.Root>
                                    </div>
                                </div>
                                <div
                                    className={[
                                        styles.editorField,
                                        styles.editorColorField,
                                    ].join(' ')}
                                >
                                    <span className={styles.editorFieldLabel}>Color</span>
                                    <div className={styles.editorColorControl}>
                                        <ColorPicker
                                            color={sSeriesColor}
                                            onChange={(color) => patchItem({ color })}
                                            tooltipContent="Color"
                                        />
                                    </div>
                                </div>
                                {pQueryDraft.tagSet.length !== 1 && (
                                    <Button
                                        className={styles.editorSeriesRemoveButton}
                                        size="xsm"
                                        variant="ghost"
                                        icon={
                                            <Close size={16} color="#f8f8f8" />
                                        }
                                        onClick={() =>
                                            setTagSet(
                                                pQueryDraft.tagSet.filter((tag) => tag.key !== item.key),
                                            )
                                        }
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
            {sSeriesDraft && (
                <Modal.Root
                    isOpen
                    onClose={closeSeriesModal}
                    data-testid="editor-series-dialog"
                    style={{ maxWidth: '700px', width: '100%' }}
                >
                    <Modal.Header>
                        <Modal.Title>
                            <span
                                className={seriesStyles.titleIcon}
                                aria-hidden="true"
                            >
                                <BiSolidChart />
                            </span>
                            Edit Series
                        </Modal.Title>
                        <Modal.Close />
                    </Modal.Header>
                    <Modal.Body>
                        <div className={seriesStyles.panelStack}>
                            <PanelSeriesEditor
                                seriesList={sSeriesDraft}
                                rollupTableList={pRollupTableList}
                                lockedAxisKind={pLockedAxisKind}
                                onFooterMessageChange={setSeriesFooterMessage}
                                onSeriesListChange={setSeriesDraft}
                            />
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        {sSeriesFooterMessage ? (
                            <span
                                className={seriesStyles.footerMessage}
                                role="status"
                            >
                                {sSeriesFooterMessage}
                            </span>
                        ) : null}
                        <Modal.Cancel>Cancel</Modal.Cancel>
                        <Modal.Confirm onClick={applySeriesSelection}>
                            Apply
                        </Modal.Confirm>
                    </Modal.Footer>
                </Modal.Root>
            )}
            <Button
                className={styles.editorAddSeriesButton}
                variant="secondary"
                size="sm"
                shadow
                icon={<PlusCircle size={16} />}
                title="Click to add a new series"
                aria-label="Click to add a new series"
                onClick={() => setSeriesDraft([...pQueryDraft.tagSet])}
            >
                Add new series
            </Button>
        </>
    );
};

export default EditorDataTab;
