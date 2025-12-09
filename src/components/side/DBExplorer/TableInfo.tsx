import './TableInfo.scss';
import { getTableInfo, getColumnIndexInfo, getRecordCount, unMountDB, mountDB, backupStatus } from '@/api/repository/api';
import React, { useEffect, useRef, useState } from 'react';
import { FaDatabase, TfiLayoutColumn3Alt, VscChevronRight, FaUser, VscWarning, VscChevronDown, Copy } from '@/assets/icons/Icon';
import { generateUUID, getUserName, isCurUserEqualAdmin } from '@/utils';
import { IconButton } from '@/components/buttons/IconButton';
import { TbDatabaseMinus, TbDatabasePlus, TbFileDatabase } from 'react-icons/tb';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { Loader } from '@/components/loader';
import { Error } from '@/components/toast/Toast';
import { IsKeyword, MountNameRegEx } from '@/utils/database';
import { LuDatabaseBackup } from 'react-icons/lu';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { TableTypeOrderList } from './utils';
import { getColumnType } from '@/utils/dashboardUtil';
import { ClipboardCopy } from '@/utils/ClipboardCopy';
import { FaCheck } from 'react-icons/fa';
import { Tooltip } from 'react-tooltip';
import { Virtuoso } from 'react-virtuoso';

const TAB_TYPE = 'DBTable';

