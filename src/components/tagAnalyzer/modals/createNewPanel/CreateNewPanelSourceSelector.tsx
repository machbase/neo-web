import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
} from 'react';
import { ArrowDown } from '@/assets/icons/Icon';
import {
    Combobox,
    InputSelect,
    type ComboboxOption,
} from '@/design-system/components';
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
    type TagAnalyzerColumnInfo,
} from '@/utils/tagAnalyzerFields';
import { DATETIME_COLUMN_TYPE } from '@/utils/timeFieldColumns';
import type { RollupTableMap } from '../../fetch/panelData/PanelDataFetchTypes';
import {
    updateNewPanelSeriesSourceColumns,
    getCreateNewPanelValueSummaryLabel,
} from './CreateNewPanelMetadata';
import {
    fetchTableInfoSearchJsonColumnPaths,
    fetchTableInfoSearchTableMetadataBatch,
    fetchTableInfoSearchTableMetadata,
    type TableInfoSearchColumnMetadataRow,
} from '../../fetch/tableInfoSearch/TableInfoSearchFetch';
import {
    NewPanelTimeType,
    type NewPanelSeriesPath,
    getNewPanelTimeTypeFromSourceColumns,
    isNewPanelTableTimeTypeCompatible,
} from './CreateNewPanelTypes';
import styles from './CreateNewPanel.module.scss';

type TableMetadataCacheEntry = {
    sourceColumns: TagAnalyzerColumnInfo | undefined;
    tableColumns: TableInfoSearchColumnMetadataRow[];
};

