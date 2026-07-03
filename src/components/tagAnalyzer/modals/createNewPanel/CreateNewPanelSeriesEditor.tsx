import {
    useCallback,
    useEffect,
    useId,
    useRef,
    useState,
    type KeyboardEvent,
} from 'react';
import { Search } from '@/assets/icons/Icon';
import {
    Badge,
    Button,
    Dropdown,
    Input,
} from '@/design-system/components';
import useDebounce from '@/hooks/useDebounce';
import { getId } from '@/utils';
import {
    isTagAnalyzerJsonValue,
} from '@/utils/tagAnalyzerFields';
import {
    MIXED_X_AXIS_KIND_WARNING,
    PANEL_TAG_LIMIT,
    TAG_ANALYZER_AGGREGATION_MODE_OPTIONS,
    getDefaultPanelSeriesAlias,
    hasMixedXAxisValueKinds,
    isPanelSeriesUsingDefaultAlias,
    type PanelSeriesDefinition,
    type PanelSeriesSourceColumns,
} from '../../domain/SeriesDomain';
import type { RollupTableMap } from '../../fetch/panelData/PanelDataFetchTypes';
import {
    TABLE_INFO_SEARCH_TAG_PAGE_SIZE,
    fetchTableInfoSearchTableNames,
    fetchTableInfoSearchTags,
    type TableInfoSearchTagSearchItem,
} from '../../fetch/tableInfoSearch/TableInfoSearchFetch';
import type { TableSchemaColumn } from '../../fetch/tableSchema/fetchTableSchema';
import {
    createPanelSeriesDefinition,
    getPanelSeriesRollupColumn,
} from './CreateNewPanelSeries';
import { CreateNewPanelAvailableSeriesList } from './CreateNewPanelAvailableSeriesList';
import { CreateNewPanelSourceSelector } from './CreateNewPanelSourceSelector';
import styles from './CreateNewPanel.module.scss';

