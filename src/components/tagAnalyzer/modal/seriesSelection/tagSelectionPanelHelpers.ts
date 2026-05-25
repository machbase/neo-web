import type {
    SelectedSeriesDraftListItem,
    TagSearchItem,
    TagSearchListItem,
    TagSelectionDraftItem,
} from './TagSelectionTypes';

function getDisplayTableName(tableName: string): string {
    return tableName.split('.').at(-1) ?? tableName;
}

function getSourceValueLabel(item: TagSelectionDraftItem): string {
    const sValueColumn = item.sourceColumns.jsonKey
        ? `${item.sourceColumns.value} -> ${item.sourceColumns.jsonKey}`
        : item.sourceColumns.value;

    return sValueColumn || 'Value not selected';
}

function buildSelectedSeriesSourceSummary(item: TagSelectionDraftItem): string {
    const sTableName = getDisplayTableName(item.table);
    const sTimeColumn = item.sourceColumns.time || 'Time not selected';

    return `${sTableName} - ${sTimeColumn} -> ${getSourceValueLabel(item)}`;
}

function buildSelectedSeriesTooltip(item: TagSelectionDraftItem): string {
    return [
        `Tag: ${item.sourceTagName}`,
        `Table: ${item.table}`,
        `Time: ${item.sourceColumns.time || 'not selected'}`,
        `Value: ${getSourceValueLabel(item)}`,
        `Mode: ${item.calculationMode || 'avg'}`,
    ].join('\n');
}

export function mapTagSearchItemsToListItems(
    availableTags: TagSearchItem[],
): TagSearchListItem[] {
    return availableTags.map((item) => ({
        id: item.id,
        label: item.name,
        tooltip: item.name,
    }));
}
export function findTagById(
    availableTags: TagSearchItem[],
    id: string | number,
): TagSearchItem | undefined {
    return availableTags.find((tag) => tag.id === String(id));
}
export function mapSelectedSeriesDraftListItems(
    selectedSeriesDrafts: TagSelectionDraftItem[],
): SelectedSeriesDraftListItem[] {
    return selectedSeriesDrafts.map((item) => ({
        id: item.key,
        selectedSeriesDraft: item,
        sourceSummary: buildSelectedSeriesSourceSummary(item),
        tooltip: buildSelectedSeriesTooltip(item),
    }));
}
