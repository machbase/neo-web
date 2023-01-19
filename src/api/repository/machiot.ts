import request from '@/api/core';

const fetchCalculationData = async (params: any) => {
    const { Table, TagNames, Start, End, CalculationMode, Count, IntervalType, IntervalValue } = params;
    return await request({
        method: 'GET',
        url: `/machiot/datapoints/calculated`,
        data: {
            Table,
            TagNames,
            Start,
            End,
            CalculationMode,
            Count,
            IntervalType,
            IntervalValue,
        },
    });
};

const fetchRawData = async (params: any) => {
    const { Table, TagNames, Start, End, Direction, Count, Offset } = params;
    return await request({
        method: 'GET',
        url: `/machiot/datapoints/raw`,
        data: {
            Table,
            TagNames,
            Start,
            End,
            Direction,
            Count,
            Offset,
        },
    });
};

const fetchRangeData = async (params?: any) => {
    // const { Table, TagName } = params;
    return await request({
        method: 'GET',
        url: `/machiot-rest-api/tags/range`,
        // data: {
        //     Table,
        //     TagName,
        // },
    });
};

const fetchRollupData = async (params: any) => {
    const { Table } = params;
    return await request({
        method: 'GET',
        url: `/machiot/rollup`,
        data: {
            Table,
        },
    });
};

const fetchTablesData = async () => {
    return await request({
        method: 'GET',
        url: `/machiot-rest-api/tables`,
    });
};

export { fetchCalculationData, fetchRawData, fetchTablesData, fetchRollupData, fetchRangeData };
