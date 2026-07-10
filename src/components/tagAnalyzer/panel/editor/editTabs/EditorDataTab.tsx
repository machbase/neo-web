import { useState, type CSSProperties } from 'react';
import { PlusCircle, Close } from '@/assets/icons/Icon';
import { Input, Dropdown, ColorPicker, Button } from '@/design-system/components';
import EditSeriesModal from '../../../modals/createNewPanel/EditSeriesModal';
import {
    getDefaultPanelSeriesAlias,
    getPanelSeriesDisplayColor,
    isPanelSeriesUsingDefaultAlias,
    TAG_ANALYZER_AGGREGATION_MODE_OPTIONS,
    type PanelSeriesDefinition,
} from '../../../domain/SeriesDomain';
import type { PanelInfo } from '../../../domain/panel/PanelInfo';
import type { RollupTableMap } from '../../../fetch/panelData/PanelDataFetchTypes';
import styles from '../PanelEditor.module.scss';

type EditableSeriesField = 'calculationMode' | 'alias' | 'color';
type AliasFieldStyle = CSSProperties & {
    '--editor-alias-expanded-width': string;
};

const ALIAS_FIELD_MIN_CHARACTER_WIDTH = 14;
const ALIAS_FIELD_MAX_CHARACTER_WIDTH = 42;
const ALIAS_FIELD_EXTRA_CHARACTER_WIDTH = 4;

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
                item.key === key
                    ? updateSeriesEditableField(item, field, value)
                    : item,
            ),
        );

    return (
        <>
            {pQueryDraft.tagSet.map((item: PanelSeriesDefinition, seriesIndex: number) => {
                    const sSeriesColor = getPanelSeriesDisplayColor(item, seriesIndex);
                    const updateItem = (field: EditableSeriesField) => (value: string) =>
                        updateSeriesField(item.key, field, value);

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
                                <div
                                    className={[
                                        styles.editorField,
                                        styles.editorAliasField,
                                    ].join(' ')}
                                    style={getAliasFieldStyle(item.alias)}
                                >
                                    <span className={styles.editorFieldLabel}>Alias</span>
                                    <Input
                                        aria-label="Alias"
                                        value={item.alias}
                                        onChange={(event) =>
                                            updateItem('alias')(event.target.value)
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
                                        onChange={updateItem('color')}
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
            {isModal && (
                <EditSeriesModal
                    rollupTableList={pRollupTableList}
                    onClose={() => setIsModal(false)}
                    initialSeries={pQueryDraft.tagSet}
                    onUpdateSeries={setTagSet}
                />
            )}
            <Button
                className={styles.editorAddSeriesButton}
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

function updateSeriesEditableField(
    series: PanelSeriesDefinition,
    field: EditableSeriesField,
    value: string,
): PanelSeriesDefinition {
    if (field !== 'calculationMode') {
        return { ...series, [field]: value };
    }

    const sSeries = {
        ...series,
        calculationMode: value,
    };

    return {
        ...sSeries,
        alias: isPanelSeriesUsingDefaultAlias(series)
            ? getDefaultPanelSeriesAlias(sSeries)
            : series.alias,
    };
}

function getAliasFieldStyle(alias: string): AliasFieldStyle {
    const sCharacterWidth = Math.min(
        ALIAS_FIELD_MAX_CHARACTER_WIDTH,
        Math.max(
            ALIAS_FIELD_MIN_CHARACTER_WIDTH,
            alias.length + ALIAS_FIELD_EXTRA_CHARACTER_WIDTH,
        ),
    );

    return {
        '--editor-alias-expanded-width': `max(120px, ${sCharacterWidth}ch)`,
    };
}

export default EditorDataTab;
