import { useCallback, useId, useState, type KeyboardEvent } from 'react';
import { Search } from '@/assets/icons/Icon';
import {
    Badge,
    Button,
    Input,
    List,
    Pagination,
} from '@/design-system/components';
import useDebounce from '@/hooks/useDebounce';
import { getId } from '@/utils';
import { isTagAnalyzerJsonValue } from '@/utils/tagAnalyzerFields';
import {
    tableMetadataApi,
    type TableColumn,
} from '../api/tableMetadataApi';
import {
    createPanelSeriesDefinition,
    getPanelSeriesRollupColumn,
    hasMixedXAxisValueKinds,
    MIXED_X_AXIS_KIND_WARNING,
    PANEL_TAG_LIMIT,
    PanelSeriesCalculationMode,
    type PanelSeriesDefinition,
    type PanelSeriesSourceColumns,
    type RollupTableMap,
    updatePanelSeriesCalculationMode,
} from '../seriesModel';
import { getErrorMessageFromValue } from '../errorMessage';
import { useLatestAsyncRequest } from '../hooks/useLatestAsyncRequest';
import { SourceSelector } from './SourceSelector';
import { SeriesCalculationModeSelect } from './SeriesCalculationModeSelect';
import styles from './PanelSeriesModal.module.scss';

const TAG_PAGE_SIZE = 10;

export function SeriesEditor({
    seriesList,
    rollupTableList,
    onFooterMessageChange: setFooterMessage,
    onSeriesListChange,
}: {
    seriesList: PanelSeriesDefinition[];
    rollupTableList: RollupTableMap;
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

        setFooterMessage(undefined);
        onSeriesListChange(nextSeriesList);
    }

    const handleSourceChange = useCallback((
        table: string,
        sourceColumns: PanelSeriesSourceColumns | undefined,
        tableColumns: TableColumn[],
    ): void => {
        setTagRequest(undefined);
        setAvailableTags([]);
        setTagTotal(0);
        setFooterMessage(undefined);
        setSelectedTableState(table);
        setSourceColumns(sourceColumns);
        setTableColumns(tableColumns);
        setTagPageState(1);
    }, [setFooterMessage]);

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
            searchText,
            page,
            generation: (current?.generation ?? 0) + 1,
        }));
    }

    useLatestAsyncRequest({
        enabled: sTagRequest !== undefined,
        requestKey: JSON.stringify(sTagRequest),
        fetch: async () => {
            if (!sTagRequest || !sSourceColumns?.name) {
                throw new Error('Tag search source is unavailable.');
            }
            return {
                request: sTagRequest,
                result: await tableMetadataApi.fetchTags(
                    sSelectedTable,
                    sSourceColumns.name,
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

    useDebounce(
        [sSelectedTable, sSourceColumns],
        () => {
            loadTagList();
        },
        200,
        undefined,
    );

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
                                            <SeriesCalculationModeSelect
                                                value={item.calculationMode}
                                                onChange={(mode) =>
                                                    onChangeCalculationMode(item.key, mode)
                                                }
                                                className="dropdown-trigger-sm"
                                                style={{ width: '100%' }}
                                            />
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