export function CreateNewPanelSourceSelector({
    availableSourceTableNames,
    rollupTableList,
    isTableNameLoading,
    selectedTags,
    selectedTimeType,
    tableTimeTypeByTable,
    onSourceChange,
    onSelectedTagsChange,
    onTableTimeTypeChange,
    onError,
}: {
    availableSourceTableNames: string[];
    rollupTableList: RollupTableMap;
    isTableNameLoading: boolean;
    selectedTags: NewPanelSeriesPath[];
    selectedTimeType: NewPanelTimeType;
    tableTimeTypeByTable: Record<string, NewPanelTimeType>;
    onSourceChange: (
        table: string,
        sourceColumns: TagAnalyzerColumnInfo | undefined,
        tableColumns: TableInfoSearchColumnMetadataRow[],
    ) => void;
    onSelectedTagsChange: (selectedTags: NewPanelSeriesPath[]) => boolean;
    onTableTimeTypeChange: (table: string, timeType: NewPanelTimeType) => void;
    onError: (message: string) => void;
}) {
    const [sSelectedTable, setSelectedTable] = useState('');
    const [sSourceColumns, setSourceColumns] =
        useState<TagAnalyzerColumnInfo | undefined>();
    const [sTableColumns, setTableColumns] =
        useState<TableInfoSearchColumnMetadataRow[]>([]);
    const [sJsonPathOptionsByColumn, setJsonPathOptionsByColumn] =
        useState<Record<string, string[]>>({});
    const [sJsonKeyInputDraft, setJsonKeyInputDraft] =
        useState<string | undefined>();
    const [sColumnResultsByTable, setColumnResultsByTable] =
        useState<Record<string, TableMetadataCacheEntry>>({});
    const [sSourceColumnsByTable, setSourceColumnsByTable] =
        useState<Record<string, TagAnalyzerColumnInfo>>({});
    const [sJsonKeyByColumn, setJsonKeyByColumn] =
        useState<Record<string, string>>({});
    const sColumnRequestKeyRef = useRef(0);

    const sTableOptions = useMemo<ComboboxOption[]>(
        () =>
            availableSourceTableNames.map((table) => {
                const sTableTimeType = tableTimeTypeByTable[table];

                return {
                    value: table,
                    label: getTableOptionLabel(table, sTableTimeType),
                    disabled: !isNewPanelTableTimeTypeCompatible(
                        selectedTimeType,
                        sTableTimeType,
                    ),
                };
            }),
        [availableSourceTableNames, selectedTimeType, tableTimeTypeByTable],
    );
    const sTimeColumnOptions = useMemo<ComboboxOption[]>(
        () =>
            getTagAnalyzerTimeColumns(sTableColumns).map((item) => ({
                label: `${item[0]} (${item[1] === DATETIME_COLUMN_TYPE ? 'dateTime' : 'numeric'})`,
                value: item[0],
            })),
        [sTableColumns],
    );
    const sValueColumnOptions = useMemo<ComboboxOption[]>(
        () =>
            getTagAnalyzerValueColumns(sTableColumns).map((item) => {
                const sIsJsonColumn = isJsonTypeColumn(item[1]);
                const sSummaryLabel = sIsJsonColumn
                    ? undefined
                    : getCreateNewPanelValueSummaryLabel(
                          rollupTableList,
                          sSelectedTable,
                          item[0],
                      );

                return {
                    label: sIsJsonColumn
                        ? `${item[0]} (JSON)`
                        : sSummaryLabel
                            ? `${item[0]} (${sSummaryLabel})`
                            : item[0],
                    value: item[0],
                };
            }),
        [rollupTableList, sSelectedTable, sTableColumns],
    );
    const sIsJsonValue = isTagAnalyzerJsonValue(
        sTableColumns,
        sSourceColumns?.value ?? '',
    );
    const sSelectedJsonKey = sSourceColumns?.jsonKey ?? '';
    const sSelectedJsonKeySummaryLabel =
        sIsJsonValue && sSelectedJsonKey
            ? getCreateNewPanelValueSummaryLabel(
                  rollupTableList,
                  sSelectedTable,
                  sSourceColumns?.value ?? '',
                  sSelectedJsonKey,
              )
            : undefined;
    const sJsonPathOptionsKey = getJsonPathOptionsKey(
        sSelectedTable,
        sSourceColumns?.value ?? '',
    );
    const sSelectedJsonPathOptions = useMemo(
        () => (
            sJsonPathOptionsKey
                ? sJsonPathOptionsByColumn[sJsonPathOptionsKey] ?? []
                : []
        ),
        [sJsonPathOptionsByColumn, sJsonPathOptionsKey],
    );
    const sJsonKeyOptions = useMemo<ComboboxOption[]>(
        () =>
            sSelectedJsonPathOptions.map((path) => {
                const sSummaryLabel = getCreateNewPanelValueSummaryLabel(
                    rollupTableList,
                    sSelectedTable,
                    sSourceColumns?.value ?? '',
                    path,
                );

                const sPathLabel = displayJsonPathLabel(path);

                return {
                    label: sSummaryLabel
                        ? `${sPathLabel} (${sSummaryLabel})`
                        : sPathLabel,
                    value: path,
                };
            }),
        [
            rollupTableList,
            sSelectedJsonPathOptions,
            sSelectedTable,
            sSourceColumns?.value,
        ],
    );
    const sJsonKeyInputValue =
        sJsonKeyInputDraft ?? displayJsonPathLabel(sSelectedJsonKey);

    useEffect(() => {
        let sIsCanceled = false;

        async function loadTableMetadataBatch(): Promise<void> {
            if (availableSourceTableNames.length === 0) {
                return;
            }

            try {
                const sMetadataByTable =
                    await fetchTableInfoSearchTableMetadataBatch(
                        availableSourceTableNames,
                    );

                if (sIsCanceled) {
                    return;
                }

                setColumnResultsByTable((previousResults) => {
                    let sDidChange = false;
                    const sNextResults = { ...previousResults };

                    for (const [table, result] of Object.entries(sMetadataByTable)) {
                        if (sNextResults[table]) {
                            continue;
                        }

                        sNextResults[table] = {
                            sourceColumns: result.columns,
                            tableColumns: result.tableColumns,
                        };
                        sDidChange = true;
                    }

                    return sDidChange ? sNextResults : previousResults;
                });

                for (const [table, result] of Object.entries(sMetadataByTable)) {
                    onTableTimeTypeChange(
                        table,
                        getNewPanelTimeTypeFromSourceColumns(result.columns),
                    );
                }
            } catch (error) {
                if (!sIsCanceled) {
                    onError(getErrorMessage(error));
                }
            }
        }

        void loadTableMetadataBatch();

        return () => {
            sIsCanceled = true;
        };
    }, [availableSourceTableNames, onError, onTableTimeTypeChange]);

    useEffect(() => {
        async function loadJsonPathOptions(): Promise<void> {
            if (
                !sSelectedTable ||
                !sSourceColumns?.value ||
                !isTagAnalyzerJsonValue(sTableColumns, sSourceColumns.value) ||
                !sJsonPathOptionsKey ||
                sJsonPathOptionsByColumn[sJsonPathOptionsKey]
            ) {
                return;
            }

            try {
                const sPaths = await fetchTableInfoSearchJsonColumnPaths(
                    sSelectedTable,
                    sSourceColumns.value,
                );
                setJsonPathOptionsByColumn((previousOptions) => (
                    previousOptions[sJsonPathOptionsKey]
                        ? previousOptions
                        : {
                              ...previousOptions,
                              [sJsonPathOptionsKey]: sPaths,
                          }
                ));
            } catch (error) {
                onError(getErrorMessage(error));
            }
        }

        void loadJsonPathOptions();
    }, [
        onError,
        sJsonPathOptionsByColumn,
        sJsonPathOptionsKey,
        sSelectedTable,
        sSourceColumns?.value,
        sTableColumns,
    ]);
    const applyLoadedColumns = useCallback((
        table: string,
        sourceColumns: TagAnalyzerColumnInfo | undefined,
        tableColumns: TableInfoSearchColumnMetadataRow[],
    ): void => {
        const sTableTimeType = getNewPanelTimeTypeFromSourceColumns(sourceColumns);

        onTableTimeTypeChange(table, sTableTimeType);
        if (!isNewPanelTableTimeTypeCompatible(selectedTimeType, sTableTimeType)) {
            setSourceColumns(undefined);
            setTableColumns(tableColumns);
            onSourceChange(table, undefined, tableColumns);
            onError(getTableTimeTypeMismatchMessage(selectedTimeType, sTableTimeType));
            return;
        }

        setSourceColumns(sourceColumns);
        setTableColumns(tableColumns);
        onSourceChange(table, sourceColumns, tableColumns);
    }, [
        onError,
        onSourceChange,
        onTableTimeTypeChange,
        selectedTimeType,
    ]);

    const loadColumns = useCallback(async (
        table: string,
        currentColumns?: Partial<TagAnalyzerColumnInfo>,
    ): Promise<void> => {
        const sRequestKey = sColumnRequestKeyRef.current + 1;
        sColumnRequestKeyRef.current = sRequestKey;

        const sCachedResult = sColumnResultsByTable[table];
        if (sCachedResult) {
            const sNextColumns =
                sSourceColumnsByTable[table] ??
                sCachedResult.sourceColumns;
            applyLoadedColumns(
                table,
                sNextColumns,
                sCachedResult.tableColumns,
            );
            return;
        }

        try {
            const sResult = await fetchTableInfoSearchTableMetadata(
                table,
                currentColumns,
            );
            if (sColumnRequestKeyRef.current !== sRequestKey) {
                return;
            }
            if (sResult.errorMessage) {
                onError(sResult.errorMessage);
            }

            setColumnResultsByTable((previousResults) => ({
                ...previousResults,
                [table]: {
                    sourceColumns: sResult.columns,
                    tableColumns: sResult.tableColumns,
                },
            }));
            applyLoadedColumns(
                table,
                sResult.columns,
                sResult.tableColumns,
            );
        } catch (error) {
            if (sColumnRequestKeyRef.current === sRequestKey) {
                onError(getErrorMessage(error));
            }
        }
    }, [
        applyLoadedColumns,
        onError,
        sColumnResultsByTable,
        sSourceColumnsByTable,
    ]);

    const clearCurrentColumns = useCallback((): void => {
        setJsonKeyInputDraft(undefined);
        setSourceColumns(undefined);
        setTableColumns([]);
    }, []);

    const changeTable = useCallback((value: string): void => {
        const sTableTimeType = tableTimeTypeByTable[value];

        if (!isNewPanelTableTimeTypeCompatible(selectedTimeType, sTableTimeType)) {
            onError(getTableTimeTypeMismatchMessage(selectedTimeType, sTableTimeType));
            return;
        }

        setSelectedTable(value);
        clearCurrentColumns();

        if (!sColumnResultsByTable[value]) {
            onSourceChange(value, undefined, []);
        }

        if (value) {
            void loadColumns(value);
        }
    }, [
        clearCurrentColumns,
        loadColumns,
        onError,
        onSourceChange,
        sColumnResultsByTable,
        selectedTimeType,
        tableTimeTypeByTable,
    ]);

    useEffect(() => {
        const sFallbackTable = availableSourceTableNames[0] ?? '';
        const sShouldPickFallback =
            !sSelectedTable ||
            (
                availableSourceTableNames.length > 0 &&
                !availableSourceTableNames.includes(sSelectedTable)
            );

        if (sShouldPickFallback && sFallbackTable !== sSelectedTable) {
            changeTable(sFallbackTable);
        }
    }, [availableSourceTableNames, changeTable, sSelectedTable]);

    useEffect(() => {
        const sSelectedTableTimeType = tableTimeTypeByTable[sSelectedTable];

        if (
            !sSelectedTable ||
            isNewPanelTableTimeTypeCompatible(
                selectedTimeType,
                sSelectedTableTimeType,
            )
        ) {
            return;
        }

        setSourceColumns(undefined);
        onSourceChange(sSelectedTable, undefined, sTableColumns);
    }, [
        onSourceChange,
        sSelectedTable,
        sTableColumns,
        selectedTimeType,
        tableTimeTypeByTable,
    ]);

    function applySourceColumns(nextColumns: TagAnalyzerColumnInfo): void {
        const sNextTableTimeType = getNewPanelTimeTypeFromSourceColumns(nextColumns);
        const sHasSelectedCurrentTable = selectedTags.some(
            (item) => item.table === sSelectedTable,
        );

        if (
            !sHasSelectedCurrentTable &&
            !isNewPanelTableTimeTypeCompatible(
                selectedTimeType,
                sNextTableTimeType,
            )
        ) {
            onError(getTableTimeTypeMismatchMessage(
                selectedTimeType,
                sNextTableTimeType,
            ));
            return;
        }

        const sNextTags = selectedTags.map((item) =>
            item.table === sSelectedTable
                ? updateNewPanelSeriesSourceColumns(
                      item,
                      nextColumns,
                      rollupTableList,
                  )
                : item,
        );
        if (!onSelectedTagsChange(sNextTags)) {
            return;
        }

        setSourceColumns(nextColumns);
        if (sSelectedTable) {
            onTableTimeTypeChange(sSelectedTable, sNextTableTimeType);
            setSourceColumnsByTable((previousColumns) => ({
                ...previousColumns,
                [sSelectedTable]: nextColumns,
            }));
        }
        onSourceChange(sSelectedTable, nextColumns, sTableColumns);
    }

    function patchColumnSelection(
        patch: Partial<TagAnalyzerColumnInfo>,
    ): void {
        applySourceColumns(createTagAnalyzerColumnInfo(
            sTableColumns,
            {
                ...sSourceColumns,
                ...patch,
            },
        ));
    }

    function changeTimeColumn(value: string): void {
        patchColumnSelection({ time: value });
    }

    function changeValueColumn(value: string): void {
        const sJsonOptionsKey = getJsonPathOptionsKey(sSelectedTable, value);
        const sJsonKey =
            isTagAnalyzerJsonValue(sTableColumns, value) &&
            sSourceColumns?.value === value
                ? sSourceColumns?.jsonKey ?? ''
                : sJsonKeyByColumn[sJsonOptionsKey] ?? '';
        const sNextJsonKey = isTagAnalyzerJsonValue(sTableColumns, value)
            ? sJsonKey
            : '';

        setJsonKeyInputDraft(undefined);
        patchColumnSelection({ value, jsonKey: sNextJsonKey });
    }

    function changeJsonKey(value: string): void {
        if (!sSourceColumns) {
            return;
        }

        const sKnownPaths = sSelectedJsonPathOptions;
        const sJsonKey = jsonPathInputToStoredPath(value, sKnownPaths);
        patchColumnSelection({
            jsonKey: sJsonKey,
        });
        setJsonKeyByColumn((previousJsonKeys) => ({
            ...previousJsonKeys,
            [getJsonPathOptionsKey(sSelectedTable, sSourceColumns.value)]: sJsonKey,
        }));
    }

    function changeJsonKeyInput(event: ChangeEvent<HTMLInputElement>): void {
        setJsonKeyInputDraft(event.target.value);
    }

    function commitJsonKeyInput(): void {
        if (sJsonKeyInputDraft === undefined) {
            return;
        }

        changeJsonKey(sJsonKeyInputDraft);
        setJsonKeyInputDraft(undefined);
    }

    return (
        <>
            <div className={styles.fieldGrid}>
                <CreateNewPanelComboboxField
                    label="Table"
                    options={sTableOptions}
                    value={sSelectedTable}
                    onChange={changeTable}
                    disabled={isTableNameLoading}
                />
                <CreateNewPanelComboboxField
                    label="Time"
                    options={sTimeColumnOptions}
                    value={sSourceColumns?.time ?? ''}
                    onChange={changeTimeColumn}
                    disabled={isTableNameLoading || !sSelectedTable}
                />
                <CreateNewPanelComboboxField
                    label="Value"
                    options={sValueColumnOptions}
                    value={sSourceColumns?.value ?? ''}
                    onChange={changeValueColumn}
                    disabled={isTableNameLoading || !sSelectedTable}
                />
            </div>

            {sIsJsonValue ? (
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
                            onChange={changeJsonKeyInput}
                            onBlur={commitJsonKeyInput}
                            selectValue={sSelectedJsonKey}
                            onSelectChange={(value) => {
                                setJsonKeyInputDraft(undefined);
                                changeJsonKey(value);
                            }}
                            fullWidth
                            size="sm"
                            style={{ height: '30px' }}
                        />
                    </div>
                </div>
            ) : null}
        </>
    );
}

