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
import {
    DEFAULT_LABEL_STYLE,
    DEFAULT_TRIGGER_STYLE,
    MODE_TRIGGER_WRAPPER_STYLE,
    SELECTED_SERIES_ITEM_STYLE,
    SELECTED_SERIES_LIST_STYLE,
} from './TagSelectionConstants';
import type { TagSelectionPanelViewModel } from './TagSelectionTypes';

const FIELD_ROW_STYLE = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
} as const;
const PANEL_STACK_STYLE = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
} as const;
const ITEM_LIST_ROW_STYLE = {
    ...FIELD_ROW_STYLE,
    alignItems: 'flex-start',
} as const;
const ITEM_LIST_GROUP_STYLE = {
    display: 'flex',
    gap: '12px',
    flex: '1 1 auto',
    minWidth: 0,
} as const;
const FIELD_LABEL_STYLE = {
    width: '120px',
    flexShrink: 0,
    color: '#c4c4c4',
    fontSize: '13px',
    fontWeight: 500,
} as const;
const FIELD_CONTROL_GROUP_STYLE = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: 0,
} as const;
const FIELD_CONTROL_CONTAINER_STYLE = { flex: 1, minWidth: 0 } as const;
const JSON_KEY_LABEL_STYLE = {
    color: '#c4c4c4',
    fontSize: '13px',
    fontWeight: 500,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
} as const;
const JSON_KEY_META_STYLE = {
    color: '#8190a1',
    fontSize: '10px',
    fontWeight: 600,
    lineHeight: 1,
    whiteSpace: 'nowrap',
} as const;
const FIELD_INPUT_STYLE = { height: '30px' } as const;
const SELECTED_SERIES_TEXT_STYLE = {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0,
} as const;
const SELECTED_SERIES_SOURCE_STYLE = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: '#8190a1',
    fontSize: '11px',
    fontWeight: 500,
} as const;
const SELECTED_SERIES_WARNING_STYLE = {
    marginTop: '8px',
    color: '#ff8a3d',
    fontSize: '12px',
    lineHeight: '16px',
} as const;

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
        <div style={FIELD_ROW_STYLE}>
            <label style={FIELD_LABEL_STYLE}>{label}</label>
            <div style={FIELD_CONTROL_GROUP_STYLE}>
                <div style={FIELD_CONTROL_CONTAINER_STYLE}>
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
        <div style={PANEL_STACK_STYLE}>
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
                        <span style={JSON_KEY_LABEL_STYLE}>
                            <span>-&gt;$</span>
                            {selectedJsonKeySummaryLabel ? (
                                <span style={JSON_KEY_META_STYLE}>
                                    {selectedJsonKeySummaryLabel}
                                </span>
                            ) : null}
                        </span>
                        <div style={FIELD_CONTROL_CONTAINER_STYLE}>
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
                                style={FIELD_INPUT_STYLE}
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

            <div style={ITEM_LIST_ROW_STYLE}>
                <label style={FIELD_LABEL_STYLE}>Item list</label>
                <div style={ITEM_LIST_GROUP_STYLE}>
                    <div style={{ flex: '2 1 0', minWidth: 0 }}>
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

                    <div style={{ flex: '2 1 0', minWidth: 0 }}>
                        <div className={listStyles.list} style={SELECTED_SERIES_LIST_STYLE}>
                            {sSelectedSeriesDraftListItems.length > 0 ? (
                                <div className={`${listStyles['list__items']} scrollbar-dark`}>
                                    {sSelectedSeriesDraftListItems.map((item) => (
                                        <div
                                            key={item.id}
                                            role="button"
                                            tabIndex={0}
                                            title={item.tooltip}
                                            className={listStyles['list__item']}
                                            style={SELECTED_SERIES_ITEM_STYLE}
                                            onClick={() => onSelectedSeriesDraftRemove(item.id)}
                                            onKeyDown={(event) =>
                                                handleSelectedSeriesDraftKeyDown(
                                                    event,
                                                    item.id,
                                                )
                                            }
                                        >
                                            <div className={listStyles['list__item-label']}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                                    <span
                                                        style={SELECTED_SERIES_TEXT_STYLE}
                                                        title={item.tooltip}
                                                    >
                                                        <span style={DEFAULT_LABEL_STYLE}>
                                                            {item.selectedSeriesDraft.sourceTagName}
                                                        </span>
                                                        <span style={SELECTED_SERIES_SOURCE_STYLE}>
                                                            {item.sourceSummary}
                                                        </span>
                                                    </span>
                                                    <div
                                                        style={MODE_TRIGGER_WRAPPER_STYLE}
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
                                                                    ...DEFAULT_TRIGGER_STYLE,
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
                            style={{
                                marginTop: '8px',
                                textAlign: 'right',
                                fontSize: '12px',
                                color: sSelectedCountColor,
                            }}
                        >
                            {buildTagSelectionCountLabel(
                                selectedSeriesDrafts.length,
                                maxSelectedCount,
                            )}
                        </div>
                        {axisKindWarning ? (
                            <div style={SELECTED_SERIES_WARNING_STYLE}>
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
