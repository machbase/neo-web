/**
 * Wraps a SQL statement with the TQL CSV envelope used by the chart fetch endpoints.
 * Intent: Keep every chart fetch query using the same TQL CSV wrapper.
 * @param {string} aSqlQuery - The SQL query body to wrap.
 * @returns {string} The wrapped TQL CSV query string.
 */
export function buildTqlCsvQueryPayload(aSqlQuery: string): string {
    return `SQL("${aSqlQuery}")\nCSV()`;
}
