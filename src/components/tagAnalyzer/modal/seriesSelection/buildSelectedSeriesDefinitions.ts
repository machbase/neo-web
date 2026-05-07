import type { PanelSeriesDefinition } from '../../domain/SeriesModel';
import type { TagSelectionDraftItem } from './TagSelectionTypes';

/**
 * Merges selected tag drafts into an existing tag set.
 * Intent: Rebuild the series config list after the user changes the selected tags.
 *
 * @param originSeriesConfigs The current series configs.
 * @param selectedSeriesDrafts The selected series drafts to merge in.
 * @returns The merged series configs.
 */
export function mergeSelectedTagsIntoTagSet(
    originSeriesConfigs: PanelSeriesDefinition[],
    selectedSeriesDrafts: TagSelectionDraftItem[],
): PanelSeriesDefinition[] {
    const sNewSeriesConfigs = buildSeriesDefinitionsFromDrafts(selectedSeriesDrafts);

    return [...originSeriesConfigs, ...sNewSeriesConfigs];
}

/**
 * Converts selected tag drafts into the current runtime series-definition shape.
 * Intent: Ensure modal-selected tags produce explicit runtime series configs without relying on legacy fields.
 *
 * @param seriesDrafts The selected tag drafts to convert.
 * @returns The explicit runtime series definitions.
 */
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
        annotations: [],
    }));
}
