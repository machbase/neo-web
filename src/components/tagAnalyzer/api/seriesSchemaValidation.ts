import { getUserName } from '@/utils';
import { getCurrentDatabaseName } from '@/utils/currentDatabaseState';
import { buildArrayElementSql, isArrayTypeColumn } from '@/utils/arrayValue';
import { tableMetadataApi, type TableColumn } from './tableMetadataApi';
import { validatePanelSeriesSourceColumns, type PanelSeriesSourceColumns, type ValidatedPanelSeriesSourceColumns } from '../seriesModel';

// Keep only in-flight work: reopening a board or retrying always observes the current schema.
// Shared requests have no caller's AbortSignal, so cancelling one series cannot cancel another.
const pending = new Map<string, Promise<TableColumn[]>>();

export async function validateSeriesSchema(table: string, source: PanelSeriesSourceColumns, signal?: AbortSignal): Promise<ValidatedPanelSeriesSourceColumns> {
    const columns = validatePanelSeriesSourceColumns(source);
    // Legacy scalar/JSON queries must not acquire a new catalogue dependency or extra refresh IO.
    // New ARRAY selections carry an index (and optionally a known type marker); their schema
    // is always revalidated, including boards restored without going through the editor.
    if (columns.arrayIndex === undefined && columns.arrayType === undefined) return columns;
    const key = `${getUserName()}\u0000${getCurrentDatabaseName()}\u0000${table}`;
    let request = pending.get(key);
    if (!request) {
        request = tableMetadataApi.fetchTableColumns(table);
        pending.set(key, request);
        const active = request;
        void request.finally(() => { if (pending.get(key) === active) pending.delete(key); }).catch(() => undefined);
    }
    const schema = await request;
    if (signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
    const column = schema.find((item) => item.name.toUpperCase() === source.value.toUpperCase());
    if (!column) throw new Error(`Value column ${source.value} is unavailable. Refresh the schema and retry.`);
    if (isArrayTypeColumn(column.type)) {
        if (columns.arrayIndex === undefined) throw new Error('Select an ARRAY element before querying.');
        if (!column.arrayMetadata) throw new Error('ARRAY metadata is unavailable. Retry the schema request.');
        buildArrayElementSql(columns.value, columns.arrayIndex, column.arrayMetadata);
        return { ...columns, arrayMetadata: column.arrayMetadata };
    }
    if (columns.arrayIndex !== undefined) throw new Error('The selected value column is no longer an ARRAY.');
    return columns;
}
