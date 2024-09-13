import { getTableInfo, getColumnIndexInfo, getRollupTable, getRecordCount, unMountDB, mountDB, backupStatus } from '@/api/repository/api';
import React, { useEffect, useRef, useState } from 'react';
import { GoDotFill, FaDatabase, TfiLayoutColumn3Alt, VscChevronRight, FaUser } from '@/assets/icons/Icon';
import { generateUUID, getUserName } from '@/utils';
import { getColumnType } from '@/utils/dashboardUtil';
import { IconButton } from '@/components/buttons/IconButton';
import { TbDatabaseMinus, TbDatabasePlus, TbFileDatabase } from 'react-icons/tb';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { ADMIN_ID } from '@/utils/constants';
import { Loader } from '@/components/loader';
import { Error } from '@/components/toast/Toast';
import { MountNameRegEx } from '@/utils/database';
import './TableInfo.scss';
import { LuDatabaseBackup } from 'react-icons/lu';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { useRecoilState, useSetRecoilState } from 'recoil';

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
    const [sMountAlias, setMountAlias] = useState<string>(backupInfo.path.toUpperCase());
    const sMountAliasRef = useRef<any>(undefined);

    const mountBackupDB = async () => {
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
        setMountAlias(() => backupInfo.path.toUpperCase());
        setIsMount(true);
    };
    const handleMountName = (e: React.ChangeEvent<HTMLInputElement>) => {
        const start = e.target.selectionStart ?? 0;
        const end = e.target.selectionEnd ?? 0;
        if (!MountNameRegEx.test(e.target.value) && e.target.value !== '') return sMountAliasRef.current.setSelectionRange(start - 1, end - 1);
        sMountAliasRef.current.setSelectionRange(start, end);
        setMountAlias(() => e.target.value.toUpperCase());
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
export const TableInfo = ({ pShowHiddenObj, pValue, pRefresh, pUpdate }: any) => {
    const [sCollapseTree, setCollapseTree] = useState(true);
    const [isUnmount, setIsUnmount] = useState<boolean>(false);

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
                    {getUserName().toUpperCase() === ADMIN_ID.toUpperCase() && pValue.dbName !== 'MACHBASEDB' && (
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
}
const UserDiv = (props: UserDivPropsType): JSX.Element => {
    const [sCollapseTree, setCollapseTree] = useState(true);
    const TableTypeList: string[] = ['tag', 'log', 'fixed', 'volatile', 'lookup', 'keyValue'];
    let sUserName = getUserName();
    if (sUserName) sUserName = sUserName.toUpperCase();

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
            {props.pUserData && props.pShowUserIcon && (
                <div className="user-column " style={{ alignItems: 'baseline' }} onClick={() => setCollapseTree(!sCollapseTree)}>
                    {UserColumn(<FaUser />, props.pUserData.userName, sCollapseTree ? 'db-exp-arrow db-exp-arrow-bottom' : 'db-exp-arrow')}
                </div>
            )}
            {props.pUserData && props.pUserData.tableList && sCollapseTree && (
                <div className="table-wrap db-exp-comm">
                    {TableTypeList.map((aTableType: string, aIdx: number) => {
                        return (
                            <div key={`table-${aTableType}-${aIdx}`}>
                                {props.pUserData.tableList[aTableType].map((aTable: any, bIdx: number) => {
                                    return (
                                        <div className="table-wrap-content" key={`table-${aTableType}-${aIdx}-${bIdx}`} style={{ display: checkDisplay(aTable[5]) ? '' : 'none' }}>
                                            {sUserName && (
                                                <TableDiv
                                                    pShowHiddenObj={props.pShowHiddenObj}
                                                    pUserName={sUserName}
                                                    pTableIcon={<TfiLayoutColumn3Alt style={{ color: getColor(aTableType), rotate: '90deg' }} />}
                                                    pTable={aTable}
                                                    pTableType={aTableType}
                                                    onTableInfo={getTableInfoData}
                                                    onColumnInfo={getColumnIndexInfoData}
                                                    pRefresh={props.pRefresh}
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
    pShowHiddenObj: boolean;
    pTableIcon: React.ReactElement;
    pTableType: string;
    pUserName: string;
    pTable: (string | number)[];
    pRefresh: number;
    onTableInfo: (aDatabaseId: string, aTableId: string) => any;
    onColumnInfo: (aDatabaseId: string, atableId: string) => any;
}
const TableDiv = (props: TableDivPropsType): JSX.Element => {
    const [sIsOpen, setIsOpen] = useState<boolean>(false);
    const [sColumnList, setColumnList] = useState<(string | number)[][]>([]);
    const [sIndexList, setIndexList] = useState<(string | number)[][]>([]);
    const [sRollupList, setRollupList] = useState<(string | number)[][]>([]);
    const [sRecordCount, setRecordCount] = useState<number>(0);

    const handleDataFetch = async () => {
        if (sIsOpen) return setIsOpen(false);
        else setIsOpen(true);
        handleColumns();
        fetchIndex();
        if ((props.pTable[4] as number) === 6 && props.pTable[0] === 'MACHBASEDB') fetchRollup();
    };
    const handleColumns = async () => {
        const res = await props.onTableInfo(props.pTable[6].toString(), props.pTable[2].toString());
        setColumnList(res.data.rows);
    };
    const fetchIndex = async () => {
        const res = await props.onColumnInfo(props.pTable[6].toString(), props.pTable[2].toString());
        setIndexList(res.data.rows);
    };
    const fetchRollup = async () => {
        const res = await getRollupTable(`${props.pTable[3].toString()}`, props.pTable[1].toString());
        setRollupList(res.data.rows);
    };
    const fetchRecordCount = async () => {
        const res: any = await getRecordCount(`${props.pTable[3].toString()}`, `${props.pTable[0] !== 'MACHBASEDB' ? props.pTable[0] + '.' : ''}${props.pTable[1].toString()}`);
        if (res.success && res.data && res.data.rows[0][0]) setRecordCount(res.data.rows[0][0]);
        else setRecordCount(0);
    };

    useEffect(() => {
        if (props.pTableType === 'tag' || props.pTableType === 'log' || !props.pShowHiddenObj) fetchRecordCount();
    }, [props.pRefresh, props.pShowHiddenObj]);

    return (
        <>
            <div className="table-column-wrap" onClick={handleDataFetch}>
                <div className="table-column-l">
                    <VscChevronRight className={`${sIsOpen ? 'db-exp-arrow db-exp-arrow-bottom' : 'db-exp-arrow'}`} />
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <IconButton
                            pWidth={'100%'}
                            pHeight={20}
                            pIsToopTip
                            pToolTipContent={props.pTableType + ' table'}
                            pToolTipId={props.pTableType + props.pUserName + '-block-math'}
                            pIcon={
                                <>
                                    <span className="icons">{props.pTableIcon}</span>
                                    <span className="table-name">
                                        {(props.pTable[0] === 'MACHBASEDB' && props.pTable[1] === 'SYS') ||
                                        (props.pTable[0] === 'MACHBASEDB' && props.pTable[1] === props.pUserName)
                                            ? props.pTable[3]
                                            : `${props.pTable[1]}.${props.pTable[3]}`}
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
            {sIsOpen && sColumnList.length > 0 && (
                <ColumnDiv pKey={props.pTable[0] as string} pShowHiddenObj={props.pShowHiddenObj} pColumnList={sColumnList} pIndexList={sIndexList} pRollupList={sRollupList} />
            )}
        </>
    );
};
interface ColumnDivPropsType {
    pKey: string;
    pShowHiddenObj: boolean;
    pColumnList: (string | number)[][];
    pIndexList: (string | number)[][];
    pRollupList: (string | number)[][];
}
const ColumnDiv = (props: ColumnDivPropsType): JSX.Element => {
    const columnNameList: string[] = ['columns', 'index', 'rollup'];
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
        if (!props.pShowHiddenObj) return true;
        switch (aColumn) {
            case 'column': {
                if (!aData) return false;
                if (aData[3].toString() === '65534') return false;
                if (aData[3].toString() === '0' && aData[0].toString() === '_ARRIVAL_TIME') return false;
                if (aData[3].toString() === '0' && aData[0].toString() === '_ROWID') return false;
                return true;
            }
            case 'index':
                return false;
            case 'rollup':
                return false;
            default:
                return true;
        }
    };
    return (
        <>
            {columnNameList.map((aColumn: string, aIdx: number) => {
                return (
                    <div key={`${props.pKey}-columns-${aColumn}-${aIdx}`}>
                        {aColumn === 'columns' && props.pColumnList.length > 0 && (
                            <div key={`${props.pKey}-columns-columns-${aColumn}-${aIdx}-content`}>
                                {!props.pShowHiddenObj && (props.pIndexList.length > 0 || props.pRollupList.length > 0) && <LabelDiv pTxt={aColumn} />}
                                {props.pColumnList.map((bColumn, bIdx: number) => {
                                    return (
                                        checkDisplay('column', bColumn) && (
                                            <div className="table-column-content" key={`${props.pKey}-columns-${aColumn}-${aIdx}-${bColumn}-${bIdx}`}>
                                                <span className="icons" style={{ marginRight: '2px', opacity: '0.5' }}>
                                                    <GoDotFill></GoDotFill>
                                                </span>
                                                <div className="table-column-content-row">
                                                    <span className="l-txt">{bColumn[0]}</span>
                                                    <div className="r-txt">
                                                        {getColumnType(bColumn[1] as number) + ' '}
                                                        {bColumn[1] === 5 && `(${bColumn[2]})`}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    );
                                })}
                            </div>
                        )}
                        {aColumn === 'index' && props.pIndexList.length > 0 && checkDisplay('index') && (
                            <div key={`${props.pKey}-columns-index-${aColumn}-${aIdx}-content`}>
                                <LabelDiv pTxt={aColumn} />
                                {props.pIndexList.map((aIndex, aIdx: number) => {
                                    return (
                                        <div className="table-column-content" key={`${props.pKey}-columns-index-${aColumn}-${aIndex}-${aIdx}`}>
                                            <span className="icons" style={{ marginRight: '2px', opacity: '0.5' }}>
                                                <GoDotFill></GoDotFill>
                                            </span>
                                            <div className="table-column-content-row">
                                                <span className="l-txt">{aIndex[1]}</span>
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
                        {aColumn === 'rollup' && props.pRollupList.length > 0 && checkDisplay('rollup') && (
                            <div key={`${props.pKey}-columns-rollup-${aColumn}-${aIdx}-content`}>
                                <LabelDiv pTxt={aColumn} />
                                {props.pRollupList.map((aRollup, aIdx: number) => {
                                    return (
                                        <div className="table-column-content" key={`${props.pKey}-columns-rollup-${aColumn}-${aRollup}-${aIdx}`}>
                                            <span className="icons" style={{ marginRight: '2px', opacity: '0.5' }}>
                                                <GoDotFill className={`fill-${aRollup[3] === 1 ? 'enable' : 'disable'}`}></GoDotFill>
                                            </span>
                                            <div className="table-column-content-row">
                                                <span className="l-txt">{aRollup[2]}</span>
                                                <div className="r-txt">
                                                    <span style={{ marginLeft: '3px' }}>{aRollup[1]}ms</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </>
    );
};
interface LabelDivPropsType {
    pTxt: string;
}
const LabelDiv = (props: LabelDivPropsType): JSX.Element => {
    return <div className="table-wrap-label-content">{props.pTxt}</div>;
};
