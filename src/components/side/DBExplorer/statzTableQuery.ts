import { sqlContains, sqlIdentifierPath, sqlString } from '@/utils/queryText';
import { E_TABLE_INFO } from './utils';

export type StatzFilterMode = 'exact' | 'search';

export interface StatzModalInfo {
    state: boolean;
    filter: string;
    filterMode: StatzFilterMode;
    table: any;
    recordCnt: number;
}

const buildStatzTarget = (modalInfo: StatzModalInfo): string => {
    const tableName = sqlIdentifierPath(modalInfo.table[E_TABLE_INFO.DB_NM], modalInfo.table[E_TABLE_INFO.USER_NM], `V$${modalInfo.table[E_TABLE_INFO.TB_NM]}_STAT`);
    const filterClause =
        modalInfo.filterMode === 'exact'
            ? ` WHERE NAME = ${sqlString(modalInfo.filter)}`
            : modalInfo.filter
              ? ` WHERE NAME LIKE ${sqlContains(modalInfo.filter)}`
              : '';

    return `${tableName}${filterClause}`;
};

export const buildStatzTableQuery = (modalInfo: StatzModalInfo, offset: number, limit: number): string =>
    `SELECT * FROM ${buildStatzTarget(modalInfo)} LIMIT ${offset}, ${limit}`;

/**
 * Rows the modal pages through. The view holds only tags that have data, so the metadata count the
 * page opened with is larger whenever some tag has none — the surplus pages came up empty.
 */
export const buildStatzCountQuery = (modalInfo: StatzModalInfo): string => `SELECT COUNT(*) FROM ${buildStatzTarget(modalInfo)}`;
