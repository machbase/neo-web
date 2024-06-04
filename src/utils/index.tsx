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
    const sDotIndex = aFileName.lastIndexOf('.');
    if (sDotIndex === -1) return '';

    return aFileName.slice(sDotIndex + 1).toLowerCase();
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

export const isRollup = (aRollups: any, aTableName: string, aInterval: number) => {
    const sCurrentUserName = decodeJwt(JSON.stringify(localStorage.getItem('accessToken'))).sub.toUpperCase();
    if (!isEmpty(aRollups) && aRollups[sCurrentUserName][aTableName] && aInterval > 0) {
        const aValue = aRollups[sCurrentUserName][aTableName];
        const aResult = aValue.find((aRollupTime: any) => aInterval % aRollupTime === 0);
        return !!aResult;
    } else {
        return false;
    }
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

export const parseTables = (aTableInfo: { columns: any[]; rows: any[] }) => {
    if (!aTableInfo.rows) return [];

    const sCurrentUserName = decodeJwt(JSON.stringify(localStorage.getItem('accessToken'))).sub;
    const sIsAdmin = sCurrentUserName.toLowerCase() === ADMIN_ID;
    const sDbIdx = aTableInfo.columns.findIndex((aItem: any) => aItem === 'DB');
    const sUserIdx = aTableInfo.columns.findIndex((aItem: any) => aItem === 'USER');
    const sTableIdx = aTableInfo.columns.findIndex((aItem: any) => aItem === 'NAME');

    let sParseTables = aTableInfo.rows.filter((aItem: any) => aItem[4] === 'Tag Table');
    if (!sIsAdmin) {
        sParseTables = sParseTables.filter((aItem: any) => aItem[sDbIdx].toLowerCase() === DEFAULT_DB_NAME);
    }

    return sParseTables.map((aItem: any) => {
        if (aItem[sDbIdx].toLowerCase() !== DEFAULT_DB_NAME) {
            return aItem[sDbIdx] + '.' + aItem[sUserIdx] + '.' + aItem[sTableIdx];
        } else {
            if (aItem[sUserIdx].toUpperCase() === sCurrentUserName.toUpperCase()) {
                return aItem[sTableIdx];
            } else {
                return aItem[sUserIdx] + '.' + aItem[sTableIdx];
            }
        }
    });
};

export const parseDashboardTables = (aTableInfo: { columns: any[]; rows: any[] }) => {
    if (!aTableInfo.rows) return [];
    const sCurrentUserName = decodeJwt(JSON.stringify(localStorage.getItem('accessToken'))).sub;
    const sIsAdmin = sCurrentUserName.toLowerCase() === ADMIN_ID;
    const sMount = aTableInfo.columns.findIndex((aItem: any) => aItem === 'DBID');
    const sDbIdx = aTableInfo.columns.findIndex((aItem: any) => aItem === 'DB_NAME');
    const sUserIdx = aTableInfo.columns.findIndex((aItem: any) => aItem === 'USER_NAME');
    const sTableIdx = aTableInfo.columns.findIndex((aItem: any) => aItem === 'TABLE_NAME');

    let sParseTables: any = aTableInfo.rows;
    if (!sIsAdmin) {
        sParseTables = aTableInfo.rows.filter((aItem: any) => aItem[sDbIdx].toLowerCase() === DEFAULT_DB_NAME);
    }

    return sParseTables.map((aItem: any) => {
        // MACHBASE_DB
        if (aItem[sMount] === -1) {
            if (aItem[sUserIdx].toUpperCase() === sCurrentUserName.toUpperCase()) {
                return aItem;
            } else {
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
            query += `select min(${aInfo.cols.time}) as min_tm, max(${aInfo.cols.time}) as max_tm from ${tableName} where ${aInfo.cols.name} = '${tags}'`;
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
