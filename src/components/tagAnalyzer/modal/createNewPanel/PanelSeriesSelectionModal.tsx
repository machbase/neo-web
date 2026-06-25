import {
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type KeyboardEvent,
} from 'react';
import type { IconType } from 'react-icons';
import {
    BiSolidChart,
    Check,
    MdOutlineStackedLineChart,
    Search,
    VscGraphLine,
    VscGraphScatter,
} from '@/assets/icons/Icon';
import {
    Badge,
    Button,
    Dropdown,
    Input,
    List,
    Toast,
} from '@/design-system/components';
import { Modal } from '@/design-system/components/Modal';
import useDebounce from '@/hooks/useDebounce';
import { getId } from '@/utils';
import { isTagAnalyzerJsonValue, type TagAnalyzerColumnInfo } from '@/utils/tagAnalyzerFields';

import type {
    PanelEChartType,
    PanelInfo,
} from '../../domain/panel/PanelConfig';
import {
    MIXED_X_AXIS_KIND_WARNING,
    hasMixedXAxisValueKinds,
    PANEL_TAG_LIMIT,
    TAG_ANALYZER_AGGREGATION_MODE_OPTIONS,
    type PanelSeriesDefinition,
} from '../../domain/SeriesDomain';

import { fetchAllRollupTableInfo } from '../../fetch/metadata/RollupMetadata';
import type { RollupTableMap } from '../../fetch/panelData/PanelDataFetchTypes';

import {
    fetchCreateNewPanelTableNames,
    fetchCreateNewPanelTags,
} from './CreateNewPanelFetch';
import {
    DEFAULT_NEW_PANEL_TITLE,
    createNewPanelInfo,
} from './CreateNewPanelInfo';
import { CreateNewPanelSourceSelector } from './CreateNewPanelSourceSelector';
import {
    createNewPanelSeriesPath,
    createNewPanelSeriesPathsFromDefinitions,
    createPanelSeriesDefinitionsFromPaths,
    getCreateNewPanelRollupColumn,
} from './CreateNewPanelMetadata';
import {
    type CreateNewPanelColumnMetadataRow,
    type CreateNewPanelTagSearchItem,
    type NewPanelSeriesPath,
} from './CreateNewPanelTypes';
import styles from './CreateNewPanel.module.scss';

const CHART_TYPE_OPTIONS = [
    ['Zone', MdOutlineStackedLineChart, 'Zone'],
    ['Dot', VscGraphScatter, 'Scatter'],
    ['Line', VscGraphLine, 'Line'],
] as const satisfies ReadonlyArray<readonly [PanelEChartType, IconType, string]>;

const CHART_TYPE_CARD_STYLE = {
    flex: 1,
    height: 76,
} satisfies CSSProperties;

const CHART_TYPE_CARD_ACTIVE_STYLE = {
    ...CHART_TYPE_CARD_STYLE,
    borderColor: '#006cd2',
} satisfies CSSProperties;

type CreatePanelSelectionModalProps = {
    onClose: () => void;
    onCreatePanel: (panelInfo: PanelInfo) => void;
    initialSeries?: never;
    onUpdateSeries?: never;
};

type UpdatePanelSeriesSelectionModalProps = {
    onClose: () => void;
    initialSeries: PanelSeriesDefinition[];
    onUpdateSeries: (tagSet: PanelSeriesDefinition[]) => void;
    onCreatePanel?: never;
};

type PanelSeriesSelectionModalProps =
    | CreatePanelSelectionModalProps
    | UpdatePanelSeriesSelectionModalProps;

function isUpdatePanelSeriesSelectionModalProps(
    props: PanelSeriesSelectionModalProps,
): props is UpdatePanelSeriesSelectionModalProps {
    return props.onUpdateSeries !== undefined;
}

