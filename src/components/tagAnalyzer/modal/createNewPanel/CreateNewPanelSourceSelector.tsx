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
    fetchCreateNewPanelJsonColumnPaths,
    fetchCreateNewPanelTableMetadata,
} from './CreateNewPanelFetch';
import type {
    CreateNewPanelColumnMetadataRow,
    NewPanelSeriesPath,
} from './CreateNewPanelTypes';
import styles from './CreateNewPanel.module.scss';

type TableMetadataCacheEntry = {
    sourceColumns: TagAnalyzerColumnInfo | undefined;
    tableColumns: CreateNewPanelColumnMetadataRow[];
};

export function CreateNewPanelSourceSelector({
    availableSourceTableNames,
    rollupTableList,
    isTableNameLoading,
    selectedTags,
    onSourceChange,
    onSelectedTagsChange,
    onError,
}: {
    availableSourceTableNames: string[];
    rollupTableList: RollupTableMap;
    isTableNameLoading: boolean;
    selectedTags: NewPanelSeriesPath[];
    onSourceChange: (
        table: string,
        sourceColumns: TagAnalyzerColumnInfo | undefined,
        tableColumns: CreateNewPanelColumnMetadataRow[],
    ) => void;
    onSelectedTagsChange: (selectedTags: NewPanelSeriesPath[]) => boolean;
    onError: (message: string) => void;
}) {
    const [sSelectedTable, setSelectedTable] = useState('');
    const [sSourceColumns, setSourceColumns] =
        useState<TagAnalyzerColumnInfo | undefined>();
    const [sTableColumns, setTableColumns] =
        useState<CreateNewPanelColumnMetadataRow[]>([]);
    const [sJsonPathOptionsByColumn, setJsonPathOptionsByColumn] =
        useState<Record<string, string[]>>({});
    const [sJsonKeyInputDraft, setJsonKeyInputDraft] =
        useState<string | undefined>();
    const sColumnResultsByTableRef =
        useRef<Record<string, TableMetadataCacheEntry>>({});
    const sSourceColumnsByTableRef =
        useRef<Record<string, TagAnalyzerColumnInfo>>({});
    const sJsonKeyByColumnRef = useRef<Record<string, string>>({});
    const sColumnRequestKeyRef = useRef(0);
    const sSelectedTagsRef = useRef(selectedTags);

    useEffect(() => {
        sSelectedTagsRef.current = selectedTags;
    }, [selectedTags]);

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
                const sPaths = await fetchCreateNewPanelJsonColumnPaths(
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
        tableColumns: CreateNewPanelColumnMetadataRow[],
    ): void => {
        setSourceColumns(sourceColumns);
        setTableColumns(tableColumns);
        onSourceChange(table, sourceColumns, tableColumns);
    }, [onSourceChange]);

    const loadColumns = useCallback(async (
        table: string,
        currentColumns?: Partial<TagAnalyzerColumnInfo>,
    ): Promise<void> => {
        const sRequestKey = sColumnRequestKeyRef.current + 1;
        sColumnRequestKeyRef.current = sRequestKey;

        const sCachedResult = sColumnResultsByTableRef.current[table];
        if (sCachedResult) {
            const sNextColumns =
                sSourceColumnsByTableRef.current[table] ??
                sCachedResult.sourceColumns;
            applyLoadedColumns(
                table,
                sNextColumns,
                sCachedResult.tableColumns,
            );
            return;
        }

        try {
            const sResult = await fetchCreateNewPanelTableMetadata(
                table,
                currentColumns,
            );
            if (sColumnRequestKeyRef.current !== sRequestKey) {
                return;
            }
            if (sResult.errorMessage) {
                onError(sResult.errorMessage);
            }

            sColumnResultsByTableRef.current[table] = {
                sourceColumns: sResult.columns,
                tableColumns: sResult.tableColumns,
            };
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
    }, [applyLoadedColumns, onError]);

    const clearCurrentColumns = useCallback((): void => {
        setJsonKeyInputDraft(undefined);
        setSourceColumns(undefined);
        setTableColumns([]);
    }, []);

    const changeTable = useCallback((value: string): void => {
        setSelectedTable(value);
        clearCurrentColumns();

        if (!sColumnResultsByTableRef.current[value]) {
            onSourceChange(value, undefined, []);
        }

        if (value) {
            void loadColumns(value);
        }
    }, [clearCurrentColumns, loadColumns, onSourceChange]);

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
    function applySourceColumns(nextColumns: TagAnalyzerColumnInfo): void {
        const sNextTags = sSelectedTagsRef.current.map((item) =>
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
            sSourceColumnsByTableRef.current[sSelectedTable] = nextColumns;
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
                : sJsonKeyByColumnRef.current[sJsonOptionsKey] ?? '';
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
        sJsonKeyByColumnRef.current[
            getJsonPathOptionsKey(sSelectedTable, sSourceColumns.value)
        ] = sJsonKey;
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

