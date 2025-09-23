import moment from 'moment';
import SplitPane from 'split-pane-react/esm/SplitPane';
import { IconButton } from '@/components/buttons/IconButton';
import { LuFlipVertical } from 'react-icons/lu';
import { ExtensionTab } from '@/components/extension/ExtensionTab';
import { Pane, SashContent } from 'split-pane-react';
import { useEffect, useRef, useState, useMemo } from 'react';
import { fetchQuery } from '@/api/repository/database';
import { getColumnType as GetColumnType } from '@/utils/dashboardUtil';
import { TbEyeMinus, TbEyeOff } from 'react-icons/tb';
import { Refresh } from '@/assets/icons/Icon';
import { MetaTablePage } from './metaTablePage';
import { CheckIndexFlag, CheckTableFlag, COLUMN_HIDDEN_REGEX, E_TABLE_INFO, E_TABLE_TYPE, E_TABLE_TYPE_COLOR, FetchCommonType, GettColumnFlag } from './utils';

const BadgeSelectorItem = ({ item }: { item: { name: string; color: string } }) => {
    return (
        <div className="badge-selector-item" style={{ boxShadow: `inset 4px 0 0 0  ${item.color}` }}>
            <span style={{ fontSize: '12px' }}>{item.name}</span>
        </div>
    );
};

