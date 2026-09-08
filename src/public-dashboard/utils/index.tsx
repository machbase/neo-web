import { ADMIN_ID, DEFAULT_DB_NAME, IMAGE_EXTENSION_LIST } from './constants';
import { getCurrentDatabaseName } from '@/utils/currentDatabaseState';
import { qualifyThreePart } from '@/utils/qualifiedTableName';
import { buildRollupTimeExpression } from '../../utils/rollupQueryBuilder';
import { findRollupColumnMatch, getRollupColumnNameCandidates } from '../../utils/rollupColumnCandidates';

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

export const getRollupMatch = (aRollups: any, aTableName: string, aInterval: number, aColumnName: string, aJsonKey?: string) => {
    const sRollupVersion = localStorage.getItem('V$ROLLUP_VER');
    const sSplitTableName = aTableName.split('.');
    let sUserName: string = ADMIN_ID.toUpperCase();
    // A name that carries its database supplies the prefix itself; a shorter one — which is
    // what a dashboard saved before v8.7 holds — means the database this session is in. The
    // literal 'MACHBASEDB' this replaced was the same thing only while a server held one
    // database: on a server whose current database is FACTORY_A it looked up
    // `MACHBASEDB.SENSOR`, a key the rollup map does not contain, and the panel scanned raw
    // data instead of reading the rollup. Pre-v8.7 and before the probe settles this still
    // answers MACHBASEDB, so those servers are unaffected.
    let sDBNM: string = getCurrentDatabaseName();
    if (sSplitTableName.length > 2) sDBNM = sSplitTableName.at(-3) as string;
    let sTableName: string = sSplitTableName.at(-1) as string;
    if (sSplitTableName.length > 1) sUserName = sSplitTableName.at(-2) as string;

    // OLD version does not support MOUNTED DB
    if (sRollupVersion === 'OLD' && sSplitTableName.length > 2 && sDBNM.toUpperCase() !== 'MACHBASEDB') {
        return undefined;
    }

    // Anything but `'OLD'` — an absent version included. `getRollupTableList` builds the map's
    // keys on exactly that condition, so asking `=== 'RECENT'` here split the two apart whenever
    // the version had not been probed: the map held `MACHBASEDB.SENSOR` while the lookup asked
    // for `SENSOR`, and every rollup silently missed.
    //
    // Absent is a normal state, not a corner: opening a shared `/view/...` link clears the flag
    // with the tokens (Routes.tsx) and the post-login redirect returns straight to `/view/...`
    // (Login.tsx), never mounting the one component that probes.
    if (sRollupVersion !== 'OLD') sTableName = sDBNM + '.' + sTableName;
    const sUserNameCandidates = Array.from(new Set([sUserName, sUserName.toUpperCase()]));
    const sTableNameCandidates = Array.from(new Set([sTableName, sTableName.toUpperCase()]));
    const sTableRollups = sUserNameCandidates
        .flatMap((aUserName) => sTableNameCandidates.map((aTableName) => aRollups?.[aUserName]?.[aTableName]))
        .find((aTableRollups) => aTableRollups);
    if (isEmpty(aRollups) || !sTableRollups) return undefined;

    return findRollupColumnMatch(sTableRollups, getRollupColumnNameCandidates(aColumnName, aJsonKey), aInterval);
};

export const isRollup = (aRollups: any, aTableName: string, aInterval: number, aColumnName: string, aJsonKey?: string) => {
    return !!getRollupMatch(aRollups, aTableName, aInterval, aColumnName, aJsonKey);
};
export const isRollupExt = (aRollups: any, aTableName: string, aInterval: any, aColumnName = 'VALUE', aJsonKey?: string) => {
    return getRollupMatch(aRollups, aTableName, aInterval, aColumnName, aJsonKey)?.extType ?? 0;
};

/**
 * Helper function to convert ROLLUP query syntax
 * Old syntax: time ROLLUP 5 min
 * New syntax: ROLLUP('MIN', 5, time)
 */
export const convertToNewRollupSyntax = (timeColumn: string, intervalType: string, intervalValue: number): string => {
    return buildRollupTimeExpression(timeColumn, intervalType, intervalValue);
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
    const sDbIdx = aTableInfo.columns.findIndex((aItem: any) => aItem === 'DB_NAME');
    const sUserIdx = aTableInfo.columns.findIndex((aItem: any) => aItem === 'USER_NAME');
    const sTableIdx = aTableInfo.columns.findIndex((aItem: any) => aItem === 'TABLE_NAME');

    // Same rule as the main tree's copy: always three parts. Shortening a name for the current
    // database was safe only while a server held one; on v8.7 a bare or `owner.table` name
    // resolves against whichever database the session is in, so a name built for FACTORY_A's
    // table silently reads MACHBASEDB's same-named one. The row is rewritten in place because
    // callers read TABLE_NAME back out of it.
    const sParseTables: any = aTableInfo.rows;

    return sParseTables.map((aItem: any) => {
        aItem[sTableIdx] = qualifyThreePart(aItem[sDbIdx], aItem[sUserIdx], aItem[sTableIdx]);
        return aItem;
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
