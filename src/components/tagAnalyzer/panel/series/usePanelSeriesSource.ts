import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComboboxOption } from '@/design-system/components';
import { getCurrentDatabaseName } from '@/utils/currentDatabaseState';
import { isJsonTypeColumn } from '@/utils/dashboardJsonValue';
import {
    createTagAnalyzerColumnInfo,
    getTagAnalyzerTimeColumns,
    getTagAnalyzerValueColumns,
    isTagAnalyzerJsonValue,
} from '@/utils/tagAnalyzerFields';
import { DATETIME_COLUMN_TYPE } from '@/utils/timeFieldColumns';
import { resolveStoredTableName } from '@/utils/qualifiedTableName';
import { tableMetadataApi, type TableColumn } from '../../api/tableMetadataApi';
import type { PanelSeriesSourceColumns } from '../../seriesModel';
import { getErrorMessageFromValue } from '../../errorMessage';
import { useLatestAsyncRequest } from '../../hooks/useLatestAsyncRequest';

export function usePanelSeriesSource(
    onTagSourceChange: (table: string, tagColumn: string | undefined) => void,
    onError: (message: string | undefined) => void,
) {
    const [sAvailableSourceTableNames, setAvailableSourceTableNames] =
        useState<string[] | undefined>();
    const [sSource, setSource] = useState<{
        table: string;
        columns: PanelSeriesSourceColumns | undefined;
        tableColumns: TableColumn[];
    }>({ table: '', columns: undefined, tableColumns: [] });
    const { table: selectedTable, columns: sourceColumns, tableColumns } = sSource;
    const availableSourceTableNames = sAvailableSourceTableNames ?? EMPTY_TABLE_NAMES;

    useLatestAsyncRequest({
        enabled: true,
        requestKey: 'tag-analyzer-table-names',
        fetch: () => tableMetadataApi.fetchTableNames(),
        onSuccess: setAvailableSourceTableNames,
        onError: (error) => {
            setAvailableSourceTableNames([]);
            onError(getErrorMessageFromValue(error));
        },
    });

    const onSourceChange = useCallback((
        table: string,
        columns: PanelSeriesSourceColumns | undefined,
        tableColumns: TableColumn[],
    ): void => {
        onError(undefined);
        setSource({ table, columns, tableColumns });
        if (table !== selectedTable || columns?.name !== sourceColumns?.name) {
            onTagSourceChange(table, columns?.name);
        }
    }, [onError, onTagSourceChange, selectedTable, sourceColumns?.name]);

    const sJsonKeyByColumnRef = useRef<Record<string, string>>({});
    const [sColumnRequest, setColumnRequest] =
        useState<SourceColumnRequest>();
    const sSourceTables = useMemo<SourceTableOption[]>(
        () => availableSourceTableNames.map(parseSourceTableOption),
        [availableSourceTableNames],
    );
    const sDatabaseOptions = useMemo(
        () => createSourceOptions(sSourceTables.map(({ database }) => database), 'database'),
        [sSourceTables],
    );
    const sSelectedSourceTable = sSourceTables.find(
        ({ qualifiedName }) => qualifiedName === selectedTable,
    );
    const sActiveDatabase = sSelectedSourceTable?.database ?? sDatabaseOptions[0]?.value ?? '';
    const sActiveDatabaseTables = useMemo<SourceTableOption[]>(
        () =>
            sSourceTables.filter(
                ({ database }) => database === sActiveDatabase,
            ),
        [sActiveDatabase, sSourceTables],
    );
    const sOwnerOptions = useMemo(
        () => createSourceOptions(sActiveDatabaseTables.map(({ owner }) => owner).filter(Boolean), 'user'),
        [sActiveDatabaseTables],
    );
    const sActiveOwner = sSelectedSourceTable?.database === sActiveDatabase
        ? sSelectedSourceTable.owner
        : sOwnerOptions[0]?.value ?? '';
    const sActiveOwnerTables = useMemo<SourceTableOption[]>(
        () =>
            sOwnerOptions.length === 0
                ? sActiveDatabaseTables
                : sActiveDatabaseTables.filter(
                      ({ owner }) => owner === sActiveOwner,
                  ),
        [
            sOwnerOptions.length,
            sActiveDatabaseTables,
            sActiveOwner,
        ],
    );
    const sTableOptions = useMemo<ComboboxOption[]>(
        () =>
            sActiveOwnerTables.map(({ table, qualifiedName }) => ({
                value: qualifiedName,
                label: table,
                tooltip: qualifiedName,
                testId: `tag-analyzer-table-option-${encodeURIComponent(qualifiedName)}`,
            })),
        [sActiveOwnerTables],
    );
    const sTimeColumnOptions = useMemo<ComboboxOption[]>(
        () =>
            getTagAnalyzerTimeColumns(tableColumns).map((item) => ({
                label: `${item[0]} (${item[1] === DATETIME_COLUMN_TYPE ? 'DateTime' : 'Numeric'})`,
                value: item[0],
                testId: `source-time-option-${encodeURIComponent(item[0])}`,
            })),
        [tableColumns],
    );
    const sValueColumnOptions = useMemo<ComboboxOption[]>(
        () =>
            getTagAnalyzerValueColumns(tableColumns).map((item) => ({
                label: isJsonTypeColumn(item[1]) ? `${item[0]} (JSON)` : item[0],
                value: item[0],
                testId: `source-value-option-${encodeURIComponent(item[0])}`,
            })),
        [tableColumns],
    );
    const sIsJsonValue = isTagAnalyzerJsonValue(
        tableColumns,
        sourceColumns?.value ?? '',
    );

    useLatestAsyncRequest({
        enabled: sColumnRequest !== undefined,
        requestKey: JSON.stringify(sColumnRequest),
        fetch: async () => {
            if (!sColumnRequest) {
                throw new Error('Source table is unavailable.');
            }
            const table = sColumnRequest.table;
            const tableColumns = await tableMetadataApi.fetchTableColumns(
                table,
            );
            const columnInfo = createTagAnalyzerColumnInfo(tableColumns);
            return {
                table,
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
            onSourceChange(table, nextSourceColumns, nextTableColumns);
        },
        onError: (error) => onError(getErrorMessageFromValue(error)),
    });

    const changeTable = useCallback(
        (value: string): void => {
            onSourceChange(value, undefined, []);

            if (!value) {
                setColumnRequest(undefined);
                return;
            }

            setColumnRequest((current) => ({
                table: value,
                generation: (current?.generation ?? 0) + 1,
            }));
        },
        [onSourceChange],
    );

    const changeDatabase = useCallback(
        (value: string): void => {
            const sFirstOwner = sSourceTables.find(
                ({ database, owner }) => database === value && owner,
            )?.owner;
            const sFirstTable = sSourceTables.find(
                ({ database, owner }) =>
                    database === value &&
                    (sFirstOwner === undefined || owner === sFirstOwner),
            );
            changeTable(sFirstTable?.qualifiedName ?? '');
        },
        [changeTable, sSourceTables],
    );

    const changeOwner = useCallback(
        (value: string): void => {
            changeTable(
                sActiveDatabaseTables.find(({ owner }) => owner === value)?.qualifiedName ?? '',
            );
        },
        [changeTable, sActiveDatabaseTables],
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
            changeTable(
                sActiveOwnerTables[0]?.qualifiedName ??
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
        sActiveOwnerTables,
        selectedTable,
    ]);

    function patchColumnSelection(
        patch: Partial<PanelSeriesSourceColumns>,
    ): void {
        onSourceChange(
            selectedTable,
            createTagAnalyzerColumnInfo(tableColumns, { ...sourceColumns, ...patch }),
            tableColumns,
        );
    }

    function changeValueColumn(value: string): void {
        const sJsonKey =
            isTagAnalyzerJsonValue(tableColumns, value) &&
            sourceColumns?.value === value
                ? sourceColumns?.jsonKey ?? ''
                : sJsonKeyByColumnRef.current[getJsonPathOptionsKey(selectedTable, value)] ?? '';
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

    return {
        selectedTable, sourceColumns, tableColumns,
        isTableNameLoading: sAvailableSourceTableNames === undefined,
        databaseOptions: sDatabaseOptions, activeDatabase: sActiveDatabase,
        ownerOptions: sOwnerOptions, activeOwner: sActiveOwner,
        tableOptions: sTableOptions, hasOwners: sOwnerOptions.length > 0,
        timeColumnOptions: sTimeColumnOptions, valueColumnOptions: sValueColumnOptions,
        isJsonValue: sIsJsonValue,
        changeDatabase, changeOwner, changeTable, patchColumnSelection,
        changeValueColumn, applyJsonKey,
    };
}

export function getJsonPathOptionsKey(
    tableName: string,
    valueColumn: string,
): string {
    return tableName && valueColumn
        ? [tableName, valueColumn].join('\u0000')
        : '';
}

export function formatRollupOptionLabel(
    label: string,
    summaryLabel: string | undefined,
): string {
    return summaryLabel ? `${label} (${summaryLabel})` : label;
}

// -------------------- Local --------------------

type SourceColumnRequest = { table: string; generation: number };
type SourceTableOption = {
    database: string;
    owner: string;
    table: string;
    qualifiedName: string;
};
const EMPTY_TABLE_NAMES: string[] = [];

function createSourceOptions(values: string[], field: 'database' | 'user'): ComboboxOption[] {
    return [...new Set(values)].map((value) => ({
        value,
        label: value,
        testId: `tag-analyzer-${field}-option-${encodeURIComponent(value)}`,
    }));
}

function parseSourceTableOption(qualifiedName: string): SourceTableOption {
    const sParts = qualifiedName.split('.');

    return {
        database:
            sParts.length >= 3 ? sParts[0] : getCurrentDatabaseName(),
        owner: sParts.length >= 2 ? sParts.at(-2) ?? '' : '',
        table: sParts.at(-1) ?? qualifiedName,
        qualifiedName,
    };
}
