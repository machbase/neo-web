import {
    EMPTY_SELECTION_ERROR,
    TAG_SELECTION_LIMIT_COLOR,
} from './TagSelectionConstants';

/**
 * Builds the selection-limit error message for the tag picker.
 * Intent: Explain why the chart cannot accept more tags when the limit is reached.
 * @param {number} aMaxSelectedCount The maximum number of selectable tags.
 * @returns {string} The over-limit validation message.
 */
export function buildTagSelectionLimitError(aMaxSelectedCount: number): string {
    return `The maximum number of tags in a chart is ${aMaxSelectedCount}.`;
}

/**
 * Resolves the current tag-selection validation message.
 * Intent: Centralize the empty-state and over-limit copy in one presentation helper.
 * @param {number} aSelectedCount The current number of selected tags.
 * @param {number} aMaxSelectedCount The maximum number of selectable tags.
 * @returns {string | undefined} The validation message, or undefined when the selection is valid.
 */
export function getTagSelectionErrorMessage(
    aSelectedCount: number,
    aMaxSelectedCount: number,
): string | undefined {
    if (aSelectedCount === 0) {
        return EMPTY_SELECTION_ERROR;
    }

    if (aSelectedCount > aMaxSelectedCount) {
        return buildTagSelectionLimitError(aMaxSelectedCount);
    }

    return undefined;
}

/**
 * Chooses the color used for the selected-tag count label.
 * Intent: Highlight the count when the user reaches the selection limit.
 * @param {number} aSelectedCount The current number of selected tags.
 * @param {number} aMaxSelectedCount The maximum number of selectable tags.
 * @returns {string} The label color for the current selection state.
 */
export function getTagSelectionCountColor(
    aSelectedCount: number,
    aMaxSelectedCount: number,
): string {
    return aSelectedCount === aMaxSelectedCount ? TAG_SELECTION_LIMIT_COLOR : 'inherit';
}

/**
 * Builds the selected-tag count label text.
 * Intent: Keep the selection footer copy consistent across tag-selection views.
 * @param {number} aSelectedCount The current number of selected tags.
 * @param {number} aMaxSelectedCount The maximum number of selectable tags.
 * @returns {string} The formatted selected-tag count label.
 */
export function buildTagSelectionCountLabel(
    aSelectedCount: number,
    aMaxSelectedCount: number,
): string {
    return `Select: ${aSelectedCount} / ${aMaxSelectedCount}`;
}
