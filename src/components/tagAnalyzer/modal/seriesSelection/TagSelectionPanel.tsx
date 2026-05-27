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
import type { KeyboardEvent, ReactNode } from 'react';
import {
    buildTagSelectionCountLabel,
    getTagSelectionCountColor,
} from './tagSelectionPresentation';
import {
    findTagById,
    mapSelectedSeriesDraftListItems,
    mapTagSearchItemsToListItems,
} from './tagSelectionPanelHelpers';
import type { TagSelectionPanelViewModel } from './TagSelectionTypes';
import styles from './TagSelectionPanel.module.scss';

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
    const sAvailableTagListItems = mapTagSearchItemsToListItems(availableTags);
    const sSelectedSeriesDraftListItems = mapSelectedSeriesDraftListItems(
        selectedSeriesDrafts,
    );
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
                    <div className={styles.listColumn}>
                        <List
                            maxHeight={200}
                            items={sAvailableTagListItems}
                            onItemClick={(id) => {
                                const sTag = findTagById(availableTags, id);
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

                    <div className={styles.listColumn}>
                        <div className={`${listStyles.list} ${styles.selectedSeriesList}`}>
                            {sSelectedSeriesDraftListItems.length > 0 ? (
                                <div className={`${listStyles['list__items']} scrollbar-dark`}>
                                    {sSelectedSeriesDraftListItems.map((item) => (
                                        <div
                                            key={item.id}
                                            role="button"
                                            tabIndex={0}
                                            title={item.tooltip}
                                            className={`${listStyles['list__item']} ${styles.selectedSeriesItem}`}
                                            onClick={() => onSelectedSeriesDraftRemove(item.id)}
                                            onKeyDown={(event) =>
                                                handleSelectedSeriesDraftKeyDown(
                                                    event,
                                                    item.id,
                                                )
                                            }
                                        >
                                            <div className={listStyles['list__item-label']}>
                                                <div className={styles.selectedSeriesRow}>
                                                    <span
                                                        className={styles.selectedSeriesText}
                                                        title={item.tooltip}
                                                    >
                                                        <span className={styles.selectedSeriesName}>
                                                            {item.selectedSeriesDraft.sourceTagName}
                                                        </span>
                                                        <span className={styles.selectedSeriesSource}>
                                                            {item.sourceSummary}
                                                        </span>
                                                    </span>
                                                    <div
                                                        className={styles.modeTriggerWrapper}
                                                        onClick={(event) => event.stopPropagation()}
                                                    >
                                                        <Dropdown.Root
                                                            options={modeOptions}
                                                            value={item.selectedSeriesDraft.calculationMode || 'avg'}
                                                            onChange={(value) =>
                                                                onSelectedSeriesDraftModeChange(
                                                                    value,
                                                                    item.selectedSeriesDraft,
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