// Owns everything about editing a series list: the source metadata (tables,
// columns, rollup info), the tag search, and the selected list. Parents only
// hold the series list itself and receive changes through onSeriesListChange.
export function CreateNewPanelSeriesEditor({
    seriesList,
    rollupTableList,
    availableSourceTableNames,
    onFooterMessageChange,
    onSeriesListChange,
}: {
    seriesList: PanelSeriesDefinition[];
    rollupTableList: RollupTableMap;
    availableSourceTableNames?: string[];
    onFooterMessageChange?: (message: string | undefined) => void;
    onSeriesListChange: (seriesList: PanelSeriesDefinition[]) => void;
}) {
    const [sAvailableSourceTableNames, setAvailableSourceTableNames] =
        useState<string[]>(() => availableSourceTableNames ?? []);
    const [sIsTableNameLoading, setIsTableNameLoading] =
        useState(() => availableSourceTableNames === undefined);
    const [sSelectedTable, setSelectedTableState] = useState('');
    const [sSourceColumns, setSourceColumns] =
        useState<PanelSeriesSourceColumns | undefined>();
    const [sTableColumns, setTableColumns] =
        useState<TableSchemaColumn[]>([]);
    const [sAvailableTags, setAvailableTags] = useState<TableInfoSearchTagSearchItem[]>([]);
    const [sTagTotal, setTagTotal] = useState(0);
    const [sTagPage, setTagPage] = useState(1);
    const [sTagPageInputValue, setTagPageInputValue] = useState('1');
    const [sTagInputValue, setTagInputValue] = useState('');
    const [sAppliedTagSearchText, setAppliedTagSearchText] = useState('');
    const tagSearchRequestKeyRef = useRef(0);
    const sIsAtSelectionLimit = seriesList.length >= PANEL_TAG_LIMIT;
    const sHasPendingTagSearch = sTagInputValue !== sAppliedTagSearchText;
    const sTagInputId = useId();

    const showFooterError = useCallback((message: string): void => {
        onFooterMessageChange?.(message);
    }, [onFooterMessageChange]);

    const clearFooterMessage = useCallback((): void => {
        onFooterMessageChange?.(undefined);
    }, [onFooterMessageChange]);

    useEffect(() => {
        if (availableSourceTableNames === undefined) {
            return;
        }

        setAvailableSourceTableNames(availableSourceTableNames);
        setIsTableNameLoading(false);
    }, [availableSourceTableNames]);

    useEffect(() => {
        if (availableSourceTableNames !== undefined) {
            return undefined;
        }

        let sIsActive = true;

        void fetchTableInfoSearchTableNames().then((tableNames) => {
            if (!sIsActive) {
                return;
            }

            setAvailableSourceTableNames(tableNames);
            setIsTableNameLoading(false);
        });

        return () => {
            sIsActive = false;
        };
    }, [availableSourceTableNames]);

    const applyNewSeriesList = useCallback((
        nextSeriesList: PanelSeriesDefinition[],
    ): boolean => {
        if (hasMixedXAxisValueKinds(nextSeriesList)) {
            showFooterError(MIXED_X_AXIS_KIND_WARNING);
            return false;
        }

        clearFooterMessage();
        onSeriesListChange(nextSeriesList);
        return true;
    }, [clearFooterMessage, onSeriesListChange, showFooterError]);

    const handleSourceChange = useCallback((
        table: string,
        sourceColumns: PanelSeriesSourceColumns | undefined,
        tableColumns: TableSchemaColumn[],
    ): void => {
        clearFooterMessage();
        setSelectedTableState(table);
        setSourceColumns(sourceColumns);
        setTableColumns(tableColumns);
        setTagPageState(1);
    }, [clearFooterMessage]);

    async function loadTagList(
        searchText = sAppliedTagSearchText,
        page = sTagPage,
    ): Promise<void> {
        if (!sSelectedTable || !sSourceColumns?.name) {
            setAvailableTags([]);
            setTagTotal(0);
            setTagPageState(1);
            return;
        }

        const sRequestKey = tagSearchRequestKeyRef.current + 1;
        tagSearchRequestKeyRef.current = sRequestKey;

        try {
            const { items, total, errorMessage } = await fetchTableInfoSearchTags({
                table: sSelectedTable,
                searchText,
                columns: sSourceColumns,
                page,
                pageSize: TABLE_INFO_SEARCH_TAG_PAGE_SIZE,
                suppressToast: true,
            });

            if (tagSearchRequestKeyRef.current !== sRequestKey) {
                return;
            }

            const sMaxPage = Math.max(
                1,
                Math.ceil(total / TABLE_INFO_SEARCH_TAG_PAGE_SIZE),
            );
            setTagTotal(total);
            if (page > sMaxPage) {
                setAvailableTags([]);
                setTagPageState(sMaxPage);
                void loadTagList(searchText, sMaxPage);
                return;
            }

            setAvailableTags(items);

            if (errorMessage) {
                showFooterError(errorMessage);
            } else {
                clearFooterMessage();
            }
        } catch (error) {
            if (tagSearchRequestKeyRef.current !== sRequestKey) {
                return;
            }

            setAvailableTags([]);
            setTagTotal(0);
            showFooterError(getErrorMessage(error));
        }
    }

    function setTagPageState(page: number): void {
        const sSafePage = Math.max(1, Math.floor(page));
        setTagPage(sSafePage);
        setTagPageInputValue(String(sSafePage));
    }

    function handleTagInputValueChange(value: string): void {
        clearFooterMessage();
        setTagInputValue(value);
    }

    function handleTagSearch(): void {
        clearFooterMessage();
        const sNextSearchText = sTagInputValue;
        setAppliedTagSearchText(sNextSearchText);
        setTagPageState(1);
        void loadTagList(sNextSearchText, 1);
    }

    function handleTagPageChange(page: number): void {
        setTagPageState(page);
        void loadTagList(sAppliedTagSearchText, page);
    }

    function addSelectedTag(tagName: string): void {
        if (sIsAtSelectionLimit) {
            showFooterError(`The maximum number of tags in a chart is ${PANEL_TAG_LIMIT}.`);
            return;
        }

        const sColumns = sSourceColumns;
        if (!sSelectedTable || !sColumns) {
            showFooterError('please select table.');
            return;
        }
        if (!sColumns.time) {
            showFooterError('please select time field.');
            return;
        }
        if (!sColumns.value) {
            showFooterError('please select value field.');
            return;
        }
        if (isTagAnalyzerJsonValue(sTableColumns, sColumns.value) && !sColumns.jsonKey) {
            showFooterError('please select JSON key.');
            return;
        }

        applyNewSeriesList([
            ...seriesList,
            createPanelSeriesDefinition({
                key: getId(),
                table: sSelectedTable,
                tagName,
                calculationMode: 'avg',
                columns: sColumns,
                rollupMetadata: rollupTableList,
            }),
        ]);
    }

    function removeSelectedTag(tagId: string): void {
        applyNewSeriesList(seriesList.filter((item) => item.key !== tagId));
    }

    function changeSeriesCalculationMode(
        seriesKey: string,
        calculationMode: string,
    ): void {
        applyNewSeriesList(
            seriesList.map((previousTag) =>
                previousTag.key === seriesKey
                    ? withUpdatedSeriesCalculationMode(previousTag, calculationMode)
                    : previousTag,
            ),
        );
    }

    // Table changes reload the columns (in the source selector); source changes
    // refresh the available tag list using the last applied search text.
    useDebounce(
        [sSelectedTable, sSourceColumns],
        () => {
            void loadTagList();
        },
        200,
        undefined,
    );

    return (
        <>
            <CreateNewPanelSourceSelector
                availableSourceTableNames={sAvailableSourceTableNames}
                rollupTableList={rollupTableList}
                isTableNameLoading={sIsTableNameLoading}
                selectedTable={sSelectedTable}
                sourceColumns={sSourceColumns}
                tableColumns={sTableColumns}
                onSourceChange={handleSourceChange}
                onError={showFooterError}
            />

            <div className={styles.fieldCell}>
                <label className={styles.fieldLabelTop} htmlFor={sTagInputId}>
                    Tag
                </label>
                <Input
                    id={sTagInputId}
                    value={sTagInputValue}
                    placeholder="Search Tag"
                    onChange={(event) => handleTagInputValueChange(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            handleTagSearch();
                        }
                    }}
                    fullWidth
                    size="sm"
                    rightIcon={
                        <Button
                            variant="ghost"
                            size="icon"
                            icon={<Search size={16} />}
                            className={`${styles.tagSearchButton} ${
                                sHasPendingTagSearch ? styles.tagSearchButtonPending : ''
                            }`}
                            onClick={handleTagSearch}
                            aria-label="Search tags"
                        />
                    }
                />
            </div>

            <div className={styles.itemListGroup}>
                <CreateNewPanelAvailableSeriesList
                    tags={sAvailableTags}
                    total={sTagTotal}
                    page={sTagPage}
                    pageInputValue={sTagPageInputValue}
                    onPageChange={handleTagPageChange}
                    onPageInputChange={setTagPageInputValue}
                    onSelectTag={addSelectedTag}
                />

                <CreateNewPanelSelectedSeriesList
                    selectedSeries={seriesList}
                    rollupTableList={rollupTableList}
                    onRemoveSeries={removeSelectedTag}
                    onClearAll={() => applyNewSeriesList([])}
                    onChangeCalculationMode={changeSeriesCalculationMode}
                />
            </div>
        </>
    );
}

