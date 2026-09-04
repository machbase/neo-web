import {
    useCallback,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent,
    type ReactNode,
} from 'react';
import { Tooltip } from 'react-tooltip';
import { ArrowDown, Search } from '@/assets/icons/Icon';
import {
    Badge,
    Button,
    Combobox,
    Dropdown,
    Input,
    InputSelect,
    List,
    Pagination,
    type ComboboxOption,
} from '@/design-system/components';
import { getId } from '@/utils';
import { getCurrentDatabaseName } from '@/utils/currentDatabaseState';
import {
    displayJsonPathLabel,
    isJsonTypeColumn,
    jsonPathInputToStoredPath,
} from '@/utils/dashboardJsonValue';
import {
    createTagAnalyzerColumnInfo,
    getTagAnalyzerTimeColumns,
    getTagAnalyzerValueColumns,
    isTagAnalyzerJsonValue,
} from '@/utils/tagAnalyzerFields';
import { DATETIME_COLUMN_TYPE } from '@/utils/timeFieldColumns';
import { resolveStoredTableName } from '@/utils/qualifiedTableName';
import {
    tableMetadataApi,
    type TableColumn,
} from '../../api/tableMetadataApi';
import {
    createPanelSeriesDefinition,
    formatRollupIntervalList,
    formatRollupRangeLabel,
    getPanelSeriesRollupColumn,
    getPanelSeriesRollupInfo,
    getPanelSeriesValueSummaryLabel,
    getSeriesListAxisKind,
    hasMixedXAxisValueKinds,
    MIXED_X_AXIS_KIND_WARNING,
    normalizePanelSeriesCalculationMode,
    PANEL_TAG_LIMIT,
    PanelSeriesCalculationMode,
    TAG_ANALYZER_AGGREGATION_MODE_OPTIONS,
    type PanelSeriesDefinition,
    type PanelSeriesSourceColumns,
    type RollupTableMap,
    updatePanelSeriesCalculationMode,
} from '../../seriesModel';
import type { AxisKind } from '../../range/rangeModel';
import { getErrorMessageFromValue } from '../../errorMessage';
import { useLatestAsyncRequest } from '../../hooks/useLatestAsyncRequest';
import styles from './PanelSeriesEditor.module.scss';

const TAG_PAGE_SIZE = 10;
export const X_AXIS_KIND_CHANGE_WARNING =
    'The panel x-axis type cannot be changed.';

function encodeTestIdSegment(value: string): string {
    return encodeURIComponent(value);
}