function CreateNewPanelComboboxField({
    label,
    options,
    value,
    onChange,
    disabled,
}: {
    label: string;
    options: ComboboxOption[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}) {
    return (
        <div className={styles.fieldCell}>
            <label className={styles.fieldLabelTop}>{label}</label>
            <Combobox.Root
                options={options}
                value={value}
                onChange={onChange}
                disabled={disabled}
                fullWidth
                size="sm"
            >
                <Combobox.Input />
                <Combobox.Trigger icon={<ArrowDown size={14} />} />
                <Combobox.Dropdown>
                    <Combobox.List />
                </Combobox.Dropdown>
            </Combobox.Root>
        </div>
    );
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function getJsonPathOptionsKey(tableName: string, valueColumn: string): string {
    return tableName && valueColumn ? `${tableName}\u0000${valueColumn}` : '';
}

function getTableOptionLabel(
    tableName: string,
    timeType: NewPanelTimeType | undefined,
): string {
    return timeType && timeType !== NewPanelTimeType.Unselected
        ? `${tableName} (${timeType})`
        : tableName;
}

function getTableTimeTypeMismatchMessage(
    selectedTimeType: NewPanelTimeType,
    tableTimeType: NewPanelTimeType | undefined,
): string {
    const sTableTypeLabel = tableTimeType ?? NewPanelTimeType.Unselected;

    return `Selected series use ${selectedTimeType} time. ${sTableTypeLabel} time tables cannot be mixed in one chart.`;
}

