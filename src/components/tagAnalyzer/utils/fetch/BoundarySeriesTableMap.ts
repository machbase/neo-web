import type {
    BoundarySeries,
    TableTagMap,
} from './FetchTypes';

/**
 * Groups boundary-series input by table.
 * Intent: Convert per-series boundary input into the table-grouped structure used by boundary SQL helpers.
 * @param {T[]} tableTagInfo - The series metadata to group.
 * @returns {TableTagMap[]} The grouped table mappings.
 */
export function groupBoundarySeriesByTable<T extends BoundarySeries>(
    tableTagInfo: T[],
): TableTagMap[] {
    const sGroupedTableMap: Record<
        string,
        {
            cols: T['sourceColumns'];
            tags: string[];
        }
    > = {};

    tableTagInfo.forEach((info) => {
        const sExistingEntry = sGroupedTableMap[info.table];
        const sTagName = info.sourceTagName || '';

        if (sExistingEntry) {
            sExistingEntry.tags.push(sTagName);
            return;
        }

        sGroupedTableMap[info.table] = {
            cols: info.sourceColumns,
            tags: [sTagName],
        };
    });

    return Object.keys(sGroupedTableMap).map((table) => ({
        table,
        tags: sGroupedTableMap[table].tags,
        cols: sGroupedTableMap[table].cols,
    }));
}
