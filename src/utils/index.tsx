import { ADMIN_ID, DEFAULT_DB_NAME, IMAGE_EXTENSION_LIST } from '@/utils/constants';

export const getId = () => {
    return new Date().getTime() + (Math.random() * 1000).toFixed();
};

export const isValidJSON = (aString: string) => {
    try {
        JSON.parse(aString);
        return true;
    } catch (error) {
        return false;
    }
};

export const isImage = (aFileName: string) => {
    const sImageExtensions = IMAGE_EXTENSION_LIST;

    const sDotIndex = aFileName.lastIndexOf('.');
    if (sDotIndex === -1) return false;

    const sFileExtension = aFileName.slice(sDotIndex + 1).toLowerCase();
    if (sImageExtensions.includes(sFileExtension)) {
        return true;
    }

    return false;
};

export const binaryCodeEncodeBase64 = (aBinaryCode: ArrayBufferLike) => {
    return btoa(new Uint8Array(aBinaryCode).reduce((data, byte) => data + String.fromCharCode(byte), ''));
};

export const extractionExtension = (aFileName: string) => {
    const sDotIndex = aFileName?.lastIndexOf('.');
    if (sDotIndex === -1) return '';

    return aFileName?.slice(sDotIndex + 1)?.toLowerCase();
};

export const getMonacoLines = (aWrapperHeight: number, aLineHeight: number) => {
    return Number((aWrapperHeight / aLineHeight).toFixed(2));
};

export const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (calc) {
        const random = (Math.random() * 16) | 0,
            value = calc === 'x' ? random : (random & 0x3) | 0x8;
        return value.toString(16);
    });
};

export const isRollup = (aRollups: any, aTableName: string, aInterval: number, aColumnName: string) => {
    const sRollupVersion = localStorage.getItem('V$ROLLUP_VER');
    const sSplitTableName = aTableName.split('.');
    let sUserName: string = ADMIN_ID.toUpperCase();
    let sDBNM: string = 'MACHBASEDB';
    if (sSplitTableName.length > 2) sDBNM = sSplitTableName.at(-3) as string;
    let sTableName: string = sSplitTableName.at(-1) as string;
    if (sSplitTableName.length > 1) sUserName = sSplitTableName.at(-2) as string;

    // OLD version does not support MOUNTED DB
    if (sRollupVersion === 'OLD' && sSplitTableName.length > 2 && sDBNM.toUpperCase() !== 'MACHBASEDB') {
        return false;
    }

    if (sRollupVersion === 'RECENT') sTableName = sDBNM + '.' + sTableName;
    if (!isEmpty(aRollups) && aRollups[sUserName] && aRollups[sUserName][sTableName] && aRollups[sUserName][sTableName][aColumnName] && aInterval > 0) {
        const aValue = aRollups[sUserName][sTableName][aColumnName];
        const aResult = aValue.find((aRollupTime: any) => aInterval % aRollupTime === 0);
        return !!aResult;
    } else {
        return false;
    }
};
export const isRollupExt = (aRollups: any, aTableName: string, aInterval: any) => {
    const sRollupVersion = localStorage.getItem('V$ROLLUP_VER');
    const sSplitTableName = aTableName.split('.');
    let sUserName: string = ADMIN_ID.toUpperCase();
    let sDBNM: string = 'MACHBASEDB';
    if (sSplitTableName.length > 2) sDBNM = sSplitTableName.at(-3) as string;
    let sTableName: string = sSplitTableName.at(-1) as string;
    if (sSplitTableName.length > 1) sUserName = sSplitTableName.at(-2) as string;

    // OLD version does not support MOUNTED DB
    if (sRollupVersion === 'OLD' && sSplitTableName.length > 2 && sDBNM.toUpperCase() !== 'MACHBASEDB') {
        return 0;
    }

    if (sRollupVersion === 'RECENT') sTableName = sDBNM + '.' + sTableName;
    if (!isEmpty(aRollups) && aRollups[sUserName] && aRollups[sUserName][sTableName] && aRollups[sUserName][sTableName]['EXT_TYPE'] && aInterval > 0) {
        const aValue = aRollups[sUserName][sTableName]['VALUE'];
        let aResult = 0;
        aValue?.map((aRollupTime: any, idx: number) => {
            if (aInterval % aRollupTime === 0) aResult = aRollups[sUserName][sTableName]['EXT_TYPE'][idx];
        });
        return aResult;
    } else return 0;
};

export const decodeJwt = (aToken: string) => {
    const sBase64Url = aToken.split('.')[1];
    const sBase64 = sBase64Url.replace(/-/g, '+').replace(/_/g, '/');
    const sJwtInfo = decodeURIComponent(
        atob(sBase64)
            .split('')
            .map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join('')
    );

    return JSON.parse(sJwtInfo);
};