function PanelSeriesSelectionModal(props: PanelSeriesSelectionModalProps) {
    const { onClose } = props;
    const sIsSeriesUpdateMode = isUpdatePanelSeriesSelectionModalProps(props);
    const sInitialSeries = sIsSeriesUpdateMode ? props.initialSeries : [];
    const [sChartTitle, setChartTitle] = useState(DEFAULT_NEW_PANEL_TITLE);
    const [sSelectedChartType, setSelectedChartType] =
        useState<PanelEChartType>('Line');
    const [sAvailableSourceTableNames, setAvailableSourceTableNames] =
        useState<string[]>([]);
    const [sRollupTableList, setRollupTableList] = useState<RollupTableMap>({});
    const [sIsTableNameLoading, setIsTableNameLoading] = useState(true);
    const [sSelectedTable, setSelectedTableState] = useState('');

    const [sAvailableTags, setAvailableTags] = useState<CreateNewPanelTagSearchItem[]>([]);
    const [sSelectedTags, setSelectedTags] = useState<NewPanelSeriesPath[]>(() =>
        createNewPanelSeriesPathsFromDefinitions(sInitialSeries, {}),
    );

    const [sTagInputValue, setTagInputValue] = useState('');
    const [sSourceColumns, setSourceColumns] =
        useState<TagAnalyzerColumnInfo | undefined>();
    const [sTableColumns, setTableColumns] =
        useState<CreateNewPanelColumnMetadataRow[]>([]);
    const [sAxisKindWarning, setAxisKindWarning] =
        useState<string | undefined>();
    const tagSearchRequestKeyRef = useRef(0);
    const sIsAtSelectionLimit = sSelectedTags.length >= PANEL_TAG_LIMIT;

    function applySelectedTags(nextTags: NewPanelSeriesPath[]): boolean {
        if (hasMixedXAxisValueKinds(nextTags)) {
            setAxisKindWarning(MIXED_X_AXIS_KIND_WARNING);
            Toast.error(MIXED_X_AXIS_KIND_WARNING);
            return false;
        }

        setSelectedTags(nextTags);
        setAxisKindWarning(undefined);
        return true;
    }

    function handleSourceChange(
        table: string,
        sourceColumns: TagAnalyzerColumnInfo | undefined,
        tableColumns: CreateNewPanelColumnMetadataRow[],
    ): void {
        setSelectedTableState(table);
        setSourceColumns(sourceColumns);
        setTableColumns(tableColumns);

        if (!table || !sourceColumns) {
            setAvailableTags([]);
        }
    }

    async function loadTagList(): Promise<void> {
        if (!sSelectedTable || !sSourceColumns?.name) {
            setAvailableTags([]);
            return;
        }

        const sRequestKey = tagSearchRequestKeyRef.current + 1;
        tagSearchRequestKeyRef.current = sRequestKey;

        try {
            const { items, errorMessage } = await fetchCreateNewPanelTags({
                table: sSelectedTable,
                searchText: sTagInputValue,
                columns: sSourceColumns,
            });

            if (tagSearchRequestKeyRef.current !== sRequestKey) {
                return;
            }

            setAvailableTags(items);

            if (errorMessage) {
                Toast.error(errorMessage);
            }
        } catch (error) {
            if (tagSearchRequestKeyRef.current !== sRequestKey) {
                return;
            }

            setAvailableTags([]);
            Toast.error(getErrorMessage(error));
        }
    }

    function addSelectedTag(tagName: string): void {
        if (sIsAtSelectionLimit) {
            Toast.error(`The maximum number of tags in a chart is ${PANEL_TAG_LIMIT}.`);
            return;
        }

        const sColumns = sSourceColumns;
        if (!sSelectedTable || !sColumns) {
            Toast.error('please select table.');
            return;
        }
        if (!sColumns.time) {
            Toast.error('please select time field.');
            return;
        }
        if (!sColumns.value) {
            Toast.error('please select value field.');
            return;
        }
        if (isTagAnalyzerJsonValue(sTableColumns, sColumns.value) && !sColumns.jsonKey) {
            Toast.error('please select JSON key.');
            return;
        }
        if (isTagAlreadySelected(sSelectedTags, sSelectedTable, tagName)) {
            Toast.error('Tag already selected.');
            return;
        }

        applySelectedTags([
            ...sSelectedTags,
            createNewPanelSeriesPath({
                key: getId(),
                table: sSelectedTable,
                tagName,
                calculationMode: 'avg',
                columns: sColumns,
                rollupMetadata: sRollupTableList,
            }),
        ]);
    }

    function removeSelectedTag(tagId: string): void {
        const sNextTags = sSelectedTags.filter((item) => item.key !== tagId);

        setSelectedTags(sNextTags);
        setAxisKindWarning(
            hasMixedXAxisValueKinds(sNextTags)
                ? MIXED_X_AXIS_KIND_WARNING
                : undefined,
        );
    }


    useEffect(() => {
        void loadTableNames();
        void loadRollupTableInfo();
    }, []);

    async function loadTableNames(): Promise<void> {
        setAvailableSourceTableNames(await fetchCreateNewPanelTableNames());
        setIsTableNameLoading(false);
    }

    async function loadRollupTableInfo(): Promise<void> {
        setRollupTableList(await fetchAllRollupTableInfo());
    }

    function applySeriesSelection(): void {
        const sSelectedSeriesDefinitions = createPanelSeriesDefinitionsFromPaths(
            sSelectedTags,
            sInitialSeries,
        );

        if (isUpdatePanelSeriesSelectionModalProps(props)) {
            props.onUpdateSeries(sSelectedSeriesDefinitions);
            onClose();
            return;
        }

        const sNewPanel = createNewPanelInfo(
            sSelectedSeriesDefinitions,
            sChartTitle,
            sSelectedChartType,
        );
        props.onCreatePanel(sNewPanel);
        onClose();
    }

    useDebounce(
        [
            sTagInputValue,
            sSelectedTable,
            sSourceColumns?.name,
            sSourceColumns?.time,
            sSourceColumns?.value,
            sSourceColumns?.jsonKey,
            sSourceColumns?.timeType,
            sSourceColumns?.timeBaseTime,
        ],
        () => {
            void loadTagList();
        },
        200,
        undefined,
    );

    const sTagTotal = sAvailableTags.length;
    const sAvailableTagListItems = sAvailableTags.map((item) => ({
        id: item.id,
        label: item.name,
        tooltip: item.name,
    }));
    const sSelectedCount = sSelectedTags.length;

    function handleSelectedSeriesKeyDown(
        event: KeyboardEvent<HTMLDivElement>,
        tagId: string,
    ): void {
        if (event.target !== event.currentTarget) {
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            removeSelectedTag(tagId);
        }
    }

    return (
        <Modal.Root
            isOpen
            onClose={onClose}
            style={{ maxWidth: '700px', width: '100%' }}
        >
            <Modal.Header>
                <Modal.Title>
                    <span className={styles.titleIcon}>
                        <BiSolidChart />
                    </span>
                    {sIsSeriesUpdateMode ? 'Edit Series' : 'New Chart'}
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <div className={styles.panelStack}>
                    {!sIsSeriesUpdateMode ? (
                        <>
                            <Input
                                label="Chart name"
                                value={sChartTitle}
                                onChange={(event) => setChartTitle(event.target.value)}
                                labelPosition="top"
                                fullWidth
                                size="md"
                            />

                            <div className={styles.chartTypeSection}>
                                <label className={styles.sectionLabel}>Chart type</label>
                                <div className={styles.chartTypeRow}>
                                    {CHART_TYPE_OPTIONS.map(([chartType, Icon, label]) => {
                                        const sIsActive = sSelectedChartType === chartType;

                                        return (
                                            <Button
                                                key={chartType}
                                                className={`${styles.chartTypeButton} ${sIsActive ? styles.chartTypeButtonActive : ''}`}
                                                variant="ghost"
                                                size="md"
                                                style={
                                                    sIsActive
                                                        ? CHART_TYPE_CARD_ACTIVE_STYLE
                                                        : CHART_TYPE_CARD_STYLE
                                                }
                                                onClick={() => setSelectedChartType(chartType)}
                                                active={sIsActive}
                                            >
                                                <span className={styles.chartTypeButtonContent}>
                                                    <Icon size={26} />
                                                    <span className={styles.chartTypeLabel}>
                                                        {label}
                                                        {sIsActive ? <Check size={14} /> : null}
                                                    </span>
                                                </span>
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    ) : null}
                    <CreateNewPanelSourceSelector
                        availableSourceTableNames={sAvailableSourceTableNames}
                        rollupTableList={sRollupTableList}
                        isTableNameLoading={sIsTableNameLoading}
                        selectedTags={sSelectedTags}
                        onSourceChange={handleSourceChange}
                        onSelectedTagsChange={applySelectedTags}
                        onError={(message) => Toast.error(message)}
                    />

                    <Input
                        label="Tag"
                        labelPosition="top"
                        value={sTagInputValue}
                        placeholder="Search Tag"
                        onChange={(event) => setTagInputValue(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                void loadTagList();
                            }
                        }}
                        fullWidth
                        size="sm"
                        rightIcon={
                            <Button
                                variant="ghost"
                                size="icon"
                                icon={<Search size={16} />}
                                onClick={loadTagList}
                                aria-label="Search tags"
                            />
                        }
                    />

                    <div className={styles.itemListGroup}>
                        <div className={styles.listColumn}>
                            <div className={styles.columnHeader}>
                                <span className={styles.columnTitle}>
                                    Item list
                                    <Badge variant="primary" size="sm">
                                        {sTagTotal}
                                    </Badge>
                                </span>
                            </div>
                            <List
                                className={`${styles.seriesList} ${styles.availableTagList}`}
                                items={sAvailableTagListItems}
                                onItemClick={(id) => {
                                    const sTag = sAvailableTags.find(
                                        (tag) => tag.id === String(id),
                                    );
                                    if (sTag) {
                                        void addSelectedTag(sTag.name);
                                    }
                                }}
                            />
                        </div>

                        <div className={styles.listColumn}>
                            <div className={styles.columnHeader}>
                                <span className={styles.columnTitle}>
                                    Selected
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
                                    onClick={() => {
                                        setSelectedTags([]);
                                        setAxisKindWarning(undefined);
                                    }}
                                    disabled={sSelectedCount === 0}
                                >
                                    Clear all
                                </Button>
                            </div>
                            <div className={styles.selectedSeriesList}>
                                {sSelectedTags.length > 0 ? (
                                    <div className={`${styles.selectedSeriesItems} scrollbar-dark`}>
                                        {sSelectedTags.map((item) => (
                                            <div
                                                key={item.key}
                                                role="button"
                                                tabIndex={0}
                                                title={getSelectedSeriesTooltip(
                                                    item,
                                                    sRollupTableList,
                                                )}
                                                className={styles.selectedSeriesItem}
                                                onClick={() => removeSelectedTag(item.key)}
                                                onKeyDown={(event) =>
                                                    handleSelectedSeriesKeyDown(
                                                        event,
                                                        item.key,
                                                    )
                                                }
                                            >
                                                <div className={styles.selectedSeriesItemContent}>
                                                        <div className={styles.selectedSeriesHeader}>
                                                            <span
                                                                className={styles.selectedSeriesName}
                                                                title={item.tagName}
                                                            >
                                                                {item.tagName}
                                                            </span>
                                                            <div
                                                                className={styles.modeTriggerWrapper}
                                                                onClick={(event) => event.stopPropagation()}
                                                            >
                                                                <Dropdown.Root
                                                                    options={TAG_ANALYZER_AGGREGATION_MODE_OPTIONS}
                                                                    value={item.calculationMode || 'avg'}
                                                                    onChange={(value) => {
                                                                        setSelectedTags((previousTags) =>
                                                                            previousTags.map((previousTag) =>
                                                                                previousTag.key === item.key
                                                                                    ? {
                                                                                          ...previousTag,
                                                                                          calculationMode: value,
                                                                                      }
                                                                                    : previousTag,
                                                                            ),
                                                                        );
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
                                                            rollupTableList={sRollupTableList}
                                                        />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={styles.selectedSeriesEmpty}>no-data</div>
                                )}
                            </div>
                            {sAxisKindWarning ? (
                                <div className={styles.selectedSeriesWarning}>
                                    {sAxisKindWarning}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Modal.Cancel>Cancel</Modal.Cancel>
                <Modal.Confirm onClick={applySeriesSelection}>Apply</Modal.Confirm>
            </Modal.Footer>
        </Modal.Root>
    );
}

function SelectedSeriesSourceDetails({
    item,
    rollupTableList,
}: {
    item: NewPanelSeriesPath;
    rollupTableList: RollupTableMap;
}) {
    const sRows = [
        ['Table', getDisplayTableName(item.table)],
        ['Time', item.sourceColumns.time || 'Time not selected'],
        ['Value', getSourceValueLabel(item, rollupTableList)],
    ] as const;

    return (
        <div
            className={styles.selectedSeriesSourceDetails}
            title={getSelectedSeriesTooltip(item, rollupTableList)}
        >
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


function isTagAlreadySelected(
    selectedTags: NewPanelSeriesPath[],
    table: string,
    tagName: string,
): boolean {
    return selectedTags.some((item) => (
        item.table === table && item.tagName === tagName
    ));
}

function getDisplayTableName(tableName: string): string {
    return tableName.split('.').at(-1) ?? tableName;
}

function getSourceValueLabel(
    item: NewPanelSeriesPath,
    rollupTableList: RollupTableMap,
): string {
    if (item.kind === 'json') {
        return `${item.sourceColumns.value} -> ${item.sourceColumns.jsonKey ?? ''}`;
    }

    if (item.kind === 'rollup') {
        const sRollupColumn = item.rollupColumn ?? getCreateNewPanelRollupColumn(
            rollupTableList,
            item.table,
            item.sourceColumns.value,
            item.sourceColumns.jsonKey,
        );

        return `${item.sourceColumns.value} (${sRollupColumn ?? 'rollup'})`;
    }

    return item.sourceColumns.value || 'Value not selected';
}

function getSelectedSeriesTooltip(
    item: NewPanelSeriesPath,
    rollupTableList: RollupTableMap,
): string {
    return [
        `Tag: ${item.tagName}`,
        `Table: ${item.table}`,
        `Time: ${item.sourceColumns.time || 'not selected'}`,
        `Value: ${getSourceValueLabel(item, rollupTableList)}`,
        `Mode: ${item.calculationMode || 'avg'}`,
    ].join('\n');
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

export default PanelSeriesSelectionModal;
