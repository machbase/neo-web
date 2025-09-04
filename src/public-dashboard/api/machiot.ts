// Public dashboard API wrapper - bypasses authentication by using direct /db/tql endpoints
import { removeV$Table } from '@/utils/dbUtils';
import { ADMIN_ID } from '@/utils/constants';
import moment from 'moment';

const getTableName = (targetTxt: string) => {
    if (targetTxt.includes('.')) return targetTxt.split('.').at(-1);
    else return targetTxt;
};

const executeQuery = async (query: string) => {
    try {
        const currentServerUrl = `${window.location.protocol}//${window.location.hostname}:5654`;
        const response = await fetch(`${currentServerUrl}/db/query?q=${encodeURIComponent(query)}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
        });

        if (response.ok) {
            const result = await response.json();
            return result;
        } else {
            return {
                data: { reason: `Query failed: ${response.statusText}` },
                status: response.status,
                success: false
            };
        }
    } catch (error) {
        console.error('Query execution error:', error);
        return {
            data: { reason: `Network error: ${error}` },
            status: 500,
            success: false
        };
    }
};

export const getTqlChart = async (aData: string, aType?: 'dsh') => {
    try {
        const response = await fetch('/db/tql', {
            method: 'POST',
            headers: {
                'X-Tql-Output': 'json',
                'Accept': 'application/json'
            },
            body: aData,
        });

        if (response.ok) {
            const result = await response.json();
            return { 
                data: result, 
                success: true, 
                status: response.status,
                headers: Object.fromEntries(response.headers.entries())
            };
        } else {
            return { 
                data: `Request failed: ${response.statusText}`, 
                success: false,
                status: response.status,
                headers: Object.fromEntries(response.headers.entries())
            };
        }
    } catch (error) {
        console.error('getTqlChart error:', error);
        return { data: { reason: `Network error: ${error}` }, success: false };
    }
};

export const getTqlScripts = async (aFullPath: string) => {
    try {
        const sTargetPath = aFullPath.split('/').filter((aPath: string) => aPath !== '');
        const response = await fetch(`/db/tql/${sTargetPath.join('/')}`, {
            method: 'GET',
            headers: { 
                'X-Tql-Output': 'json',
                'Accept': 'application/json'
            },
        });

        if (response.ok) {
            const result = await response.json();
            return { 
                data: result, 
                success: true, 
                status: response.status,
                headers: Object.fromEntries(response.headers.entries())
            };
        } else {
            return { 
                data: `Request failed: ${response.statusText}`, 
                success: false,
                status: response.status,
                headers: Object.fromEntries(response.headers.entries())
            };
        }
    } catch (error) {
        console.error('getTqlScripts error:', error);
        return { 
            data: `Network error: ${error}`, 
            success: false,
            status: 500,
            headers: {}
        };
    }
};

export const fetchMountTimeMinMax = async (aTargetInfo: any) => {
    const sTime = aTargetInfo.tableInfo[1][0];
    const sQuery = `select min(${sTime}), max(${sTime}) from ${aTargetInfo.table}`;
    
    const sData = await executeQuery(sQuery);

    if (sData.status >= 400) {
        console.error('fetchMountTimeMinMax error:', sData.data?.reason || sData.data);
    }

    if (!sData?.data || !sData.data?.rows || sData.data.rows.length === 0) {
        const sNowTime = moment().unix() * 1000000;
        const sNowTimeMinMax = [moment(sNowTime).subtract(1, 'h').unix() * 1000000, sNowTime];
        return [sNowTimeMinMax];
    }

    return sData.data.rows;
};

export const fetchTimeMinMax = async (aTargetInfo: any) => {
    let sQuery: string | undefined = undefined;
    // Query tag table
    if (aTargetInfo.type === 'tag') {
        const sIsVirtualTable = aTargetInfo.table.includes('V$');
        const sTableName = sIsVirtualTable ? removeV$Table(aTargetInfo.table) : getTableName(aTargetInfo.table);
        sQuery = `select min_time, max_time from ${aTargetInfo.userName}.V$${sTableName}_STAT where name in ('${aTargetInfo.tag}')`;
    }
    // Query log table
    if (aTargetInfo.type === 'log') sQuery = `select min(_ARRIVAL_TIME) as min_time, max(_ARRIVAL_TIME) as max_time from ${aTargetInfo.userName}.${aTargetInfo.table}`;
    if (!sQuery) return;

    const sData = await executeQuery(sQuery);

    if (sData.status >= 400) {
        console.error('fetchTimeMinMax error:', sData.data?.reason || sData.data);
    }

    if (!sData?.data || !sData.data?.rows || sData.data.rows.length === 0) {
        const sNowTime = moment().unix() * 1000000;
        const sNowTimeMinMax = [moment(sNowTime).subtract(1, 'h').unix() * 1000000, sNowTime];
        return [sNowTimeMinMax];
    }

    return sData.data.rows;
};