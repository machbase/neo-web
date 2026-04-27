import {
    EMPTY_SELECTION_ERROR,
    TAG_SELECTION_LIMIT_COLOR,
} from './TagSelectionConstants';

/**
 * Builds the selection-limit error message for the tag picker.
 * Intent: Explain why the chart cannot accept more tags when the limit is reached.
 * @param {number} maxSelectedCount The maximum number of selectable tags.
 * @returns {string} The over-limit validation message.
 */
export function buildTagSelectionLimitError(maxSelectedCount: number): string {
    return `The maximum number of tags in a chart is ${maxSelectedCount}.`;
}

/**
 * Resolves the current tag-selection validation message.
 * Intent: Centralize the empty-state and over-limit copy in one presentation helper.
 * @param {number} selectedCount The current number of selected tags.
 * @param {number} maxSelectedCount The maximum number of selectable tags.
 * @returns {string | undefined} The validation message, or undefined when the selection is valid.
 */
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

/**
 * Chooses the color used for the selected-tag count label.
 * Intent: Highlight the count when the user reaches the selection limit.
 * @param {number} selectedCount The current number of selected tags.
 * @param {number} maxSelectedCount The maximum number of selectable tags.
 * @returns {string} The label color for the current selection state.
 */
export function getTagSelectionCountColor(
    selectedCount: number,
    maxSelectedCount: number,
): string {
    return selectedCount === maxSelectedCount ? TAG_SELECTION_LIMIT_COLOR : 'inherit';
}

/**
 * Builds the selected-tag count label text.
 * Intent: Keep the selection footer copy consistent across tag-selection views.
 * @param {number} selectedCount The current number of selected tags.
 * @param {number} maxSelectedCount The maximum number of selectable tags.
 * @returns {string} The formatted selected-tag count label.
 */
export function buildTagSelectionCountLabel(
    selectedCount: number,
    maxSelectedCount: number,
): string {
    return `Select: ${selectedCount} / ${maxSelectedCount}`;
}
