import { TransformBlockType } from '../../../type/transform';
import { ChartType } from '../../../type/eChart';
import { CheckAllowedTransformChartType } from '../../Chart/TransformDataParser';
import { chartTypeConverter } from '../../eChartHelper';
import { FakeTQL } from '../../TQL/TqlQueryHelper';

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
