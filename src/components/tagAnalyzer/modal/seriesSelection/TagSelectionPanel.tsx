import { Search } from '@/assets/icons/Icon';
import {
    Button,
    Dropdown,
    Input,
    InputSelect,
    List,
    Pagination,
} from '@/design-system/components';
import listStyles from '@/design-system/components/List/index.module.scss';
import type { KeyboardEvent } from 'react';
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
} as const;
const FIELD_INPUT_STYLE = { height: '30px' } as const;

const TagSelectionPanel = ({
    viewModel,
}: {
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
        <>
            <Dropdown.Root
                label="Table"
                labelPosition="left"
                options={tableOptions}
                value={selectedTable}
                onChange={onSelectedTableChange}
                fullWidth
            >
                <Dropdown.Trigger />
                <Dropdown.Menu>
                    <Dropdown.List />
                </Dropdown.Menu>
            </Dropdown.Root>

            <Input
                label={`Tag (${tagTotal})`}
                labelPosition="left"
                value={tagInputValue}
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

            <InputSelect
                label="Time field"
                labelPosition="left"
                type="text"
                options={timeColumnOptions}
                value={selectedTimeColumn}
                onChange={(event) => onTimeColumnChange(event.target.value)}
                selectValue={selectedTimeColumn}
                onSelectChange={onTimeColumnChange}
                disabled={isDisabled}
                fullWidth
                size="sm"
                style={FIELD_INPUT_STYLE}
            />

            <div style={FIELD_ROW_STYLE}>
                <label style={FIELD_LABEL_STYLE}>Value field</label>
                <div style={FIELD_CONTROL_GROUP_STYLE}>
                    <div style={FIELD_CONTROL_CONTAINER_STYLE}>
                        <InputSelect
                            aria-label="Value field"
                            type="text"
                            options={valueColumnOptions}
                            value={selectedValueColumn}
                            onChange={(event) => onValueColumnChange(event.target.value)}
                            selectValue={selectedValueColumn}
                            onSelectChange={onValueColumnChange}
                            disabled={isDisabled}
                            fullWidth
                            size="sm"
                            style={FIELD_INPUT_STYLE}
                        />
                    </div>
                    {isJsonValue ? (
                        <>
                            <span style={JSON_KEY_LABEL_STYLE}>-&gt;$</span>
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
                </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', flex: '1 1 auto', minWidth: 0 }}>
                <div style={{ flex: '1 1 0', minWidth: '120px', maxWidth: '120px' }} />

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
                                                    style={DEFAULT_LABEL_STYLE}
                                                    title={item.selectedSeriesDraft.sourceTagName}
                                                >
                                                    {item.selectedSeriesDraft.sourceTagName}
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
                </div>
            </div>
        </>
    );
};

export default TagSelectionPanel;
