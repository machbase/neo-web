import {
    useEffect,
    useId,
    useMemo,
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
    Input,
    InputSelect,
    List,
    Pagination,
    type ComboboxOption,
} from '@/design-system/components';
import { getId } from '@/utils';
import {
    displayJsonPathLabel,
    jsonPathInputToStoredPath,
} from '@/utils/dashboardJsonValue';
import { isTagAnalyzerJsonValue } from '@/utils/tagAnalyzerFields';
import { tableMetadataApi } from '../../api/tableMetadataApi';
import {
    createPanelSeriesDefinition,
    getSeriesListAxisKind,
    hasMixedXAxisValueKinds,
    MIXED_X_AXIS_KIND_WARNING,
    X_AXIS_KIND_CHANGE_WARNING,
    PANEL_TAG_LIMIT,
    PanelSeriesCalculationMode,
    type PanelSeriesDefinition,
    updatePanelSeriesCalculationMode,
} from '../../seriesModel';
import {
    formatRollupIntervalList,
    formatRollupRangeLabel,
    getPanelSeriesRollupColumn,
    getPanelSeriesRollupInfo,
    getPanelSeriesValueSummaryLabel,
    type RollupTableMap,
} from '../../api/rollupMetadata';
import type { AxisKind } from '../../rangeExpression/rangeModel';
import { getErrorMessageFromValue } from '../../errorMessage';
import { useLatestAsyncRequest } from '../../hooks/useLatestAsyncRequest';
import { Field, Inline, Stack, Text } from '../../ui/Presentation';
import { SeriesCalculationModeField } from './SeriesCalculationModeField';
import {
    formatRollupOptionLabel,
    getJsonPathOptionsKey,
    usePanelSeriesSource,
} from './usePanelSeriesSource';
import { useSeriesTagSearch } from './useSeriesTagSearch';
import styles from './PanelSeriesEditor.module.scss';
import controls from '../../ui/Controls.module.scss';

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
    const tagSearch = useSeriesTagSearch(setFooterMessage);
    const source = usePanelSeriesSource(
        tagSearch.changeSource,
        setFooterMessage,
    );
    const {
        selectedTable: sSelectedTable,
        sourceColumns: sColumns,
        tableColumns: sTableColumns,
    } = source;
    const sTagInputId = useId();
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

    function addSelectedTag(tagName: string): void {
        if (seriesList.length >= PANEL_TAG_LIMIT) {
            setFooterMessage(`The maximum number of tags in a chart is ${PANEL_TAG_LIMIT}.`);
            return;
        }

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

        if (seriesList.some(
            (series) =>
                series.table === sSelectedTable &&
                series.sourceTagName === tagName &&
                series.calculationMode === PanelSeriesCalculationMode.Average &&
                series.sourceColumns.name === sColumns.name &&
                series.sourceColumns.time === sColumns.time &&
                series.sourceColumns.value === sColumns.value &&
                (series.sourceColumns.jsonKey ?? '') ===
                    (sColumns.jsonKey ?? ''),
        )) {
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
                useRollupTable: getPanelSeriesRollupColumn(
                    rollupTableList,
                    sSelectedTable,
                    sColumns.value,
                    sColumns.jsonKey,
                ) !== undefined,
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
                source={source}
                rollupTableList={rollupTableList}
                onError={setFooterMessage}
            />

            <Field label="Tag" htmlFor={sTagInputId}>
                <Input
                    id={sTagInputId}
                    data-testid="tag-analyzer-series-search-input"
                    value={tagSearch.searchInput}
                    placeholder="Search Tag"
                    onChange={(event) => {
                        setFooterMessage(undefined);
                        tagSearch.setSearchInput(event.target.value);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            tagSearch.search();
                        }
                    }}
                    fullWidth
                    size="md"
                    rightIcon={
                        <Button
                            data-testid="tag-analyzer-series-search-button"
                            variant="ghost"
                            size="icon"
                            icon={<Search size={16} />}
                            className={`${styles.tagSearchButton} ${
                                tagSearch.hasPendingSearch ? styles.tagSearchButtonPending : ''
                            }`}
                            onClick={tagSearch.search}
                            aria-label="Search tags"
                        />
                    }
                />
            </Field>

            <div className={`${controls.twoColumns} ${styles.seriesColumns}`}>
                <Stack gap={8} className={styles.seriesColumn}>
                    <Inline className={styles.columnHeader}>
                        <Text variant="section" tone="muted">Item list</Text>
                        <Badge variant="primary" size="sm">
                            {tagSearch.total}
                        </Badge>
                    </Inline>
                    <List
                        className={`${styles.seriesList} ${controls.selectableList}`}
                        items={tagSearch.tags.map((tag) => ({
                            id: tag,
                            label: tag,
                            tooltip: tag,
                            testId: `tag-analyzer-series-option-${encodeURIComponent(tag)}`,
                        }))}
                        onItemClick={(id) => {
                            const sTag = String(id);
                            if (tagSearch.tags.includes(sTag)) {
                                addSelectedTag(sTag);
                            }
                        }}
                    />
                </Stack>

                <SelectedSeriesList
                    selectedSeries={seriesList}
                    rollupTableList={rollupTableList}
                    onRemoveSeries={removeSelectedTag}
                    onClearAll={() => applyNewSeriesList([])}
                    onChangeCalculationMode={changeSeriesCalculationMode}
                />
                <Pagination
                    data-testid="series-pagination"
                    currentPage={tagSearch.page}
                    totalPages={tagSearch.totalPages}
                    onPageChange={tagSearch.changePage}
                    onPageInputChange={tagSearch.setPageInput}
                    inputValue={tagSearch.pageInput}
                    showTotalPage
                    className={styles.seriesPagination}
                />
            </div>
        </>
    );
}

