import { Page, Toast, CommonTable } from '@/design-system/components';
import { isDatabaseWritable, normalizeDatabaseId } from '@/utils/currentDatabaseState';
import { isMountedTableName } from '@/utils/qualifiedTableName';
import { createTagAnalyzerBoardFromDatabaseSeries } from '@/components/tagAnalyzer/integration';
import { canOpenTagAnalyzerFromMetaColumns, createTagAnalyzerColumnsFromDbExplorer, getTagNameFromMetaRow } from './TagAnalyzerUtil';
import { buildQualifiedTableName, CheckTableFlag, DATA_NUMBER_TYPE, E_TABLE_INFO, E_TABLE_TYPE, FetchCommonType, STR_NUM_ARR_TYPE } from './utils';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchQuery, fetchTqlQuery } from '@/api/repository/database';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { useSetRecoilState } from 'recoil';
import { getUserName } from '@/utils';
import useDebounce from '@/hooks/useDebounce';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { BiInfoCircle } from 'react-icons/bi';
import { StatzTableModal } from './statzTableModal';
import { TagHierarchyPage } from '@/components/tagHierarchy/TagHierarchyPage';
import { HIERARCHY_RESERVED_NAME } from '@/api/repository/tagHierarchy';

type META_MOD_TYPE = 'INSERT' | 'UPDATE' | 'DELETE';
const IGNORE_COL_LIST = ['_ID'];
const REQUIRE_COL_LIST = ['NAME'];

