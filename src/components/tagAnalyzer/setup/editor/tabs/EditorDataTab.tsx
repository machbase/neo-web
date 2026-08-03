import { useState, type CSSProperties } from 'react';
import { PlusCircle, Close } from '@/assets/icons/Icon';
import { Input, ColorPicker, Button } from '@/design-system/components';
import { SeriesEditor } from '../../SeriesEditor';
import { SeriesCalculationModeSelect } from '../../SeriesCalculationModeSelect';
import { SeriesModalFrame } from '../../SeriesModalFrame';
import type { PanelInfo } from '../../../panel/panelModel';
import {
    getPanelSeriesDisplayColor,
    type PanelSeriesDefinition,
    type RollupTableMap,
    updatePanelSeriesCalculationMode,
} from '../../../seriesModel';
import styles from '../PanelEditor.module.scss';

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
                                        <SeriesCalculationModeSelect
                                            value={item.calculationMode}
                                            onChange={(mode) =>
                                                updateItem(
                                                    updatePanelSeriesCalculationMode(item, mode),
                                                )
                                            }
                                            className={styles.editorSelectTrigger}
                                        />
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
                <SeriesModalFrame
                    title="Edit Series"
                    footerMessage={sSeriesFooterMessage}
                    onClose={closeSeriesModal}
                    onApply={applySeriesSelection}
                >
                    <SeriesEditor
                        seriesList={sSeriesDraft}
                        rollupTableList={pRollupTableList}
                        onFooterMessageChange={setSeriesFooterMessage}
                        onSeriesListChange={setSeriesDraft}
                    />
                </SeriesModalFrame>
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
