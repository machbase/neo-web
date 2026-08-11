import { useState, type CSSProperties } from 'react';
import { BiSolidChart, PlusCircle, Close } from '@/assets/icons/Icon';
import { Input, ColorPicker, Button, Dropdown } from '@/design-system/components';
import { Modal } from '@/design-system/components/Modal';
import { PanelSeriesEditor } from '../../series/PanelSeriesEditor';
import type { PanelInfo } from '../../panelModel';
import { TimeUnit } from '../../../range/intervalResolver';
import {
    getPanelSeriesDisplayColor,
    normalizePanelSeriesCalculationMode,
    TAG_ANALYZER_AGGREGATION_MODE_OPTIONS,
    type PanelSeriesDefinition,
    type RollupTableMap,
    updatePanelSeriesCalculationMode,
} from '../../../seriesModel';
import styles from '../PanelEditor.module.scss';
import seriesStyles from '../../series/PanelSeriesEditor.module.scss';

const AUTOMATIC_INTERVAL = 'automatic';
const INTERVAL_TYPE_OPTIONS = [
    { label: 'Automatic', value: AUTOMATIC_INTERVAL },
    { label: 'Millisecond', value: TimeUnit.Millisecond },
    { label: 'Second', value: TimeUnit.Second },
    { label: 'Minute', value: TimeUnit.Minute },
    { label: 'Hour', value: TimeUnit.Hour },
    { label: 'Day', value: TimeUnit.Day },
    { label: 'Week', value: TimeUnit.Week },
    { label: 'Month', value: TimeUnit.Month },
    { label: 'Year', value: TimeUnit.Year },
];

const EditorDataTab = ({
    pQueryDraft,
    pRollupTableList,
    pOnChangeQueryDraft,
}: {
    pQueryDraft: PanelInfo['query'];
    pRollupTableList: RollupTableMap;
    pOnChangeQueryDraft: (queryDraft: PanelInfo['query']) => void;
}) => {
    const [sSeriesDraft, setSeriesDraft] = useState<
        PanelSeriesDefinition[] | undefined
    >();
    const [sSeriesFooterMessage, setSeriesFooterMessage] =
        useState<string | undefined>();

    const setTagSet = (tagSet: PanelSeriesDefinition[]) => {
        pOnChangeQueryDraft({ ...pQueryDraft, tagSet });
    };

    function closeSeriesModal(): void {
        setSeriesDraft(undefined);
        setSeriesFooterMessage(undefined);
    }

    function applySeriesSelection(): void {
        if (!sSeriesDraft) return;
        setTagSet(sSeriesDraft);
        closeSeriesModal();
    }

    return (
        <>
            <div className={styles.editorCard}>
                <div className={styles.editorWrappedRow}>
                    <div className={styles.editorField}>
                        <span className={styles.editorFieldLabel}>Interval</span>
                        <div className={styles.editorNarrowControl}>
                            <Dropdown.Root
                                options={INTERVAL_TYPE_OPTIONS}
                                value={
                                    pQueryDraft.intervalType ??
                                    AUTOMATIC_INTERVAL
                                }
                                onChange={(value) =>
                                    pOnChangeQueryDraft({
                                        ...pQueryDraft,
                                        intervalType:
                                            value === AUTOMATIC_INTERVAL
                                                ? undefined
                                                : (value as TimeUnit),
                                    })
                                }
                            >
                                <Dropdown.Trigger
                                    className={styles.editorSelectTrigger}
                                />
                                <Dropdown.Menu>
                                    <Dropdown.List />
                                </Dropdown.Menu>
                            </Dropdown.Root>
                        </div>
                    </div>
                </div>
            </div>
            {pQueryDraft.tagSet.map((item, seriesIndex) => {
                    const sSeriesColor = getPanelSeriesDisplayColor(item, seriesIndex);
                    const sAliasWidth = Math.min(
                        42,
                        Math.max(14, item.alias.length + 4),
                    );
                    const updateItem = (nextItem: PanelSeriesDefinition) =>
                        setTagSet(
                            pQueryDraft.tagSet.map((series) =>
                                series.key === item.key ? nextItem : series,
                            ),
                        );
                    const patchItem = (patch: Partial<PanelSeriesDefinition>) =>
                        updateItem({ ...item, ...patch });

                    return (
                        <div key={item.key} className={styles.editorCard}>
                            <div className={styles.editorWrappedRow}>
                                <div
                                    className={styles.editorSeriesIdentity}
                                    title={`${item.sourceTagName} (${item.table})`}
                                >
                                    <span
                                        className={styles.editorSeriesTagName}
                                    >
                                        {item.sourceTagName}
                                    </span>
                                    <span
                                        className={styles.editorSeriesTableName}
                                    >
                                        {item.table}
                                    </span>
                                </div>
                                <div className={styles.editorField}>
                                    <span className={styles.editorFieldLabel}>
                                        Calc Mode
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
                                        styles.editorAliasField,
                                    ].join(' ')}
                                    style={
                                        {
                                            '--editor-alias-expanded-width': `max(120px, ${sAliasWidth}ch)`,
                                        } as CSSProperties
                                    }
                                >
                                    <span className={styles.editorFieldLabel}>Alias</span>
                                    <Input
                                        aria-label="Alias"
                                        value={item.alias}
                                        onChange={(event) =>
                                            patchItem({ alias: event.target.value })
                                        }
                                        size="sm"
                                        className={styles.editorAliasInput}
                                        style={{ height: '30px' }}
                                    />
                                </div>
                                <div className={styles.editorInlineField}>
                                    <span className={styles.editorFieldLabel}>Color</span>
                                    <ColorPicker
                                        color={sSeriesColor}
                                        onChange={(color) => patchItem({ color })}
                                        tooltipContent="Color"
                                    />
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
