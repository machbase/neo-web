import { ArrowDown, Search } from '@/assets/icons/Icon';
import {
    Button,
    Combobox,
    Dropdown,
    Input,
    InputSelect,
    List,
    Pagination,
} from '@/design-system/components';
import type { ComboboxOption } from '@/design-system/components';
import listStyles from '@/design-system/components/List/index.module.scss';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import {
    buildTagSelectionCountLabel,
    getTagSelectionCountColor,
} from './tagSelectionPresentation';
import type { TagSelectionDraftItem, TagSelectionPanelViewModel } from './TagSelectionTypes';
import styles from './TagSelectionPanel.module.scss';

const getDisplayTableName = (tableName: string): string => tableName.split('.').at(-1) ?? tableName;

const getSourceValueLabel = (item: TagSelectionDraftItem): string =>
    item.sourceColumns.jsonKey
        ? `${item.sourceColumns.value} -> ${item.sourceColumns.jsonKey}`
        : item.sourceColumns.value || 'Value not selected';

const getSelectedSeriesSourceSummary = (item: TagSelectionDraftItem): string =>
    `${getDisplayTableName(item.table)} - ${item.sourceColumns.time || 'Time not selected'} -> ${getSourceValueLabel(item)}`;

const getSelectedSeriesTooltip = (item: TagSelectionDraftItem): string =>
    [
        `Tag: ${item.sourceTagName}`,
        `Table: ${item.table}`,
        `Time: ${item.sourceColumns.time || 'not selected'}`,
        `Value: ${getSourceValueLabel(item)}`,
        `Mode: ${item.calculationMode || 'avg'}`,
    ].join('\n');

const COMPACT_INPUT_WRAPPER_STYLE = {
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: '50%',
    minWidth: 260,
    maxWidth: 420,
} satisfies CSSProperties;

function TagSelectionComboboxField({
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
        <div className={styles.fieldRow}>
            <label className={styles.fieldLabel}>{label}</label>
            <div className={styles.fieldControlGroup}>
                <div className={styles.fieldControlContainer}>
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
                {children}
            </div>
        </div>
    );
}

