import moment from 'moment';
import { getCurrentDatabaseId, hasLogicalDatabases, isDatabaseWritable, isSameDatabaseId, normalizeDatabaseId } from '@/utils/currentDatabaseState';
import { isMountedTableName } from '@/utils/qualifiedTableName';
import { LuFlipVertical } from 'react-icons/lu';
import { Button, Page, CommonTable, Tabs } from '@/design-system/components';
import { SplitPane, Pane } from '@/design-system/components';
import { SashContent } from 'split-pane-react';
import { useEffect, useRef, useState, useMemo } from 'react';
import { fetchQuery, fetchTqlWithoutConsole } from '@/api/repository/database';
import { TbEyeMinus, TbEyeOff } from 'react-icons/tb';
import { Refresh } from '@/assets/icons/Icon';
import MaterialIcon from '@/components/common/MaterialIcon';
import { MetaTablePage } from './metaTablePage';
import {
    buildDataViewerColumnConfigFromColumnRows,
    buildQualifiedTableName,
    buildRetentionQuery,
    CheckIndexFlag,
    CheckTableFlag,
    E_TABLE_INFO,
    E_TABLE_TYPE,
    E_TABLE_TYPE_COLOR,
    FetchCommonType,
    formatTableBaseExtent,
    normalizeLogicalLengthInfo,
    resolveDisplayColumnInfo,
    resolveTableBaseColumn,
} from './utils';
import { Tooltip } from 'react-tooltip';
import { BiInfoCircle } from 'react-icons/bi';
import { generateUUID, getUserName } from '@/utils';
import { ClipboardCopy } from '@/utils/ClipboardCopy';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';

const BadgeSelectorItem = ({ item }: { item: { name: string; color: string } }) => {
    return (
        <div
            style={{
                boxShadow: `inset 2px 0 0 0  ${item.color}`,
                width: 'auto',
                padding: '0 8px',
                backgroundColor: '#454545',
                borderTopRightRadius: '4px',
                borderBottomRightRadius: '4px',
            }}
        >
            <span style={{ fontSize: '12px' }}>{item.name}</span>
        </div>
    );
};

const buildLogicalLengthQuery = (qualifiedTableName: string) =>
    `show table ${qualifiedTableName} -a;`;

const buildLogicalLengthQueries = ({
    dbName,
    userName,
    tableName,
    databaseId,
    currentUserName,
}: {
    dbName?: string;
    userName?: string;
    tableName: string;
    databaseId?: string | number;
    currentUserName?: string;
}) => {
    const normalizedUserName = userName?.toUpperCase();
    const normalizedCurrentUserName = currentUserName?.toUpperCase();
    // "Local" means the database this session is in, not the pre-v8.7 sentinel. On v8.7 the
    // current database has a real id, so comparing against -1 made every table look mounted.
    const isLocalDatabase = isSameDatabaseId(databaseId, getCurrentDatabaseId());
    const isCurrentUserTable =
        !!normalizedUserName && normalizedUserName === normalizedCurrentUserName;

    const candidates = [
        dbName && userName ? `${dbName}.${userName}.${tableName}` : '',
        isLocalDatabase && userName ? `${userName}.${tableName}` : '',
        isLocalDatabase && isCurrentUserTable ? tableName : '',
    ].filter(Boolean);

    return Array.from(new Set(candidates)).map((candidate) => buildLogicalLengthQuery(candidate));
};

// Custom cell component for ROLLUP column with SRC hover tooltip
const RollupNameCell = ({ row, columns }: { row: (string | number)[]; columns: string[] }) => {
    const rollupIdx = columns.indexOf('ROLLUP');
    const srcIdx = columns.indexOf('SRC');
    const rollupValue = row[rollupIdx];
    const srcValue = row[srcIdx];

    try {
        const srcData = JSON.parse(srcValue as string);
        const srcArray = srcData.arr || [];
        const tooltipId = `rollup-${rollupValue}`;

        return (
            <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{rollupValue}</span>
                    <BiInfoCircle
                        data-tooltip-id={tooltipId}
                        style={{
                            cursor: 'help',
                            color: '#888',
                            minWidth: '12px',
                            maxWidth: '12px',
                        }}
                    />
                </div>
                <Tooltip id={tooltipId} place="top" style={{ maxWidth: '400px', zIndex: 9999 }}>
                    <div>
                        <strong>Sources:</strong>
                        <div>
                            {srcArray.map((src: string, idx: number) => (
                                <div key={idx} style={{ whiteSpace: 'nowrap' }}>
                                    {src}
                                </div>
                            ))}
                        </div>
                    </div>
                </Tooltip>
            </>
        );
    } catch {
        return <span>{rollupValue}</span>;
    }
};