// -------------------- Local --------------------

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

    function handleSelectedSeriesKeyDown(
        event: KeyboardEvent<HTMLElement>,
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
        <Stack gap={8} className={styles.seriesColumn}>
            <Inline justify="between" className={styles.columnHeader}>
                <Inline data-testid="tag-analyzer-selected-series-count">
                    <Text variant="section" tone="muted">Selected</Text>
                    <Badge
                        variant={sSelectedCount >= PANEL_TAG_LIMIT ? 'error' : 'primary'}
                        size="sm"
                    >
                        {`${sSelectedCount} / ${PANEL_TAG_LIMIT}`}
                    </Badge>
                </Inline>
                <Button
                    data-testid="clear-all"
                    variant="ghost"
                    size="sm"
                    onClick={onClearAll}
                    disabled={sSelectedCount === 0}
                >
                    Clear all
                </Button>
            </Inline>
            <Stack gap={0} className={styles.selectedSeriesList}>
                {selectedSeries.length > 0 ? (
                    <Stack gap={4} className={`${styles.selectedSeriesItems} scrollbar-dark`}>
                        {selectedSeries.map((item) => (
                            <Stack
                                key={item.key}
                                data-testid={`selected-series-${encodeURIComponent(item.key)}`}
                                gap={8}
                                role="button"
                                tabIndex={0}
                                title={getSelectedSeriesTooltip(
                                    item,
                                    rollupTableList,
                                )}
                                className={`${controls.selectable} ${styles.selectedSeriesItem}`}
                                onClick={() => onRemoveSeries(item.key)}
                                onKeyDown={(event) =>
                                    handleSelectedSeriesKeyDown(event, item.key)
                                }
                            >
                                <div className={styles.selectedSeriesHeader}>
                                    <Text
                                        data-testid={`source-tag-${encodeURIComponent(JSON.stringify([item.table, item.sourceTagName]))}`}
                                        variant="section"
                                        truncate
                                        tone="default"
                                        title={item.sourceTagName}
                                    >
                                        {item.sourceTagName}
                                    </Text>
                                    <Inline
                                        gap={0}
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        <SeriesCalculationModeField
                                            value={item.calculationMode}
                                            onChange={(mode) => onChangeCalculationMode(item.key, mode)}
                                            className={controls.control}
                                        />
                                    </Inline>
                                </div>
                                <SelectedSeriesSourceDetails
                                    item={item}
                                    rollupTableList={rollupTableList}
                                />
                            </Stack>
                        ))}
                    </Stack>
                ) : (
                    <Inline justify="center" className={styles.selectedSeriesEmpty}>
                        <Text tone="subtle">No series selected.</Text>
                    </Inline>
                )}
            </Stack>
        </Stack>
    );
}