export const getUserName = () => {
    try {
        const sToken = localStorage.getItem('accessToken');
        const sDecodeJwt = decodeJwt(JSON.stringify(sToken));
        return sDecodeJwt.sub;
    } catch {
        return undefined;
    }
};
export const compareString = (aAStr: string, aBStr: string): boolean => {
    if (aAStr?.toUpperCase() === aBStr?.toUpperCase()) return true;
    else return false;
};
export const isCurUserEqualAdmin = (): boolean => {
    const sCurUser = getUserName();
    if (sCurUser?.toUpperCase() === ADMIN_ID.toUpperCase()) return true;
    else return false;
};

export const parseTables = (aTableInfo: { columns: any[]; rows: any[] }) => {
    if (!aTableInfo.rows) return [];

    const sDbIdx = aTableInfo.columns.findIndex((aItem: any) => aItem === 'DB');
    const sUserIdx = aTableInfo.columns.findIndex((aItem: any) => aItem === 'USER');
    const sTableIdx = aTableInfo.columns.findIndex((aItem: any) => aItem === 'NAME');
    let sParseTables = aTableInfo.rows.filter((aItem: any) => aItem[4] === 'Tag Table');

    if (!isCurUserEqualAdmin()) {
        sParseTables = sParseTables.filter((aItem: any) => aItem[sDbIdx].toUpperCase() === DEFAULT_DB_NAME.toUpperCase());
    }

    return sParseTables.map((aItem: any) => {
        if (aItem[sDbIdx].toUpperCase() !== DEFAULT_DB_NAME.toUpperCase()) {
            return aItem[sDbIdx] + '.' + aItem[sUserIdx] + '.' + aItem[sTableIdx];
        } else {
            if (isCurUserEqualAdmin() && compareString(aItem[sUserIdx], ADMIN_ID)) return aItem[sTableIdx];
            else return aItem[sUserIdx] + '.' + aItem[sTableIdx];
        }
    });
};

export const parseDashboardTables = (aTableInfo: { columns: any[]; rows: any[] }) => {
    if (!aTableInfo.rows) return [];
    const sMount = aTableInfo.columns.findIndex((aItem: any) => aItem === 'DBID');
    const sDbIdx = aTableInfo.columns.findIndex((aItem: any) => aItem === 'DB_NAME');
    const sUserIdx = aTableInfo.columns.findIndex((aItem: any) => aItem === 'USER_NAME');
    const sTableIdx = aTableInfo.columns.findIndex((aItem: any) => aItem === 'TABLE_NAME');

    let sParseTables: any = aTableInfo.rows;
    if (!isCurUserEqualAdmin()) {
        sParseTables = aTableInfo.rows.filter((aItem: any) => aItem[sDbIdx].toUpperCase() === DEFAULT_DB_NAME.toUpperCase());
    }

    return sParseTables.map((aItem: any) => {
        // MACHBASE_DB
        if (aItem[sMount] === -1) {
            if (isCurUserEqualAdmin() && compareString(aItem[sUserIdx], ADMIN_ID)) return aItem;
            else {
                aItem[sTableIdx] = aItem[sUserIdx] + '.' + aItem[sTableIdx];
                return aItem;
            }
        }
        // MOUNTED DB
        else {
            aItem[sTableIdx] = aItem[sDbIdx] + '.' + aItem[sUserIdx] + '.' + aItem[sTableIdx];
            return aItem;
        }
    });
};

export const isEmpty = (aArr: any) => {
    return Array.isArray(aArr) && aArr.length === 0;
};

export const isObjectEmpty = (aObj: Object) => {
    return Object.keys(aObj).length === 0;
};

export const elapsedTime = (date: number): string => {
    if (typeof date === 'string') return '';
    const start = date;
    const end = new Date();

    const seconds = Math.floor((end.getTime() - start) / 1000);
    if (seconds < 60) return 'just a moment ago';

    const minutes = seconds / 60;
    if (minutes < 60) return `${Math.floor(minutes)}min ago`;

    const hours = minutes / 60;
    if (hours < 24) return `${Math.floor(hours)}hour ago`;

    const days = hours / 24;
    if (days < 30) return `${Math.floor(days)}day ago`;

    const months = days / 30;
    return `${Math.floor(months)}month ago`;
};

export const elapsedSize = (aSize: number): string => {
    if (aSize === undefined || aSize === null) return '';
    if (typeof aSize === 'string') return '';
    if (aSize < 1000) return aSize + ' B';
    return Math.floor(aSize / 1000) + ' KB';
};

