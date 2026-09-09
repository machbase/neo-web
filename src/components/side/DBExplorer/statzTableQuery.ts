import { E_TABLE_INFO } from './utils';

export type StatzFilterMode = 'exact' | 'search';

export interface StatzModalInfo {
    state: boolean;
    filter: string;
    filterMode: StatzFilterMode;
    table: any;
    recordCnt: number;
}

const escapeSqlString = (value: string) => value.replace(/'/g, "''");

export const buildStatzTableQuery = (modalInfo: StatzModalInfo, offset: number, limit: number): string => {
    const tableName = `${modalInfo.table[E_TABLE_INFO.DB_NM]}.${modalInfo.table[E_TABLE_INFO.USER_NM]}.V$${modalInfo.table[E_TABLE_INFO.TB_NM]}_STAT`;
    const escapedFilter = escapeSqlString(modalInfo.filter);
    const filterClause =
        modalInfo.filterMode === 'exact'
            ? ` WHERE NAME = '${escapedFilter}'`
            : modalInfo.filter
              ? ` WHERE NAME LIKE '%${escapedFilter}%'`
              : '';

    return `SELECT * FROM ${tableName}${filterClause} LIMIT ${offset}, ${limit}`;
};
