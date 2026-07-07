import { useState } from 'react';
import { PlusCircle, Close } from '@/assets/icons/Icon';
import { Input, Dropdown, ColorPicker, Button } from '@/design-system/components';
import EditSeriesModal from '../../../modals/createNewPanel/EditSeriesModal';
import { Tooltip } from 'react-tooltip';
import {
    getPanelSeriesDisplayColor,
    TAG_ANALYZER_AGGREGATION_MODE_OPTIONS,
    type PanelSeriesDefinition,
} from '../../../domain/SeriesDomain';
import type { PanelInfo } from '../../../domain/panel/PanelInfo';
import type { RollupTableMap } from '../../../fetch/panelData/PanelDataFetchTypes';
import { cx } from './EditorFieldUtils';
import styles from '../PanelEditor.module.scss';

type EditableSeriesField = 'calculationMode' | 'alias' | 'color';

const EditorDataTab = ({
    pQueryDraft,
    pRollupTableList,
    pOnChangeQueryDraft
}: {
    pQueryDraft: PanelInfo['query'];
    pRollupTableList: RollupTableMap;
    pOnChangeQueryDraft: (queryDraft: PanelInfo['query']) => void;
}) => {
    const [isModal, setIsModal] = useState(false);

    const setTagSet = (tagSet: PanelSeriesDefinition[]) => {
        pOnChangeQueryDraft({ ...pQueryDraft, tagSet });
    };

    const updateSeriesField = (key: string, field: EditableSeriesField, value: string) =>
        setTagSet(
            pQueryDraft.tagSet.map((item: PanelSeriesDefinition) =>
                item.key === key ? { ...item, [field]: value } : item,
            ),
        );

    return (
        <>
            {pQueryDraft.tagSet.map((item: PanelSeriesDefinition, seriesIndex: number) => {
                    const sSeriesColor = getPanelSeriesDisplayColor(item, seriesIndex);
                    const updateItem = (field: EditableSeriesField) => (value: string) =>
                        updateSeriesField(item.key, field, value);
                    const sTableTooltipClass = `taz-table-name-tooltip-${seriesIndex}`;

                    return (
                        <div key={item.key} className={styles.editorCard}>
                            <div className={styles.editorWrappedRow}>
                                <div
                                    className={styles.editorField}
                                >
                                    <span className={styles.editorFieldLabel}>
                                        Calc Mode
                                    </span>
                                    <div className={styles.editorNarrowControl}>
                                        <Dropdown.Root
                                            options={TAG_ANALYZER_AGGREGATION_MODE_OPTIONS}
                                            value={item.calculationMode ?? 'avg'}
                                            onChange={updateItem('calculationMode')}
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
                                <div className={styles.editorField}>
                                    <span
                                        className={cx(
                                            sTableTooltipClass,
                                            styles.editorFieldLabel,
                                        )}
                                    >
                                        Source Tag Name
                                        <span className={styles.editorFieldHint}>
                                            ({item.table})
                                        </span>
                                    </span>
                                    <Tooltip
                                        anchorSelect={`.${sTableTooltipClass}`}
                                        content={item.table}
                                    />
                                    <div
                                        className={styles.editorFixedValue}
                                        aria-label="Source Tag Name"
                                        title={item.sourceTagName}
                                        style={{ width: '128px', height: '30px' }}
                                    >
                                        {item.sourceTagName}
                                    </div>
                                </div>
                                <div className={styles.editorField}>
                                    <span className={styles.editorFieldLabel}>Alias</span>
                                    <Input
                                        aria-label="Alias"
                                        value={item.alias}
                                        onChange={(event) =>
                                            updateItem('alias')(event.target.value)
                                        }
                                        size="sm"
                                        style={{ width: '120px', height: '30px' }}
                                    />
                                </div>
                                <div className={styles.editorInlineField}>
                                    <span className={styles.editorFieldLabel}>Color</span>
                                    <ColorPicker
                                        color={sSeriesColor}
                                        onChange={updateItem('color')}
                                        tooltipContent="Color"
                                    />
                                </div>
                                {pQueryDraft.tagSet.length !== 1 && (
                                    <Button
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
            {isModal && (
                <EditSeriesModal
                    rollupTableList={pRollupTableList}
                    onClose={() => setIsModal(false)}
                    initialSeries={pQueryDraft.tagSet}
                    onUpdateSeries={setTagSet}
                />
            )}
            <Button
                variant="secondary"
                size="sm"
                shadow
                autoFocus={false}
                icon={<PlusCircle size={16} />}
                title="Click to add a new series"
                aria-label="Click to add a new series"
                onClick={() => setIsModal(true)}
            >
                Add new series
            </Button>
        </>
    );
};

export default EditorDataTab;