export function PanelSeriesEditor({
    seriesList,
    rollupTableList,
    lockedAxisKind,
    onFooterMessageChange: setFooterMessage,
    onSeriesListChange,
}: {
    seriesList: PanelSeriesDefinition[];
    rollupTableList: RollupTableMap;
    lockedAxisKind?: AxisKind;
    onFooterMessageChange: (message: string | undefined) => void;
    onSeriesListChange: (seriesList: PanelSeriesDefinition[]) => void;
}) {
    const [sAvailableSourceTableNames, setAvailableSourceTableNames] =
        useState<string[] | undefined>();
    const [sSelectedTable, setSelectedTableState] = useState('');
    const [sSourceColumns, setSourceColumns] =
        useState<PanelSeriesSourceColumns | undefined>();
    const [sTableColumns, setTableColumns] =
        useState<TableColumn[]>([]);
    const [sAvailableTags, setAvailableTags] =
        useState<string[]>([]);
    const [sTagTotal, setTagTotal] = useState(0);
    const [sTagPage, setTagPage] = useState(1);
    const [sTagPageInputValue, setTagPageInputValue] = useState('1');
    const [sTagInputValue, setTagInputValue] = useState('');
    const [sAppliedTagSearchText, setAppliedTagSearchText] = useState('');
    const [sTagRequest, setTagRequest] = useState<{
        table: string;
        tagColumn: string;
        searchText: string;
        page: number;
        generation: number;
    }>();
    const sHasPendingTagSearch = sTagInputValue !== sAppliedTagSearchText;
    const sTagInputId = useId();
    const sIsTableNameLoading = sAvailableSourceTableNames === undefined;
    const sTotalTagPages = Math.max(
        1,
        Math.ceil(sTagTotal / TAG_PAGE_SIZE),
    );
    const sAvailableTagItems = sAvailableTags.map((tag) => ({
        id: tag,
        label: tag,
        tooltip: tag,
        testId: `tag-analyzer-series-option-${encodeTestIdSegment(tag)}`,
    }));

    useLatestAsyncRequest({
        enabled: true,
        requestKey: 'tag-analyzer-table-names',
        fetch: () => tableMetadataApi.fetchTableNames(),
        onSuccess: setAvailableSourceTableNames,
        onError: (error) => {
            setAvailableSourceTableNames([]);
            setFooterMessage(getErrorMessageFromValue(error));
        },
    });

    function applyNewSeriesList(
        nextSeriesList: PanelSeriesDefinition[],
    ): void {
        if (hasMixedXAxisValueKinds(nextSeriesList)) {
            setFooterMessage(MIXED_X_AXIS_KIND_WARNING);
            return;
        }
        const sNextAxisKind = getSeriesListAxisKind(nextSeriesList);
        if (
            lockedAxisKind &&
            sNextAxisKind &&
            sNextAxisKind !== lockedAxisKind
        ) {
            setFooterMessage(X_AXIS_KIND_CHANGE_WARNING);
            return;
        }

        setFooterMessage(undefined);
        onSeriesListChange(nextSeriesList);
    }

    const handleSourceChange = useCallback((
        table: string,
        sourceColumns: PanelSeriesSourceColumns | undefined,
        tableColumns: TableColumn[],
    ): void => {
        const sTagSourceChanged =
            table !== sSelectedTable ||
            sourceColumns?.name !== sSourceColumns?.name;

        setFooterMessage(undefined);
        setSelectedTableState(table);
        setSourceColumns(sourceColumns);
        setTableColumns(tableColumns);

        if (!sTagSourceChanged) return;

        setAvailableTags([]);
        setTagTotal(0);
        setTagPageState(1);
        if (!table || !sourceColumns?.name) {
            setTagRequest(undefined);
            return;
        }

        setTagRequest((current) => ({
            table,
            tagColumn: sourceColumns.name,
            searchText: sAppliedTagSearchText,
            page: 1,
            generation: (current?.generation ?? 0) + 1,
        }));
    }, [
        sAppliedTagSearchText,
        sSelectedTable,
        sSourceColumns?.name,
        setFooterMessage,
    ]);

    function loadTagList(
        searchText = sAppliedTagSearchText,
        page = sTagPage,
    ): void {
        if (!sSelectedTable || !sSourceColumns?.name) {
            setAvailableTags([]);
            setTagTotal(0);
            setTagPageState(1);
            return;
        }
        setTagRequest((current) => ({
            table: sSelectedTable,
            tagColumn: sSourceColumns.name,
            searchText,
            page,
            generation: (current?.generation ?? 0) + 1,
        }));
    }

    useLatestAsyncRequest({
        enabled: sTagRequest !== undefined,
        requestKey: JSON.stringify(sTagRequest),
        fetch: async () => {
            if (!sTagRequest) {
                throw new Error('Tag search source is unavailable.');
            }
            return {
                request: sTagRequest,
                result: await tableMetadataApi.fetchTags(
                    sTagRequest.table,
                    sTagRequest.tagColumn,
                    sTagRequest.searchText,
                    sTagRequest.page,
                    TAG_PAGE_SIZE,
                ),
            };
        },
        onSuccess: ({ request, result: { tags, total } }) => {
            const sMaxPage = Math.max(
                1,
                Math.ceil(total / TAG_PAGE_SIZE),
            );
            setTagTotal(total);
            if (request.page > sMaxPage) {
                setAvailableTags([]);
                setTagPageState(sMaxPage);
                loadTagList(request.searchText, sMaxPage);
                return;
            }
            setAvailableTags(tags);
            setFooterMessage(undefined);
        },
        onError: (error) => {
            setAvailableTags([]);
            setTagTotal(0);
            setFooterMessage(getErrorMessageFromValue(error));
        },
    });

    function setTagPageState(page: number): void {
        const sSafePage = Math.max(1, Math.floor(page));
        setTagPage(sSafePage);
        setTagPageInputValue(String(sSafePage));
    }

    function handleTagSearch(): void {
        setFooterMessage(undefined);
        setAppliedTagSearchText(sTagInputValue);
        setTagPageState(1);
        loadTagList(sTagInputValue, 1);
    }

    function handleTagPageChange(page: number): void {
        setTagPageState(page);
        loadTagList(sAppliedTagSearchText, page);
    }

    function addSelectedTag(tagName: string): void {
        if (seriesList.length >= PANEL_TAG_LIMIT) {
            setFooterMessage(`The maximum number of tags in a chart is ${PANEL_TAG_LIMIT}.`);
            return;
        }

        const sColumns = sSourceColumns;
        if (!sSelectedTable || !sColumns) {
            setFooterMessage('Select a table.');
            return;
        }
        if (!sColumns.time) {
            setFooterMessage('Select a time field.');
            return;
        }
        if (!sColumns.value) {
            setFooterMessage('Select a value field.');
            return;
        }
        if (isTagAnalyzerJsonValue(sTableColumns, sColumns.value) && !sColumns.jsonKey) {
            setFooterMessage('Select a JSON key.');
            return;
        }

        const sHasDuplicateSource = seriesList.some(
            (series) =>
                series.table === sSelectedTable &&
                series.sourceTagName === tagName &&
                series.sourceColumns.name === sColumns.name &&
                series.sourceColumns.time === sColumns.time &&
                series.sourceColumns.value === sColumns.value &&
                (series.sourceColumns.jsonKey ?? '') ===
                    (sColumns.jsonKey ?? ''),
        );
        if (sHasDuplicateSource) {
            setFooterMessage('This series has already been added.');
            return;
        }

        applyNewSeriesList([
            ...seriesList,
            createPanelSeriesDefinition({
                key: getId(),
                table: sSelectedTable,
                tagName,
                calculationMode: PanelSeriesCalculationMode.Average,
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
        calculationMode: PanelSeriesCalculationMode,
    ): void {
        applyNewSeriesList(
            seriesList.map((previousTag) =>
                previousTag.key === seriesKey
                    ? updatePanelSeriesCalculationMode(previousTag, calculationMode)
                    : previousTag,
            ),
        );
    }

    return (
        <>
            <SourceSelector
                availableSourceTableNames={sAvailableSourceTableNames ?? []}
                rollupTableList={rollupTableList}
                isTableNameLoading={sIsTableNameLoading}
                selectedTable={sSelectedTable}
                sourceColumns={sSourceColumns}
                tableColumns={sTableColumns}
                onSourceChange={handleSourceChange}
                onError={setFooterMessage}
            />

            <div className={styles.fieldCell}>
                <label className={styles.fieldLabelTop} htmlFor={sTagInputId}>
                    Tag
                </label>
                <Input
                    id={sTagInputId}
                    data-testid="tag-analyzer-series-search-input"
                    value={sTagInputValue}
                    placeholder="Search Tag"
                    onChange={(event) => {
                        setFooterMessage(undefined);
                        setTagInputValue(event.target.value);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            handleTagSearch();
                        }
                    }}
                    fullWidth
                    size="sm"
                    rightIcon={
                        <Button
                            data-testid="tag-analyzer-series-search-button"
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
                <div className={styles.listColumn}>
                    <div className={styles.columnHeader}>
                        <span className={styles.columnTitle}>
                            <span className={styles.columnTitleText}>
                                Item list
                            </span>
                            <Badge variant="primary" size="sm">
                                {sTagTotal}
                            </Badge>
                        </span>
                    </div>
                    <List
                        className={`${styles.seriesList} ${styles.availableTagList}`}
                        items={sAvailableTagItems}
                        onItemClick={(id) => {
                            const sTag = String(id);
                            if (sAvailableTags.includes(sTag)) {
                                addSelectedTag(sTag);
                            }
                        }}
                    />
                    <Pagination
                        currentPage={sTagPage}
                        totalPages={sTotalTagPages}
                        onPageChange={handleTagPageChange}
                        onPageInputChange={setTagPageInputValue}
                        inputValue={sTagPageInputValue}
                        showTotalPage
                        className={styles.seriesPagination}
                    />
                </div>

                <SelectedSeriesList
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

function SelectedSeriesList({
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
    onChangeCalculationMode: (
        seriesKey: string,
        calculationMode: PanelSeriesCalculationMode,
    ) => void;
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
                <span
                    className={styles.columnTitle}
                    data-testid="tag-analyzer-selected-series-count"
                >
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
                                                        onChangeCalculationMode(
                                                            item.key,
                                                            sMode,
                                                        );
                                                    }
                                                }}
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
                    <div className={styles.selectedSeriesEmpty}>
                        No series selected.
                    </div>
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
        ['Table', item.table.split('.').at(-1) ?? item.table],
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
    return item.sourceColumns.time || 'Time not selected';
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
        `Mode: ${item.calculationMode}`,
    ].join('\n');
}

type TableColumnsCacheEntry = {
    sourceColumns: PanelSeriesSourceColumns | undefined;
    tableColumns: TableColumn[];
};

type SourceTableOption = {
    database: string;
    owner: string;
    table: string;
    qualifiedName: string;
};

const EMPTY_JSON_PATH_OPTIONS: string[] = [];

function SourceSelector({
    availableSourceTableNames,
    rollupTableList,
    isTableNameLoading,
    selectedTable,
    sourceColumns,
    tableColumns,
    onSourceChange,
    onError,
}: {
    availableSourceTableNames: string[];
    rollupTableList: RollupTableMap;
    isTableNameLoading: boolean;
    selectedTable: string;
    sourceColumns: PanelSeriesSourceColumns | undefined;
    tableColumns: TableColumn[];
    onSourceChange: (
        table: string,
        sourceColumns: PanelSeriesSourceColumns | undefined,
        tableColumns: TableColumn[],
    ) => void;
    onError: (message: string) => void;
}) {
    const sColumnResultsByTableRef =
        useRef<Record<string, TableColumnsCacheEntry>>({});
    const sJsonKeyByColumnRef = useRef<Record<string, string>>({});
    const [sColumnRequestTable, setColumnRequestTable] = useState('');
    const [sSelectedDatabase, setSelectedDatabase] = useState('');

    const sSourceTables = useMemo<SourceTableOption[]>(
        () => availableSourceTableNames.map(parseSourceTableOption),
        [availableSourceTableNames],
    );
    const sDatabaseNames = useMemo<string[]>(
        () => [...new Set(sSourceTables.map(({ database }) => database))],
        [sSourceTables],
    );
    const sDatabaseOptions = useMemo<ComboboxOption[]>(
        () =>
            sDatabaseNames.map((database) => ({
                value: database,
                label: database,
                testId: `tag-analyzer-database-option-${encodeTestIdSegment(database)}`,
            })),
        [sDatabaseNames],
    );
    const sSelectedSourceTable = sSourceTables.find(
        ({ qualifiedName }) => qualifiedName === selectedTable,
    );
    const sSelectedTableDatabase = sSelectedSourceTable?.database;
    const sActiveDatabase = sDatabaseNames.includes(sSelectedDatabase)
        ? sSelectedDatabase
        : sSelectedTableDatabase ?? sDatabaseNames[0] ?? '';
    const sActiveDatabaseTables = useMemo<SourceTableOption[]>(
        () =>
            sSourceTables.filter(
                ({ database }) => database === sActiveDatabase,
            ),
        [sActiveDatabase, sSourceTables],
    );
    const sActiveDatabaseOwners = useMemo<string[]>(
        () => [
            ...new Set(
                sActiveDatabaseTables
                    .map(({ owner }) => owner)
                    .filter(Boolean),
            ),
        ],
        [sActiveDatabaseTables],
    );
    const sDisplayedOwner =
        sSelectedSourceTable?.database === sActiveDatabase
            ? sSelectedSourceTable.owner
            : sActiveDatabaseOwners.length === 1
              ? sActiveDatabaseOwners[0]
              : '';
    const sTableOptions = useMemo<ComboboxOption[]>(
        () => {
            const sTableNameCounts = new Map<string, number>();
            for (const { table } of sActiveDatabaseTables) {
                sTableNameCounts.set(
                    table,
                    (sTableNameCounts.get(table) ?? 0) + 1,
                );
            }

            return sActiveDatabaseTables.map(
                ({ owner, table, qualifiedName }) => ({
                    value: qualifiedName,
                    label:
                        sTableNameCounts.get(table) === 1
                            ? table
                            : [owner, table].filter(Boolean).join('.'),
                    tooltip: qualifiedName,
                    testId: `tag-analyzer-table-option-${encodeTestIdSegment(qualifiedName)}`,
                }),
            );
        },
        [sActiveDatabaseTables],
    );
    const sTimeColumnOptions = useMemo<ComboboxOption[]>(
        () =>
            getTagAnalyzerTimeColumns(tableColumns).map((item) => ({
                label: `${item[0]} (${item[1] === DATETIME_COLUMN_TYPE ? 'DateTime' : 'Numeric'})`,
                value: item[0],
            })),
        [tableColumns],
    );
    const sValueColumnOptions = useMemo<ComboboxOption[]>(
        () =>
            getTagAnalyzerValueColumns(tableColumns).map((item) => ({
                label: isJsonTypeColumn(item[1])
                    ? `${item[0]} (JSON)`
                    : formatRollupOptionLabel(
                          item[0],
                          getPanelSeriesValueSummaryLabel(
                              rollupTableList,
                              selectedTable,
                              item[0],
                          ),
                      ),
                value: item[0],
            })),
        [rollupTableList, selectedTable, tableColumns],
    );
    const sIsJsonValue = isTagAnalyzerJsonValue(
        tableColumns,
        sourceColumns?.value ?? '',
    );

    useLatestAsyncRequest({
        enabled: sColumnRequestTable !== '',
        requestKey: sColumnRequestTable,
        fetch: async () => {
            const tableColumns = await tableMetadataApi.fetchTableColumns(
                sColumnRequestTable,
            );
            const columnInfo = createTagAnalyzerColumnInfo(tableColumns);
            return {
                table: sColumnRequestTable,
                sourceColumns: {
                    name:
                        columnInfo.name ||
                        String(tableColumns[0]?.name ?? ''),
                    time: columnInfo.time,
                    timeType: columnInfo.timeType,
                    timeBaseTime: columnInfo.timeBaseTime,
                    value:
                        columnInfo.value ||
                        String(tableColumns[2]?.name ?? ''),
                    jsonKey: columnInfo.jsonKey ?? '',
                },
                tableColumns,
            };
        },
        onSuccess: ({
            table,
            sourceColumns: nextSourceColumns,
            tableColumns: nextTableColumns,
        }) => {
            sColumnResultsByTableRef.current[table] = {
                sourceColumns: nextSourceColumns,
                tableColumns: nextTableColumns,
            };
            onSourceChange(table, nextSourceColumns, nextTableColumns);
        },
        onError: (error) => onError(getErrorMessageFromValue(error)),
    });

    const loadColumns = useCallback(
        (table: string): void => {
            const sCachedResult = sColumnResultsByTableRef.current[table];
            if (sCachedResult) {
                onSourceChange(
                    table,
                    sCachedResult.sourceColumns,
                    sCachedResult.tableColumns,
                );
                return;
            }
            setColumnRequestTable(table);
        },
        [onSourceChange],
    );

    const changeTable = useCallback(
        (value: string): void => {
            if (value === selectedTable && sourceColumns) return;

            setColumnRequestTable('');
            onSourceChange(value, undefined, []);

            if (value) {
                loadColumns(value);
            }
        },
        [loadColumns, onSourceChange, selectedTable, sourceColumns],
    );

    const changeDatabase = useCallback(
        (value: string): void => {
            setSelectedDatabase(value);
            if (value !== sSelectedTableDatabase) changeTable('');
        },
        [changeTable, sSelectedTableDatabase],
    );

    /**
     * Reconcile the series' stored table with the list the server just returned.
     *
     * This used to be a string comparison against the list, and anything that failed it was
     * replaced by `availableSourceTableNames[0]`. The three names a board can hold —
     * `SENSOR` from before v8.7, `SYS.SENSOR`, and the `FACTORY_A.SYS.SENSOR` the explorer hands
     * over — do not compare equal to each other, so opening a saved board silently repointed its
     * series at an unrelated table and charted it under the board's own title.
     *
     * `resolveStoredTableName` applies the tail rule the engine itself accepts, so the short forms
     * are *promoted* to the qualified name rather than discarded. Only a genuinely new series
     * (no table at all) still takes the first entry; a name that resolves to nothing, or to several
     * tables in different databases, keeps what the board said and says so in the footer. There is
     * no name that means what the board intended, and picking one anyway is the bug being removed.
     */
    useEffect(() => {
        if (availableSourceTableNames.length === 0) return;

        const sResolved = resolveStoredTableName(
            selectedTable,
            availableSourceTableNames,
        );
        if (sResolved.status === 'exact') return;
        if (sResolved.status === 'promoted') {
            if (sResolved.name !== selectedTable) changeTable(sResolved.name);
            return;
        }
        if (!selectedTable) {
            // Keep the initial default, but after an explicit database change leave Table
            // empty so the user chooses a source inside that database.
            if (sDatabaseNames.includes(sSelectedDatabase)) return;
            changeTable(
                sActiveDatabaseTables[0]?.qualifiedName ??
                    availableSourceTableNames[0],
            );
            return;
        }
        onError(
            sResolved.status === 'ambiguous'
                ? `${selectedTable} matches ${sResolved.candidates.length} tables (${sResolved.candidates.join(', ')}). Pick one so the series names its database.`
                : `${selectedTable} is not in this server's tag table list. The series still points at it.`,
        );
    }, [
        availableSourceTableNames,
        changeTable,
        onError,
        sActiveDatabaseTables,
        sDatabaseNames,
        sSelectedDatabase,
        selectedTable,
    ]);

    function patchColumnSelection(
        patch: Partial<PanelSeriesSourceColumns>,
    ): void {
        const nextColumns = createTagAnalyzerColumnInfo(tableColumns, {
            ...sourceColumns,
            ...patch,
        });
        if (selectedTable) {
            sColumnResultsByTableRef.current[selectedTable] = {
                sourceColumns: nextColumns,
                tableColumns,
            };
        }
        onSourceChange(selectedTable, nextColumns, tableColumns);
    }

    function changeValueColumn(value: string): void {
        const sJsonOptionsKey = getJsonPathOptionsKey(selectedTable, value);
        const sJsonKey =
            isTagAnalyzerJsonValue(tableColumns, value) &&
            sourceColumns?.value === value
                ? sourceColumns?.jsonKey ?? ''
                : sJsonKeyByColumnRef.current[sJsonOptionsKey] ?? '';
        patchColumnSelection({
            value,
            jsonKey: isTagAnalyzerJsonValue(tableColumns, value)
                ? sJsonKey
                : '',
        });
    }

    function applyJsonKey(jsonKey: string): void {
        if (!sourceColumns) {
            return;
        }

        patchColumnSelection({ jsonKey });
        sJsonKeyByColumnRef.current[
            getJsonPathOptionsKey(selectedTable, sourceColumns.value)
        ] = jsonKey;
    }

    return (
        <>
            <div className={styles.fieldGroups}>
                <div
                    className={styles.sourceFieldGrid}
                    role="group"
                    aria-label="Source location"
                >
                    <SourceComboboxField
                        label="Database"
                        options={sDatabaseOptions}
                        value={sActiveDatabase}
                        onChange={changeDatabase}
                        disabled={isTableNameLoading}
                    />
                    <SourceReadOnlyField
                        label="User"
                        value={sDisplayedOwner}
                        placeholder={
                            sActiveDatabaseOwners.length > 1
                                ? 'Select a table'
                                : undefined
                        }
                    />
                    <SourceComboboxField
                        label="Table"
                        options={sTableOptions}
                        value={selectedTable}
                        onChange={changeTable}
                        disabled={isTableNameLoading || !sActiveDatabase}
                        dropdownWidth="auto"
                    />
                </div>
                <div
                    className={styles.columnFieldGrid}
                    role="group"
                    aria-label="Source fields"
                >
                    <SourceComboboxField
                        label="Time"
                        options={sTimeColumnOptions}
                        value={sourceColumns?.time ?? ''}
                        onChange={(value) =>
                            patchColumnSelection({ time: value })
                        }
                        disabled={isTableNameLoading || !selectedTable}
                    />
                    <SourceComboboxField
                        label="Value"
                        options={sValueColumnOptions}
                        value={sourceColumns?.value ?? ''}
                        onChange={changeValueColumn}
                        disabled={isTableNameLoading || !selectedTable}
                    >
                        <ValueRollupStatus
                            rollupTableList={rollupTableList}
                            selectedTable={selectedTable}
                            valueColumn={sourceColumns?.value ?? ''}
                            jsonKey={sourceColumns?.jsonKey}
                        />
                    </SourceComboboxField>
                </div>
            </div>

            {sIsJsonValue ? (
                <JsonKeyField
                    selectedTable={selectedTable}
                    valueColumn={sourceColumns?.value ?? ''}
                    selectedJsonKey={sourceColumns?.jsonKey ?? ''}
                    rollupTableList={rollupTableList}
                    onApplyJsonKey={applyJsonKey}
                    onError={onError}
                />
            ) : null}
        </>
    );
}

function parseSourceTableOption(qualifiedName: string): SourceTableOption {
    const sParts = qualifiedName.split('.');
    const sTable = sParts.at(-1) ?? qualifiedName;

    return {
        database:
            sParts.length >= 3 ? sParts[0] : getCurrentDatabaseName(),
        owner: sParts.length >= 2 ? sParts.at(-2) ?? '' : '',
        table: sTable,
        qualifiedName,
    };
}

function ValueRollupStatus({
    rollupTableList,
    selectedTable,
    valueColumn,
    jsonKey,
}: {
    rollupTableList: RollupTableMap;
    selectedTable: string;
    valueColumn: string;
    jsonKey?: string;
}) {
    const sTooltipId = `create-panel-value-rollup-${useId().replace(/:/g, '')}`;
    if (!selectedTable || !valueColumn) {
        return null;
    }

    const sRollupInfo = getPanelSeriesRollupInfo(
        rollupTableList,
        selectedTable,
        valueColumn,
        jsonKey,
    );
    const sLabel = sRollupInfo
        ? `Has Rollup (${formatRollupRangeLabel(sRollupInfo)})`
        : 'No Rollup';
    const sTooltip = sRollupInfo
        ? [
              `Column: ${sRollupInfo.columnName}`,
              `Minimum Rollup: ${formatRollupIntervalList([sRollupInfo.minimumInterval])}`,
              `Maximum Rollup: ${formatRollupIntervalList([sRollupInfo.maximumInterval])}`,
              `Intervals: ${formatRollupIntervalList(sRollupInfo.intervals)}`,
          ].join('\n')
        : `No rollup intervals found for ${valueColumn}.`;

    return (
        <>
            <span
                className={[
                    styles.valueRollupStatus,
                    sRollupInfo
                        ? styles.valueRollupStatusActive
                        : styles.valueRollupStatusInactive,
                ].join(' ')}
                data-tooltip-id={sTooltipId}
                data-tooltip-content={sTooltip}
            >
                {sLabel}
            </span>
            <Tooltip
                id={sTooltipId}
                className="tooltip-div"
                place="bottom"
                positionStrategy="fixed"
                delayShow={250}
                style={{ whiteSpace: 'pre-line' }}
            />
        </>
    );
}

function JsonKeyField({
    selectedTable,
    valueColumn,
    selectedJsonKey,
    rollupTableList,
    onApplyJsonKey,
    onError,
}: {
    selectedTable: string;
    valueColumn: string;
    selectedJsonKey: string;
    rollupTableList: RollupTableMap;
    onApplyJsonKey: (jsonKey: string) => void;
    onError: (message: string) => void;
}) {
    const [sJsonPathOptionsByColumn, setJsonPathOptionsByColumn] = useState<
        Record<string, string[]>
    >({});
    const [sJsonKeyInputDraft, setJsonKeyInputDraft] = useState<
        string | undefined
    >();
    const sJsonPathOptionsKey = getJsonPathOptionsKey(
        selectedTable,
        valueColumn,
    );
    const sJsonPathOptions =
        sJsonPathOptionsByColumn[sJsonPathOptionsKey] ??
        EMPTY_JSON_PATH_OPTIONS;
    const sSelectedJsonKeySummaryLabel = selectedJsonKey
        ? getPanelSeriesValueSummaryLabel(
              rollupTableList,
              selectedTable,
              valueColumn,
              selectedJsonKey,
          )
        : undefined;
    const sJsonKeyOptions = useMemo<ComboboxOption[]>(
        () =>
            sJsonPathOptions.map((path) => ({
                label: formatRollupOptionLabel(
                    displayJsonPathLabel(path),
                    getPanelSeriesValueSummaryLabel(
                        rollupTableList,
                        selectedTable,
                        valueColumn,
                        path,
                    ),
                ),
                value: path,
            })),
        [rollupTableList, sJsonPathOptions, selectedTable, valueColumn],
    );
    const sJsonKeyInputValue =
        sJsonKeyInputDraft ?? displayJsonPathLabel(selectedJsonKey);

    useEffect(() => {
        setJsonKeyInputDraft(undefined);
    }, [sJsonPathOptionsKey]);

    useLatestAsyncRequest({
        enabled: Boolean(
            selectedTable &&
                valueColumn &&
                sJsonPathOptionsKey &&
                !sJsonPathOptionsByColumn[sJsonPathOptionsKey],
        ),
        requestKey: sJsonPathOptionsKey,
        fetch: () =>
            tableMetadataApi.fetchJsonColumnPaths(
                selectedTable,
                valueColumn,
            ),
        onSuccess: (paths) =>
            setJsonPathOptionsByColumn((previousOptions) => ({
                ...previousOptions,
                [sJsonPathOptionsKey]: paths,
            })),
        onError: (error) => onError(getErrorMessageFromValue(error)),
    });

    function applyJsonKeyInput(value: string): void {
        onApplyJsonKey(jsonPathInputToStoredPath(value, sJsonPathOptions));
    }

    function commitJsonKeyInput(): void {
        if (sJsonKeyInputDraft === undefined) {
            return;
        }

        applyJsonKeyInput(sJsonKeyInputDraft);
        setJsonKeyInputDraft(undefined);
    }

    return (
        <div className={styles.fieldGridFull}>
            <span className={styles.jsonKeyLabel}>
                <span>-&gt;$</span>
                {sSelectedJsonKeySummaryLabel ? (
                    <span className={styles.jsonKeyMeta}>
                        {sSelectedJsonKeySummaryLabel}
                    </span>
                ) : null}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <InputSelect
                    aria-label="JSON key"
                    type="text"
                    options={sJsonKeyOptions}
                    value={sJsonKeyInputValue}
                    onChange={(event) =>
                        setJsonKeyInputDraft(event.target.value)
                    }
                    onBlur={commitJsonKeyInput}
                    selectValue={selectedJsonKey}
                    onSelectChange={(value) => {
                        setJsonKeyInputDraft(undefined);
                        applyJsonKeyInput(value);
                    }}
                    fullWidth
                    size="md"
                />
            </div>
        </div>
    );
}

function SourceComboboxField({
    label,
    options,
    value,
    onChange,
    disabled,
    dropdownWidth,
    children,
}: {
    label: string;
    options: ComboboxOption[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    dropdownWidth?: 'trigger' | 'auto';
    children?: ReactNode;
}) {
    const sInputId = useId();

    return (
        <div className={styles.fieldCell}>
            <label className={styles.fieldLabelTop} htmlFor={sInputId}>
                {label}
            </label>
            <Combobox.Root
                options={options}
                value={value}
                onChange={onChange}
                disabled={disabled}
                fullWidth
                size="md"
            >
                <Combobox.Input id={sInputId} />
                <Combobox.Trigger icon={<ArrowDown size={14} />} />
                <Combobox.Dropdown width={dropdownWidth}>
                    <Combobox.List />
                </Combobox.Dropdown>
            </Combobox.Root>
            {children}
        </div>
    );
}

function SourceReadOnlyField({
    label,
    value,
    placeholder,
}: {
    label: string;
    value: string;
    placeholder?: string;
}) {
    const sInputId = useId();

    return (
        <div className={styles.fieldCell}>
            <label className={styles.fieldLabelTop} htmlFor={sInputId}>
                {label}
            </label>
            <Input
                id={sInputId}
                value={value}
                placeholder={placeholder}
                readOnly
                fullWidth
                size="md"
            />
        </div>
    );
}

function getJsonPathOptionsKey(
    tableName: string,
    valueColumn: string,
): string {
    return tableName && valueColumn
        ? [tableName, valueColumn].join('\u0000')
        : '';
}

function formatRollupOptionLabel(
    label: string,
    summaryLabel: string | undefined,
): string {
    return summaryLabel ? `${label} (${summaryLabel})` : label;
}
