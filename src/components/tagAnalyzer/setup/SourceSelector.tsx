import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Tooltip } from 'react-tooltip';
import { ArrowDown } from '@/assets/icons/Icon';
import { Combobox, InputSelect, type ComboboxOption } from '@/design-system/components';
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
import {
    tableMetadataApi,
    type TableColumn,
} from '../api/tableMetadataApi';
import { getErrorMessageFromValue } from '../errorMessage';
import { useLatestAsyncRequest } from '../hooks/useLatestAsyncRequest';
import {
    formatRollupIntervalList,
    formatRollupRangeLabel,
    getPanelSeriesRollupInfo,
    getPanelSeriesValueSummaryLabel,
    type PanelSeriesRollupInfo,
    type PanelSeriesSourceColumns,
    type RollupTableMap,
} from '../seriesModel';
import styles from './PanelSeriesModal.module.scss';

type TableColumnsCacheEntry = {
    sourceColumns: PanelSeriesSourceColumns | undefined;
    tableColumns: TableColumn[];
};
const EMPTY_JSON_PATH_OPTIONS: string[] = [];

export function SourceSelector({
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

    const sTableOptions = useMemo<ComboboxOption[]>(
        () =>
            availableSourceTableNames.map((table) => ({
                value: table,
                label: table,
            })),
        [availableSourceTableNames],
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

    useLatestAsyncRequest({
        enabled: sColumnRequestTable !== '',
        requestKey: sColumnRequestTable,
        fetch: async () => {
            const tableColumns = await tableMetadataApi.fetchTableColumns(
                sColumnRequestTable,
            );
            return {
                table: sColumnRequestTable,
                sourceColumns: createSourceColumns(tableColumns),
                tableColumns,
            };
        },
        onSuccess: ({ table, sourceColumns: nextSourceColumns, tableColumns: nextTableColumns }) => {
            sColumnResultsByTableRef.current[table] = {
                sourceColumns: nextSourceColumns,
                tableColumns: nextTableColumns,
            };
            onSourceChange(table, nextSourceColumns, nextTableColumns);
        },
        onError: (error) => onError(getErrorMessageFromValue(error)),
    });

    const loadColumns = useCallback((table: string): void => {
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
    }, [onSourceChange]);

    const changeTable = useCallback((value: string): void => {
        onSourceChange(value, undefined, []);

        if (value) {
            void loadColumns(value);
        }
    }, [loadColumns, onSourceChange]);

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

    function applySourceColumns(nextColumns: PanelSeriesSourceColumns): void {
        if (selectedTable) {
            sColumnResultsByTableRef.current[selectedTable] = {
                sourceColumns: nextColumns,
                tableColumns,
            };
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
                : sJsonKeyByColumnRef.current[sJsonOptionsKey] ?? '';
        patchColumnSelection({
            value,
            jsonKey: isTagAnalyzerJsonValue(tableColumns, value) ? sJsonKey : '',
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
                >
                    <CreateNewPanelValueRollupStatus
                        rollupTableList={rollupTableList}
                        selectedTable={selectedTable}
                        valueColumn={sourceColumns?.value ?? ''}
                        jsonKey={sourceColumns?.jsonKey}
                    />
                </CreateNewPanelComboboxField>
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

function CreateNewPanelValueRollupStatus({
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
    const sTooltip = getValueRollupTooltip(valueColumn, sRollupInfo);

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

function getValueRollupTooltip(
    valueColumn: string,
    rollupInfo: PanelSeriesRollupInfo | undefined,
): string {
    if (!rollupInfo) {
        return `No rollup intervals found for ${valueColumn}.`;
    }

    return [
        `Column: ${rollupInfo.columnName}`,
        `Minimum Rollup: ${formatRollupIntervalList([rollupInfo.minimumInterval])}`,
        `Maximum Rollup: ${formatRollupIntervalList([rollupInfo.maximumInterval])}`,
        `Intervals: ${formatRollupIntervalList(rollupInfo.intervals)}`,
    ].join('\n');
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
    const sJsonPathOptions = sJsonPathOptionsByColumn[sJsonPathOptionsKey] ??
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

    useLatestAsyncRequest({
        enabled: Boolean(
            selectedTable &&
            valueColumn &&
            sJsonPathOptionsKey &&
            !sJsonPathOptionsByColumn[sJsonPathOptionsKey],
        ),
        requestKey: sJsonPathOptionsKey,
        fetch: () => tableMetadataApi.fetchJsonColumnPaths(selectedTable, valueColumn),
        onSuccess: (paths) => setJsonPathOptionsByColumn((previousOptions) => ({
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
    children,
}: {
    label: string;
    options: ComboboxOption[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    children?: ReactNode;
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
            {children}
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

function createSourceColumns(
    tableColumns: TableColumn[],
): PanelSeriesSourceColumns {
    const sColumnInfo = createTagAnalyzerColumnInfo(tableColumns);

    return {
        name: sColumnInfo.name || String(tableColumns[0]?.name ?? ''),
        time: sColumnInfo.time,
        timeType: sColumnInfo.timeType,
        timeBaseTime: sColumnInfo.timeBaseTime,
        value: sColumnInfo.value || String(tableColumns[2]?.name ?? ''),
        jsonKey: sColumnInfo.jsonKey ?? '',
    };
}
