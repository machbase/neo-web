import request from '@/api/core';

const fetchCalculationData = async (params: any) => {
    const { Table, TagNames, Start, End, CalculationMode, Count, IntervalType, IntervalValue } = params;
    const queryString = `/?TagNames=${encodeURIComponent(
        TagNames
    )}&Start=${Start}&End=${End}&CalculationMode=${CalculationMode}&Count=${Count}&IntervalType=${IntervalType}&IntervalValue=${IntervalValue}&table=${Table}`;
    return await request({
        method: 'GET',
        url: `/machiot-rest-api/datapoints/calculated` + queryString,
    });
};

const fetchRawData = async (params: any) => {
    const { Table, TagNames, Start, End, Direction, Count } = params;
    const queryString = `/?TagNames=${encodeURIComponent(TagNames)}&Start=${Start}&End=${End}&Direction=${Direction}&Count=${Count}&table=${Table}`;
    return await request({
        method: 'GET',
        url: `/machiot-rest-api/datapoints/raw` + queryString,
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
        url: `/machiot-rest-api/tables/`,
    });
};

export { fetchCalculationData, fetchRawData, fetchTablesData, fetchRollupData, fetchRangeData };
