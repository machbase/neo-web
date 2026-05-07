/**
 * Parses one unknown value into a non-negative integer.
 * Intent: Keep shared UI index parsing consistent across chart and panel helpers.
 * @param {unknown} value The value to parse.
 * @returns {number | undefined} The parsed non-negative integer, if valid.
 */
export function parseNonNegativeInteger(value: unknown): number | undefined {
    const sValue = Number(value);

    return Number.isInteger(sValue) && sValue >= 0 ? sValue : undefined;
}
