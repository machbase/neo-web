import { ExtensionTab } from '@/components/extension/ExtensionTab';
import { CheckTableFlag, DATA_NUMBER_TYPE, E_TABLE_INFO, E_TABLE_TYPE, FetchCommonType, GenTazDefault, STR_NUM_ARR_TYPE } from './utils';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchQuery, fetchTqlQuery } from '@/api/repository/database';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { useSetRecoilState } from 'recoil';
import useDebounce from '@/hooks/useDebounce';
import { Success as ToastSuccess } from '@/components/toast/Toast';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { BiInfoCircle } from 'react-icons/bi';
import { StatzTableModal } from './statzTableModal';

type META_MOD_TYPE = 'INSERT' | 'UPDATE' | 'DELETE';
const IGNORE_COL_LIST = ['_ID'];
const REQUIRE_COL_LIST = ['NAME'];

export const MetaTablePage = ({
    pIsActiveTab,
    pMTableInfo,
    pRefresh,
}: {
    pIsActiveTab: boolean;
    pMTableInfo: any;
    pRefresh: { state: number; set: React.Dispatch<React.SetStateAction<number>> };
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

    const FetchMetaTable = useCallback(
        async (opt: { page: number; filter: string }) => {
            if (sIsLoading) return; // Prevent multiple simultaneous requests
            setIsLoading(true);
            const currentPage = opt?.page !== undefined ? opt?.page : sPage;
            const currentFilter = opt?.filter !== undefined ? opt.filter : sFilter;
            const sTargetTable = `${mTableInfo[E_TABLE_INFO.DB_NM]}.${mTableInfo[E_TABLE_INFO.USER_NM]}._${mTableInfo[E_TABLE_INFO.TB_NM]}_META WHERE NAME LIKE '%${
                currentFilter ? currentFilter + '%' : ''
            }'`;
            const sQuery = `select * from ${sTargetTable} order by _id asc`;
            const { svrState, svrData } = await fetchTqlQuery(sQuery, currentPage);

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
        [mTableInfo]
    );
    const FetchMetaTableCnt = useCallback(
        async (filter: string) => {
            const currentFilter = filter !== undefined ? filter : sFilter;
            const sTargetTable = `${mTableInfo[E_TABLE_INFO.DB_NM]}.${mTableInfo[E_TABLE_INFO.USER_NM]}._${mTableInfo[E_TABLE_INFO.TB_NM]}_META WHERE NAME LIKE '%${
                currentFilter ? currentFilter + '%' : ''
            }'`;
            const sQuery = `select count(*) from ${sTargetTable}`;
            const { svrState, svrData } = await fetchQuery(sQuery);
            if (svrState) setMetaTableCnt(svrData?.rows?.[0]?.[0] ?? 0);
            else setMetaTableCnt(0);
        },
        [mTableInfo]
    );
    const FetchTagMinMax = async (aTagNm: string) => {
        const sQuery = `select min(time) as 'MIN', max(time) as 'MAX' from ${mTableInfo[E_TABLE_INFO.DB_NM]}.${mTableInfo[E_TABLE_INFO.USER_NM]}.${
            mTableInfo[E_TABLE_INFO.TB_NM]
        } where NAME in ('${aTagNm}')`;
        const { svrData } = await fetchQuery(sQuery);
        const sTazBoard = GenTazDefault({
            aTag: aTagNm,
            aTime: { min: Math.floor(svrData?.rows?.[0]?.[0] / 1000000), max: Math.floor(svrData?.rows?.[0]?.[1] / 1000000) },
            aTableInfo: mTableInfo,
        });

        setBoardList((aPrev: any) => {
            return [...aPrev, sTazBoard];
        });
        setSelectedTab(sTazBoard.id);
    };

    const convertTagMetaForInsert = (aValues: STR_NUM_ARR_TYPE) => {
        let sResultList = mMetaColumnListWithoutID?.map((colNm: string, idx: number) => {
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
        let sResultList = mMetaColumnListWithoutID?.map((colNm: string, idx: number) => {
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
            sQuery = `UPDATE ${mTableInfo[E_TABLE_INFO.DB_NM]}.${mTableInfo[E_TABLE_INFO.USER_NM]}.${
                mTableInfo[E_TABLE_INFO.TB_NM]
            } METADATA SET ${sConvertedStr} WHERE NAME='${aTagNm}'`;
        }
        if (aCommand === 'DELETE') {
            // Close modal
            setIsOpenConfirm(false);
            sQuery = `DELETE FROM ${mTableInfo[E_TABLE_INFO.DB_NM]}.${mTableInfo[E_TABLE_INFO.USER_NM]}.${mTableInfo[E_TABLE_INFO.TB_NM]} METADATA WHERE NAME='${aTagNm}'`;
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
                        rows: prevInfo?.rows?.filter((row: STR_NUM_ARR_TYPE) => row?.[sMetaTableInfo?.columns?.indexOf('NAME') as number] !== aTagNm),
                    };
                });
            if (aCommand === 'UPDATE')
                setMetaTableInfo((prevInfo: any) => {
                    return {
                        ...prevInfo,
                        rows: prevInfo?.rows?.map((row: STR_NUM_ARR_TYPE) => {
                            if (row?.[sMetaTableInfo?.columns?.indexOf('NAME') as number] === aTagNm)
                                return [row?.[sMetaTableInfo?.columns?.indexOf('_ID') as number]]?.concat(aValues as STR_NUM_ARR_TYPE);
                            else return row;
                        }),
                    };
                });

            if (aCommand === 'INSERT' || aCommand === 'DELETE') {
                ToastSuccess(svrReason);
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
            ModMeta('UPDATE', aUpdateInfo.modBeforeInfo.row[mMetaColumnList?.indexOf('NAME') as number], rowWithoutId);
        },
        [mMetaColumnList]
    );
    const handleInsertMeta = () => {
        ModMeta('INSERT', sModUpdateInfo.values[0] as string, sModUpdateInfo.values);
    };
    const handleDeleteMeta = useCallback(
        (aItem: any) => {
            setDelInfo(aItem?.[sMetaTableInfo?.columns?.indexOf('NAME') as number]);
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
        (item: STR_NUM_ARR_TYPE) => {
            FetchTagMinMax(item[1] as string);
        },
        [mTableInfo]
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
    }, [mTableInfo, pRefresh.state, pIsActiveTab]);

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
    const allowedV$ = (): boolean => {
        if (mTableInfo[E_TABLE_INFO.DB_ID] === -1) return true;
        else return false;
    };

    useDebounce([sFilter], debouncedFilterSearch, 1000, sSearchIIFE?.current ?? false);

    return (
        <div
            key={mTableInfo[E_TABLE_INFO.DB_NM] + mTableInfo[E_TABLE_INFO.USER_NM] + mTableInfo[E_TABLE_INFO.TB_NM]}
            style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 40px)' }}
        >
            {CheckTableFlag(mTableInfo[E_TABLE_INFO.TB_TYPE]) === E_TABLE_TYPE.TAG ? (
                <>
                    <ExtensionTab.Body fixed>
                        <ExtensionTab.ContentBlock pHoverNone>
                            <ExtensionTab.SubTitle>Meta table</ExtensionTab.SubTitle>
                        </ExtensionTab.ContentBlock>
                        {sModUpdateInfo.isOpen ? (
                            <>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>Input of tag meta</ExtensionTab.ContentTitle>
                                </ExtensionTab.ContentBlock>
                                {mMetaColumnListWithoutID?.map((column: string, colIdx: number) => {
                                    return (
                                        <ExtensionTab.ContentBlock key={`meta-table-col-${colIdx?.toString()}`}>
                                            <ExtensionTab.DpRow>
                                                <ExtensionTab.ContentTitle>{column}</ExtensionTab.ContentTitle>
                                                <ExtensionTab.ContentDesc>
                                                    <span style={{ marginLeft: '4px', color: '#009688' }}>
                                                        ({sMetaTableInfo?.types?.[sMetaTableInfo?.columns?.indexOf(column)]})
                                                    </span>
                                                </ExtensionTab.ContentDesc>
                                                {REQUIRE_COL_LIST.includes(column?.toString()?.toUpperCase()) ? (
                                                    <ExtensionTab.ContentDesc>
                                                        <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                                    </ExtensionTab.ContentDesc>
                                                ) : null}
                                            </ExtensionTab.DpRow>
                                            <ExtensionTab.Input
                                                pValue={sModUpdateInfo?.values?.[colIdx] ?? ''}
                                                pWidth={'400px'}
                                                pCallback={(event: React.FormEvent<HTMLInputElement>) => handleMetaPayload(colIdx, event)}
                                            />
                                        </ExtensionTab.ContentBlock>
                                    );
                                })}
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.DpRow>
                                        <ExtensionTab.TextButton pIsDisable={!sModUpdateInfo?.values?.[0]} pText="SAVE" pType="CREATE" pCallback={handleInsertMeta} />
                                        <ExtensionTab.TextButton pText="CANCEL" pType="DELETE" pCallback={() => setModUpdateInfo({ isOpen: false, values: [], msg: undefined })} />
                                    </ExtensionTab.DpRow>
                                    {sModUpdateInfo?.msg ? <ExtensionTab.TextResErr pText={sModUpdateInfo?.msg} /> : null}
                                </ExtensionTab.ContentBlock>
                                <ExtensionTab.Hr />
                            </>
                        ) : null}
                        <ExtensionTab.ContentBlock pHoverNone>
                            <ExtensionTab.DpRowBetween>
                                <ExtensionTab.ContentDesc>count: {sMetaTableCnt?.toLocaleString() ?? 0}</ExtensionTab.ContentDesc>
                                {sModUpdateInfo.isOpen ? (
                                    <div />
                                ) : allowedV$() ? (
                                    <ExtensionTab.DpRow>
                                        <ExtensionTab.TextButton
                                            pText="Info"
                                            mr="8px"
                                            pType="STATUS"
                                            pIcon={<BiInfoCircle style={{ marginRight: '4px' }} />}
                                            pCallback={() => handleVirtualModal(sFilter, true)}
                                        />
                                        <ExtensionTab.TextButton pText="+ Insert" mr="0" pType="CREATE" pCallback={handleInsertBlock} />
                                    </ExtensionTab.DpRow>
                                ) : null}
                            </ExtensionTab.DpRowBetween>
                            <ExtensionTab.Input
                                pPlaceholder={'Search'}
                                pValue={sFilter}
                                pWidth={'100%'}
                                pCallback={(event: React.FormEvent<HTMLInputElement>) => handleSearchTxt(event)}
                                pEnter={handleFilterIIFESearch}
                            />
                            {!sModUpdateInfo.isOpen && sModUpdateInfo?.msg ? <ExtensionTab.TextResErr pText={sModUpdateInfo?.msg} /> : null}
                        </ExtensionTab.ContentBlock>
                    </ExtensionTab.Body>
                    {sMetaTableInfo && sMetaTableInfo?.rows && sMetaTableInfo?.rows?.length > 0 ? (
                        <ExtensionTab.ScrollTable
                            pList={mMetaTableInfo}
                            pReadOnly={!allowedV$()}
                            actionCallback={handleMoveTaz}
                            deleteCallback={handleDeleteMeta}
                            eocCallback={handleEndOfContent}
                            saveCallback={handleUpdateMeta}
                            v$Callback={allowedV$() ? (i) => handleVirtualModal(i, false) : undefined}
                            hasMoreData={sHasMoreData}
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
            ) : null}
            {sVirtualModal?.state ? <StatzTableModal pModalInfo={sVirtualModal} pSetModalInfo={setVirtualModal} /> : null}
        </div>
    );
};
