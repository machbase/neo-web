import {
    EMPTY_SELECTION_ERROR,
    TAG_SELECTION_LIMIT_COLOR,
} from './TagSelectionConstants';
export function buildTagSelectionLimitError(maxSelectedCount: number): string {
    return `The maximum number of tags in a chart is ${maxSelectedCount}.`;
}
export function getTagSelectionErrorMessage(
    selectedCount: number,
    maxSelectedCount: number,
): string | undefined {
    if (selectedCount === 0) {
        return EMPTY_SELECTION_ERROR;
    }

    if (selectedCount > maxSelectedCount) {
        return buildTagSelectionLimitError(maxSelectedCount);
    }

    return undefined;
}
export function getTagSelectionCountColor(
    selectedCount: number,
    maxSelectedCount: number,
): string {
    return selectedCount === maxSelectedCount ? TAG_SELECTION_LIMIT_COLOR : 'inherit';
}
export function buildTagSelectionCountLabel(
    selectedCount: number,
    maxSelectedCount: number,
): string {
    return `Select: ${selectedCount} / ${maxSelectedCount}`;
}