// Custom cell component for GAP column with hover tooltip
const RollupGapCell = ({ row, columns }: { row: (string | number)[]; columns: string[] }) => {
    const gapIdx = columns.indexOf('GAP');
    const srcIdx = columns.indexOf('SRC');
    const rollupIdx = columns.indexOf('ROLLUP');
    const gapValue = row[gapIdx];
    const srcValue = row[srcIdx];
    const rollupValue = row[rollupIdx];

    try {
        const gapData = JSON.parse(gapValue as string);
        const srcData = JSON.parse(srcValue as string);
        const gapSum = gapData.sum || 0;
        const gapArray = gapData.arr || [];
        const srcArray = srcData.arr || [];
        const tooltipId = `gap-${rollupValue}`;

        return (
            <>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '6px',
                    }}
                >
                    <span>{gapSum.toLocaleString()}</span>
                    <BiInfoCircle
                        data-tooltip-id={tooltipId}
                        style={{
                            cursor: 'help',
                            color: '#888',
                            minWidth: '12px',
                            maxWidth: '12px',
                        }}
                    />
                </div>
                <Tooltip id={tooltipId} place="top" style={{ maxWidth: '500px', zIndex: 9999 }}>
                    <div>
                        <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>
                            Total: {gapSum.toLocaleString()}
                        </div>
                        <div
                            style={{
                                borderTop: '1px solid rgba(255,255,255,0.2)',
                                paddingTop: '8px',
                            }}
                        >
                            <strong>Details:</strong>
                            <div>
                                {gapArray.map((val: number, idx: number) => {
                                    const src = srcArray[idx] || 'Unknown';
                                    return (
                                        <div key={idx} style={{ whiteSpace: 'nowrap' }}>
                                            <span>{src}</span>
                                            <span style={{ fontWeight: 'bold', marginLeft: '8px' }}>
                                                {val.toLocaleString()}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </Tooltip>
            </>
        );
    } catch {
        return <span>{gapValue}</span>;
    }
};

// Custom cell component for PREDICATE column with conditional display
const RollupPredicateCell = ({ row, columns }: { row: (string | number)[]; columns: string[] }) => {
    const predicateIdx = columns.indexOf('PREDICATE');
    const rollupIdx = columns.indexOf('ROLLUP');
    const predicateValue = row[predicateIdx];
    const rollupValue = row[rollupIdx];

    // Check if predicate is empty or null
    if (!predicateValue || predicateValue === '' || predicateValue === null) {
        return <div />;
    }

    const tooltipId = `predicate-${rollupValue}`;

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BiInfoCircle
                    data-tooltip-id={tooltipId}
                    style={{ cursor: 'help', color: '#888', minWidth: '12px', maxWidth: '12px' }}
                />
            </div>
            <Tooltip
                id={tooltipId}
                place="top"
                style={{ maxWidth: '500px', zIndex: 9999, whiteSpace: 'pre-wrap' }}
            >
                {predicateValue}
            </Tooltip>
        </>
    );
};

export const DBTablePage = ({ pCode, pIsActiveTab }: { pCode: any; pIsActiveTab: boolean }) => {
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const setSelectedTab = useSetRecoilState<any>(gSelectedTab);
    const [sLastFetchTime, setLastFetchTime] = useState<string>('');
    const [isVertical, setIsVertical] = useState<boolean>(true);
    const [sMetaView, setMetaView] = useState<'table' | 'hierarchy'>('table');
    const [sRecordInfo, setRecordInfo] = useState<{ cnt: number; min: number; max: number }>({
        cnt: 0,
        min: 0,
        max: 0,
    });
    const [sRefreshCnt, setRefreshCnt] = useState<number>(0);
    const [sGroupWidth, setGroupWidth] = useState<any[]>(['60%', '40%']);
    const [sIsHiddenCol, setIsHiddenCol] = useState<boolean>(true);
    const [sRawColumnInfo, setRawColumnInfo] = useState<FetchCommonType>();
    const [sLogicalLengthCandidates, setLogicalLengthCandidates] = useState<
        Array<FetchCommonType | undefined>
    >([]);
    const [sTagIndexGap, setTagIndexGap] = useState<FetchCommonType>();
    const [sIndexInfo, setIndexInfo] = useState<FetchCommonType>();
    const [sRollupInfo, setRollupInfo] = useState<FetchCommonType>();
    const [sErrMsg, setErrMsg] = useState<{ key: 'ROLLUP' | undefined; value: string | undefined }>(
        { key: undefined, value: undefined },
    );
    const [sRetentionInfo, setRetentionInfo] = useState<FetchCommonType>();
    const [sViewSqlInfo, setViewSqlInfo] = useState<FetchCommonType>();
    const sBodyRef = useRef(null);

    const Resizer = () => <SashContent className={`security-key-sash-style`} />;

    const formatDuration = (value: number, unit: 'ms' | 's' = 's') => {
        const milliseconds = unit === 'ms' ? value : value * 1000;
        const duration = moment.duration(milliseconds);

        const years = duration.years();
        const months = duration.months();
        const days = duration.days();
        const hours = duration.hours();
        const minutes = duration.minutes();
        const seconds = duration.seconds();
        const ms = duration.milliseconds();

        const parts = [];
        if (years > 0) parts.push(`${years}y`);
        if (months > 0) parts.push(`${months}M`);
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (seconds > 0) parts.push(`${seconds}s`);
        if (unit === 'ms' && ms > 0) parts.push(`${ms}ms`);

        return parts?.join(' ') ?? '';
    };

    // Memoization tableInfo
    const mTableInfo = useMemo(() => {
        return pCode?.code?.tableInfo;
    }, [pCode?.code?.tableInfo]);
    const mQualifiedTableName = useMemo(() => {
        if (!mTableInfo) return '';
        return buildQualifiedTableName({
            dbName: String(mTableInfo[E_TABLE_INFO.DB_NM] ?? ''),
            userName: String(mTableInfo[E_TABLE_INFO.USER_NM] ?? ''),
            tableName: String(mTableInfo[E_TABLE_INFO.TB_NM] ?? ''),
            databaseId: normalizeDatabaseId(mTableInfo[E_TABLE_INFO.DB_ID] ?? -1),
            currentUserName: getUserName(),
        });
    }, [mTableInfo]);
    const mIsTagTable = useMemo(() => CheckTableFlag(mTableInfo?.[E_TABLE_INFO.TB_TYPE]) === E_TABLE_TYPE.TAG, [mTableInfo]);

    const handleCopyTableName = () => {
        if (!mQualifiedTableName) return;
        ClipboardCopy(mQualifiedTableName);
    };
    const handleOpenDataViewer = () => {
        if (!mTableInfo || !mIsTagTable) return;
        const columnConfig = buildDataViewerColumnConfigFromColumnRows(mColList?.rows);
        const code = {
            dbName: String(mTableInfo[E_TABLE_INFO.DB_NM] ?? ''),
            userName: String(mTableInfo[E_TABLE_INFO.USER_NM] ?? ''),
            tableName: String(mTableInfo[E_TABLE_INFO.TB_NM] ?? ''),
            tableType: String(CheckTableFlag(mTableInfo[E_TABLE_INFO.TB_TYPE]) ?? ''),
            databaseId: String(mTableInfo[E_TABLE_INFO.DB_ID] ?? ''),
            ...columnConfig,
        };
        const existing = sBoardList.find((board) => board.type === 'DataViewer');
        if (existing) {
            setBoardList((boardList) =>
                boardList.map((board) =>
                    board.id === existing.id
                        ? {
                              ...board,
                              name: `DATA: ${code.tableName}`,
                              code,
                              savedCode: false,
                          }
                        : board,
                ),
            );
            setSelectedTab(existing.id);
            return;
        }

        const id = generateUUID();
        setBoardList([
            ...sBoardList,
            {
                id,
                type: 'DataViewer',
                name: `DATA: ${code.tableName}`,
                path: '',
                code,
                panels: [],
                range_bgn: '',
                range_end: '',
                sheet: [],
                savedCode: false,
            },
        ]);
        setSelectedTab(id);
    };
    // Memoization column list
    const mMainColumnSection = useMemo(() => {
        if (!sRawColumnInfo) return undefined;

        return resolveDisplayColumnInfo(sRawColumnInfo, sLogicalLengthCandidates, {
            includeMeta: false,
            hideHidden: sIsHiddenCol,
        });
    }, [sRawColumnInfo, sLogicalLengthCandidates, sIsHiddenCol]);
    const mColList = mMainColumnSection?.columnInfo;
    // Which column the rows are ordered by, and whether it measures distance. Both the extent query
    // and the header readout below key on it: a base distance is a plain number in its own unit, not
    // a nanosecond timestamp.
    const mBaseColumn = useMemo(() => resolveTableBaseColumn(mColList), [mColList]);
    // Memoization meta column list
    const mMetaColumnSection = useMemo(() => {
        if (!sRawColumnInfo) return undefined;

        return resolveDisplayColumnInfo(sRawColumnInfo, sLogicalLengthCandidates, {
            includeMeta: true,
            hideHidden: false,
        });
    }, [sRawColumnInfo, sLogicalLengthCandidates]);
    const mMetaColList = mMetaColumnSection?.columnInfo;
    const mColErrMsg = useMemo(() => {
        if (mMainColumnSection?.status === 'missing')
            return 'logical LENGTH lookup failed. showing BYTE values in LENGTH.';
        if (mMainColumnSection?.status === 'partial')
            return 'some logical LENGTH values are unavailable. showing BYTE values for missing columns.';
        return '';
    }, [mMainColumnSection]);
    const mMetaColErrMsg = useMemo(() => {
        if (mMetaColumnSection?.status === 'missing')
            return 'logical LENGTH lookup failed. showing BYTE values in LENGTH.';
        if (mMetaColumnSection?.status === 'partial')
            return 'some logical LENGTH values are unavailable. showing BYTE values for missing columns.';
        return '';
    }, [mMetaColumnSection]);

    const FetchRecordCount = async () => {
        let sSubCol = '';
        if (CheckTableFlag(mTableInfo[E_TABLE_INFO.TB_TYPE]) === E_TABLE_TYPE.TAG)
            // Unfiltered, so this stays a metadata read rather than a scan — measured 0.185 ms over
            // DISTANCE_SENSOR's million rows, against 0.173 ms for the same extent through
            // `V$<TABLE>_STAT`. The stat view is what the *tag-filtered* readers need (a
            // `WHERE NAME IN (...)` is what turns this into a scan); here it would only add a
            // second query, and its ROW_COUNT lags `COUNT(*)` — measured 52,803 against 54,372 on
            // TEST — so the record count has to come from the table either way.
            sSubCol = `, MIN(${mBaseColumn.name}) as MIN, MAX(${mBaseColumn.name}) as MAX`;
        // v8.7 renamed V$STORAGE_DC_TABLE_INDEXES.DATABASE_ID to TABLESPACE_ID, so joining on
        // the old column no longer compiles (ERR-2056). Scoping by TABLE_ID instead is not a
        // workaround but the narrower statement: this panel shows the indexes of one table, and
        // `sub` is already restricted to that table. Substituting TABLESPACE_ID would compile
        // and return nothing — it compares a logical database id against a physical tablespace
        // id, which is 0 for every database. TABLE_ID exists on both engines, so one query text
        // serves v8.5 and v8.7 alike.
        if (CheckTableFlag(mTableInfo[E_TABLE_INFO.TB_TYPE]) === E_TABLE_TYPE.LOG)
            sSubCol = ', MIN(_ARRIVAL_TIME) as MIN, MAX(_ARRIVAL_TIME) as MAX';
        const sQuery = `SELECT COUNT(*) as CNT ${sSubCol} FROM ${mTableInfo[E_TABLE_INFO.DB_NM]}.${mTableInfo[E_TABLE_INFO.USER_NM]}.${mTableInfo[E_TABLE_INFO.TB_NM]}`;
        const { svrState, svrData } = await fetchQuery(sQuery);
        if (svrState) {
            setRecordInfo({
                cnt: svrData?.rows?.[0]?.[svrData?.columns?.indexOf?.('CNT')] ?? 0,
                min: svrData?.rows?.[0]?.[svrData?.columns?.indexOf?.('MIN')] ?? 0,
                max: svrData?.rows?.[0]?.[svrData?.columns?.indexOf?.('MAX')] ?? 0,
            });
        } else setRecordInfo({ cnt: 0, min: 0, max: 0 });
    };
    const FetchColumn = async () => {
        const rawColumnQuery = `SELECT NAME, TYPE, LENGTH, FLAG as DESC FROM M$SYS_COLUMNS WHERE TABLE_ID=${mTableInfo[E_TABLE_INFO.TB_ID]} AND DATABASE_ID=${
            mTableInfo[E_TABLE_INFO.DB_ID]
        } ORDER BY ID`;
        const logicalLengthQueries = buildLogicalLengthQueries({
            dbName: mTableInfo[E_TABLE_INFO.DB_NM],
            userName: mTableInfo[E_TABLE_INFO.USER_NM],
            tableName: mTableInfo[E_TABLE_INFO.TB_NM],
            databaseId: mTableInfo[E_TABLE_INFO.DB_ID],
            currentUserName: getUserName(),
        });
        const [{ svrState, svrData }, primaryLogicalLengthResult] = await Promise.all([
            fetchQuery(rawColumnQuery),
            fetchTqlWithoutConsole(logicalLengthQueries[0]),
        ]);

        if (!svrState) {
            setRawColumnInfo(undefined);
            setLogicalLengthCandidates([]);
            return;
        }

        const logicalLengthCandidates: Array<FetchCommonType | undefined> = [
            primaryLogicalLengthResult.svrState
                ? normalizeLogicalLengthInfo(primaryLogicalLengthResult.svrData)
                : undefined,
        ];

        for (const logicalLengthQuery of logicalLengthQueries.slice(1)) {
            const { svrState, svrData } = await fetchTqlWithoutConsole(logicalLengthQuery);
            if (svrState) {
                logicalLengthCandidates.push(normalizeLogicalLengthInfo(svrData));
            }
        }

        setRawColumnInfo(svrData);
        setLogicalLengthCandidates(logicalLengthCandidates);
    };
    const FetchIndexGapForTag = async () => {
        const sQuery = `SELECT TABLE_ID AS 'TABLE', INDEX_STATE AS STATE, (TABLE_END_RID-DISK_INDEX_END_RID) AS DISK_GAP, (TABLE_END_RID-MEMORY_INDEX_END_RID) AS MEMORY_GAP FROM V$STORAGE_TAG_INDEX WHERE INDEX_ID = 4294967295 AND TABLE_ID IN (SELECT ID FROM m$SYS_TABLES WHERE NAME LIKE '_${
            mTableInfo[E_TABLE_INFO.TB_NM]
        }_DATA%' AND DATABASE_ID=${mTableInfo[E_TABLE_INFO.DB_ID]} AND USER_ID=(SELECT USER_ID FROM M$SYS_USERS WHERE NAME=upper('${
            mTableInfo[E_TABLE_INFO.USER_NM]
        }') limit 1)) ORDER BY TABLE_ID`;
        const { svrState, svrData } = await fetchQuery(sQuery);
        if (svrState) {
            svrData.rows.map((row: (string | number)[], idx: number) => {
                const tableValue = row[svrData.columns.indexOf('TABLE')];
                if (
                    tableValue === null ||
                    tableValue === undefined ||
                    Number.isNaN(tableValue as number)
                )
                    return row;
                else
                    return (row[svrData.columns.indexOf('TABLE')] =
                        `DATA${idx} (${row[svrData.columns.indexOf('TABLE')]})`);
            });
            svrData.rows.map((row: (string | number)[]) => {
                const tableValue = row[svrData.columns.indexOf('MEMORY_GAP')];
                if (
                    tableValue === null ||
                    tableValue === undefined ||
                    Number.isNaN(tableValue as number)
                )
                    return row;
                else
                    return (row[svrData.columns.indexOf('MEMORY_GAP')] =
                        row[svrData.columns.indexOf('MEMORY_GAP')].toLocaleString() ?? '0');
            });
            svrData.rows.map((row: (string | number)[]) => {
                const tableValue = row[svrData.columns.indexOf('DISK_GAP')];
                if (
                    tableValue === null ||
                    tableValue === undefined ||
                    Number.isNaN(tableValue as number)
                )
                    return row;
                else
                    return (row[svrData.columns.indexOf('DISK_GAP')] =
                        row[svrData.columns.indexOf('DISK_GAP')].toLocaleString() ?? '0');
            });
            setTagIndexGap(svrData);
        } else setTagIndexGap(undefined);
    };
    const FetchIndex = async () => {
        // Default query for volatile and mount tag table
        let sQuery = `select i.name as 'NAME', i.type as TYPE, c.name as 'COLUMN', '' as 'DESC' from m$sys_index_columns c inner join m$sys_indexes i on c.database_id=i.database_id and c.table_id=i.table_id and c.index_id=i.id where c.database_id=${
            mTableInfo[E_TABLE_INFO.DB_ID]
        } and c.table_id=${mTableInfo[E_TABLE_INFO.TB_ID]}`;
        // Only a mounted backup has to be kept out of the tag statistics views. Unlike the
        // LOG branch above they carry no TABLESPACE_ID, and a mount contributes no rows to them
        // at all — measured, a tag table backed up and mounted beside its source leaves
        // V$STORAGE_TAG_INDEX with exactly one row per id, the source's. Since a mount reuses
        // the ids of the database it was taken from, asking by id would answer with the
        // source's numbers rather than nothing.
        //
        // A second *active* database is safe, though: table ids come from one allocator shared
        // across databases — measured, three tables created alternately in two databases got
        // 683, 684, 685 — so ids never collide between them, and their rows are present.
        // Testing "is this the database I am connected to" excluded them for no reason.
        if (
            CheckTableFlag(mTableInfo[E_TABLE_INFO.TB_TYPE]) === E_TABLE_TYPE.TAG &&
            !isMountedTableName(mQualifiedTableName)
        )
            sQuery = `SELECT sub.NAME, sub.TYPE, sub.COLUMN_NAME as 'COLUMN', SUM(vi.TABLE_END_RID - vi.DISK_INDEX_END_RID) AS DISK_GAP FROM (SELECT * from V$STORAGE_TAG_INDEX where index_id <> 4294967295) as vi INNER JOIN (SELECT i.name AS NAME, i.type AS TYPE, c.name AS COLUMN_NAME, i.id AS index_id, c.table_id FROM m$sys_index_columns c INNER JOIN m$sys_indexes i ON c.table_id = i.table_id AND c.index_id = i.id WHERE c.table_id=${
                mTableInfo[E_TABLE_INFO.TB_ID]
            } and c.DATABASE_ID = ${mTableInfo[E_TABLE_INFO.DB_ID]} ) as sub ON vi.INDEX_ID = sub.index_id group by sub.name, sub.TYPE, sub.COLUMN_NAME`;
        // The join carries TABLESPACE_ID as well as TABLE_ID, because a table id is not unique
        // across databases: a mounted backup keeps the ids of the database it was taken from.
        // Measured — a LOG table backed up and mounted alongside its source gives V$STORAGE_DC_
        // TABLE_INDEXES two rows for the same TABLE_ID (tablespace 0 and 667), and the join on
        // id alone returned both of them to *each* side, mixing two databases' RID counters into
        // one panel. Tablespace tells them apart: `M$SYS_TABLES` reports 0 for an active
        // database and the mount's own tablespace for a mounted one, and the storage view agrees.
        if (CheckTableFlag(mTableInfo[E_TABLE_INFO.TB_TYPE]) === E_TABLE_TYPE.LOG)
            sQuery = `
SELECT sub.NAME, sub.TYPE, sub.COLUMN_NAME as 'COLUMN', (vi.TABLE_END_RID - vi.END_RID) AS DISK_GAP FROM V$STORAGE_DC_TABLE_INDEXES vi INNER JOIN (SELECT i.name AS NAME, i.type AS TYPE, c.name AS COLUMN_NAME, i.id AS index_id, c.table_id, c.tablespace_id, CASE WHEN c.database_id = -1 THEN 0 ELSE c.database_id END AS database_id FROM m$sys_index_columns c INNER JOIN m$sys_indexes i ON c.table_id = i.table_id AND c.index_id = i.id AND c.database_id = i.database_id WHERE c.table_id=${
                mTableInfo[E_TABLE_INFO.TB_ID]
            } and c.DATABASE_ID = ${mTableInfo[E_TABLE_INFO.DB_ID]} ) sub ON vi.id = sub.index_id AND vi.TABLE_ID = sub.table_id AND vi.TABLESPACE_ID = sub.tablespace_id`;

        const { svrState, svrData } = await fetchQuery(sQuery);
        if (svrState) {
            svrData.rows.map((row: (string | number)[]) => {
                const typeValue = row[svrData.columns.indexOf('TYPE')];
                if (
                    typeValue === null ||
                    typeValue === undefined ||
                    Number.isNaN(typeValue as number)
                )
                    return row;
                else
                    return (row[svrData.columns.indexOf('TYPE')] = CheckIndexFlag(
                        typeValue as number,
                    ));
            });
            svrData.rows.map((row: (string | number)[]) => {
                const tableValue = row[svrData.columns.indexOf('DISK_GAP')];
                if (
                    tableValue === null ||
                    tableValue === undefined ||
                    Number.isNaN(tableValue as number)
                )
                    return row;
                else {
                    if (!isMountedTableName(mQualifiedTableName))
                        return (row[svrData.columns.indexOf('DISK_GAP')] =
                            row[svrData.columns.indexOf('DISK_GAP')].toLocaleString() ?? '0');
                    else return (row[svrData.columns.indexOf('DISK_GAP')] = '-');
                }
            });
            setIndexInfo(svrData);
        } else setIndexInfo(undefined);
    };
    const FetchRollup = async () => {
        const sRollupVersion = localStorage.getItem('V$ROLLUP_VER');
        const sDatabaseIdCondition =
            sRollupVersion === 'OLD'
                ? ''
                : ` A.DATABASE_ID=C.DATABASE_ID AND A.DATABASE_ID=${mTableInfo[E_TABLE_INFO.DB_ID]} AND `;
        const sQuery = `SELECT
                            C.ROLLUP_TABLE AS 'ROLLUP',
                            C.SOURCE_TABLE AS 'SRC',        
                            C.INTERVAL_TIME AS 'INTERVAL',
                            B.TABLE_END_RID - C.END_RID AS 'GAP',
                            C.ENABLED AS 'ENABLED',
                            C.PREDICATE AS 'PREDICATE'
                        FROM
                            M$SYS_TABLES A,
                            V$STORAGE_TAG_TABLES B,
                            V$ROLLUP C
                        WHERE
                        ${sDatabaseIdCondition}
                        A.NAME=C.SOURCE_TABLE
                        AND C.USER_ID=A.USER_ID
                        AND C.USER_ID=(SELECT USER_ID FROM M$SYS_USERS WHERE NAME=upper('${mTableInfo[E_TABLE_INFO.USER_NM]}') limit 1)
                        AND A.ID=B.ID
                        AND C.ROOT_TABLE=upper('${mTableInfo[E_TABLE_INFO.TB_NM]}')
                        ORDER BY ROLLUP_TABLE, SOURCE_TABLE;`;

        const { svrState, svrData } = await fetchQuery(sQuery);
        if (svrState) {
            // Group rows by ROLLUP column value
            const rollupIdx = svrData.columns.indexOf('ROLLUP');
            const groupedRows: Map<string, any[]> = new Map();

            svrData.rows.forEach((row: (string | number)[]) => {
                const rollupValue = String(row[rollupIdx]);
                if (!groupedRows.has(rollupValue)) {
                    groupedRows.set(rollupValue, []);
                }
                groupedRows.get(rollupValue)!.push([...row]);
            });

            // Merge grouped rows
            const mergedRows = Array.from(groupedRows.values()).map((rows) => {
                if (rows.length === 1) {
                    return rows[0];
                }

                // Create merged row based on first row
                const mergedRow = [...rows[0]];

                // For each column except ROLLUP, merge values according to SRC count
                svrData.columns.forEach((col: string, idx: number) => {
                    if (col !== 'ROLLUP') {
                        // Keep INTERVAL, ENABLED, PREDICATE as single values (they are always the same)
                        if (col === 'INTERVAL' || col === 'ENABLED' || col === 'PREDICATE') {
                            mergedRow[idx] = rows[0][idx];
                        } else if (col === 'GAP') {
                            // For GAP, create JSON structure with sum and array
                            const gapValues = rows.map((r) => Number(r[idx]) || 0);
                            const gapSum = gapValues.reduce((acc, val) => acc + val, 0);
                            mergedRow[idx] = JSON.stringify({ sum: gapSum, arr: gapValues });
                        } else if (col === 'SRC') {
                            // For SRC, create JSON structure with display flag and array
                            const srcValues = rows.map((r) => r[idx]);
                            mergedRow[idx] = JSON.stringify({ display: false, arr: srcValues });
                        } else {
                            // For other columns, create array format
                            const values = rows.map((r) => r[idx]);
                            mergedRow[idx] = '[' + values.join(', ') + ']';
                        }
                    }
                });

                return mergedRow;
            });

            // Apply INTERVAL formatting
            mergedRows.forEach((row: (string | number)[]) => {
                const intervalValue = row[svrData.columns.indexOf('INTERVAL')];
                if (
                    intervalValue !== null &&
                    intervalValue !== undefined &&
                    !Number.isNaN(intervalValue as number) &&
                    typeof intervalValue === 'number'
                ) {
                    row[svrData.columns.indexOf('INTERVAL')] = formatDuration(
                        intervalValue as number,
                        'ms',
                    );
                }
            });

            setRollupInfo({ ...svrData, rows: mergedRows });
        } else setRollupInfo(undefined);
    };
    const FetchRetention = async () => {
        const sQuery = buildRetentionQuery({
            tableName: String(mTableInfo[E_TABLE_INFO.TB_NM] ?? ''),
            userName: String(mTableInfo[E_TABLE_INFO.USER_NM] ?? ''),
            // Pre-v8.7 the view has no `DATABASE_ID` to filter on and is scoped to the session
            // anyway; there the table shown is always the session's, so an unscoped statement
            // is the right one. See `buildRetentionQuery` for what changed on v8.7.
            databaseId: hasLogicalDatabases()
                ? normalizeDatabaseId(mTableInfo[E_TABLE_INFO.DB_ID])
                : undefined,
        });
        const { svrState, svrData } = await fetchTqlWithoutConsole(sQuery);
        if (svrState) {
            svrData.rows.map((row: (string | number)[]) => {
                const durationValue = row[svrData.columns.indexOf('DURATION')];
                if (
                    durationValue === null ||
                    durationValue === undefined ||
                    Number.isNaN(durationValue as number)
                )
                    return row;
                else
                    return (row[svrData.columns.indexOf('DURATION')] = formatDuration(
                        durationValue as number,
                        's',
                    ));
            });
            svrData.rows.map((row: (string | number)[]) => {
                const intervalValue = row[svrData.columns.indexOf('INTERVAL')];
                if (
                    intervalValue === null ||
                    intervalValue === undefined ||
                    Number.isNaN(intervalValue as number)
                )
                    return row;
                else
                    return (row[svrData.columns.indexOf('INTERVAL')] = formatDuration(
                        intervalValue as number,
                        's',
                    ));
            });
            svrData.rows.map((row: (string | number)[]) => {
                const lastDeletedTime = row[svrData.columns.indexOf('LAST_DELETED_TIME')];
                if (
                    lastDeletedTime === null ||
                    lastDeletedTime === undefined ||
                    Number.isNaN(lastDeletedTime as number)
                )
                    return row;
                else
                    return (row[svrData.columns.indexOf('LAST_DELETED_TIME')] = moment(
                        (lastDeletedTime as number) / 1000000,
                    ).format('YYYY-MM-DD HH:mm:ss'));
            });
            setRetentionInfo(svrData);
        } else setRetentionInfo(undefined);
    };
    const FetchViewSql = async () => {
        const sQuery = `select VIEW_SQL from M$SYS_VIEWS where DB_NAME=upper('${
            mTableInfo[E_TABLE_INFO.DB_NM]
        }') and USER_NAME=upper('${mTableInfo[E_TABLE_INFO.USER_NM]}') and VIEW_NAME=upper('${mTableInfo[E_TABLE_INFO.TB_NM]}') limit 1`;
        const { svrState, svrData } = await fetchQuery(sQuery);
        const sViewSqlIdx =
            svrData?.columns?.findIndex(
                (aColumn: string) => aColumn.toUpperCase() === 'VIEW_SQL',
            ) ?? -1;
        const sRows = svrData?.rows ?? [];

        if (svrState && sRows.length > 0) {
            setViewSqlInfo({
                columns: ['VIEW_SQL'],
                rows: sRows.map((aRow: (string | number)[]) => [
                    aRow[sViewSqlIdx >= 0 ? sViewSqlIdx : 0],
                ]),
                types: ['string'],
            });
            return;
        }

        setViewSqlInfo(undefined);
    };
    const FetchRollupState = async (aRollupName: string, aCommand: string) => {
        const sQuery = `EXEC ${aCommand}(${aRollupName})`;
        const { svrState, svrReason } = await fetchTqlWithoutConsole(sQuery);
        if (svrState) FetchRollup();
        else {
            setErrMsg({ key: 'ROLLUP', value: svrReason ?? '' });
            setTimeout(() => {
                setErrMsg({ key: undefined, value: undefined });
            }, 5000);
        }
    };

    const SetLastFetchTime = () => {
        const sCurTime = new Date();
        setLastFetchTime(moment(sCurTime).format('YYYY-MM-DD HH:mm:ss'));
    };
    const handleRollupState = (e: any, item: any) => {
        e.stopPropagation();
        // Use original row data for correct column indices
        const originalRow = item.__originalRow || item;
        const originalColumns = item.__originalColumns || sRollupInfo?.columns;
        const sRollupName = originalRow[originalColumns?.indexOf('ROLLUP') as number];
        const sCommand =
            originalRow[originalColumns?.indexOf('ENABLED') as number] === 0
                ? 'ROLLUP_START'
                : 'ROLLUP_STOP';
        FetchRollupState(sRollupName as string, sCommand as string);
    };
    const rollupStateElement = (item: any) => {
        // Use original row data for correct column indices
        const originalRow = item.__originalRow || item;
        const originalColumns = item.__originalColumns || sRollupInfo?.columns;
        const enabledValue = originalRow[originalColumns?.indexOf('ENABLED') as number];
        // Editing a rollup is a write, so the gate is whether the database accepts writes —
        // not whether it is the one we are connected to. Another active READ_WRITE database
        // is editable; a READ ONLY one or a mounted backup is not.
        const sReadOnly =
            !isDatabaseWritable(mTableInfo[E_TABLE_INFO.DB_ID]) ||
            mTableInfo[E_TABLE_INFO.USER_NM]?.toUpperCase() !== getUserName()?.toUpperCase();

        if (enabledValue === 1)
            return (
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: '8px' }}>
                    <Page.Switch
                        pReadOnly={sReadOnly}
                        pState={true}
                        pCallback={(e) => handleRollupState(e, item)}
                    />
                </div>
            );
        else
            return (
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: '8px' }}>
                    <Page.Switch
                        pReadOnly={sReadOnly}
                        pState={false}
                        pCallback={(e) => handleRollupState(e, item)}
                    />
                </div>
            );
    };

    useEffect(() => {
        if (sRawColumnInfo) FetchRecordCount();
    }, [sRawColumnInfo]);

    useEffect(() => {
        if (pIsActiveTab) {
            if (mTableInfo) {
                SetLastFetchTime();
                FetchColumn();
                FetchIndex();
                // On v8.7 the query carries its own `DATABASE_ID` condition, so any database
                // can be read. An older server has no such column, and there the session's
                // database is the only one whose retention the view can be trusted to describe.
                if (hasLogicalDatabases() || isSameDatabaseId(mTableInfo[E_TABLE_INFO.DB_ID], getCurrentDatabaseId())) FetchRetention();
                else setRetentionInfo(undefined);
                // Cond rollup (TAG)
                if (CheckTableFlag(mTableInfo[E_TABLE_INFO.TB_TYPE]) === E_TABLE_TYPE.TAG)
                    FetchRollup();
                else setRollupInfo(undefined);
                // Cond index (MACHBASEDB) (TAG)
                if (
                    !isMountedTableName(mQualifiedTableName) &&
                    CheckTableFlag(mTableInfo[E_TABLE_INFO.TB_TYPE]) === E_TABLE_TYPE.TAG
                )
                    FetchIndexGapForTag();
                else setTagIndexGap(undefined);
                if (CheckTableFlag(mTableInfo[E_TABLE_INFO.TB_TYPE]) === E_TABLE_TYPE.VIEW)
                    FetchViewSql();
                else setViewSqlInfo(undefined);
            } else {
                setRecordInfo({ cnt: 0, min: 0, max: 0 });
                setRawColumnInfo(undefined);
                setLogicalLengthCandidates([]);
                setIndexInfo(undefined);
                setRollupInfo(undefined);
                setRetentionInfo(undefined);
                setTagIndexGap(undefined);
                setViewSqlInfo(undefined);
            }
        }
    }, [mTableInfo, pIsActiveTab, sRefreshCnt]);

    // Init screen size
    useEffect(() => {
        if (sBodyRef?.current && (sBodyRef.current as HTMLDivElement)?.offsetWidth) {
            const width = (sBodyRef.current as HTMLDivElement).offsetWidth;
            setGroupWidth([width * 0.6, width * 0.4]);
        }
    }, []);

    return (
        <Page pRef={sBodyRef}>
            <SplitPane
                sashRender={() => Resizer()}
                split={isVertical ? 'vertical' : 'horizontal'}
                sizes={sGroupWidth}
                onChange={setGroupWidth}
            >
                <Pane minSize={500} style={{ display: 'flex', flexDirection: 'column' }}>
                    <Page.Header />
                    <Page.Body fixed>
                        <Page.ContentBlock pHoverNone>
                            <Page.DpRowBetween style={{ flexWrap: 'wrap' }}>
                                <Page.DpRow
                                    style={{
                                        gap: '8px',
                                        display: 'flex',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        textWrap: 'nowrap',
                                    }}
                                >
                                    <Page.SubTitle>Table</Page.SubTitle>
                                    <BadgeSelectorItem
                                        item={{
                                            name: CheckTableFlag(mTableInfo[E_TABLE_INFO.TB_TYPE]),
                                            color: E_TABLE_TYPE_COLOR[
                                                CheckTableFlag(
                                                    mTableInfo[E_TABLE_INFO.TB_TYPE],
                                                ) as keyof typeof E_TABLE_TYPE_COLOR
                                            ],
                                        }}
                                    />
                                    <Page.ContentTitle>{`${mTableInfo[E_TABLE_INFO.TB_NM]}`}</Page.ContentTitle>
                                    <Page.ContentDesc>{`(${mTableInfo[E_TABLE_INFO.DB_NM]}.${mTableInfo[E_TABLE_INFO.USER_NM]})`}</Page.ContentDesc>
                                    <Button.Copy
                                        size="xsm"
                                        variant="ghost"
                                        isToolTip
                                        toolTipContent={`Copy "${mQualifiedTableName}"`}
                                        onClick={handleCopyTableName}
                                    />
                                    {mIsTagTable && (
                                        <Button
                                            size="xsm"
                                            variant="ghost"
                                            icon={<MaterialIcon name="query_stats" size={14} />}
                                            isToolTip
                                            toolTipContent="Open Data Viewer"
                                            onClick={handleOpenDataViewer}
                                            aria-label="Open Data Viewer"
                                        />
                                    )}
                                </Page.DpRow>
                                <Page.DpRow
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'end',
                                        justifyContent: 'end',
                                        flex: 1,
                                    }}
                                >
                                    <Page.DpRow style={{ gap: '4px' }}>
                                        <Page.ContentDesc>
                                            Record: {sRecordInfo?.cnt?.toLocaleString() ?? '0'}
                                        </Page.ContentDesc>
                                        <Button
                                            size="xsm"
                                            variant="ghost"
                                            isToolTip
                                            toolTipContent={`last fetch: ${sLastFetchTime}`}
                                            icon={<Refresh size={14} />}
                                            onClick={() => setRefreshCnt(sRefreshCnt + 1)}
                                        />
                                    </Page.DpRow>
                                    {CheckTableFlag(mTableInfo[E_TABLE_INFO.TB_TYPE]) ===
                                        E_TABLE_TYPE.TAG ||
                                    CheckTableFlag(mTableInfo[E_TABLE_INFO.TB_TYPE]) ===
                                        E_TABLE_TYPE.LOG ? (
                                        <Page.DpRowBetween>
                                            <Page.Space />
                                            <div style={{ textWrap: 'nowrap' }}>
                                                <Page.ContentDesc>
                                                    {formatTableBaseExtent(
                                                        sRecordInfo?.min,
                                                        mBaseColumn.isDistance,
                                                    )}
                                                    {' ~ '}
                                                    {formatTableBaseExtent(
                                                        sRecordInfo?.max,
                                                        mBaseColumn.isDistance,
                                                    )}
                                                </Page.ContentDesc>
                                            </div>
                                        </Page.DpRowBetween>
                                    ) : null}
                                </Page.DpRow>
                            </Page.DpRowBetween>
                        </Page.ContentBlock>
                        <Page.Hr />
                    </Page.Body>
                    <div
                        className="scrollbar-dark-border"
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'auto',
                            flex: 1,
                            height: 'calc(100% - 130px)',
                        }}
                    >
                        {/* COLUMN */}
                        {mColList?.rows && mColList?.rows?.length > 0 && (
                            <Page.ContentBlock>
                                <Page.DpRowBetween>
                                    <Page.ContentTitle>Column</Page.ContentTitle>
                                    <Button
                                        size="xsm"
                                        variant="ghost"
                                        icon={
                                            sIsHiddenCol ? (
                                                <TbEyeMinus size={16} />
                                            ) : (
                                                <TbEyeOff size={16} />
                                            )
                                        }
                                        onClick={() => {
                                            setIsHiddenCol(!sIsHiddenCol);
                                        }}
                                    />
                                </Page.DpRowBetween>
                                {/* mColList/mMetaColList columns are fixed to ['NAME','TYPE','LENGTH','BYTE','DESC'] by resolveDisplayColumnInfo -> buildDisplayColumnInfo (utils.ts), so 'NAME' always exists at index 0 and header-name matching is valid. Rename the header here too if that column list ever changes. */}
                                <CommonTable
                                    scrollX={false}
                                    cellWidthFix
                                    copyableColumns={['NAME']}
                                    data={{ columns: mColList?.columns, rows: mColList.rows }}
                                />
                                {mColErrMsg ? <Page.TextResErr pText={mColErrMsg} /> : null}
                            </Page.ContentBlock>
                        )}
                        {/* VIEW SQL */}
                        {sViewSqlInfo?.rows && sViewSqlInfo?.rows?.length > 0 && (
                            <Page.ContentBlock>
                                <Page.DpRow>
                                    <Page.ContentTitle>View SQL</Page.ContentTitle>
                                </Page.DpRow>
                                <CommonTable
                                    scrollX={false}
                                    cellWidthFix
                                    textWrap
                                    data={{ columns: [], rows: sViewSqlInfo.rows }}
                                />
                            </Page.ContentBlock>
                        )}
                        {/* COLUMN (META) */}
                        {mMetaColList?.rows && mMetaColList?.rows?.length > 0 && (
                            <Page.ContentBlock>
                                <Page.DpRow>
                                    <Page.ContentTitle>Meta Column</Page.ContentTitle>
                                </Page.DpRow>
                                {/* Same fixed-column guarantee as the Column section above: 'NAME' is always present at index 0, so copyableColumns={['NAME']} matches by header name. */}
                                <CommonTable
                                    scrollX={false}
                                    cellWidthFix
                                    copyableColumns={['NAME']}
                                    data={{
                                        columns: mMetaColList?.columns,
                                        rows: mMetaColList.rows,
                                    }}
                                />
                                {mMetaColErrMsg ? <Page.TextResErr pText={mMetaColErrMsg} /> : null}
                            </Page.ContentBlock>
                        )}
                        {/* Tag index gap */}
                        {sTagIndexGap?.rows && sTagIndexGap?.rows?.length > 0 && (
                            <Page.ContentBlock>
                                <Page.DpRow>
                                    <Page.ContentTitle>tag index gap</Page.ContentTitle>
                                </Page.DpRow>
                                <CommonTable
                                    scrollX={false}
                                    cellWidthFix
                                    data={{
                                        columns: sTagIndexGap?.columns,
                                        rows: sTagIndexGap.rows,
                                    }}
                                />
                            </Page.ContentBlock>
                        )}
                        {/* INDEX */}
                        {sIndexInfo?.rows && sIndexInfo?.rows?.length > 0 && (
                            <Page.ContentBlock>
                                <Page.ContentTitle>indexes</Page.ContentTitle>
                                <CommonTable
                                    scrollX={false}
                                    cellWidthFix
                                    textWrap
                                    data={{ columns: sIndexInfo?.columns, rows: sIndexInfo.rows }}
                                />
                            </Page.ContentBlock>
                        )}
                        {/* ROLLUP */}
                        {sRollupInfo?.rows && sRollupInfo?.rows?.length > 0 && (
                            <Page.ContentBlock>
                                <Page.ContentTitle>Rollup</Page.ContentTitle>
                                <CommonTable
                                    scrollX={false}
                                    cellWidthFix
                                    data={{
                                        columns: sRollupInfo.columns
                                            .filter((col: string) => col !== 'SRC')
                                            .map((col: string) => (col === 'PREDICATE' ? '' : col)),
                                        rows: sRollupInfo.rows.map((row: (string | number)[]) => {
                                            const srcIdx = sRollupInfo.columns.indexOf('SRC');
                                            // Store original row for custom renderers to access
                                            const filteredRow = row.filter(
                                                (_: any, idx: number) => idx !== srcIdx,
                                            );
                                            (filteredRow as any).__originalRow = row;
                                            (filteredRow as any).__originalColumns =
                                                sRollupInfo.columns;
                                            return filteredRow;
                                        }),
                                    }}
                                    cellRenderers={[
                                        {
                                            column: 'ROLLUP',
                                            render: (row: any) => (
                                                <RollupNameCell
                                                    row={row.__originalRow || row}
                                                    columns={
                                                        row.__originalColumns || sRollupInfo.columns
                                                    }
                                                />
                                            ),
                                        },
                                        {
                                            column: 'GAP',
                                            render: (row: any) => (
                                                <RollupGapCell
                                                    row={row.__originalRow || row}
                                                    columns={
                                                        row.__originalColumns || sRollupInfo.columns
                                                    }
                                                />
                                            ),
                                        },
                                        {
                                            column: 'ENABLED',
                                            maxWidth: '100px',
                                            render: rollupStateElement,
                                        },
                                        {
                                            column: '',
                                            maxWidth: '30px',
                                            render: (row: any) => (
                                                <RollupPredicateCell
                                                    row={row.__originalRow || row}
                                                    columns={
                                                        row.__originalColumns || sRollupInfo.columns
                                                    }
                                                />
                                            ),
                                        },
                                    ]}
                                />
                                {sErrMsg?.key === 'ROLLUP' ? (
                                    <Page.TextResErr pText={sErrMsg?.value ?? ''} />
                                ) : null}
                            </Page.ContentBlock>
                        )}
                        {/* RETENTION */}
                        {sRetentionInfo?.rows && sRetentionInfo?.rows?.length > 0 && (
                            <Page.ContentBlock>
                                <Page.ContentTitle>Retention</Page.ContentTitle>
                                <CommonTable
                                    scrollX={false}
                                    cellWidthFix
                                    textWrap
                                    data={{
                                        columns: sRetentionInfo?.columns,
                                        rows: sRetentionInfo.rows,
                                    }}
                                />
                            </Page.ContentBlock>
                        )}
                    </div>
                </Pane>
                <Pane minSize={500}>
                    <Page.Header>
                        {CheckTableFlag(mTableInfo[E_TABLE_INFO.TB_TYPE]) === E_TABLE_TYPE.TAG ? (
                            <Tabs.Root
                                selectedTab={sMetaView}
                                onTabSelect={(tab) => setMetaView(tab.id as 'table' | 'hierarchy')}
                            >
                                <Tabs.Header variant="sub">
                                    <Tabs.List>
                                        <Tabs.Item value="table" variant="sub">
                                            Meta Table
                                        </Tabs.Item>
                                        <Tabs.Item value="hierarchy" variant="sub">
                                            Hierarchy
                                        </Tabs.Item>
                                    </Tabs.List>
                                </Tabs.Header>
                            </Tabs.Root>
                        ) : null}
                        <Button.Group>
                            <Button
                                size="sm"
                                variant="ghost"
                                isToolTip
                                toolTipContent="Vertical"
                                active={isVertical}
                                icon={<LuFlipVertical style={{ transform: 'rotate(90deg)' }} />}
                                onClick={() => setIsVertical(true)}
                            />
                            <Button
                                size="sm"
                                variant="ghost"
                                isToolTip
                                toolTipContent="Horizontal"
                                icon={<LuFlipVertical />}
                                active={!isVertical}
                                onClick={() => setIsVertical(false)}
                            />
                        </Button.Group>
                    </Page.Header>
                    {mColList ? (
                        <MetaTablePage
                            pIsActiveTab={pIsActiveTab}
                            pMTableInfo={mTableInfo}
                            pMColInfo={mColList}
                            pMMetaColInfo={mMetaColList}
                            pMetaView={sMetaView}
                            pRefresh={{ state: sRefreshCnt, set: setRefreshCnt }}
                        />
                    ) : null}
                </Pane>
            </SplitPane>
        </Page>
    );
};
