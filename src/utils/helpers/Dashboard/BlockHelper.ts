import { TransformBlockType } from '@/components/dashboard/createPanel/Transform/type';
import { ChartType } from '@/type/eChart';
import { CheckAllowedTransformChartType } from '@/utils/Chart/TransformDataParser';
import { chartTypeConverter } from '@/utils/eChartHelper';
import { FakeTQL } from '@/utils/TQL/TqlQueryHelper';

export const FakeTextBlock = {
    block: {
        alias: '',
        dataType: '',
        idx: 0,
        name: '',
        query: FakeTQL,
        sql: '',
        tql: '',
        useQuery: true,
        trx: false,
    },
    alias: {
        color: '#EB5757',
        name: '',
        type: 'block',
        useQuery: true,
    },
};

export type CalcBlockTotalType = {
    query: number;
    trx: number;
    total: number;
    limit: number;
    addable: boolean;
};
export const CalcBlockTotal = (aPanelOption: any): CalcBlockTotalType => {
    const sVisibleQueryBlock = aPanelOption?.blockList?.filter((block: any) => block.isVisible);
    const sVisibleTrxBlock = aPanelOption?.transformBlockList?.filter((block: TransformBlockType) => block.isVisible);
    const sLimit = aPanelOption?.chartOptions?.tagLimit ?? 12;
    let sTotal = (sVisibleQueryBlock?.length ?? 0) + (sVisibleTrxBlock?.length ?? 0);

    if (!CheckAllowedTransformChartType(chartTypeConverter(aPanelOption.type) as ChartType)) sTotal = sVisibleQueryBlock?.length ?? 0;

    return { query: sVisibleQueryBlock?.length ?? 0, trx: sVisibleTrxBlock?.length ?? 0, total: sTotal, limit: sLimit, addable: sTotal < sLimit };
};

/**
 * The axis series lists after a block is deleted.
 *
 * Both axes name series by their position in `blockList`, so removing a block shifts everything after
 * it down by one. Left unrenumbered the list points at the wrong series - or past the end of the list,
 * which is what made an Adv scatter throw on its x-axis block once that block was gone.
 */
export const renumberBlockIndicesAfterDelete = (aIndexList: any, aDeletedIdx: number): number[] => {
    if (!Array.isArray(aIndexList)) return [];
    return aIndexList.filter((aIdx: number) => aIdx !== aDeletedIdx).map((aIdx: number) => (aIdx > aDeletedIdx ? aIdx - 1 : aIdx));
};

/**
 * The same renumbering for the x-axis, which names exactly one series and cannot go without one: if the
 * deleted block WAS the x-axis, the panel falls back to the first remaining series.
 */
export const renumberXAxisAfterDelete = (aXAxisOptions: any, aDeletedIdx: number) => {
    if (!Array.isArray(aXAxisOptions) || !aXAxisOptions[0]) return aXAxisOptions;
    const sRenumbered = renumberBlockIndicesAfterDelete(aXAxisOptions[0].useBlockList, aDeletedIdx);
    return [{ ...aXAxisOptions[0], useBlockList: sRenumbered.length > 0 ? sRenumbered : [0] }, ...aXAxisOptions.slice(1)];
};
