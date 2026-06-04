import { useMemo } from 'react';
import type { DropdownOption } from '@/design-system/hooks/useDropdown';
import {
    getTagAnalyzerTimeColumns,
    getTagAnalyzerValueColumns,
    isTagAnalyzerJsonValue,
} from '@/utils/tagAnalyzerFields';
import { displayJsonPathLabel, isJsonTypeColumn } from '@/utils/dashboardJsonValue';
import {
    formatTimeColumnOptionLabel,
    formatValueColumnOptionLabel,
    getValueSummaryLabel,
} from './TagSelectionColumnMetadata';
import { TAG_SEARCH_PAGE_LIMIT } from './TagSelectionConstants';
import type {
    TagSelectionColumnMetadataRow,
    TagSelectionSourceColumns,
} from './TagSelectionTypes';

type TagSelectionDerivedOptionsInput = {
    tables: string[];
    tagTotal: number;
    tableColumns: TagSelectionColumnMetadataRow[];
    rollupMetadata: unknown;
    selectedTable: string;
    sourceColumns: TagSelectionSourceColumns | undefined;
    jsonPathOptions: Record<string, string[]>;
};

export function useTagSelectionDerivedOptions({
    tables,
    tagTotal,
    tableColumns,
    rollupMetadata,
    selectedTable,
    sourceColumns,
    jsonPathOptions,
}: TagSelectionDerivedOptionsInput) {
    const tableOptions = useMemo<DropdownOption[]>(
        () => tables.map((table) => ({ value: table, label: table, disabled: undefined })),
        [tables],
    );
    const maxPageNum = useMemo(
        () => Math.ceil(tagTotal / TAG_SEARCH_PAGE_LIMIT),
        [tagTotal],
    );
    const timeColumnOptions = useMemo<DropdownOption[]>(
        () =>
            getTagAnalyzerTimeColumns(tableColumns).map((item) => ({
                label: formatTimeColumnOptionLabel(item[0], item[1]),
                value: item[0],
                disabled: undefined,
            })),
        [tableColumns],
    );
    const valueColumnOptions = useMemo<DropdownOption[]>(
        () =>
            getTagAnalyzerValueColumns(tableColumns).map((item) => {
                const sIsJsonColumn = isJsonTypeColumn(item[1]);
                const sSummaryLabel = sIsJsonColumn
                    ? undefined
                    : getValueSummaryLabel(rollupMetadata, selectedTable, item[0]);

                return {
                    label: sIsJsonColumn
                        ? `${item[0]} (JSON)`
                        : formatValueColumnOptionLabel(item[0], sSummaryLabel),
                    value: item[0],
                    disabled: undefined,
                };
            }),
        [rollupMetadata, selectedTable, tableColumns],
    );
    const isJsonValue = isTagAnalyzerJsonValue(
        tableColumns,
        sourceColumns?.value ?? '',
    );
    const selectedJsonKey = sourceColumns?.jsonKey ?? '';
    const selectedJsonKeySummaryLabel =
        isJsonValue && selectedJsonKey
            ? getValueSummaryLabel(
                  rollupMetadata,
                  selectedTable,
                  sourceColumns?.value ?? '',
                  selectedJsonKey,
              )
            : undefined;
    const jsonKeyOptions = useMemo<DropdownOption[]>(
        () =>
            ((sourceColumns?.value && jsonPathOptions[sourceColumns.value]) || []).map(
                (path) => {
                    const sSummaryLabel = getValueSummaryLabel(
                        rollupMetadata,
                        selectedTable,
                        sourceColumns?.value ?? '',
                        path,
                    );

                    return {
                        label: formatValueColumnOptionLabel(
                            displayJsonPathLabel(path),
                            sSummaryLabel,
                        ),
                        value: path,
                        disabled: undefined,
                    };
                },
            ),
        [jsonPathOptions, rollupMetadata, selectedTable, sourceColumns?.value],
    );

    return {
        tableOptions,
        maxPageNum,
        timeColumnOptions,
        valueColumnOptions,
        isJsonValue,
        selectedJsonKey,
        selectedJsonKeySummaryLabel,
        jsonKeyOptions,
    };
}