const TagSelectionPanel = ({
    chartControl,
    viewModel,
}: {
    chartControl?: ReactNode;
    viewModel: TagSelectionPanelViewModel;
}) => {
    const {
        searchControls,
        columnControls,
        availableTagList,
        selectedSeriesList,
    } = viewModel;
    const {
        tableOptions,
        selectedTable,
        onSelectedTableChange,
        tagTotal,
        tagInputValue,
        onTagInputChange,
        onSearch,
    } = searchControls;
    const {
        timeColumnOptions,
        valueColumnOptions,
        jsonKeyOptions,
        selectedTimeColumn,
        selectedValueColumn,
        selectedJsonKey,
        selectedJsonKeySummaryLabel,
        jsonKeyInputValue,
        isJsonValue,
        isDisabled,
        onTimeColumnChange,
        onValueColumnChange,
        onJsonKeyInputChange,
        onJsonKeyInputBlur,
        onJsonKeySelect,
    } = columnControls;
    const {
        availableTags,
        onAvailableTagSelect,
        pagination,
    } = availableTagList;
    const {
        selectedSeriesDrafts,
        onSelectedSeriesDraftRemove,
        axisKindWarning,
        modeOptions,
        modeTriggerStyle,
        onSelectedSeriesDraftModeChange,
        maxSelectedCount,
    } = selectedSeriesList;
    const sAvailableTagListItems = availableTags.map((item) => ({
        id: item.id,
        label: item.name,
        tooltip: item.name,
    }));
    const sSelectedCountColor = getTagSelectionCountColor(
        selectedSeriesDrafts.length,
        maxSelectedCount,
    );
    const handleSelectedSeriesDraftKeyDown = (
        event: KeyboardEvent<HTMLDivElement>,
        tagId: string,
    ) => {
        if (event.target !== event.currentTarget) {
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelectedSeriesDraftRemove(tagId);
        }
    };

    return (
        <div className={styles.panelStack}>
            <TagSelectionComboboxField
                label="Table"
                options={tableOptions}
                value={selectedTable}
                onChange={onSelectedTableChange}
            />

            <TagSelectionComboboxField
                label="Time"
                options={timeColumnOptions}
                value={selectedTimeColumn}
                onChange={onTimeColumnChange}
                disabled={isDisabled}
            />

            <TagSelectionComboboxField
                label="Value"
                options={valueColumnOptions}
                value={selectedValueColumn}
                onChange={onValueColumnChange}
                disabled={isDisabled}
            >
                {isJsonValue ? (
                    <>
                        <span className={styles.jsonKeyLabel}>
                            <span>-&gt;$</span>
                            {selectedJsonKeySummaryLabel ? (
                                <span className={styles.jsonKeyMeta}>
                                    {selectedJsonKeySummaryLabel}
                                </span>
                            ) : null}
                        </span>
                        <div className={styles.fieldControlContainer}>
                            <InputSelect
                                aria-label="JSON key"
                                type="text"
                                options={jsonKeyOptions}
                                value={jsonKeyInputValue}
                                onChange={(event) =>
                                    onJsonKeyInputChange(event.target.value)
                                }
                                onBlur={onJsonKeyInputBlur}
                                selectValue={selectedJsonKey}
                                onSelectChange={onJsonKeySelect}
                                fullWidth
                                size="sm"
                                style={{ height: '30px' }}
                            />
                        </div>
                    </>
                ) : null}
            </TagSelectionComboboxField>

            {chartControl}

            <Input
                label={`Tag (${tagTotal})`}
                labelPosition="left"
                value={tagInputValue}
                placeholder="Search Tag"
                onChange={(event) => onTagInputChange(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && onSearch()}
                fullWidth
                size="sm"
                style={COMPACT_INPUT_WRAPPER_STYLE}
                rightIcon={
                    <Button
                        variant="ghost"
                        size="icon"
                        icon={<Search size={16} />}
                        onClick={onSearch}
                        aria-label="Search tags"
                    />
                }
            />

            <div className={`${styles.fieldRow} ${styles.itemListRow}`}>
                <label className={styles.fieldLabel}>Item list</label>
                <div className={styles.itemListGroup}>
                    <div className={`${styles.listColumn} ${styles.availableTagColumn}`}>
                        <List
                            maxHeight={200}
                            items={sAvailableTagListItems}
                            onItemClick={(id) => {
                                const sTag = availableTags.find((tag) => tag.id === String(id));
                                if (sTag) {
                                    onAvailableTagSelect(sTag.name);
                                }
                            }}
                        />
                        <Pagination
                            currentPage={pagination.tagPagination}
                            totalPages={pagination.maxPageNum}
                            onPageChange={pagination.onPageChange}
                            inputValue={String(pagination.keepPageNum)}
                            onPageInputChange={pagination.onPageInputChange}
                            style={{ marginTop: '8px' }}
                        />
                    </div>

                    <div className={`${styles.listColumn} ${styles.selectedSeriesColumn}`}>
                        <div className={`${listStyles.list} ${styles.selectedSeriesList}`}>
                            {selectedSeriesDrafts.length > 0 ? (
                                <div className={`${listStyles['list__items']} scrollbar-dark`}>
                                    {selectedSeriesDrafts.map((item) => (
                                        <div
                                            key={item.key}
                                            role="button"
                                            tabIndex={0}
                                            title={getSelectedSeriesTooltip(item)}
                                            className={`${listStyles['list__item']} ${styles.selectedSeriesItem}`}
                                            onClick={() => onSelectedSeriesDraftRemove(item.key)}
                                            onKeyDown={(event) =>
                                                handleSelectedSeriesDraftKeyDown(
                                                    event,
                                                    item.key,
                                                )
                                            }
                                        >
                                            <div className={listStyles['list__item-label']}>
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
                                                                options={modeOptions}
                                                                value={item.calculationMode || 'avg'}
                                                                onChange={(value) =>
                                                                    onSelectedSeriesDraftModeChange(
                                                                        value,
                                                                        item,
                                                                    )
                                                                }
                                                            >
                                                                <Dropdown.Trigger
                                                                    className="dropdown-trigger-sm"
                                                                    style={{
                                                                        width: '100%',
                                                                        ...modeTriggerStyle,
                                                                    }}
                                                                />
                                                                <Dropdown.Menu>
                                                                    <Dropdown.List />
                                                                </Dropdown.Menu>
                                                            </Dropdown.Root>
                                                        </div>
                                                    </div>
                                                    <span
                                                        className={styles.selectedSeriesSource}
                                                        title={getSelectedSeriesTooltip(item)}
                                                    >
                                                        {getSelectedSeriesSourceSummary(item)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={listStyles['list__empty']}>no-data</div>
                            )}
                        </div>
                        <div
                            className={styles.selectedCount}
                            style={{
                                color: sSelectedCountColor,
                            }}
                        >
                            {buildTagSelectionCountLabel(
                                selectedSeriesDrafts.length,
                                maxSelectedCount,
                            )}
                        </div>
                        {axisKindWarning ? (
                            <div className={styles.selectedSeriesWarning}>
                                {axisKindWarning}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TagSelectionPanel;