export const DBTablePage = ({ pCode, pIsActiveTab }: { pCode: any; pIsActiveTab: boolean }) => {
    const [sLastFetchTime, setLastFetchTime] = useState<string>('');
    const [isVertical, setIsVertical] = useState<boolean>(true);
    const [sRecordInfo, setRecordInfo] = useState<{ cnt: number; min: number; max: number }>({ cnt: 0, min: 0, max: 0 });
    const [sRefreshCnt, setRefreshCnt] = useState<number>(0);
    const [sGroupWidth, setGroupWidth] = useState<any[]>(['60%', '40%']);
    const [sIsHiddenCol, setIsHiddenCol] = useState<boolean>(true);
    const [sColumnInfo, setColumnInfo] = useState<FetchCommonType>();
    const [sTagIndexGap, setTagIndexGap] = useState<FetchCommonType>();
    const [sIndexInfo, setIndexInfo] = useState<FetchCommonType>();
    const [sRollupInfo, setRollupInfo] = useState<FetchCommonType>();
    const [sErrMsg, setErrMsg] = useState<{ key: 'ROLLUP' | undefined; value: string | undefined }>({ key: undefined, value: undefined });
    const [sRetentionInfo, setRetentionInfo] = useState<FetchCommonType>();
    const sBodyRef = useRef(null);

    const Resizer = () => <SashContent className={`security-key-sash-style`} />;

    // Memoization tableInfo
    const mTableInfo = useMemo(() => {
        return pCode?.code?.tableInfo;
    }, [pCode?.code?.tableInfo]);
    // Memoization column list
    const mColList = useMemo(() => {
        if (!sColumnInfo) return undefined;
        let sTmpColInfo = { ...sColumnInfo, rows: sColumnInfo.rows.filter((row: (string | number)[]) => !(row[sColumnInfo.columns.indexOf('DESC')] as string)?.includes('meta')) };

        if (!sIsHiddenCol) return sTmpColInfo;
        const sTmpRows = sTmpColInfo?.rows?.filter((row: (string | number)[]) => {
            if (COLUMN_HIDDEN_REGEX.test(row[sColumnInfo.columns.indexOf('NAME')] as string)) return false;
            return row;
        });
        return { ...sColumnInfo, rows: sTmpRows };
    }, [sColumnInfo, sIsHiddenCol]);
    // Memoization meta column list
    const mMetaColList = useMemo(() => {
        const sTmpRows = sColumnInfo?.rows?.filter((row: (string | number)[]) => {
            if ((row[sColumnInfo.columns.indexOf('DESC')] as string)?.includes('meta')) return row;
            return false;
        });
        return { ...sColumnInfo, rows: sTmpRows };
    }, [sColumnInfo]);

    const FetchRecordCount = async () => {
        let sSubCol = '';
        if (CheckTableFlag(mTableInfo[E_TABLE_INFO.TB_TYPE]) === E_TABLE_TYPE.TAG) sSubCol = `, MIN(${mColList?.rows?.[1]?.[0]}) as MIN, MAX(${mColList?.rows?.[1]?.[0]}) as MAX`;
        if (CheckTableFlag(mTableInfo[E_TABLE_INFO.TB_TYPE]) === E_TABLE_TYPE.LOG) sSubCol = ', MIN(_ARRIVAL_TIME) as MIN, MAX(_ARRIVAL_TIME) as MAX';
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
        const sQuery = `SELECT NAME, TYPE, LENGTH, FLAG as DESC FROM M$SYS_COLUMNS WHERE TABLE_ID=${mTableInfo[E_TABLE_INFO.TB_ID]} AND DATABASE_ID=${
            mTableInfo[E_TABLE_INFO.DB_ID]
        } ORDER BY ID`;
        const { svrState, svrData } = await fetchQuery(sQuery);
        if (svrState) {
            svrData.rows.map((row: (string | number)[]) => {
                const typeValue = row[svrData.columns.indexOf('TYPE')];
                if (typeValue === null || typeValue === undefined || Number.isNaN(typeValue as number)) return row;
                else return (row[svrData.columns.indexOf('TYPE')] = GetColumnType(typeValue as number));
            });
            svrData.rows.map((row: (string | number)[]) => {
                const descValue = row[svrData.columns.indexOf('DESC')];
                if (descValue === null || descValue === undefined || Number.isNaN(descValue as number)) return row;
                else return (row[svrData.columns.indexOf('DESC')] = GettColumnFlag(descValue as number));
            });
            setColumnInfo(svrData);
        } else setColumnInfo(undefined);
    };
    const FetchIndexGapForTag = async () => {
        const sQuery = `SELECT TABLE_ID AS 'TABLE', INDEX_STATE AS STATE, (TABLE_END_RID-MEMORY_INDEX_END_RID) AS MEMORY_GAP, (TABLE_END_RID-DISK_INDEX_END_RID) AS DISK_GAP FROM V$STORAGE_TAG_INDEX WHERE INDEX_ID = 4294967295 AND TABLE_ID IN (SELECT ID FROM m$SYS_TABLES WHERE NAME LIKE '_${
            mTableInfo[E_TABLE_INFO.TB_NM]
        }_DATA%' AND DATABASE_ID=${mTableInfo[E_TABLE_INFO.DB_ID]} AND USER_ID=(SELECT USER_ID FROM M$SYS_USERS WHERE NAME=upper('${
            mTableInfo[E_TABLE_INFO.USER_NM]
        }') limit 1)) ORDER BY TABLE_ID`;
        const { svrState, svrData } = await fetchQuery(sQuery);
        if (svrState) {
            svrData.rows.map((row: (string | number)[], idx: number) => {
                const tableValue = row[svrData.columns.indexOf('TABLE')];
                if (tableValue === null || tableValue === undefined || Number.isNaN(tableValue as number)) return row;
                else return (row[svrData.columns.indexOf('TABLE')] = `DATA${idx}`);
            });
            svrData.rows.map((row: (string | number)[]) => {
                const tableValue = row[svrData.columns.indexOf('MEMORY_GAP')];
                if (tableValue === null || tableValue === undefined || Number.isNaN(tableValue as number)) return row;
                else return (row[svrData.columns.indexOf('MEMORY_GAP')] = row[svrData.columns.indexOf('MEMORY_GAP')].toLocaleString() ?? '0');
            });
            svrData.rows.map((row: (string | number)[]) => {
                const tableValue = row[svrData.columns.indexOf('DISK_GAP')];
                if (tableValue === null || tableValue === undefined || Number.isNaN(tableValue as number)) return row;
                else return (row[svrData.columns.indexOf('DISK_GAP')] = row[svrData.columns.indexOf('DISK_GAP')].toLocaleString() ?? '0');
            });
            setTagIndexGap(svrData);
        } else setTagIndexGap(undefined);
    };
    const FetchIndex = async () => {
        // Default query for volatile
        let sQuery = `select i.name as 'NAME', i.type as TYPE, c.name as 'COLUMN', '' as 'DESC' from m$sys_index_columns c inner join m$sys_indexes i on c.database_id=i.database_id and c.table_id=i.table_id and c.index_id=i.id where c.database_id=${
            mTableInfo[E_TABLE_INFO.DB_ID]
        } and c.table_id=${mTableInfo[E_TABLE_INFO.TB_ID]}`;
        if (CheckTableFlag(mTableInfo[E_TABLE_INFO.TB_TYPE]) === E_TABLE_TYPE.TAG)
            sQuery = `SELECT sub.NAME, sub.TYPE, sub.COLUMN_NAME as 'COLUMN', SUM(vi.TABLE_END_RID - vi.MEMORY_INDEX_END_RID) AS MEMORY_GAP, SUM(vi.TABLE_END_RID - vi.DISK_INDEX_END_RID) AS DISK_GAP FROM (SELECT * from V$STORAGE_TAG_INDEX where index_id <> 4294967295) as vi INNER JOIN (SELECT i.name AS NAME, i.type AS TYPE, c.name AS COLUMN_NAME, i.id AS index_id, c.table_id FROM m$sys_index_columns c INNER JOIN m$sys_indexes i ON c.table_id = i.table_id AND c.index_id = i.id WHERE c.table_id=${
                mTableInfo[E_TABLE_INFO.TB_ID]
            }) as sub ON vi.INDEX_ID = sub.index_id group by sub.name, sub.TYPE, sub.COLUMN_NAME`;
        if (CheckTableFlag(mTableInfo[E_TABLE_INFO.TB_TYPE]) === E_TABLE_TYPE.LOG)
            sQuery = `
SELECT sub.NAME, sub.TYPE, sub.COLUMN_NAME as 'COLUMN', (vi.TABLE_END_RID - vi.END_RID) AS GAP FROM V$STORAGE_DC_TABLE_INDEXES vi INNER JOIN (SELECT i.name AS NAME, i.type AS TYPE, c.name AS COLUMN_NAME, i.id AS index_id, c.table_id FROM m$sys_index_columns c INNER JOIN m$sys_indexes i ON c.table_id = i.table_id AND c.index_id = i.id WHERE c.table_id=${
                mTableInfo[E_TABLE_INFO.TB_ID]
            }) sub ON vi.id = sub.index_id`;

        const { svrState, svrData } = await fetchQuery(sQuery);
        if (svrState) {
            svrData.rows.map((row: (string | number)[]) => {
                const typeValue = row[svrData.columns.indexOf('TYPE')];
                if (typeValue === null || typeValue === undefined || Number.isNaN(typeValue as number)) return row;
                else return (row[svrData.columns.indexOf('TYPE')] = CheckIndexFlag(typeValue as number));
            });
            svrData.rows.map((row: (string | number)[]) => {
                const tableValue = row[svrData.columns.indexOf('MEMORY_GAP')];
                if (tableValue === null || tableValue === undefined || Number.isNaN(tableValue as number)) return row;
                else return (row[svrData.columns.indexOf('MEMORY_GAP')] = row[svrData.columns.indexOf('MEMORY_GAP')].toLocaleString() ?? '0');
            });
            svrData.rows.map((row: (string | number)[]) => {
                const tableValue = row[svrData.columns.indexOf('DISK_GAP')];
                if (tableValue === null || tableValue === undefined || Number.isNaN(tableValue as number)) return row;
                else return (row[svrData.columns.indexOf('DISK_GAP')] = row[svrData.columns.indexOf('DISK_GAP')].toLocaleString() ?? '0');
            });
            setIndexInfo(svrData);
        } else setIndexInfo(undefined);
    };
    const FetchRollup = async () => {
        const sRollupVersion = localStorage.getItem('V$ROLLUP_VER');
        const sDatabaseIdCondition = sRollupVersion === 'OLD' ? '' : `v.database_id=${mTableInfo[E_TABLE_INFO.DB_ID]} and `;

        const sQuery = `select v.rollup_table as 'ROLLUP', v.COLUMN_NAME as 'COLUMN', v.interval_time as 'INTERVAL', v.ENABLED from v$rollup v, m$sys_users m where ${sDatabaseIdCondition}v.user_id=m.user_id and m.name=upper('${mTableInfo[E_TABLE_INFO.USER_NM]}') and root_table=upper('${
            mTableInfo[E_TABLE_INFO.TB_NM]
        }') group by root_table, column_name, enabled, interval_time, rollup_table order by interval_time asc`;

        const { svrState, svrData } = await fetchQuery(sQuery);
        if (svrState) {
            svrData.rows.map((row: (string | number)[]) => {
                const intervalValue = row[svrData.columns.indexOf('INTERVAL')];
                if (intervalValue === null || intervalValue === undefined || Number.isNaN(intervalValue as number)) return row;
                else return (row[svrData.columns.indexOf('INTERVAL')] = intervalValue + ' ms');
            });
            setRollupInfo(svrData);
        } else setRollupInfo(undefined);
    };
    const FetchRetention = async () => {
        const sQuery = `select j.POLICY_NAME as 'POLICY', r.'DURATION' as "DURATION", r.'INTERVAL' as "INTERVAL", j.STATE, j.LAST_DELETED_TIME from M$retention r, V$retention_job j where r.policy_name=j.policy_name and table_name=upper('${
            mTableInfo[E_TABLE_INFO.TB_NM]
        }') and user_name=upper('${mTableInfo[E_TABLE_INFO.USER_NM]}')`;
        const { svrState, svrData } = await fetchQuery(sQuery);
        if (svrState) {
            svrData.rows.map((row: (string | number)[]) => {
                const durationValue = row[svrData.columns.indexOf('DURATION')];
                if (durationValue === null || durationValue === undefined || Number.isNaN(durationValue as number)) return row;
                else return (row[svrData.columns.indexOf('DURATION')] = durationValue + ' ms');
            });
            svrData.rows.map((row: (string | number)[]) => {
                const intervalValue = row[svrData.columns.indexOf('INTERVAL')];
                if (intervalValue === null || intervalValue === undefined || Number.isNaN(intervalValue as number)) return row;
                else return (row[svrData.columns.indexOf('INTERVAL')] = intervalValue + ' ms');
            });
            svrData.rows.map((row: (string | number)[]) => {
                const lastDeletedTime = row[svrData.columns.indexOf('LAST_DELETED_TIME')];
                if (lastDeletedTime === null || lastDeletedTime === undefined || Number.isNaN(lastDeletedTime as number)) return row;
                else return (row[svrData.columns.indexOf('LAST_DELETED_TIME')] = moment((lastDeletedTime as number) / 1000000).format('YYYY-MM-DD HH:mm:ss'));
            });
            setRetentionInfo(svrData);
        } else setRetentionInfo(undefined);
    };
    const FetchRollupState = async (aRollupName: string, aCommand: string) => {
        const sQuery = `EXEC ${aCommand}(${aRollupName})`;
        const { svrState, svrReason } = await fetchQuery(sQuery);
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
    const handleRollupState = (e: any, item: (string | number)[]) => {
        e.stopPropagation();
        const sRollupName = item[sRollupInfo?.columns?.indexOf('ROLLUP') as number];
        const sCommand = item[sRollupInfo?.columns?.indexOf('ENABLED') as number] === 0 ? 'ROLLUP_START' : 'ROLLUP_STOP';
        FetchRollupState(sRollupName as string, sCommand as string);
    };
    const rollupStateElement = (item: (string | number)[]) => {
        if (item[sRollupInfo?.columns?.indexOf('ENABLED') as number] === 1) return <ExtensionTab.Switch pState={true} pCallback={(e) => handleRollupState(e, item)} />;
        else return <ExtensionTab.Switch pState={false} pCallback={(e) => handleRollupState(e, item)} />;
    };

    useEffect(() => {
        if (sColumnInfo) FetchRecordCount();
    }, [sColumnInfo]);

    useEffect(() => {
        if (pIsActiveTab) {
            if (mTableInfo) {
                SetLastFetchTime();
                FetchColumn();
                FetchIndex();
                // Cond retention (MACHBASEDB)
                if (mTableInfo[E_TABLE_INFO.DB_ID] === -1) FetchRetention();
                else setRetentionInfo(undefined);
                // Cond rollup (MACHBASEDB + TAG)
                if (mTableInfo[E_TABLE_INFO.DB_ID] === -1 && CheckTableFlag(mTableInfo[E_TABLE_INFO.TB_TYPE]) === E_TABLE_TYPE.TAG) {
                    FetchRollup();
                    FetchIndexGapForTag();
                } else {
                    setRollupInfo(undefined);
                    setTagIndexGap(undefined);
                }
            } else {
                setRecordInfo({ cnt: 0, min: 0, max: 0 });
                setColumnInfo(undefined);
                setIndexInfo(undefined);
                setRollupInfo(undefined);
                setRetentionInfo(undefined);
                setTagIndexGap(undefined);
            }
        }
    }, [mTableInfo, sRefreshCnt, pIsActiveTab]);

    // Init screen size
    useEffect(() => {
        if (sBodyRef?.current && (sBodyRef.current as HTMLDivElement)?.offsetWidth) {
            const width = (sBodyRef.current as HTMLDivElement).offsetWidth;
            setGroupWidth([width * 0.6, width * 0.4]);
        }
    }, []);

    return (
        <ExtensionTab pRef={sBodyRef}>
            <SplitPane sashRender={() => Resizer()} split={isVertical ? 'vertical' : 'horizontal'} sizes={sGroupWidth} onChange={setGroupWidth}>
                <Pane minSize={500}>
                    <ExtensionTab.Header />
                    <ExtensionTab.Body fixed>
                        <ExtensionTab.ContentBlock pHoverNone>
                            <ExtensionTab.DpRowBetween>
                                <div style={{ gap: '8px', display: 'flex', flexDirection: 'row', alignItems: 'center', textWrap: 'nowrap' }}>
                                    <ExtensionTab.SubTitle>Table</ExtensionTab.SubTitle>
                                    <BadgeSelectorItem
                                        item={{
                                            name: CheckTableFlag(mTableInfo[E_TABLE_INFO.TB_TYPE]),
                                            color: E_TABLE_TYPE_COLOR[CheckTableFlag(mTableInfo[E_TABLE_INFO.TB_TYPE]) as keyof typeof E_TABLE_TYPE_COLOR],
                                        }}
                                    />
                                    <ExtensionTab.ContentTitle>{`${mTableInfo[E_TABLE_INFO.TB_NM]}`}</ExtensionTab.ContentTitle>
                                    <ExtensionTab.ContentDesc>{`(${mTableInfo[E_TABLE_INFO.DB_NM]}.${mTableInfo[E_TABLE_INFO.USER_NM]})`}</ExtensionTab.ContentDesc>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end' }}>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <ExtensionTab.ContentDesc>Record: {sRecordInfo?.cnt?.toLocaleString() ?? '0'}</ExtensionTab.ContentDesc>
                                        <IconButton
                                            pWidth={20}
                                            pHeight={20}
                                            pIsToopTip
                                            pToolTipId="db-exp-table-refresh-time"
                                            pToolTipContent={`last fetch: ${sLastFetchTime}`}
                                            pIcon={<Refresh size={13} />}
                                            onClick={() => setRefreshCnt(sRefreshCnt + 1)}
                                        />
                                    </div>
                                    {CheckTableFlag(mTableInfo[E_TABLE_INFO.TB_TYPE]) === E_TABLE_TYPE.TAG ||
                                    CheckTableFlag(mTableInfo[E_TABLE_INFO.TB_TYPE]) === E_TABLE_TYPE.LOG ? (
                                        <ExtensionTab.DpRowBetween>
                                            <div />
                                            <div style={{ textWrap: 'nowrap' }}>
                                                <ExtensionTab.ContentDesc>
                                                    {sRecordInfo?.min > 0 ? moment((sRecordInfo?.min as number) / 1000000).format('YYYY-MM-DD HH:mm:ss') : 'N/A'}
                                                    {' ~ '}
                                                    {sRecordInfo?.max > 0 ? moment((sRecordInfo?.max as number) / 1000000).format('YYYY-MM-DD HH:mm:ss') : 'N/A'}
                                                </ExtensionTab.ContentDesc>
                                            </div>
                                        </ExtensionTab.DpRowBetween>
                                    ) : null}
                                </div>
                            </ExtensionTab.DpRowBetween>
                        </ExtensionTab.ContentBlock>
                        <ExtensionTab.Hr />
                    </ExtensionTab.Body>
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'auto', flex: 1, height: 'calc(100% - 130px)' }}>
                        {/* COLUMN */}
                        {mColList?.rows && mColList?.rows?.length > 0 && (
                            <ExtensionTab.ContentBlock>
                                <ExtensionTab.DpRowBetween>
                                    <ExtensionTab.ContentTitle>Column</ExtensionTab.ContentTitle>
                                    <IconButton
                                        pWidth={20}
                                        pHeight={20}
                                        pIcon={sIsHiddenCol ? <TbEyeMinus size={15} /> : <TbEyeOff size={15} />}
                                        onClick={() => {
                                            setIsHiddenCol(!sIsHiddenCol);
                                        }}
                                    />
                                </ExtensionTab.DpRowBetween>
                                <ExtensionTab.Table pList={{ columns: mColList?.columns, rows: mColList.rows }} />
                            </ExtensionTab.ContentBlock>
                        )}
                        {/* COLUMN (META) */}
                        {mMetaColList?.rows && mMetaColList?.rows?.length > 0 && (
                            <ExtensionTab.ContentBlock>
                                <ExtensionTab.DpRow>
                                    <ExtensionTab.ContentTitle>Meta Column</ExtensionTab.ContentTitle>
                                </ExtensionTab.DpRow>
                                <ExtensionTab.Table pList={{ columns: mMetaColList?.columns, rows: mMetaColList.rows }} />
                            </ExtensionTab.ContentBlock>
                        )}
                        {/* Tag index gap */}
                        {sTagIndexGap?.rows && sTagIndexGap?.rows?.length > 0 && (
                            <ExtensionTab.ContentBlock>
                                <ExtensionTab.DpRow>
                                    <ExtensionTab.ContentTitle>tag index gap</ExtensionTab.ContentTitle>
                                </ExtensionTab.DpRow>
                                <ExtensionTab.Table pList={{ columns: sTagIndexGap?.columns, rows: sTagIndexGap.rows }} />
                            </ExtensionTab.ContentBlock>
                        )}
                        {/* INDEX */}
                        {sIndexInfo?.rows && sIndexInfo?.rows?.length > 0 && (
                            <ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentTitle>Index</ExtensionTab.ContentTitle>
                                <ExtensionTab.Table pList={{ columns: sIndexInfo?.columns, rows: sIndexInfo.rows }} />
                            </ExtensionTab.ContentBlock>
                        )}
                        {/* ROLLUP */}
                        {sRollupInfo?.rows && sRollupInfo?.rows?.length > 0 && (
                            <ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentTitle>Rollup</ExtensionTab.ContentTitle>
                                <ExtensionTab.Table pList={{ columns: sRollupInfo?.columns, rows: sRollupInfo.rows }} replaceCell={{ key: 'ENABLED', value: rollupStateElement }} />
                                {sErrMsg?.key === 'ROLLUP' ? <ExtensionTab.TextResErr pText={sErrMsg?.value ?? ''} /> : null}
                            </ExtensionTab.ContentBlock>
                        )}
                        {/* RETENTION */}
                        {sRetentionInfo?.rows && sRetentionInfo?.rows?.length > 0 && (
                            <ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentTitle>Retention</ExtensionTab.ContentTitle>
                                <ExtensionTab.Table pList={{ columns: sRetentionInfo?.columns, rows: sRetentionInfo.rows }} />
                            </ExtensionTab.ContentBlock>
                        )}
                    </div>
                </Pane>
                <Pane minSize={500}>
                    <ExtensionTab.Header>
                        <div />
                        <ExtensionTab.DpRow>
                            <IconButton
                                pIsToopTip
                                pToolTipContent="Vertical"
                                pToolTipId="app-store-tab-hori"
                                pIcon={<LuFlipVertical style={{ transform: 'rotate(90deg)' }} />}
                                pIsActive={isVertical}
                                onClick={() => setIsVertical(true)}
                            />
                            <IconButton
                                pIsToopTip
                                pToolTipContent="Horizontal"
                                pToolTipId="app-store-tab-ver"
                                pIcon={<LuFlipVertical />}
                                pIsActive={!isVertical}
                                onClick={() => setIsVertical(false)}
                            />
                        </ExtensionTab.DpRow>
                    </ExtensionTab.Header>
                    {mColList ? (
                        <MetaTablePage pIsActiveTab={pIsActiveTab} pMTableInfo={mTableInfo} pMColInfo={mColList} pRefresh={{ state: sRefreshCnt, set: setRefreshCnt }} />
                    ) : null}
                </Pane>
            </SplitPane>
        </ExtensionTab>
    );
};