export const BackupTableInfo = ({ pValue, pRefresh, pBackupRefresh }: any) => {
    const [sBkCollapseTree, setBkCollapseTree] = useState(true);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const setSelectedTab = useSetRecoilState<any>(gSelectedTab);

    const handleBackup = async (e: React.MouseEvent) => {
        e.stopPropagation();

        const sResBackupStatus: any = await backupStatus();
        let sStatusCode: any = undefined;
        if (sResBackupStatus && sResBackupStatus?.success) {
            // Set default
            if (!sResBackupStatus.data?.type)
                sStatusCode = {
                    type: 'database',
                    duration: {
                        type: 'full',
                        after: '',
                        from: '',
                        to: '',
                    },
                    path: '',
                    tableName: '',
                };
            else sStatusCode = sResBackupStatus.data;
        } else
            sStatusCode = {
                type: 'database',
                duration: {
                    type: 'full',
                    after: '',
                    from: '',
                    to: '',
                },
                path: '',
                tableName: '',
            };

        if (sStatusCode.path === '') pBackupRefresh();

        const sExistKeyTab = sBoardList.reduce((prev: boolean, cur: any) => {
            return prev || cur.type === 'backupdb';
        }, false);

        if (sExistKeyTab) {
            const aTarget = sBoardList.find((aBoard: any) => aBoard.type === 'backupdb');
            setBoardList((aBoardList: any) => {
                return aBoardList.map((aBoard: any) => {
                    if (aBoard.id === aTarget.id) {
                        return {
                            ...aTarget,
                            name: `DATABASE: backup`,
                            code: sStatusCode,
                            savedCode: undefined,
                        };
                    }
                    return aBoard;
                });
            });
            setSelectedTab(aTarget.id);
            return;
        } else {
            const sId = generateUUID();
            setBoardList([
                ...sBoardList,
                {
                    id: sId,
                    type: 'backupdb',
                    name: `DATABASE: backup`,
                    code: sStatusCode,
                    savedCode: undefined,
                    path: '',
                },
            ]);
            setSelectedTab(sId);
            return;
        }
    };

    return (
        <div className="backup-database-wrapper">
            <div className="bk-wrap db-exp-comm" onClick={() => setBkCollapseTree(!sBkCollapseTree)}>
                <div className="backup-db-header">
                    <div className="bk-folder-wrap">
                        <div className="bk-folder-wrap-icon">
                            <VscChevronRight className={`${sBkCollapseTree ? 'db-exp-arrow db-exp-arrow-bottom' : 'db-exp-arrow'}`} />
                        </div>
                        <span className="bk-folder-wrap-name">BACKUPS</span>
                    </div>
                    <div className="backup-db-icon">
                        <IconButton
                            pIsToopTip
                            pToolTipContent="Database backup"
                            pToolTipId="db-backup"
                            pWidth={18}
                            pHeight={20}
                            pIcon={<LuDatabaseBackup size={12} />}
                            onClick={handleBackup}
                        />
                    </div>
                </div>
            </div>
            {sBkCollapseTree && (
                <div className="backup-wrap db-exp-comm">
                    {pValue.map((aBackup: any, aIdx: number) => {
                        return (
                            <div key={aBackup.path + '-backup' + aIdx}>
                                <BACKUP_DB_DIV backupInfo={aBackup} pUpdate={pRefresh} />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
const BACKUP_DB_DIV = ({ backupInfo, pUpdate }: { backupInfo: { path: string; isMount: boolean; mountName: string }; pUpdate: any }) => {
    const [isUnmount, setIsUnmount] = useState<boolean>(false);
    const [isMount, setIsMount] = useState<boolean>(false);
    const [sMountState, setMountState] = useState<string>('');
    const [sMountAlias, setMountAlias] = useState<string>(backupInfo.path?.toUpperCase());
    const sMountAliasRef = useRef<any>(undefined);

    const mountBackupDB = async () => {
        if (IsKeyword(sMountAliasRef?.current?.value)) return;
        setIsMount(false);
        setMountState('LOADING');
        const sResMount: any = await mountDB(sMountAlias, backupInfo.path);
        if (sResMount && sResMount?.success) pUpdate();
        else Error(sResMount?.data?.reason ?? sResMount.statusText);
        setMountState('');
    };
    const unmountDB = async () => {
        const sResUnmount: any = await unMountDB(backupInfo.mountName);
        if (sResUnmount && sResUnmount?.success) pUpdate();
        else Error(sResUnmount?.data?.reason ?? sResUnmount.statusText);
        setIsUnmount(false);
    };
    const handleUnmountModal = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsUnmount(true);
    };
    const handleMountModal = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMountAlias(() => backupInfo.path?.toUpperCase());
        setIsMount(true);
    };
    const handleMountName = (e: React.ChangeEvent<HTMLInputElement>) => {
        const start = e.target.selectionStart ?? 0;
        const end = e.target.selectionEnd ?? 0;
        if (!MountNameRegEx.test(e.target.value) && e.target.value !== '') return sMountAliasRef.current.setSelectionRange(start - 1, end - 1);
        sMountAliasRef.current.setSelectionRange(start, end);
        setMountAlias(() => e.target.value?.toUpperCase());
    };

    return (
        <>
            <div className="backup-item">
                <div className="backup-item-l">
                    <TbFileDatabase className="size-16" color={backupInfo.isMount ? 'rgb(196,196,196)' : '#939498'} />
                    <span className="backup-item-path" style={{ color: backupInfo.isMount ? 'rgb(196,196,196)' : '#939498' }}>
                        {backupInfo?.path}
                    </span>
                </div>
                <div className="backup-item-r">
                    {sMountState !== 'LOADING' ? (
                        <IconButton
                            pIsToopTip
                            pToolTipContent={backupInfo.isMount ? 'Database unmount' : 'Database mount'}
                            pToolTipId={'db-mount-unmount' + backupInfo.path}
                            pWidth={20}
                            pHeight={20}
                            pIcon={backupInfo.isMount ? <TbDatabaseMinus size={13} /> : <TbDatabasePlus size={13} />}
                            onClick={backupInfo.isMount ? handleUnmountModal : handleMountModal}
                        />
                    ) : (
                        <div style={{ marginRight: '4px' }}>
                            <Loader width="12px" height="12px" borderRadius="90%" />
                        </div>
                    )}
                </div>
            </div>
            {/* DELETE CONFIRM MODAL */}
            {isUnmount && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={setIsUnmount}
                    pCallback={unmountDB}
                    pContents={
                        <div className="body-content">
                            <span>{`Do you want to unmount this database (${backupInfo.path} = ${backupInfo.mountName ?? ''})?`}</span>
                        </div>
                    }
                />
            )}
            {/* MOUNT CONFIRM MODAL */}
            {isMount && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={setIsMount}
                    pCallback={mountBackupDB}
                    pContents={
                        <div className="body-content">
                            <span>{`Do you want to mount this database?`}</span>
                            <div className="comfirm-input-wrap">
                                <label htmlFor="mount-db-name">Name</label>
                                <input
                                    ref={sMountAliasRef}
                                    value={sMountAliasRef?.current?.value ?? sMountAlias}
                                    onChange={handleMountName}
                                    autoComplete="off"
                                    id="mount-db-name"
                                    autoFocus
                                    type="text"
                                />
                            </div>
                            {IsKeyword(sMountAliasRef?.current?.value) && (
                                <div className="mount-res-err" style={{ display: 'flex', marginTop: '8px' }}>
                                    <VscWarning color="rgb(255, 83, 83)" />
                                    <span style={{ color: 'rgb(255, 83, 83)', fontSize: '14px', marginLeft: '4px' }}>Mount name cannot be a keyword.</span>
                                </div>
                            )}
                        </div>
                    }
                />
            )}
        </>
    );
};
const DBDiv = (aIcon: React.ReactElement, aName: string, aClassName: string): JSX.Element => {
    return (
        <div className="db-folder-wrap">
            <VscChevronRight className={`${aClassName}`} />
            <span className="icons">{aIcon}</span>
            <span className="db-folder-wrap-name">{aName}</span>
        </div>
    );
};
export const TableInfo = ({ pShowHiddenObj, pValue, pRefresh, pUpdate, pContextMenu }: any) => {
    const setSelectedTab = useSetRecoilState<any>(gSelectedTab);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sCollapseTree, setCollapseTree] = useState(true);
    const [isUnmount, setIsUnmount] = useState<boolean>(false);

    const handleDBTablePage = (aCurLoginUserNm: string, aTableInfo: (number | string)[]) => {
        const sExistKeyTab = sBoardList.reduce((prev: boolean, cur: any) => {
            return prev || cur.type === TAB_TYPE;
        }, false);

        let sApplyTabID = generateUUID();

        if (sExistKeyTab) {
            const aTarget = sBoardList.find((aBoard: any) => aBoard.type === TAB_TYPE);
            sApplyTabID = aTarget.id;
            setBoardList((aBoardList: any) => {
                return aBoardList.map((aBoard: any) => {
                    if (aBoard.id === aTarget.id) {
                        return {
                            ...aTarget,
                            name: `TABLE: ${aTableInfo[3]}`,
                            code: { curUserNm: aCurLoginUserNm, tableInfo: aTableInfo },
                            savedCode: false,
                        };
                    }
                    return aBoard;
                });
            });
        } else {
            setBoardList([
                ...sBoardList,
                {
                    id: sApplyTabID,
                    type: TAB_TYPE,
                    name: `TABLE: ${aTableInfo[3]}`,
                    code: { curUserNm: aCurLoginUserNm, tableInfo: aTableInfo },
                    savedCode: false,
                    path: '',
                },
            ]);
        }
        setSelectedTab(sApplyTabID);
    };

    const handleUnmountModal = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsUnmount(true);
    };
    const unmountDB = async () => {
        await unMountDB(pValue.dbName);
        pUpdate();
    };

    return (
        <>
            {/* DB */}
            {pValue && pValue.dbName && (
                <div className="db-wrap db-exp-comm" onClick={() => setCollapseTree(!sCollapseTree)}>
                    {DBDiv(<FaDatabase />, pValue.dbName, sCollapseTree ? 'db-exp-arrow db-exp-arrow-bottom' : 'db-exp-arrow')}
                    {isCurUserEqualAdmin() && pValue.dbName !== 'MACHBASEDB' && (
                        <div className="table-unmount">
                            <IconButton
                                pIsToopTip
                                pToolTipContent="Database unmount"
                                pToolTipId="db-unmount"
                                pWidth={20}
                                pHeight={20}
                                pIcon={<TbDatabaseMinus size={13} />}
                                onClick={handleUnmountModal}
                            />
                        </div>
                    )}
                </div>
            )}
            {/* DELETE CONFIRM MODAL */}
            {isUnmount && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={setIsUnmount}
                    pCallback={unmountDB}
                    pContents={
                        <div className="body-content">
                            <span>{`Do you want to unmount this database (${pValue?.dbName})?`}</span>
                        </div>
                    }
                />
            )}
            {/* USER */}
            {pValue && sCollapseTree && (
                <div className="user-wrap db-exp-comm">
                    {pValue.userList.map((aUser: { userName: string; total: number; tableList: any }) => {
                        return (
                            <UserDiv
                                key={aUser.userName + '-user'}
                                pShowUserIcon={pValue.userList.length > 1}
                                pUserData={aUser}
                                pShowHiddenObj={pShowHiddenObj}
                                pRefresh={pRefresh}
                                pHandleDBTablePage={handleDBTablePage}
                                pContextMenu={pContextMenu}
                            />
                        );
                    })}
                </div>
            )}
        </>
    );
};

interface UserDivPropsType {
    pUserData: { userName: string; total: number; tableList: any };
    pShowHiddenObj: boolean;
    pShowUserIcon: boolean;
    pRefresh: number;
    pHandleDBTablePage: (aCurLoginUserNm: string, aTableInfo: (number | string)[]) => void;
    pContextMenu: (e: React.MouseEvent<HTMLDivElement, MouseEvent>, aTableInfo: (number | string)[], aUser: string, aPriv: string) => void;
}
const UserDiv = (props: UserDivPropsType): JSX.Element => {
    const [sCollapseTree, setCollapseTree] = useState(true);

    let sUserName = getUserName();
    if (sUserName) sUserName = sUserName?.toUpperCase();

    const checkDisplay = (aValue: number): boolean => {
        if (aValue === 0) return true;
        if (!props.pShowHiddenObj) return true;
        return false;
    };
    const UserColumn = (aIcon: React.ReactElement, aName: string, aClassName: string): JSX.Element => {
        return (
            <div className="user-folder-wrap">
                <VscChevronRight className={`${aClassName}`} />
                <span className="icons" style={{ color: '#c4c4c4' }}>
                    {aIcon}
                </span>
                <span className="user-folder-wrap-name">{aName}</span>
            </div>
        );
    };
    const getColor = (aTableType: string) => {
        switch (aTableType) {
            case 'tag':
                return 'rgb(92, 163, 220)';
            case 'keyValue':
                return 'rgb(92, 226, 220)';
            case 'log':
                return 'rgb(252, 121, 118)';
            case 'volatile':
                return 'rgb(255, 202, 40)';
            case 'fixed':
            case 'lookup':
                return '#ffdc72';
        }
    };

    return (
        <>
            {props.pUserData && props.pShowUserIcon && props.pUserData.total > 0 && (
                <div className="user-column " style={{ alignItems: 'baseline' }} onClick={() => setCollapseTree(!sCollapseTree)}>
                    {UserColumn(<FaUser />, props.pUserData.userName, sCollapseTree ? 'db-exp-arrow db-exp-arrow-bottom' : 'db-exp-arrow')}
                </div>
            )}
            {props.pUserData && props.pUserData.tableList && props.pUserData.total > 0 && sCollapseTree && (
                <div className="table-wrap db-exp-comm">
                    {TableTypeOrderList.map((aTableType: string, aIdx: number) => {
                        return (
                            <div key={`table-${aTableType}-${aIdx}`}>
                                {props.pUserData.tableList[aTableType].map((aTable: any, bIdx: number) => {
                                    return (
                                        <div className="table-wrap-content" key={`table-${aTableType}-${aIdx}-${bIdx}`} style={{ display: checkDisplay(aTable[5]) ? '' : 'none' }}>
                                            {sUserName && (
                                                <TableDiv
                                                    pId={aTable[1] + aIdx.toString() + '-' + bIdx.toString()}
                                                    pShowHiddenObj={props.pShowHiddenObj}
                                                    pUserName={sUserName}
                                                    pTableIcon={<TfiLayoutColumn3Alt style={{ color: getColor(aTableType), rotate: '90deg' }} />}
                                                    pTable={aTable}
                                                    pTableType={aTableType}
                                                    pTableFlag={aTable[5]}
                                                    pPriv={aTable[7] ?? ''}
                                                    pRefresh={props.pRefresh}
                                                    pHandleDBTablePage={props.pHandleDBTablePage}
                                                    pContextMenu={props.pContextMenu}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
};

interface TableDivPropsType {
    pId: string;
    pShowHiddenObj: boolean;
    pTableIcon: React.ReactElement;
    pTableType: string;
    pTableFlag: number;
    pPriv: string;
    pUserName: string;
    pTable: (string | number)[];
    pRefresh: number;
    pHandleDBTablePage: (aCurLoginUserNm: string, aTableInfo: (number | string)[]) => void;
    pContextMenu: (e: React.MouseEvent<HTMLDivElement, MouseEvent>, aTableInfo: (number | string)[], aUser: string, aPriv: string) => void;
}
const TableDiv = (props: TableDivPropsType): JSX.Element => {
    const [sIsOpen, setIsOpen] = useState<boolean>(false);
    const [sRecordCount, setRecordCount] = useState<number>(0);
    const sPriv = props?.pPriv && props.pPriv !== '' ? props.pPriv?.split('|')?.[1].trim() : '';

    const handleTableDetail = () => {
        props.pHandleDBTablePage(props.pUserName, props.pTable);
        setIsOpen(!sIsOpen);
    };

    const fetchRecordCount = async () => {
        const res: any = await getRecordCount(`${props.pTable[3].toString()}`, `${props.pTable[0] !== 'MACHBASEDB' ? props.pTable[0] + '.' : ''}${props.pTable[1].toString()}`);
        if (res.success && res.data && res.data.rows[0][0]) setRecordCount(res.data.rows[0][0]);
        else setRecordCount(0);
    };

    const handleContextMenu = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        props.pContextMenu(e, props.pTable, props.pUserName, props.pPriv);
    };

    useEffect(() => {
        if (props.pTableFlag == 0 || !props.pShowHiddenObj) fetchRecordCount();
    }, [props.pRefresh, props.pShowHiddenObj]);

    return (
        <>
            <div className="table-column-wrap" onClick={handleTableDetail} onContextMenu={handleContextMenu}>
                <div className="table-column-l">
                    <VscChevronDown className={`table-arrow ${sIsOpen ? 'table-arrow-open' : ''}`} />
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <IconButton
                            pWidth={'100%'}
                            pHeight={20}
                            pIsToopTip
                            pToolTipContent={props.pTableType + ' table ' + sPriv}
                            pToolTipId={props.pTableType + props.pUserName + '-block-math-' + props.pId}
                            pIcon={
                                <>
                                    <span className="icons">{props.pTableIcon}</span>
                                    <span className="table-name">
                                        {props.pTable[0] === 'MACHBASEDB' && props.pTable[1] === props.pUserName ? props.pTable[3] : `${props.pTable[1]}.${props.pTable[3]}`}
                                    </span>
                                </>
                            }
                            onClick={() => {}}
                        />
                    </div>
                </div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', justifyContent: 'end' }}>
                    <span className="r-txt">{sRecordCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                </div>
            </div>
            {sIsOpen && (
                <ColumnDiv pKey={props.pTable[0] as string} pShowHiddenObj={props.pShowHiddenObj} pDatabaseId={props.pTable[6].toString()} pTableId={props.pTable[2].toString()} />
            )}
        </>
    );
};

interface ColumnDivPropsType {
    pKey: string;
    pShowHiddenObj: boolean;
    pDatabaseId: string;
    pTableId: string;
}
const ColumnNameCopy = ({ columnName }: { columnName: string }) => {
    const [copied, setCopied] = useState(false);
    const tooltipId = `column-name-${columnName.replace(/[^a-zA-Z0-9]/g, '_')}`;

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (copied) return;
        setCopied(true);
        ClipboardCopy(columnName);
        setTimeout(() => {
            setCopied(false);
        }, 600);
    };
    return (
        <div className="column-name-copy-wrapper">
            <span className={`column-name-text tooltip-${tooltipId}`}>{columnName}</span>
            <Tooltip place="top" positionStrategy="fixed" anchorSelect={`.tooltip-${tooltipId}`} content={columnName} delayShow={700} style={{ zIndex: 9999 }} />
            <div className="column-name-copy-icon" onClick={handleCopy}>
                {copied ? <FaCheck /> : <Copy />}
            </div>
        </div>
    );
};

const ColumnSkeleton = ({ count = 5 }: { count?: number }) => {
    return (
        <div className="column-skeleton-wrapper">
            {Array.from({ length: count }).map((_, index) => (
                <div className="table-column-content" key={`skeleton-${index}`}>
                    <span style={{ marginRight: '4px', opacity: '0.5' }}>{index >= count - 1 ? '└─' : '├─'}</span>
                    <div className="table-column-content-row">
                        <div className="skeleton skeleton-text" style={{ width: '60%' }}></div>
                        <div className="skeleton skeleton-text" style={{ width: '25%', marginRight: '16px' }}></div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const LabelSkeleton = () => {
    return (
        <div className="col-label-wrap">
            <div className="table-wrap-label-content" style={{ height: '21px' }}>
                <div className="skeleton skeleton-text" style={{ width: '12px', height: '12px', minWidth: '12px', marginRight: '4px' }}></div>
                <div className="skeleton skeleton-text" style={{ width: '70px', height: '14px' }}></div>
            </div>
        </div>
    );
};

const ColumnDiv = (props: ColumnDivPropsType): JSX.Element => {
    const [sColOpen, setColOpen] = useState<boolean>(false);
    const [sIndexOpen, setIndexOpen] = useState<boolean>(false);
    const [sColumnList, setColumnList] = useState<(string | number)[][]>([]);
    const [sIndexList, setIndexList] = useState<(string | number)[][]>([]);
    const [sColumnsLoading, setColumnsLoading] = useState<boolean>(false);
    const [sIndexLoading, setIndexLoading] = useState<boolean>(true);
    const [sIndexFetched, setIndexFetched] = useState<boolean>(false);

    const getIndexType = (aType: number): string => {
        switch (aType) {
            case 1:
                return 'BITMAP';
            case 2:
                return 'KEYWORD';
            case 3:
                return 'REDBLACK';
            case 6:
                return 'LSM';
            case 8:
                return 'REDBLACK';
            case 9:
                return 'KETWORD_LSM';
            case 11:
                return 'TAG';
            default:
                return '';
        }
    };

    const checkDisplay = (aColumn: string, aData?: (string | number)[]): boolean => {
        // if (!props.pShowHiddenObj) return true;
        switch (aColumn) {
            case 'column': {
                if (!aData) return false;
                if (aData[3].toString() === '65534') return false;
                if (aData[3].toString() === '0' && aData[0].toString() === '_ARRIVAL_TIME') return false;
                if (aData[3].toString() === '0' && aData[0].toString() === '_ROWID') return false;
                return true;
            }
            default:
                return true;
        }
    };

    const handleColumnsToggle = async () => {
        const newColOpen = !sColOpen;
        setColOpen(newColOpen);

        if (newColOpen) {
            setColumnsLoading(true);
            try {
                const res = await getTableInfo(props.pDatabaseId, props.pTableId);
                if (res.data && res.data.rows) {
                    setColumnList(res.data.rows);
                }
            } finally {
                setTimeout(() => {
                    setColumnsLoading(false);
                }, 350);
            }
        }
    };

    const handleIndexToggle = () => {
        setIndexOpen(!sIndexOpen);
    };

    useEffect(() => {
        const fetchIndexCheck = async () => {
            setIndexLoading(true);
            try {
                const res = await getColumnIndexInfo(props.pDatabaseId, props.pTableId);
                if (res.data && res.data.rows && res.data.rows.length > 0) {
                    setIndexList(res.data.rows);
                }
                setIndexFetched(true);
            } catch {
                setIndexFetched(true);
            } finally {
                setTimeout(() => {
                    setIndexLoading(false);
                }, 350);
            }
        };

        fetchIndexCheck();
    }, [props.pDatabaseId, props.pTableId]);

    // Filter columns and indexes
    const visibleColumns = sColumnList.filter((col) => checkDisplay('column', col));
    const visibleIndexes = sIndexList.filter(() => checkDisplay('index'));

    return (
        <div className="col-div-wrap">
            {sIndexLoading ? (
                <>
                    <LabelSkeleton />
                </>
            ) : (
                <>
                    {/* Columns Section */}
                    <div className="col-label-wrap" onClick={handleColumnsToggle}>
                        <LabelDiv pTxt="columns" pIsOpen={sColOpen} />
                    </div>
                    {sColOpen && (
                        <>
                            {sColumnsLoading ? (
                                <ColumnSkeleton count={3} />
                            ) : visibleColumns.length > 50 ? (
                                <Virtuoso
                                    style={{ height: '40vh' }}
                                    data={visibleColumns}
                                    itemContent={(index, bColumn) => {
                                        const isLast = index === visibleColumns.length - 1;
                                        return (
                                            <div className="table-column-content">
                                                <span style={{ marginRight: '4px', opacity: '0.5' }}>{isLast ? '└─' : '├─'}</span>
                                                <div className="table-column-content-row">
                                                    <div className="l-txt">
                                                        <ColumnNameCopy columnName={bColumn[0].toString()} />
                                                    </div>
                                                    <div className="r-txt">
                                                        {getColumnType(bColumn[1] as number) + ' '}
                                                        {bColumn[1] === 5 && `(${bColumn[2]})`}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }}
                                />
                            ) : (
                                <div className="col-list-wrapper">
                                    {visibleColumns.map((bColumn, index) => {
                                        const isLast = index === visibleColumns.length - 1;
                                        return (
                                            <div className="table-column-content" key={`${props.pKey}-col-${index}`}>
                                                <span style={{ marginRight: '4px', opacity: '0.5' }}>{isLast ? '└─' : '├─'}</span>
                                                <div className="table-column-content-row">
                                                    <div className="l-txt">
                                                        <ColumnNameCopy columnName={bColumn[0].toString()} />
                                                    </div>
                                                    <div className="r-txt">
                                                        {getColumnType(bColumn[1] as number) + ' '}
                                                        {bColumn[1] === 5 && `(${bColumn[2]})`}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {/* Index Section */}
                    {sIndexFetched && visibleIndexes.length > 0 && (
                        <>
                            <div className="col-label-wrap" onClick={handleIndexToggle}>
                                <LabelDiv pTxt="index" pIsOpen={sIndexOpen} />
                            </div>
                            {sIndexOpen && (
                                <>
                                    {visibleIndexes.length > 50 ? (
                                        <Virtuoso
                                            style={{ height: '40vh' }}
                                            data={visibleIndexes}
                                            itemContent={(index, aIndex) => {
                                                const isLast = index === visibleIndexes.length - 1;
                                                return (
                                                    <div className="table-column-content">
                                                        <span style={{ marginRight: '4px', opacity: '0.5' }}>{isLast ? '└─' : '├─'}</span>
                                                        <div className="table-column-content-row">
                                                            <div className="l-txt">
                                                                <ColumnNameCopy columnName={aIndex[1].toString()} />
                                                            </div>
                                                            <div className="r-txt">
                                                                <span>{getIndexType(aIndex[2] as number)}</span>
                                                                <span style={{ marginLeft: '3px' }}>({aIndex[0]})</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }}
                                        />
                                    ) : (
                                        <div className="col-list-wrapper">
                                            {visibleIndexes.map((aIndex, index) => {
                                                const isLast = index === visibleIndexes.length - 1;
                                                return (
                                                    <div className="table-column-content" key={`${props.pKey}-idx-${index}`}>
                                                        <span style={{ marginRight: '4px', opacity: '0.5' }}>{isLast ? '└─' : '├─'}</span>
                                                        <div className="table-column-content-row">
                                                            <div className="l-txt">
                                                                <ColumnNameCopy columnName={aIndex[1].toString()} />
                                                            </div>
                                                            <div className="r-txt">
                                                                <span>{getIndexType(aIndex[2] as number)}</span>
                                                                <span style={{ marginLeft: '3px' }}>({aIndex[0]})</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
};
interface LabelDivPropsType {
    pTxt: string;
    pIsOpen?: boolean;
}
const LabelDiv = (props: LabelDivPropsType): JSX.Element => {
    return (
        <div className="table-wrap-label-content">
            {props.pIsOpen !== undefined && <VscChevronDown className={`label-arrow ${props.pIsOpen ? 'label-arrow-open' : ''}`} />}
            <span>{props.pTxt}</span>
        </div>
    );
};
