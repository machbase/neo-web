import TQL from '../TqlGenerator';
import { TransformBlockType } from '../../type/transform';
import { ChartType, E_CHART_TYPE } from '../../type/eChart';
import { DSH_CHART_NAME_VALUE_SCRIPT_MODULE, DSH_CHART_TIME_VALUE_SCRIPT_MODULE, DSH_CHART_VALUE_VALUE_SCRIPT_MODULE } from '../TqlGenerator/constants';

export enum E_ALLOW_CHART_TYPE {
    LINE = 'line',
    BAR = 'bar',
    SCATTER = 'scatter',
    PIE = 'pie',
    ADV_SCATTER = 'advScatter',
    GAUGE = 'gauge',
    LIQUID = 'liquidFill',
    TEXT = 'text',
}
export enum E_BLOCK_TYPE {
    STD = 'block',
    TRX = 'trxBlock',
}
enum E_CHART_DATA_TYPE {
    TIME_VALUE = 'TIME_VALUE',
    VALUE_VALUE = TIME_VALUE,
    NAME_VALUE = 'NAME_VALUE',
}
type TrxParsedAliasType = {
    name: string;
    color: string;
    useQuery: boolean;
    type: E_BLOCK_TYPE;
};
export type TrxParsedBlockType = {
    alias: string;
    value: string;
    valid: boolean | undefined;
    isVisible: boolean;
    block: any[];
};
type ResTrxType = {
    trx: boolean;
    useQuery: boolean;
    alias: string;
    query: string;
    tql: string;
    sql: string;
    dataType: E_CHART_DATA_TYPE;
};
export const TRX_REPLACE_LIST = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
export const ALLOWED_TRX_CHART_TYPE = [
    E_ALLOW_CHART_TYPE.LINE,
    E_ALLOW_CHART_TYPE.BAR,
    E_ALLOW_CHART_TYPE.SCATTER,
    E_ALLOW_CHART_TYPE.PIE,
    E_ALLOW_CHART_TYPE.ADV_SCATTER,
    E_ALLOW_CHART_TYPE.LIQUID,
    E_ALLOW_CHART_TYPE.GAUGE,
    E_ALLOW_CHART_TYPE.TEXT,
];
export const CheckAllowedTransformChartType = (aType: ChartType): boolean => {
    if (ALLOWED_TRX_CHART_TYPE.includes(aType as E_ALLOW_CHART_TYPE & E_CHART_TYPE)) return true;
    return false;
};

export type ChartDataType = keyof typeof E_CHART_DATA_TYPE;

/** Trnasform data parser */
export const TRX_PARSER = (
    aChartType: string,
    aDataType: ChartDataType,
    aTrxBlockList: TransformBlockType[],
    aQueryBlockList: any[],
    aV_V_X_AXIS: string | undefined,
    aIsSave: boolean
) => {
    let sResultTrxList: (ResTrxType | undefined)[] = [];
    // COMMON
    const [sSourceAliasList, sSourceTrxList] = TRX_COMMON_PARSER(aTrxBlockList, aQueryBlockList) as [TrxParsedAliasType[], TrxParsedBlockType[]];
    // TIME_VALUE
    if (aDataType === E_CHART_DATA_TYPE.TIME_VALUE && aChartType !== E_ALLOW_CHART_TYPE.ADV_SCATTER) sResultTrxList = TRX_TIME_VALUE_PARSER(sSourceTrxList, aIsSave);
    // VALUE_VALUE
    if (aDataType === E_CHART_DATA_TYPE.VALUE_VALUE && aChartType === E_ALLOW_CHART_TYPE.ADV_SCATTER)
        sResultTrxList = TRX_VALUE_VALUE_PARSER(sSourceTrxList, aV_V_X_AXIS as string, aIsSave);
    // NAME_VALUE
    if (aDataType === E_CHART_DATA_TYPE.NAME_VALUE) sResultTrxList = TRX_NAME_VALUE_PARSER(sSourceTrxList, aIsSave);
    return [sSourceAliasList, sResultTrxList];
};