export const convertMsUnitTime = (aTime: string | number, aIntervalUnit: string) => {
    const sTime = typeof aTime === 'string' ? Number(aTime) : aTime;
    if (aIntervalUnit === 'sec') {
        return sTime * 1000;
    } else if (aIntervalUnit === 'min') {
        return sTime * 1000 * 60;
    } else if (aIntervalUnit === 'hour') {
        return sTime * 1000 * 60 * 60;
    }

    return sTime;
};

export const deepEqual = (object1: any, object2: any) => {
    const keys1 = Object.keys(object1);
    const keys2 = Object.keys(object2);

    if (keys1.length !== keys2.length) {
        return false;
    }

    for (const key of keys1) {
        const val1 = object1[key];
        const val2 = object2[key];
        const areObjects = isObject(val1) && isObject(val2);

        if ((areObjects && !deepEqual(val1, val2)) || (!areObjects && val1 !== val2)) {
            return false;
        }
    }

    return true;
};

export const isObject = (object: any) => {
    return object != null && typeof object === 'object';
};

export const parseCodeBlocks = (aMarkdownContents: string) => {
    const regex = /```[\s\S]*?```/g;
    const matches = aMarkdownContents.match(regex);
    const startPikchr = '```pikchr';
    const startMermaid = '```mermaid';
    if (!matches) return [];

    return matches
        .filter((block) => {
            return !block.startsWith(startMermaid);
        })
        .filter((block) => {
            return !block.startsWith(startPikchr);
        })
        .map((block) => {
            return block
                .replace(/```[\w]*\n?/g, '')
                .replace(/```/g, '')
                .trim();
        });
};

type TableTagInfo = {
    key: string;
    alias: string;
    calculationMode: string;
    table: string;
    tagName: string;
    weight: number;
    colName: {
        name: string;
        time: string;
        value: string;
    };
};
export const createTableTagMap = (tableTagInfo: TableTagInfo[]) => {
    const sMap: any = {};

    tableTagInfo.forEach((aInfo: any) => {
        const tableKey = aInfo.table;
        const tagName = aInfo.tagName;
        const colInfo = aInfo.colName;

        if (sMap[tableKey]) {
            sMap[tableKey].tags.push(tagName);
        } else {
            sMap[tableKey] = { tags: [tagName], cols: colInfo };
        }
    });

    const sResult = Object.keys(sMap).map((table: string) => {
        return {
            table,
            tags: sMap[table].tags,
            cols: sMap[table].cols,
        };
    });

    return sResult;
};

type TableTagMap = {
    table: string;
    tags: string[];
};
export const createMinMaxQuery = (tableTagMap: TableTagMap[], currentUserName: string) => {
    let query = '';
    tableTagMap.forEach((aInfo: any, aIndex: number) => {
        if (aIndex !== 0) query += ` UNION ALL `;

        let tableName = '';
        let tags = '';
        let userName = currentUserName;
        const tableInfo = aInfo.table.split('.');

        // MOUNTED DB
        if (tableInfo.length === 3) {
            tags = aInfo.tags[0];
            tableName = aInfo.table;
            query += `SELECT 
                MIN(TIME) AS min_tm,
                MAX(TIME) AS max_tm
            FROM (
                SELECT TIME FROM (SELECT /*+ SCAN_FORWARD(${tableInfo.at(-1)}) */ TIME FROM ${tableName} WHERE ${aInfo.cols.name} = '${tags}' LIMIT 1)
                UNION ALL
                SELECT TIME FROM (SELECT /*+ SCAN_BACKWARD(${tableInfo.at(-1)}) */ TIME FROM ${tableName} WHERE ${aInfo.cols.name} = '${tags}' LIMIT 1)
            )`;
        }
        // MACHBASE DB
        else {
            // USER
            if (tableInfo.length === 2) {
                tableName = tableInfo[1];
                userName = tableInfo[0];
            }
            // ADMIN
            else {
                tableName = aInfo.table;
                userName = ADMIN_ID.toUpperCase();
            }
            aInfo.tags.forEach((tag: string, aIndex: number) => {
                if (aIndex === aInfo.tags.length - 1) {
                    tags += `'${tag}'`;
                } else {
                    tags += `'${tag}',`;
                }
            });
            query += `select min(min_time) as min_tm, max(max_time) as max_tm from ${userName}.v$${tableName}_stat where NAME in (${tags})`;
        }
    });
    return query;
};

export const generateRandomString = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < 20; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
};

export const isMobile = () => {
    return /iPhone|Android/i.test(window.navigator.userAgent);
};
