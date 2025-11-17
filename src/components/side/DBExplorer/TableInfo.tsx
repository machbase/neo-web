import './TableInfo.scss';
import { getTableInfo, getColumnIndexInfo, getRecordCount, unMountDB, mountDB, backupStatus } from '@/api/repository/api';
import React, { useEffect, useRef, useState } from 'react';
import { FaDatabase, TfiLayoutColumn3Alt, VscChevronRight, FaUser, VscWarning } from '@/assets/icons/Icon';
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

    const getTableInfoData = async (aDatabaseId: string, aTableId: string) => {
        return await getTableInfo(aDatabaseId, aTableId);
    };
    const getColumnIndexInfoData = async (aDatabaseId: string, aTableId: string) => {
        return await getColumnIndexInfo(aDatabaseId, aTableId);
    };
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
                                                    onTableInfo={getTableInfoData}
                                                    onColumnInfo={getColumnIndexInfoData}
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
    onTableInfo: (aDatabaseId: string, aTableId: string) => any;
    onColumnInfo: (aDatabaseId: string, atableId: string) => any;
    pHandleDBTablePage: (aCurLoginUserNm: string, aTableInfo: (number | string)[]) => void;
    pContextMenu: (e: React.MouseEvent<HTMLDivElement, MouseEvent>, aTableInfo: (number | string)[], aUser: string, aPriv: string) => void;
}
const TableDiv = (props: TableDivPropsType): JSX.Element => {
    const [sRecordCount, setRecordCount] = useState<number>(0);
    const sPriv = props?.pPriv && props.pPriv !== '' ? props.pPriv?.split('|')?.[1].trim() : '';

    const handleTableDetail = () => {
        props.pHandleDBTablePage(props.pUserName, props.pTable);
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
        </>
    );
};