function withUpdatedSeriesCalculationMode(
    series: PanelSeriesDefinition,
    calculationMode: string,
): PanelSeriesDefinition {
    const sSeries = {
        ...series,
        calculationMode,
    };

    return {
        ...sSeries,
        alias: isPanelSeriesUsingDefaultAlias(series)
            ? getDefaultPanelSeriesAlias(sSeries)
            : series.alias,
    };
}

function CreateNewPanelSelectedSeriesList({
    selectedSeries,
    rollupTableList,
    onRemoveSeries,
    onClearAll,
    onChangeCalculationMode,
}: {
    selectedSeries: PanelSeriesDefinition[];
    rollupTableList: RollupTableMap;
    onRemoveSeries: (seriesKey: string) => void;
    onClearAll: () => void;
    onChangeCalculationMode: (seriesKey: string, calculationMode: string) => void;
}) {
    const sSelectedCount = selectedSeries.length;
    const sIsAtSelectionLimit = sSelectedCount >= PANEL_TAG_LIMIT;

    function handleSelectedSeriesKeyDown(
        event: KeyboardEvent<HTMLDivElement>,
        seriesKey: string,
    ): void {
        if (event.target !== event.currentTarget) {
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onRemoveSeries(seriesKey);
        }
    }

    return (
        <div className={styles.listColumn}>
            <div className={styles.columnHeader}>
                <span className={styles.columnTitle}>
                    <span className={styles.columnTitleText}>Selected</span>
                    <Badge
                        variant={sIsAtSelectionLimit ? 'error' : 'primary'}
                        size="sm"
                    >
                        {`${sSelectedCount} / ${PANEL_TAG_LIMIT}`}
                    </Badge>
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearAll}
                    disabled={sSelectedCount === 0}
                >
                    Clear all
                </Button>
            </div>
            <div className={styles.selectedSeriesList}>
                {selectedSeries.length > 0 ? (
                    <div className={`${styles.selectedSeriesItems} scrollbar-dark`}>
                        {selectedSeries.map((item) => (
                            <div
                                key={item.key}
                                role="button"
                                tabIndex={0}
                                title={getSelectedSeriesTooltip(
                                    item,
                                    rollupTableList,
                                )}
                                className={styles.selectedSeriesItem}
                                onClick={() => onRemoveSeries(item.key)}
                                onKeyDown={(event) =>
                                    handleSelectedSeriesKeyDown(event, item.key)
                                }
                            >
                                <div className={styles.selectedSeriesItemContent}>
                                    <div className={styles.selectedSeriesHeader}>
                                        <span
                                            className={styles.selectedSeriesName}
                                            title={item.sourceTagName}
                                        >
                                            {item.sourceTagName}
                                        </span>
                                        <div
                                            className={styles.modeTriggerWrapper}
                                            onClick={(event) => event.stopPropagation()}
                                        >
                                            <Dropdown.Root
                                                options={TAG_ANALYZER_AGGREGATION_MODE_OPTIONS}
                                                value={item.calculationMode || 'avg'}
                                                onChange={(value) =>
                                                    onChangeCalculationMode(item.key, value)
                                                }
                                            >
                                                <Dropdown.Trigger
                                                    className="dropdown-trigger-sm"
                                                    style={{ width: '100%' }}
                                                />
                                                <Dropdown.Menu>
                                                    <Dropdown.List />
                                                </Dropdown.Menu>
                                            </Dropdown.Root>
                                        </div>
                                    </div>
                                    <SelectedSeriesSourceDetails
                                        item={item}
                                        rollupTableList={rollupTableList}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className={styles.selectedSeriesEmpty}>no-data</div>
                )}
            </div>
        </div>
    );
}

function SelectedSeriesSourceDetails({
    item,
    rollupTableList,
}: {
    item: PanelSeriesDefinition;
    rollupTableList: RollupTableMap;
}) {
    const sRows = [
        ['Table', getDisplayTableName(item.table)],
        ['Time', getSourceTimeLabel(item)],
        ['Value', getSourceValueLabel(item, rollupTableList)],
    ] as const;

    return (
        <div className={styles.selectedSeriesSourceDetails}>
            {sRows.map(([label, value]) => (
                <div key={label} className={styles.selectedSeriesSourceRow}>
                    <span className={styles.selectedSeriesSourceLabel}>
                        {label}
                    </span>
                    <span className={styles.selectedSeriesSourceValue}>
                        {value}
                    </span>
                </div>
            ))}
        </div>
    );
}

function getDisplayTableName(tableName: string): string {
    return tableName.split('.').at(-1) ?? tableName;
}

function getSourceValueLabel(
    item: PanelSeriesDefinition,
    rollupTableList: RollupTableMap,
): string {
    if (item.sourceColumns.jsonKey) {
        return `${item.sourceColumns.value} -> ${item.sourceColumns.jsonKey}`;
    }

    const sRollupColumn = getPanelSeriesRollupColumn(
        rollupTableList,
        item.table,
        item.sourceColumns.value,
        item.sourceColumns.jsonKey,
    );

    if (sRollupColumn) {
        return `${item.sourceColumns.value} (${sRollupColumn})`;
    }

    return item.sourceColumns.value || 'Value not selected';
}

function getSourceTimeLabel(item: PanelSeriesDefinition): string {
    if (!item.sourceColumns.time) {
        return 'Time not selected';
    }

    return item.sourceColumns.time;
}

function getSelectedSeriesTooltip(
    item: PanelSeriesDefinition,
    rollupTableList: RollupTableMap,
): string {
    return [
        `Tag: ${item.sourceTagName}`,
        `Table: ${item.table}`,
        `Time: ${getSourceTimeLabel(item)}`,
        `Value: ${getSourceValueLabel(item, rollupTableList)}`,
        `Mode: ${item.calculationMode || 'avg'}`,
    ].join('\n');
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
