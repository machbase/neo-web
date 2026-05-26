import type { PanelSeriesDefinition } from '../../domain/SeriesDomain';
import type { TagSelectionDraftItem } from './TagSelectionTypes';
export function mergeSelectedTagsIntoTagSet(
    originSeriesConfigs: PanelSeriesDefinition[],
    selectedSeriesDrafts: TagSelectionDraftItem[],
): PanelSeriesDefinition[] {
    const sNewSeriesConfigs = buildSeriesDefinitionsFromDrafts(selectedSeriesDrafts);

    return [...originSeriesConfigs, ...sNewSeriesConfigs];
}
export function buildSeriesDefinitionsFromDrafts(
    seriesDrafts: TagSelectionDraftItem[],
): PanelSeriesDefinition[] {
    return seriesDrafts.map((seriesDraft) => ({
        key: seriesDraft.key,
        table: seriesDraft.table,
        sourceTagName: seriesDraft.sourceTagName,
        alias: seriesDraft.alias,
        calculationMode: seriesDraft.calculationMode,
        color: undefined,
        useSecondaryAxis: false,
        id: undefined,
        useRollupTable: false,
        sourceColumns: {
            ...seriesDraft.sourceColumns,
        },
    }));
}
