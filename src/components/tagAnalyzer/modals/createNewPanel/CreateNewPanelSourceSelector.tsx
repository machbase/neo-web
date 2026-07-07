import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
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
} from '@/utils/tagAnalyzerFields';
import {
    PanelSeriesTimeType,
    getPanelSeriesTimeTypeFromSourceColumns,
    isPanelSeriesTableTimeTypeCompatible,
    type PanelSeriesSourceColumns,
} from '../../domain/SeriesDomain';
import type { RollupTableMap } from '../../fetch/panelData/PanelDataFetchTypes';
import { getPanelSeriesValueSummaryLabel } from './CreateNewPanelSeries';
import { fetchTableInfoSearchJsonColumnPaths } from '../../fetch/tableInfoSearch/TableInfoSearchFetch';
import {
    fetchTableSchema,
    fetchTableSchemaBatch,
    MachbaseColumnType,
    type TableSchemaColumn,
} from '../../fetch/tableSchema/fetchTableSchema';
import styles from './CreateNewPanel.module.scss';

type TableSchemaCacheEntry = {
    sourceColumns: PanelSeriesSourceColumns | undefined;
    tableColumns: TableSchemaColumn[];
};

export function CreateNewPanelSourceSelector({
    availableSourceTableNames,
    rollupTableList,
    isTableNameLoading,
    selectedTable,
    sourceColumns,
    tableColumns,
    selectedTimeType,
    tableTimeTypeByTable,
    onSourceChange,
    onTableTimeTypeChange,
    onError,
}: {
    availableSourceTableNames: string[];
    rollupTableList: RollupTableMap;
    isTableNameLoading: boolean;
    selectedTable: string;
    sourceColumns: PanelSeriesSourceColumns | undefined;
    tableColumns: TableSchemaColumn[];
    selectedTimeType: PanelSeriesTimeType;
    tableTimeTypeByTable: Record<string, PanelSeriesTimeType>;
    onSourceChange: (
        table: string,
        sourceColumns: PanelSeriesSourceColumns | undefined,
        tableColumns: TableSchemaColumn[],
    ) => void;
    onTableTimeTypeChange: (table: string, timeType: PanelSeriesTimeType) => void;
    onError: (message: string) => void;
}) {
    const [sColumnResultsByTable, setColumnResultsByTable] =
        useState<Record<string, TableSchemaCacheEntry>>({});
    const [sSourceColumnsByTable, setSourceColumnsByTable] =
        useState<Record<string, PanelSeriesSourceColumns>>({});
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
                    disabled: !isPanelSeriesTableTimeTypeCompatible(
                        selectedTimeType,
                        sTableTimeType,
                    ),
                };
            }),
        [availableSourceTableNames, selectedTimeType, tableTimeTypeByTable],
    );
    const sTimeColumnOptions = useMemo<ComboboxOption[]>(
        () =>
            getTagAnalyzerTimeColumns(tableColumns).map((item) => ({
                label: `${item[0]} (${item[1] === MachbaseColumnType.DateTime ? 'dateTime' : 'numeric'})`,
                value: item[0],
            })),
        [tableColumns],
    );
    const sValueColumnOptions = useMemo<ComboboxOption[]>(
        () =>
            getTagAnalyzerValueColumns(tableColumns).map((item) => {
                const sIsJsonColumn = isJsonTypeColumn(item[1]);
                const sSummaryLabel = sIsJsonColumn
                    ? undefined
                    : getPanelSeriesValueSummaryLabel(
                          rollupTableList,
                          selectedTable,
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
        [rollupTableList, selectedTable, tableColumns],
    );
    const sIsJsonValue = isTagAnalyzerJsonValue(
        tableColumns,
        sourceColumns?.value ?? '',
    );

    useEffect(() => {
        let sIsCanceled = false;

        async function loadTableSchemaBatch(): Promise<void> {
            if (availableSourceTableNames.length === 0) {
                return;
            }

            try {
                const sSchemaByTable = await fetchTableSchemaBatch(
                    availableSourceTableNames,
                );

                if (sIsCanceled) {
                    return;
                }

                setColumnResultsByTable((previousResults) => {
                    let sDidChange = false;
                    const sNextResults = { ...previousResults };

                    for (const [table, columns] of Object.entries(sSchemaByTable)) {
                        if (sNextResults[table]) {
                            continue;
                        }

                        const sSourceColumns = createSourceColumns(columns);

                        sNextResults[table] = {
                            sourceColumns: sSourceColumns,
                            tableColumns: columns,
                        };
                        sDidChange = true;
                    }

                    return sDidChange ? sNextResults : previousResults;
                });

                for (const [table, columns] of Object.entries(sSchemaByTable)) {
                    onTableTimeTypeChange(
                        table,
                        getPanelSeriesTimeTypeFromSourceColumns(
                            createSourceColumns(columns),
                        ),
                    );
                }
            } catch (error) {
                if (!sIsCanceled) {
                    onError(getErrorMessage(error));
                }
            }
        }

        void loadTableSchemaBatch();

        return () => {
            sIsCanceled = true;
        };
    }, [availableSourceTableNames, onError, onTableTimeTypeChange]);

    const applyLoadedColumns = useCallback((
        table: string,
        sourceColumns: PanelSeriesSourceColumns | undefined,
        tableColumns: TableSchemaColumn[],
    ): void => {
        const sTableTimeType = getPanelSeriesTimeTypeFromSourceColumns(sourceColumns);

        onTableTimeTypeChange(table, sTableTimeType);
        if (!isPanelSeriesTableTimeTypeCompatible(selectedTimeType, sTableTimeType)) {
            onSourceChange(table, undefined, tableColumns);
            onError(getTableTimeTypeMismatchMessage(selectedTimeType, sTableTimeType));
            return;
        }

        onSourceChange(table, sourceColumns, tableColumns);
    }, [
        onError,
        onSourceChange,
        onTableTimeTypeChange,
        selectedTimeType,
    ]);

    const loadColumns = useCallback(async (
        table: string,
        currentColumns?: Partial<PanelSeriesSourceColumns>,
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
            const sTableColumns = await fetchTableSchema(table);
            if (sColumnRequestKeyRef.current !== sRequestKey) {
                return;
            }
            const sSourceColumns = createSourceColumns(
                sTableColumns,
                currentColumns,
            );

            setColumnResultsByTable((previousResults) => ({
                ...previousResults,
                [table]: {
                    sourceColumns: sSourceColumns,
                    tableColumns: sTableColumns,
                },
            }));
            applyLoadedColumns(
                table,
                sSourceColumns,
                sTableColumns,
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

    const changeTable = useCallback((value: string): void => {
        const sTableTimeType = tableTimeTypeByTable[value];

        if (!isPanelSeriesTableTimeTypeCompatible(selectedTimeType, sTableTimeType)) {
            onError(getTableTimeTypeMismatchMessage(selectedTimeType, sTableTimeType));
            return;
        }

        onSourceChange(value, undefined, []);

        if (value) {
            void loadColumns(value);
        }
    }, [
        loadColumns,
        onError,
        onSourceChange,
        selectedTimeType,
        tableTimeTypeByTable,
    ]);

    useEffect(() => {
        const sFallbackTable = availableSourceTableNames[0] ?? '';
        const sShouldPickFallback =
            !selectedTable ||
            (
                availableSourceTableNames.length > 0 &&
                !availableSourceTableNames.includes(selectedTable)
            );

        if (sShouldPickFallback && sFallbackTable !== selectedTable) {
            changeTable(sFallbackTable);
        }
    }, [availableSourceTableNames, changeTable, selectedTable]);

    useEffect(() => {
        const sSelectedTableTimeType = tableTimeTypeByTable[selectedTable];

        if (
            !selectedTable ||
            isPanelSeriesTableTimeTypeCompatible(
                selectedTimeType,
                sSelectedTableTimeType,
            )
        ) {
            return;
        }

        onSourceChange(selectedTable, undefined, tableColumns);
    }, [
        onSourceChange,
        selectedTable,
        tableColumns,
        selectedTimeType,
        tableTimeTypeByTable,
    ]);

    function applySourceColumns(nextColumns: PanelSeriesSourceColumns): void {
        const sNextTableTimeType = getPanelSeriesTimeTypeFromSourceColumns(nextColumns);

        if (
            !isPanelSeriesTableTimeTypeCompatible(
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

        if (selectedTable) {
            onTableTimeTypeChange(selectedTable, sNextTableTimeType);
            setSourceColumnsByTable((previousColumns) => ({
                ...previousColumns,
                [selectedTable]: nextColumns,
            }));
        }
        onSourceChange(selectedTable, nextColumns, tableColumns);
    }

    function patchColumnSelection(
        patch: Partial<PanelSeriesSourceColumns>,
    ): void {
        applySourceColumns(createTagAnalyzerColumnInfo(
            tableColumns,
            {
                ...sourceColumns,
                ...patch,
            },
        ));
    }

    function changeValueColumn(value: string): void {
        const sJsonOptionsKey = getJsonPathOptionsKey(selectedTable, value);
        const sJsonKey =
            isTagAnalyzerJsonValue(tableColumns, value) &&
            sourceColumns?.value === value
                ? sourceColumns?.jsonKey ?? ''
                : sJsonKeyByColumn[sJsonOptionsKey] ?? '';
        const sNextJsonKey = isTagAnalyzerJsonValue(tableColumns, value)
            ? sJsonKey
            : '';

        patchColumnSelection({ value, jsonKey: sNextJsonKey });
    }

    function applyJsonKey(jsonKey: string): void {
        if (!sourceColumns) {
            return;
        }

        patchColumnSelection({ jsonKey });
        setJsonKeyByColumn((previousJsonKeys) => ({
            ...previousJsonKeys,
            [getJsonPathOptionsKey(selectedTable, sourceColumns.value)]: jsonKey,
        }));
    }

    return (
        <>
            <div className={styles.fieldGrid}>
                <CreateNewPanelComboboxField
                    label="Table"
                    options={sTableOptions}
                    value={selectedTable}
                    onChange={changeTable}
                    disabled={isTableNameLoading}
                />
                <CreateNewPanelComboboxField
                    label="Time"
                    options={sTimeColumnOptions}
                    value={sourceColumns?.time ?? ''}
                    onChange={(value) => patchColumnSelection({ time: value })}
                    disabled={isTableNameLoading || !selectedTable}
                />
                <CreateNewPanelComboboxField
                    label="Value"
                    options={sValueColumnOptions}
                    value={sourceColumns?.value ?? ''}
                    onChange={changeValueColumn}
                    disabled={isTableNameLoading || !selectedTable}
                />
            </div>

            {sIsJsonValue ? (
                <CreateNewPanelJsonKeyField
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

function CreateNewPanelJsonKeyField({
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
    const [sJsonPathOptionsByColumn, setJsonPathOptionsByColumn] =
        useState<Record<string, string[]>>({});
    const [sJsonKeyInputDraft, setJsonKeyInputDraft] =
        useState<string | undefined>();
    const sJsonPathOptionsKey = getJsonPathOptionsKey(selectedTable, valueColumn);
    const sJsonPathOptions = useMemo(
        () => (
            sJsonPathOptionsKey
                ? sJsonPathOptionsByColumn[sJsonPathOptionsKey] ?? []
                : []
        ),
        [sJsonPathOptionsByColumn, sJsonPathOptionsKey],
    );
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
            sJsonPathOptions.map((path) => {
                const sSummaryLabel = getPanelSeriesValueSummaryLabel(
                    rollupTableList,
                    selectedTable,
                    valueColumn,
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
        [rollupTableList, sJsonPathOptions, selectedTable, valueColumn],
    );
    const sJsonKeyInputValue =
        sJsonKeyInputDraft ?? displayJsonPathLabel(selectedJsonKey);

    useEffect(() => {
        setJsonKeyInputDraft(undefined);
    }, [sJsonPathOptionsKey]);

    useEffect(() => {
        async function loadJsonPathOptions(): Promise<void> {
            if (
                !selectedTable ||
                !valueColumn ||
                !sJsonPathOptionsKey ||
                sJsonPathOptionsByColumn[sJsonPathOptionsKey]
            ) {
                return;
            }

            try {
                const sPaths = await fetchTableInfoSearchJsonColumnPaths(
                    selectedTable,
                    valueColumn,
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
        selectedTable,
        valueColumn,
    ]);

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
                    onChange={(event) => setJsonKeyInputDraft(event.target.value)}
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
                size="md"
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

function getTableOptionLabel(
    tableName: string,
    timeType: PanelSeriesTimeType | undefined,
): string {
    return timeType && timeType !== PanelSeriesTimeType.Unselected
        ? `${tableName} (${timeType})`
        : tableName;
}

function getTableTimeTypeMismatchMessage(
    selectedTimeType: PanelSeriesTimeType,
    tableTimeType: PanelSeriesTimeType | undefined,
): string {
    const sTableTypeLabel = tableTimeType ?? PanelSeriesTimeType.Unselected;

    return `Selected series use ${selectedTimeType} time. ${sTableTypeLabel} time tables cannot be mixed in one chart.`;
}

function getJsonPathOptionsKey(
    tableName: string,
    valueColumn: string,
): string {
    return tableName && valueColumn
        ? [tableName, valueColumn].join('\u0000')
        : '';
}

function createSourceColumns(
    tableColumns: TableSchemaColumn[],
    currentColumns?: Partial<PanelSeriesSourceColumns>,
): PanelSeriesSourceColumns {
    const sColumnInfo = createTagAnalyzerColumnInfo(tableColumns, currentColumns);

    return {
        name: sColumnInfo.name || String(tableColumns[0]?.name ?? ''),
        time: sColumnInfo.time || String(tableColumns[1]?.name ?? ''),
        timeType: sColumnInfo.timeType,
        timeBaseTime: sColumnInfo.timeBaseTime,
        value: sColumnInfo.value || String(tableColumns[2]?.name ?? ''),
        jsonKey: sColumnInfo.jsonKey ?? currentColumns?.jsonKey ?? '',
    };
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