function SelectedSeriesSourceDetails({
    item,
    rollupTableList,
}: {
    item: PanelSeriesDefinition;
    rollupTableList: RollupTableMap;
}) {
    return (
        <div className={`${controls.threeColumns} ${styles.selectedSeriesDetails}`}>
            {[
                ['Table', item.table.split('.').at(-1) ?? item.table],
                ['Time', item.sourceColumns.time || 'Time not selected'],
                ['Value', getSourceValueLabel(item, rollupTableList)],
            ].map(([label, value]) => (
                <Inline key={label} gap={4}>
                    <Text variant="caption" tone="subtle" weight="semibold" style={{ flexShrink: 0 }}>{label}</Text>
                    <Text variant="caption" tone="secondary" truncate>{value}</Text>
                </Inline>
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

function getSelectedSeriesTooltip(
    item: PanelSeriesDefinition,
    rollupTableList: RollupTableMap,
): string {
    return [
        `Tag: ${item.sourceTagName}`,
        `Table: ${item.table}`,
        `Time: ${item.sourceColumns.time || 'Time not selected'}`,
        `Value: ${getSourceValueLabel(item, rollupTableList)}`,
        `Mode: ${item.calculationMode}`,
    ].join('\n');
}

const EMPTY_JSON_PATH_OPTIONS: string[] = [];

function SourceSelector({
    source,
    rollupTableList,
    onError,
}: {
    source: ReturnType<typeof usePanelSeriesSource>;
    rollupTableList: RollupTableMap;
    onError: (message: string) => void;
}) {
    const {
        selectedTable, sourceColumns, isTableNameLoading,
        databaseOptions, activeDatabase, ownerOptions, activeOwner,
        tableOptions, hasOwners, timeColumnOptions, valueColumnOptions,
        isJsonValue, changeDatabase, changeOwner, changeTable,
        patchColumnSelection, changeValueColumn, applyJsonKey,
    } = source;

    return (
        <>
            <Stack gap={12}>
                <div
                    className={`${controls.threeColumns} ${styles.sourceLocation}`}
                    role="group"
                    aria-label="Source location"
                >
                    <SourceComboboxField
                        label="Database"
                        testId="source-database"
                        options={databaseOptions}
                        value={activeDatabase}
                        onChange={changeDatabase}
                        disabled={isTableNameLoading}
                    />
                    <SourceComboboxField
                        label="User"
                        testId="source-user"
                        options={ownerOptions}
                        value={activeOwner}
                        onChange={changeOwner}
                        placeholder="Select a user"
                        disabled={
                            isTableNameLoading ||
                            !activeDatabase ||
                            ownerOptions.length === 0
                        }
                    />
                    <SourceComboboxField
                        label="Table"
                        testId="source-table"
                        options={tableOptions}
                        value={selectedTable}
                        onChange={changeTable}
                        disabled={
                            isTableNameLoading ||
                            !activeDatabase ||
                            (hasOwners &&
                                !activeOwner)
                        }
                        dropdownWidth="auto"
                    />
                </div>
                <div
                    className={`${controls.twoColumns} ${styles.sourceFields}`}
                    role="group"
                    aria-label="Source fields"
                >
                    <SourceComboboxField
                        label="Time"
                        testId="source-time"
                        options={timeColumnOptions}
                        value={sourceColumns?.time ?? ''}
                        onChange={(value) =>
                            patchColumnSelection({ time: value })
                        }
                        disabled={isTableNameLoading || !selectedTable}
                    />
                    <SourceComboboxField
                        label="Value"
                        testId="source-value"
                        options={valueColumnOptions}
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
            </Stack>

            {isJsonValue ? (
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
            <Text
                variant="caption"
                tone={sRollupInfo ? 'warning' : 'subtle'}
                className={styles.valueRollupStatus}
                data-tooltip-id={sTooltipId}
                data-tooltip-content={sTooltip}
            >
                {sRollupInfo ? `Has Rollup (${formatRollupRangeLabel(sRollupInfo)})` : 'No Rollup'}
            </Text>
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
        <Inline>
            <Inline className={styles.jsonKeyLabel}>
                <Text variant="label" weight="semibold" tone="muted">-&gt;$</Text>
                {sSelectedJsonKeySummaryLabel ? (
                    <Text variant="caption" tone="secondary" weight="medium">
                        {sSelectedJsonKeySummaryLabel}
                    </Text>
                ) : null}
            </Inline>
            <div style={{ flex: 1, minWidth: 0 }}>
                <InputSelect
                    aria-label="JSON key"
                    data-testid="source-json-key"
                    type="text"
                    options={sJsonKeyOptions}
                    value={sJsonKeyInputDraft ?? displayJsonPathLabel(selectedJsonKey)}
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
        </Inline>
    );
}

function SourceComboboxField({
    label,
    testId,
    dropdownWidth,
    children,
    ...comboboxProps
}: {
    label: string;
    testId: string;
    options: ComboboxOption[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    placeholder?: string;
    dropdownWidth?: 'trigger' | 'auto';
    children?: ReactNode;
}) {
    const sInputId = useId();

    return (
        <Field label={label} htmlFor={sInputId}>
            <Combobox.Root
                {...comboboxProps}
                fullWidth
                size="md"
            >
                <Combobox.Input id={sInputId} data-testid={testId} className={styles.sourceInput} />
                <Combobox.Trigger icon={<ArrowDown size={14} />} />
                <Combobox.Dropdown width={dropdownWidth}>
                    <Combobox.List />
                </Combobox.Dropdown>
            </Combobox.Root>
            {children}
        </Field>
    );
}