export const MetaTablePage = ({
    pIsActiveTab,
    pMTableInfo,
    pRefresh,
    pMColInfo,
    pMMetaColInfo,
    pMetaView = 'table',
}: {
    pIsActiveTab: boolean;
    pMTableInfo: any;
    pRefresh: { state: number; set: React.Dispatch<React.SetStateAction<number>> };
    pMColInfo: any;
    pMMetaColInfo?: any;
    pMetaView?: 'table' | 'hierarchy';
}) => {
    const setBoardList = useSetRecoilState<any[]>(gBoardList);
    const setSelectedTab = useSetRecoilState<any>(gSelectedTab);
    const [sIsComponentLoad, setIsComponentLoad] = useState<boolean>(false);
    const [sFilter, setFilter] = useState<string>('');
    const [sPage, setPage] = useState<number>(0);
    const [sModUpdateInfo, setModUpdateInfo] = useState<{ isOpen: boolean; values: STR_NUM_ARR_TYPE; msg: string | undefined }>({ isOpen: false, values: [], msg: undefined });
    const [sMetaTableInfo, setMetaTableInfo] = useState<FetchCommonType>();
    const [sMetaTableCnt, setMetaTableCnt] = useState<number>(0);
    const [sIsLoading, setIsLoading] = useState<boolean>(false);
    const [sHasMoreData, setHasMoreData] = useState<boolean>(true);
    const [sIsOpenConfirm, setIsOpenConfirm] = useState<boolean>(false);
    const [sDelInfo, setDelInfo] = useState<string>('');
    const sSearchIIFE = useRef(false);
    // Bumped on every meta fetch. A response whose token no longer matches belongs to a
    // table/filter the user has already navigated away from, so its rows are discarded.
    const sMetaFetchSeq = useRef(0);
    const sMetaCntFetchSeq = useRef(0);
    const [sVirtualModal, setVirtualModal] = useState<{ state: boolean; filter: string; table: any; recordCnt: number }>({
        state: false,
        filter: '',
        table: undefined,
        recordCnt: 0,
    });

    const mMetaColumnListWithoutID = useMemo(() => {
        if (sMetaTableInfo && sMetaTableInfo?.columns && sMetaTableInfo?.columns?.length > 0)
            return sMetaTableInfo.columns.filter((column: string) => !IGNORE_COL_LIST?.includes(column?.toString()?.toUpperCase()));
        else return [];
    }, [sMetaTableInfo]);
    const mMetaColumnList = useMemo(() => {
        if (sMetaTableInfo && sMetaTableInfo?.columns && sMetaTableInfo?.columns?.length > 0) return sMetaTableInfo.columns;
        else return [];
    }, [sMetaTableInfo]);
    const mMetaTableInfo = useMemo(() => {
        return sMetaTableInfo;
    }, [sMetaTableInfo]);
    const mTableInfo = useMemo(() => {
        return pMTableInfo;
    }, [pMTableInfo]);
    const mJsonMetaColumns = useMemo(() => {
        if (!pMMetaColInfo?.rows) return [];

        return pMMetaColInfo.rows
            .map((row: STR_NUM_ARR_TYPE) => ({ name: String(row?.[0] ?? ''), type: row?.[1] }))
            .filter((column: { name: string; type: string | number }) => {
                const normalizedName = String(column.name ?? '').toUpperCase();
                const normalizedType = String(column.type ?? '').toLowerCase();
                return normalizedName !== '_ID' && normalizedName !== 'NAME' && (normalizedType === 'json' || normalizedType === '61');
            });
    }, [pMMetaColInfo]);
    const mSpecColumn = useMemo(() => {
        return pMMetaColInfo?.rows?.find((row: STR_NUM_ARR_TYPE) => String(row?.[0] ?? '').toUpperCase() === 'SPEC')?.[0];
    }, [pMMetaColInfo]);
    const mHasAssetMetaColumn = useMemo(() => {
        return Boolean(pMMetaColInfo?.rows?.some((row: STR_NUM_ARR_TYPE) => String(row?.[0] ?? '').toUpperCase() === 'ASSET'));
    }, [pMMetaColInfo]);
    const mLogicalTableName = useMemo(() => {
        return buildQualifiedTableName({
            dbName: String(mTableInfo[E_TABLE_INFO.DB_NM] ?? ''),
            userName: String(mTableInfo[E_TABLE_INFO.USER_NM] ?? ''),
            tableName: String(mTableInfo[E_TABLE_INFO.TB_NM] ?? ''),
            databaseId: normalizeDatabaseId(mTableInfo[E_TABLE_INFO.DB_ID] ?? -1),
            currentUserName: getUserName(),
        });
    }, [mTableInfo]);
    const sCanOpenTagAnalyzer = useMemo(() => canOpenTagAnalyzerFromMetaColumns(pMColInfo?.rows), [pMColInfo]);
    /**
     * May this table's metadata be written?
     *
     * Editing metadata issues INSERT/UPDATE/DELETE ... METADATA, so the question is whether the
     * database accepts writes — not whether it is the one this session is connected to. Another
     * *active* READ_WRITE database does accept them: `ModMeta` already names the table in full
     * (`database.owner.table`), and the engine parses all three statements in that form
     * (measured: a missing table answers ERR-2025, not the ERR-2010 a rejected name would give).
     *
     * A mounted backup carries only USAGE and a READ ONLY database rejects write DML outright,
     * which `isDatabaseWritable` reads off `V$DATABASES.KIND` / `ACCESS_MODE`.
     */
    const mCanEditMeta = useMemo(() => isDatabaseWritable(mTableInfo[E_TABLE_INFO.DB_ID]), [mTableInfo]);
    const mCanEditHierarchy = useMemo(
        () => CheckTableFlag(mTableInfo[E_TABLE_INFO.TB_TYPE]) === E_TABLE_TYPE.TAG && mCanEditMeta,
        [mTableInfo, mCanEditMeta]
    );

    const FetchMetaTable = useCallback(
        async (opt: { page: number; filter: string }) => {
            const sFetchSeq = ++sMetaFetchSeq.current;
            setIsLoading(true);
            const currentPage = opt?.page !== undefined ? opt?.page : sPage;
            const currentFilter = opt?.filter !== undefined ? opt.filter : sFilter;
            const sTargetTable = `${mTableInfo[E_TABLE_INFO.DB_NM]}.${mTableInfo[E_TABLE_INFO.USER_NM]}._${mTableInfo[E_TABLE_INFO.TB_NM]}_META WHERE ${
                pMColInfo?.rows?.[0]?.[0]
            } <> '${HIERARCHY_RESERVED_NAME}' AND ${pMColInfo?.rows?.[0]?.[0]} LIKE '%${currentFilter ? currentFilter + '%' : ''}'`;
            const sQuery = `select * from ${sTargetTable} order by _id asc`;
            const { svrState, svrData } = await fetchTqlQuery(sQuery, currentPage);

            // A newer fetch already took over; keep its rows and its loading state.
            if (sFetchSeq !== sMetaFetchSeq.current) return;

            if (svrState) {
                const newRows = svrData?.rows || [];
                const hasMoreData = newRows.length >= 50; // Check if we got 50 or more rows
                setMetaTableInfo((prevInfo) => ({
                    columns: svrData.columns,
                    types: svrData.types,
                    rows: currentPage === 0 ? newRows : (prevInfo?.rows || []).concat(newRows),
                }));
                setHasMoreData(hasMoreData);
            } else setMetaTableInfo(undefined);

            setIsLoading(false);
        },
        [mTableInfo, pMColInfo]
    );
    const FetchMetaTableCnt = useCallback(
        async (filter: string) => {
            const sFetchSeq = ++sMetaCntFetchSeq.current;
            const currentFilter = filter !== undefined ? filter : sFilter;
            const sTargetTable = `${mTableInfo[E_TABLE_INFO.DB_NM]}.${mTableInfo[E_TABLE_INFO.USER_NM]}._${mTableInfo[E_TABLE_INFO.TB_NM]}_META WHERE ${
                pMColInfo?.rows?.[0]?.[0]
            } <> '${HIERARCHY_RESERVED_NAME}' AND ${pMColInfo?.rows?.[0]?.[0]} LIKE '%${currentFilter ? currentFilter + '%' : ''}'`;
            const sQuery = `select count(*) from ${sTargetTable}`;
            const { svrState, svrData } = await fetchQuery(sQuery);

            // Same guard as FetchMetaTable: a late count must not overwrite a newer one.
            if (sFetchSeq !== sMetaCntFetchSeq.current) return;

            if (svrState) setMetaTableCnt(svrData?.rows?.[0]?.[0] ?? 0);
            else setMetaTableCnt(0);
        },
        [mTableInfo, pMColInfo]
    );
    const convertTagMetaForInsert = (aValues: STR_NUM_ARR_TYPE) => {
        const sResultList = mMetaColumnListWithoutID?.map((colNm: string, idx: number) => {
            if (DATA_NUMBER_TYPE.includes(sMetaTableInfo?.types?.[sMetaTableInfo?.columns?.indexOf(colNm) as number] as string)) {
                if (aValues[idx] === null || aValues[idx] === undefined || aValues[idx] === '') return 'null';
                else return aValues[idx];
            } else {
                if (aValues[idx] === null || aValues[idx] === undefined) return "''";
                else return `'${aValues[idx]}'`;
            }
        });
        return sResultList;
    };
    const convertTagMetaForUpdate = (aValues: STR_NUM_ARR_TYPE) => {
        const sResultList = mMetaColumnListWithoutID?.map((colNm: string, idx: number) => {
            if (DATA_NUMBER_TYPE.includes(sMetaTableInfo?.types?.[sMetaTableInfo?.columns?.indexOf(colNm) as number] as string)) {
                if (aValues[idx] === null || aValues[idx] === undefined || aValues[idx] === '') return `${colNm}=NULL`;
                else return `${colNm}=${Number(aValues[idx])}`;
            } else {
                if (aValues[idx] === null || aValues[idx] === undefined) return `${colNm}=''`;
                else return `${colNm}='${aValues[idx]}'`;
            }
        });
        return sResultList;
    };
    const removeIdFromRow = (aRow: STR_NUM_ARR_TYPE): STR_NUM_ARR_TYPE => {
        const idIndex = mMetaColumnList?.indexOf('_ID');
        if (idIndex === -1) return aRow;
        return aRow.filter((_, index) => index !== idIndex);
    };
    const ModMeta = async (aCommand: META_MOD_TYPE, aTagNm: string, aValues?: STR_NUM_ARR_TYPE) => {
        let sQuery = '';
        if (aCommand === 'INSERT') {
            sQuery = `INSERT INTO ${mTableInfo[E_TABLE_INFO.DB_NM]}.${mTableInfo[E_TABLE_INFO.USER_NM]}.${mTableInfo[E_TABLE_INFO.TB_NM]} METADATA VALUES(${convertTagMetaForInsert(
                aValues as STR_NUM_ARR_TYPE
            )})`;
        }
        if (aCommand === 'UPDATE') {
            const sConvertedStr = convertTagMetaForUpdate(aValues as STR_NUM_ARR_TYPE);
            sQuery = `UPDATE ${mTableInfo[E_TABLE_INFO.DB_NM]}.${mTableInfo[E_TABLE_INFO.USER_NM]}.${mTableInfo[E_TABLE_INFO.TB_NM]} METADATA SET ${sConvertedStr} WHERE ${
                pMColInfo?.rows?.[0]?.[0]
            }='${aTagNm}'`;
        }
        if (aCommand === 'DELETE') {
            // Close modal
            setIsOpenConfirm(false);
            sQuery = `DELETE FROM ${mTableInfo[E_TABLE_INFO.DB_NM]}.${mTableInfo[E_TABLE_INFO.USER_NM]}.${mTableInfo[E_TABLE_INFO.TB_NM]} METADATA WHERE ${
                pMColInfo?.rows?.[0]?.[0]
            }='${aTagNm}'`;
        }

        const { svrState, svrReason } = await fetchQuery(sQuery);
        if (svrState) {
            setPage(0);
            setModUpdateInfo({ isOpen: false, values: [], msg: undefined });
            if (aCommand === 'INSERT') FetchMetaTable({ page: 0, filter: sFilter });
            if (aCommand === 'DELETE')
                setMetaTableInfo((prevInfo: any) => {
                    return {
                        ...prevInfo,
                        rows: prevInfo?.rows?.filter((row: STR_NUM_ARR_TYPE) => row?.[sMetaTableInfo?.columns?.indexOf(pMColInfo?.rows?.[0]?.[0]) as number] !== aTagNm),
                    };
                });
            if (aCommand === 'UPDATE')
                setMetaTableInfo((prevInfo: any) => {
                    return {
                        ...prevInfo,
                        rows: prevInfo?.rows?.map((row: STR_NUM_ARR_TYPE) => {
                            if (row?.[sMetaTableInfo?.columns?.indexOf(pMColInfo?.rows?.[0]?.[0]) as number] === aTagNm)
                                return [row?.[sMetaTableInfo?.columns?.indexOf('_ID') as number]]?.concat(aValues as STR_NUM_ARR_TYPE);
                            else return row;
                        }),
                    };
                });

            if (aCommand === 'INSERT' || aCommand === 'DELETE') {
                Toast.success(svrReason);
                FetchMetaTableCnt(sFilter);
            }
        } else {
            setModUpdateInfo((preV) => {
                return { ...preV, msg: svrReason };
            });
            setTimeout(() => {
                setModUpdateInfo((preV) => {
                    return { ...preV, msg: undefined };
                });
            }, 5000);
        }
    };

    // aUpdateInfo: [_ID, NAME, VALUES....];
    const handleUpdateMeta = useCallback(
        (aUpdateInfo: any) => {
            const rowWithoutId = removeIdFromRow(aUpdateInfo.modAfterInfo.row);
            ModMeta('UPDATE', aUpdateInfo.modBeforeInfo.row[mMetaColumnList?.indexOf(pMColInfo?.rows?.[0]?.[0]) as number], rowWithoutId);
        },
        [mMetaColumnList]
    );
    const handleInsertMeta = () => {
        ModMeta('INSERT', sModUpdateInfo.values[0] as string, sModUpdateInfo.values);
    };
    const handleDeleteMeta = useCallback(
        (aItem: any) => {
            setDelInfo(aItem?.[sMetaTableInfo?.columns?.indexOf(pMColInfo?.rows?.[0]?.[0]) as number]);
            setIsOpenConfirm(true);
        },
        [sMetaTableInfo?.columns]
    );
    const handleMetaPayload = (aColIdx: number, e: React.FormEvent<HTMLInputElement>) => {
        const sNewValues = JSON.parse(JSON.stringify(sModUpdateInfo.values));
        sNewValues[aColIdx] = (e.target as HTMLInputElement).value;
        setModUpdateInfo((preV) => {
            return { ...preV, values: sNewValues };
        });
    };
    const handleInsertBlock = () => {
        setModUpdateInfo((prev) => {
            return { ...prev, isOpen: true, msg: undefined };
        });
    };
    const handleSearchTxt = (e: React.FormEvent<HTMLInputElement>) => {
        sSearchIIFE.current = false;
        setFilter((e.target as HTMLInputElement).value);
    };
    const handleMoveTaz = useCallback(
        async (item: STR_NUM_ARR_TYPE) => {
            if (!sCanOpenTagAnalyzer) return;

            const sSourceColumns = createTagAnalyzerColumnsFromDbExplorer(
                pMColInfo?.rows,
            );
            const sTagName: string = getTagNameFromMetaRow({
                row: item,
                metaColumns: sMetaTableInfo?.columns,
                sourceNameColumn: sSourceColumns.name,
                fallbackNameColumn: String(pMColInfo?.rows?.[0]?.[0] ?? ''),
            });

            if (!sTagName) {
                Toast.error('Cannot open Tag Analyzer because tag name is empty.');
                return;
            }

            try {
                const sTazBoard = await createTagAnalyzerBoardFromDatabaseSeries({
                    tag: sTagName,
                    table: mLogicalTableName,
                    sourceColumns: sSourceColumns,
                });
                setBoardList((aPrev: any) => [...aPrev, sTazBoard]);
                setSelectedTab(sTazBoard.id);
            } catch (error) {
                Toast.error(
                    error instanceof Error
                        ? error.message
                        : 'Failed to open Tag Analyzer.',
                );
            }
        },
        [
            mLogicalTableName,
            pMColInfo,
            sCanOpenTagAnalyzer,
            sMetaTableInfo?.columns,
            setBoardList,
            setSelectedTab,
        ]
    );

    const handleEndOfContent = useCallback(() => {
        if (sIsLoading || !sHasMoreData) return; // Prevent calls while loading or no more data
        setPage((prevPage) => {
            return prevPage + 1;
        });
    }, [sIsLoading, sHasMoreData, sPage]);

    const init = (shouldResetPage: boolean = true) => {
        if (shouldResetPage) {
            setPage(0);
            setFilter(() => '');
        }
        setModUpdateInfo({ isOpen: false, values: [], msg: undefined });
        setMetaTableInfo(undefined);
        setHasMoreData(() => false);
        FetchMetaTable({ page: 0, filter: '' }); // Explicitly pass page 0
        FetchMetaTableCnt('');
    };

    // Effect for initial load only
    useEffect(() => {
        if (pIsActiveTab) {
            if (CheckTableFlag(mTableInfo[E_TABLE_INFO.TB_TYPE]) === E_TABLE_TYPE.TAG) {
                const isFirstLoad = !sIsComponentLoad;
                init(!isFirstLoad);
            }
            if (!sIsComponentLoad) setIsComponentLoad(true);
        }
    }, [pIsActiveTab, pMColInfo, pRefresh.state]);

    // Effect for page changes (pagination) - only for page > 0
    useEffect(() => {
        if (sPage > 0 && CheckTableFlag(mTableInfo[E_TABLE_INFO.TB_TYPE]) === E_TABLE_TYPE.TAG && sIsComponentLoad && sMetaTableInfo) {
            FetchMetaTable({ page: sPage, filter: sFilter });
        }
    }, [sPage]);
    // Debounced effect for filter changes
    const debouncedFilterSearch = useCallback(() => {
        if (sIsComponentLoad && CheckTableFlag(mTableInfo[E_TABLE_INFO.TB_TYPE]) === E_TABLE_TYPE.TAG) {
            setPage(0);
            setMetaTableInfo(undefined);
            setHasMoreData(true); // Reset hasMoreData flag for new search
            FetchMetaTable({ page: 0, filter: sFilter }); // Explicitly pass page 0
            FetchMetaTableCnt(sFilter);
        }
    }, [sFilter]);

    const handleFilterIIFESearch = () => {
        sSearchIIFE.current = true;
        debouncedFilterSearch();
    };
    const handleVirtualModal = (aFilter: string, aFlag: boolean) => {
        if (!allowedV$()) return;
        setVirtualModal({ state: true, filter: aFilter, table: pMTableInfo, recordCnt: aFlag ? sMetaTableCnt : 1 });
    };
    /**
     * May the `V$<TABLE>_STAT` view behind the Info panel be read?
     *
     * The question is whether the database *has* the view, and only a mounted backup does not —
     * measured: `FACTORY_A.SYS.V$DEMO_TAG_STAT` answers 2 rows from a session connected to
     * MACHBASEDB, while `MOUNT_DDD.SYS.V$ATABLE_STAT` answers `ERR-2025 Table ... does not
     * exist`. The modal already names the view in full, so a second *active* database is
     * perfectly readable; testing "is this the database I am connected to" hid the Info button
     * from it for no reason, the same way that test once hid the DROP menu.
     *
     * `isMountedTableName` keys on the catalogue and falls back to the name when there is no
     * catalogue to ask, which is what a pre-v8.7 server — where mounts predate `V$DATABASES` —
     * needs. Keep this away from the edit controls, which ask a different question
     * (`mCanEditMeta`).
     */
    const allowedV$ = (): boolean => !isMountedTableName(mLogicalTableName);

    useDebounce([sFilter], debouncedFilterSearch, 1000, sSearchIIFE?.current ?? false);

    return (
        <div
            key={mTableInfo[E_TABLE_INFO.DB_NM] + mTableInfo[E_TABLE_INFO.USER_NM] + mTableInfo[E_TABLE_INFO.TB_NM]}
            style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 40px)' }}
        >
            {CheckTableFlag(mTableInfo[E_TABLE_INFO.TB_TYPE]) === E_TABLE_TYPE.TAG ? (
                pMetaView !== 'hierarchy' ? (
                    <>
                                <Page.Body fixed={!sModUpdateInfo.isOpen} fullHeight={sModUpdateInfo.isOpen}>
                                    <Page.ContentBlock pHoverNone>
                                        <Page.SubTitle>Meta Table</Page.SubTitle>
                                    </Page.ContentBlock>
                                    {sModUpdateInfo.isOpen ? (
                                        <>
                                            <Page.ContentBlock>
                                                <Page.ContentTitle>Input of tag meta</Page.ContentTitle>
                                            </Page.ContentBlock>
                                            {mMetaColumnListWithoutID?.map((column: string, colIdx: number) => {
                                                return (
                                                    <Page.ContentBlock key={`meta-table-col-${colIdx?.toString()}`}>
                                                        <Page.DpRow>
                                                            <Page.ContentTitle>{column}</Page.ContentTitle>
                                                            <Page.ContentDesc>
                                                                <span style={{ marginLeft: '4px', color: '#009688' }}>
                                                                    ({sMetaTableInfo?.types?.[sMetaTableInfo?.columns?.indexOf(column)]})
                                                                </span>
                                                            </Page.ContentDesc>
                                                            {REQUIRE_COL_LIST.includes(column?.toString()?.toUpperCase()) ? (
                                                                <Page.ContentDesc>
                                                                    <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                                                </Page.ContentDesc>
                                                            ) : null}
                                                        </Page.DpRow>
                                                        <Page.Input
                                                            pValue={sModUpdateInfo?.values?.[colIdx] ?? ''}
                                                            pWidth={'400px'}
                                                            pCallback={(event: React.FormEvent<HTMLInputElement>) => handleMetaPayload(colIdx, event)}
                                                        />
                                                    </Page.ContentBlock>
                                                );
                                            })}
                                            <Page.ContentBlock>
                                                <Page.DpRow>
                                                    <Page.TextButton pIsDisable={!sModUpdateInfo?.values?.[0]} pText="SAVE" pType="CREATE" pCallback={handleInsertMeta} />
                                                    <Page.TextButton pText="CANCEL" pType="DELETE" pCallback={() => setModUpdateInfo({ isOpen: false, values: [], msg: undefined })} />
                                                </Page.DpRow>
                                                {sModUpdateInfo?.msg ? <Page.TextResErr pText={sModUpdateInfo?.msg} /> : null}
                                            </Page.ContentBlock>
                                            <Page.Hr />
                                        </>
                                    ) : null}
                                    <Page.ContentBlock pHoverNone>
                                        <Page.DpRowBetween>
                                            <Page.ContentDesc>count: {sMetaTableCnt?.toLocaleString() ?? 0}</Page.ContentDesc>
                                            {sModUpdateInfo.isOpen ? (
                                                <div />
                                            ) : (
                                                // Two different questions, so two different gates: the Info panel reads a
                                                // V$ view that exists only for the connected database, while Insert writes
                                                // metadata and only needs the database to accept writes.
                                                <Page.DpRow>
                                                    {allowedV$() ? (
                                                        <Page.TextButton
                                                            pText="Info"
                                                            mr={mCanEditMeta ? '8px' : '0'}
                                                            pType="STATUS"
                                                            pIcon={<BiInfoCircle style={{ marginRight: '4px' }} />}
                                                            pCallback={() => handleVirtualModal(sFilter, true)}
                                                        />
                                                    ) : null}
                                                    {mCanEditMeta ? <Page.TextButton pText="+ Insert" mr="0" pType="CREATE" pCallback={handleInsertBlock} /> : null}
                                                </Page.DpRow>
                                            )}
                                        </Page.DpRowBetween>
                                        <Page.Input
                                            pPlaceholder={'Search'}
                                            pValue={sFilter}
                                            pWidth={'100%'}
                                            pCallback={(event: React.FormEvent<HTMLInputElement>) => handleSearchTxt(event)}
                                            pEnter={handleFilterIIFESearch}
                                        />
                                        {!sModUpdateInfo.isOpen && sModUpdateInfo?.msg ? <Page.TextResErr pText={sModUpdateInfo?.msg} /> : null}
                                    </Page.ContentBlock>
                                </Page.Body>
                                {!sModUpdateInfo.isOpen && sMetaTableInfo && sMetaTableInfo?.rows && sMetaTableInfo?.rows?.length > 0 ? (
                                    <CommonTable
                                        data={mMetaTableInfo!}
                                        // Inline edit, row delete and the V$ column all hang off `editable`, so this
                                        // is the write gate. The V$ column additionally needs `v$Callback` below,
                                        // which stays on the identity test.
                                        editable={mCanEditMeta}
                                        showRowNumber
                                        showCopyButton
                                        onRowAction={handleMoveTaz}
                                        hideRowAction={!sCanOpenTagAnalyzer}
                                        onRowDelete={mCanEditMeta ? handleDeleteMeta : undefined}
                                        infiniteScroll={{ onLoadMore: handleEndOfContent, hasMore: sHasMoreData }}
                                        onSave={handleUpdateMeta}
                                        scrollX={false}
                                        v$Callback={allowedV$() ? (i) => handleVirtualModal(i, false) : undefined}
                                    />
                                ) : null}
                                {sIsOpenConfirm ? (
                                    <ConfirmModal
                                        pIsDarkMode
                                        setIsOpen={setIsOpenConfirm}
                                        pCallback={() => ModMeta('DELETE', sDelInfo)}
                                        pContents={
                                            <div className="body-content">
                                                <span>{`Do you want to delete this meta (${sDelInfo ?? ''})?`}</span>
                                            </div>
                                        }
                                    />
                                ) : null}
                        </>
                    ) : (
                                <TagHierarchyPage
                                    active={pIsActiveTab && pMetaView === 'hierarchy'}
                                    tableName={mLogicalTableName}
                                    nameColumn={pMColInfo?.rows?.[0]?.[0] ?? 'NAME'}
                                    jsonColumns={mJsonMetaColumns}
                                    hasAssetColumn={mHasAssetMetaColumn}
                                    specColumn={mSpecColumn}
                                    canEdit={mCanEditHierarchy}
                                    onMetadataSchemaChange={() => pRefresh.set((prev) => prev + 1)}
                                />
                    )
                ) : null}
            {sVirtualModal?.state ? <StatzTableModal pModalInfo={sVirtualModal} pSetModalInfo={setVirtualModal} /> : null}
        </div>
    );
};