const TRX_COMMON_PARSER = (aTrxBlockList: TransformBlockType[], aQueryBlockList: any[]): (TrxParsedAliasType[] | TrxParsedBlockType[])[] => {
    const sTmpTransformAlias: TrxParsedAliasType[] = [];
    const sTmpTransformBlockList: TrxParsedBlockType[] = aTrxBlockList
        .map((aTrBlock) => {
            aTrBlock.valid && sTmpTransformAlias.push({ name: aTrBlock.alias, color: aTrBlock.color, useQuery: aTrBlock.isVisible, type: E_BLOCK_TYPE.TRX });
            return {
                alias: aTrBlock.alias,
                value: aTrBlock.value,
                valid: aTrBlock.valid,
                isVisible: aTrBlock.isVisible,
                block: aTrBlock.selectedBlockIdxList.map((aSelBlockIdx: number) => {
                    return aQueryBlockList[aSelBlockIdx];
                }),
            };
        })
        .filter((item) => item.valid);
    return [sTmpTransformAlias, sTmpTransformBlockList];
};
const TRX_TIME_VALUE_PARSER = (trxList: TrxParsedBlockType[], aIsSave: boolean) => {
    const sParsedTrxList: (ResTrxType | undefined)[] = trxList.map((tmpTrxBlock) => {
        if (tmpTrxBlock.block.includes(undefined)) return;
        let sQuery = '';
        let sMapvalue = tmpTrxBlock.value;
        const sPopvalue: number[] = [];

        tmpTrxBlock.block.map((aTrx, aIdx: number) => {
            if (aIdx === 0) sQuery += `SQL("${aTrx.sql}")${aTrx.tql && aTrx.tql !== '' ? '\n' + aTrx.tql : ''}`;
            else {
                sQuery += TQL.MAP.SCRIPT('JS', {
                    main: DSH_CHART_TIME_VALUE_SCRIPT_MODULE.MAIN,
                    init: `${DSH_CHART_TIME_VALUE_SCRIPT_MODULE.INIT}${TQL.MAP.SCRIPT.RequestDoQuick(JSON.stringify('SQL("' + aTrx.sql + '")\n' + TQL.SINK._JSON()), {
                        isSave: aIsSave,
                    })}`,
                });
                sPopvalue.push(aIdx + 1);
            }
            sMapvalue = sMapvalue.replaceAll(new RegExp(`\\b${TRX_REPLACE_LIST[aTrx.idx]}\\b`, 'g'), `value(${aIdx + 1})`);
        });
        sQuery += '\n' + TQL.MAP.MAPVALUE(1, sMapvalue);
        if (sPopvalue.length > 0) sQuery += '\n' + TQL.MAP.POPVALUE(sPopvalue);

        return {
            trx: true,
            useQuery: tmpTrxBlock.isVisible,
            alias: tmpTrxBlock.alias,
            query: sQuery + '\n' + TQL.SINK._JSON(),
            tql: '',
            sql: sQuery,
            dataType: E_CHART_DATA_TYPE.TIME_VALUE,
        };
    });
    return sParsedTrxList;
};
const TRX_VALUE_VALUE_PARSER = (trxList: TrxParsedBlockType[], aV_V_X_AXIS: string, aIsSave: boolean) => {
    const sParsedTrxList: (ResTrxType | undefined)[] = trxList.map((tmpTrxBlock) => {
        if (tmpTrxBlock.block.includes(undefined)) return;
        let sQuery = '';
        let sMapvalue = tmpTrxBlock.value;
        const sPopvalue: number[] = [0];
        const sInjectionScript: string = TQL.MAP.SCRIPT('JS', {
            main: DSH_CHART_VALUE_VALUE_SCRIPT_MODULE.TRANSFORM,
            init: `${DSH_CHART_VALUE_VALUE_SCRIPT_MODULE.INIT}${aV_V_X_AXIS}`,
        });

        tmpTrxBlock.block.map((aTrx, aIdx: number) => {
            if (aIdx === 0) sQuery += `SQL("${aTrx.sql}")${aTrx.tql && aTrx.tql !== '' ? '\n' + aTrx.tql : ''}${sInjectionScript ? '\n' + sInjectionScript : ''}`;
            else {
                sQuery += TQL.MAP.SCRIPT('JS', {
                    main: DSH_CHART_TIME_VALUE_SCRIPT_MODULE.MAIN,
                    init: `${DSH_CHART_TIME_VALUE_SCRIPT_MODULE.INIT}${TQL.MAP.SCRIPT.RequestDoQuick(JSON.stringify('SQL("' + aTrx.sql + '")\n' + TQL.SINK._JSON()), {
                        isSave: aIsSave,
                    })}`,
                });
                sPopvalue.push(aIdx + 2);
            }
            sMapvalue = sMapvalue.replaceAll(new RegExp(`\\b${TRX_REPLACE_LIST[aTrx.idx]}\\b`, 'g'), `value(${aIdx + 2})`);
        });

        sQuery += '\n' + TQL.MAP.MAPVALUE(2, sMapvalue);
        if (sPopvalue.length > 0) sQuery += '\n' + TQL.MAP.POPVALUE(sPopvalue);

        return {
            trx: true,
            useQuery: tmpTrxBlock.isVisible,
            alias: tmpTrxBlock.alias,
            query: sQuery + '\n' + TQL.SINK._JSON(),
            tql: '',
            sql: sQuery,
            dataType: E_CHART_DATA_TYPE.VALUE_VALUE,
        };
    });

    return sParsedTrxList;
};
const TRX_NAME_VALUE_PARSER = (trxList: TrxParsedBlockType[], aIsSave: boolean) => {
    const sParsedTrxList = trxList.map((tmpTrxBlock) => {
        if (tmpTrxBlock.block.includes(undefined)) return;
        let sQuery = '';
        let sMapvalue = tmpTrxBlock.value;
        const sPopvalue: number[] = [];

        tmpTrxBlock.block.map((aTrx, aIdx: number) => {
            if (aIdx === 0) {
                sQuery += TQL.MAP.SCRIPT('JS', {
                    main: TQL.MAP.SCRIPT.Yield('xAxis[0][0].value'),
                    init: `${DSH_CHART_NAME_VALUE_SCRIPT_MODULE.INIT}${TQL.MAP.SCRIPT.RequestDoQuick(JSON.stringify(aTrx.query), { isSave: aIsSave })}`,
                });
            } else {
                sQuery += TQL.MAP.SCRIPT('JS', {
                    main: DSH_CHART_NAME_VALUE_SCRIPT_MODULE.MAIN,
                    init: `${DSH_CHART_NAME_VALUE_SCRIPT_MODULE.INIT}${TQL.MAP.SCRIPT.RequestDoQuick(JSON.stringify('SQL("' + aTrx.sql + '")\n' + aTrx.tql + TQL.SINK._JSON()), {
                        isSave: aIsSave,
                    })}`,
                });
                sPopvalue.push(aIdx);
            }
            sMapvalue = sMapvalue.replaceAll(new RegExp(`\\b${TRX_REPLACE_LIST[aTrx.idx]}\\b`, 'g'), `value(${aIdx})`);
        });
        sQuery += '\n' + TQL.MAP.MAPVALUE(0, `dict("name", "${tmpTrxBlock.alias}", "value", (${sMapvalue}))`);
        return {
            trx: true,
            useQuery: tmpTrxBlock.isVisible,
            alias: tmpTrxBlock.alias,
            query: sQuery + '\n' + TQL.SINK._JSON(),
            tql: '',
            sql: sQuery,
            dataType: E_CHART_DATA_TYPE.NAME_VALUE,
        };
    });
    return sParsedTrxList;
};
