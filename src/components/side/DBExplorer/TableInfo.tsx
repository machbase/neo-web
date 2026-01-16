import './TableInfo.scss';
import { getTableInfo, getColumnIndexInfo, getRecordCount, unMountDB, mountDB, backupStatus } from '@/api/repository/api';
import React, { useEffect, useRef, useState } from 'react';
import { FaDatabase, TfiLayoutColumn3Alt, FaUser } from '@/assets/icons/Icon';
import { generateUUID, getUserName, isCurUserEqualAdmin } from '@/utils';
import { TbDatabaseMinus, TbDatabasePlus, TbFileDatabase } from 'react-icons/tb';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { Loader } from '@/components/loader';
import { Toast } from '@/design-system/components';
import { IsKeyword, MountNameRegEx } from '@/utils/database';
import { LuDatabaseBackup } from 'react-icons/lu';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { TableTypeOrderList } from './utils';
import { getColumnType } from '@/utils/dashboardUtil';
import { ClipboardCopy } from '@/utils/ClipboardCopy';
import { Tooltip } from 'react-tooltip';
import { Virtuoso } from 'react-virtuoso';
import { Alert, Button, Input, Page, Side } from '@/design-system/components';

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
        <>
            <Side.Collapse pCallback={() => setBkCollapseTree(!sBkCollapseTree)} pCollapseState={sBkCollapseTree}>
                <span>BACKUPS</span>
                <Button.Group>
                    <Button size="side" variant="ghost" isToolTip toolTipContent="Database backup" icon={<LuDatabaseBackup size={12} />} onClick={handleBackup} />
                </Button.Group>
            </Side.Collapse>
            <Side.List>
                {sBkCollapseTree &&
                    pValue.map((aBackup: any, aIdx: number) => {
                        return (
                            <Side.Item key={aBackup.path + '-backup' + aIdx}>
                                <BACKUP_DB_DIV backupInfo={aBackup} pUpdate={pRefresh} />
                            </Side.Item>
                        );
                    })}
            </Side.List>
        </>
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
        else Toast.error(sResMount?.data?.reason ?? sResMount.statusText);
        setMountState('');
    };
    const unmountDB = async () => {
        const sResUnmount: any = await unMountDB(backupInfo.mountName);
        if (sResUnmount && sResUnmount?.success) pUpdate();
        else Toast.error(sResUnmount?.data?.reason ?? sResUnmount.statusText);
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
            <Side.ItemContent>
                <Side.ItemIcon>
                    <TbFileDatabase className="size-16" color={backupInfo.isMount ? 'rgb(196,196,196)' : '#939498'} />
                </Side.ItemIcon>
                <Side.ItemText>{backupInfo?.path}</Side.ItemText>
            </Side.ItemContent>
            <Side.ItemAction>
                {sMountState !== 'LOADING' ? (
                    <Button
                        size="side"
                        variant="ghost"
                        isToolTip
                        toolTipContent={backupInfo.isMount ? 'Database unmount' : 'Database mount'}
                        icon={backupInfo.isMount ? <TbDatabaseMinus size={13} /> : <TbDatabasePlus size={13} />}
                        onClick={backupInfo.isMount ? handleUnmountModal : handleMountModal}
                    />
                ) : (
                    <div style={{ marginRight: '4px' }}>
                        <Loader width="12px" height="12px" borderRadius="90%" />
                    </div>
                )}
            </Side.ItemAction>
            {/* DELETE CONFIRM MODAL */}
            {isUnmount && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={setIsUnmount}
                    pCallback={unmountDB}
                    pContents={
                        <Page.ContentBlock>
                            <span>{`Do you want to unmount this database (${backupInfo.path} = ${backupInfo.mountName ?? ''})?`}</span>
                        </Page.ContentBlock>
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
                        <Page.ContentBlock>
                            <span>Do you want to mount this database?</span>
                            <Page.Space />
                            <Input ref={sMountAliasRef} type="text" autoFocus label="Name" value={sMountAliasRef?.current?.value ?? sMountAlias} onChange={handleMountName} />
                            {IsKeyword(sMountAliasRef?.current?.value) && <Alert variant="error" message={'Mount name cannot be a keyword.'} />}
                        </Page.ContentBlock>
                    }
                />
            )}
        </>
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
                <Side.Item onClick={() => setCollapseTree(!sCollapseTree)}>
                    <Side.ItemContent>
                        <Side.ItemArrow isOpen={sCollapseTree} />
                        <Side.ItemIcon>
                            <FaDatabase size={13} />
                        </Side.ItemIcon>
                        <Side.ItemText>{pValue.dbName}</Side.ItemText>
                    </Side.ItemContent>
                    <Side.ItemAction>
                        {isCurUserEqualAdmin() && pValue.dbName !== 'MACHBASEDB' && (
                            <Button size="side" variant="ghost" isToolTip toolTipContent="Database unmount" icon={<TbDatabaseMinus size={13} />} onClick={handleUnmountModal} />
                        )}
                    </Side.ItemAction>
                </Side.Item>
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
            {pValue &&
                sCollapseTree &&
                pValue.userList.map((aUser: { userName: string; total: number; tableList: any }) => {
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
                <Side.Item paddingLeft={28} onClick={() => setCollapseTree(!sCollapseTree)}>
                    <Side.ItemContent>
                        <Side.ItemArrow isOpen={sCollapseTree} />
                        <Side.ItemIcon>
                            <FaUser size={13} />
                        </Side.ItemIcon>
                        <Side.ItemText>{props.pUserData.userName}</Side.ItemText>
                    </Side.ItemContent>
                </Side.Item>
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
            <Side.Item tooltip={props.pTableType + ' table ' + sPriv} tooltipPlace="top" paddingLeft={40} onClick={handleTableDetail} onContextMenu={handleContextMenu}>
                <Side.ItemContent>
                    <Side.ItemArrow isOpen={sIsOpen} />
                    <Side.ItemIcon>{props.pTableIcon}</Side.ItemIcon>
                    <Side.ItemText>
                        {props.pTable[0] === 'MACHBASEDB' && props.pTable[1] === props.pUserName ? props.pTable[3] : `${props.pTable[1]}.${props.pTable[3]}`}
                    </Side.ItemText>
                </Side.ItemContent>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', justifyContent: 'end' }}>
                    <span className="r-txt">{sRecordCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                </div>
            </Side.Item>
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

    const handleCopy = () => {
        if (copied) return;
        setCopied(true);
        ClipboardCopy(columnName);
        setTimeout(() => {
            setCopied(false);
        }, 600);
    };
    return (
        <Side.ItemText copyable onCopy={handleCopy} showCopyAlways={false}>
            <div className={`column-name-text tooltip-${tooltipId}`}>{columnName}</div>
            <Tooltip place="top" positionStrategy="fixed" anchorSelect={`.tooltip-${tooltipId}`} content={columnName} delayShow={700} style={{ zIndex: 9999 }} />
        </Side.ItemText>
    );
};

const ColumnSkeleton = ({ count = 5 }: { count?: number }) => {
    return (
        <div className="column-skeleton-wrapper">
            {Array.from({ length: count }).map((_, index) => (
                <Side.Item paddingLeft={72} className="table-column-content" key={`skeleton-${index}`}>
                    <Side.ItemContent>
                        <span style={{ marginRight: '4px', opacity: '0.5' }}>{index >= count - 1 ? '└' : '├'}</span>
                        <div className="table-column-content-row">
                            <div className="skeleton skeleton-text" style={{ width: '60%' }}></div>
                            <div className="skeleton skeleton-text" style={{ width: '25%', marginRight: '16px' }}></div>
                        </div>
                    </Side.ItemContent>
                </Side.Item>
            ))}
        </div>
    );
};

const LabelSkeleton = () => {
    return (
        <Side.Item paddingLeft={52}>
            <div className="table-rap-label-content" style={{ height: '21px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="skeleton skeleton-text" style={{ width: '12px', height: '12px', minWidth: '12px', marginRight: '4px' }}></div>
                <div className="skeleton skeleton-text" style={{ width: '70px', height: '14px' }}></div>
            </div>
        </Side.Item>
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
        <>
            {sIndexLoading ? (
                <LabelSkeleton />
            ) : (
                <>
                    {/* Columns Section */}
                    <Side.Item paddingLeft={52} onClick={handleColumnsToggle}>
                        <Side.ItemArrow isOpen={sColOpen} />
                        <Side.ItemText>columns</Side.ItemText>
                    </Side.Item>
                    {sColOpen && (
                        <>
                            {sColumnsLoading ? (
                                <ColumnSkeleton count={3} />
                            ) : visibleColumns.length > 50 ? (
                                <Virtuoso
                                    className="scrollbar-dark"
                                    style={{ height: '40vh', backgroundColor: '#2d2d2d' }}
                                    data={visibleColumns}
                                    itemContent={(index, bColumn) => {
                                        const isLast = index === visibleColumns.length - 1;
                                        return (
                                            <Side.Item paddingLeft={71}>
                                                <Side.ItemContent>
                                                    <Side.ItemIcon>{isLast ? '└' : '├'}</Side.ItemIcon>
                                                    <ColumnNameCopy columnName={bColumn[0].toString()} />
                                                </Side.ItemContent>
                                                <div className="r-txt">
                                                    {getColumnType(bColumn[1] as number) + ' '}
                                                    {bColumn[1] === 5 && `(${bColumn[2]})`}
                                                </div>
                                            </Side.Item>
                                        );
                                    }}
                                />
                            ) : (
                                <div style={{ backgroundColor: '#2d2d2d' }}>
                                    {visibleColumns.map((bColumn, index) => {
                                        const isLast = index === visibleColumns.length - 1;
                                        return (
                                            <Side.Item paddingLeft={71} key={`${props.pKey}-col-${index}`}>
                                                <Side.ItemContent>
                                                    <Side.ItemIcon>{isLast ? '└' : '├'}</Side.ItemIcon>
                                                    <ColumnNameCopy columnName={bColumn[0].toString()} />
                                                </Side.ItemContent>
                                                <div className="r-txt">
                                                    {getColumnType(bColumn[1] as number) + ' '}
                                                    {bColumn[1] === 5 && `(${bColumn[2]})`}
                                                </div>
                                            </Side.Item>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {/* Index Section */}
                    {sIndexFetched && visibleIndexes.length > 0 && (
                        <>
                            <Side.Item paddingLeft={52} onClick={handleIndexToggle}>
                                <Side.ItemArrow isOpen={sIndexOpen} />
                                <Side.ItemText>index</Side.ItemText>
                            </Side.Item>
                            {sIndexOpen && (
                                <>
                                    {visibleIndexes.length > 50 ? (
                                        <Virtuoso
                                            className="scrollbar-dark"
                                            style={{ height: '40vh', backgroundColor: '#2d2d2d' }}
                                            data={visibleIndexes}
                                            itemContent={(index, aIndex) => {
                                                const isLast = index === visibleIndexes.length - 1;
                                                return (
                                                    <Side.Item paddingLeft={71}>
                                                        <Side.ItemContent>
                                                            <Side.ItemIcon>{isLast ? '└' : '├'}</Side.ItemIcon>
                                                            <ColumnNameCopy columnName={aIndex[1].toString()} />
                                                        </Side.ItemContent>
                                                        <div className="r-txt">
                                                            <span>{getIndexType(aIndex[2] as number)}</span>
                                                            <span style={{ marginLeft: '3px' }}>({aIndex[0]})</span>
                                                        </div>
                                                    </Side.Item>
                                                );
                                            }}
                                        />
                                    ) : (
                                        <div style={{ backgroundColor: '#2d2d2d' }}>
                                            {visibleIndexes.map((aIndex, index) => {
                                                const isLast = index === visibleIndexes.length - 1;
                                                return (
                                                    <Side.Item paddingLeft={71} key={`${props.pKey}-idx-${index}`}>
                                                        <Side.ItemContent>
                                                            <Side.ItemIcon>{isLast ? '└' : '├'}</Side.ItemIcon>
                                                            <ColumnNameCopy columnName={aIndex[1].toString()} />
                                                        </Side.ItemContent>
                                                        <div className="r-txt">
                                                            <span>{getIndexType(aIndex[2] as number)}</span>
                                                            <span style={{ marginLeft: '3px' }}>({aIndex[0]})</span>
                                                        </div>
                                                    </Side.Item>
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
        </>
    );
};
