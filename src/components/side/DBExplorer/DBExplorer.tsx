import { backupStatus, getBackupDBList, getTableList } from '@/api/repository/api';
import { MdRefresh } from '@/assets/icons/Icon';
import { useEffect, useState } from 'react';
import { BackupTableInfo, TableInfo } from './TableInfo';
import { generateUUID, isCurUserEqualAdmin } from '@/utils';
import { TbDatabasePlus } from 'react-icons/tb';
import { DBMountModal } from './DBMountModal';
import { LuDatabaseBackup } from 'react-icons/lu';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { gBackupList, gBoardList, gSelectedTab } from '@/recoil/recoil';
import { DB_EXPLORER_CONTEXT_MENU_TYPE, DBExplorerContextMenu, E_DB_DDL, TABLE_CONTEXT_MENU_INITIAL_VALUE } from './DBExplorerContextMenu';
import { CheckTableFlag, E_TABLE_INFO, E_TABLE_TYPE } from './utils';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { fetchQuery } from '@/api/repository/database';
import { Toast } from '@/design-system/components';
import { useExperiment } from '@/hooks/useExperiment';
import { Button, Side, Checkbox } from '@/design-system/components';

export const DBExplorer = () => {
    const { getExperiment } = useExperiment();
    const [sDBList, setDBList] = useState<any>([]);
    const [sCollapseTree, setCollapseTree] = useState(true);
    const [sRefresh, setRefresh] = useState<number>(0);
    const [mountModalOpen, setMountModalOpen] = useState<boolean>(false);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sBackupList, setBackupList] = useRecoilState<any[]>(gBackupList);
    /** Context menu */
    const [sIsContextMenu, setIsContextMenu] = useState<DB_EXPLORER_CONTEXT_MENU_TYPE>(TABLE_CONTEXT_MENU_INITIAL_VALUE);
    /** Drop info */
    const [sIsDropModal, setIsDropModal] = useState<boolean>(false);
    const [sDropTableInfo, setDropTableInfo] = useState<{ label: string; table: (string | number)[]; cascade: boolean }>({ label: '', table: [], cascade: false });
    const [sIsDrop, setIsDrop] = useState<boolean>(false);
    const [sSideSizes, setSideSizes] = useState<any>(['85%', '15%']);
    const setSelectedTab = useSetRecoilState<any>(gSelectedTab);

    /** Converte table type */
    const TableTypeConverter = (aType: number): string => {
        switch (aType) {
            case 0:
                return 'log';
            case 1:
                return 'fixed';
            case 3:
                return 'volatile';
            case 4:
                return 'lookup';
            case 5:
                return 'keyValue';
            case 6:
                return 'tag';
            default:
                return '';
        }
    };
    /** Get database list (with mounted database)*/
    const getDatabaseList = async () => {
        setRefresh(sRefresh + 1);
        const sData = await getTableList();
        if (sData && sData.data) {
            const DB_NAME_LIST: string[] = Array.from(
                new Set(isCurUserEqualAdmin() ? ['MACHBASEDB', ...sData.data.rows.map((aRow: any) => aRow[0])] : sData.data.rows.map((aRow: any) => aRow[0]))
            );
            const USER_NAME_LIST: string[] = Array.from(
                new Set(isCurUserEqualAdmin() ? ['SYS', ...sData.data.rows.map((aRow: any) => aRow[1])] : sData.data.rows.map((aRow: any) => aRow[1]))
            );
            // DB > USER > TABLE > TYPE
            let DB_LIST: any = [];
            DB_NAME_LIST
                ? (DB_LIST = DB_NAME_LIST.map((aName: string) => {
                      return {
                          dbName: aName,
                          userList: USER_NAME_LIST.map((aUser: string) => {
                              return { userName: aUser, total: 0, tableList: { log: [], fixed: [], volatile: [], lookup: [], keyValue: [], tag: [] } };
                          }),
                          tableLen: 0,
                      };
                  }))
                : null;
            sData.data.rows.map((bRow: any) => {
                DB_LIST.map((aDB: any, aIdx: number) => {
                    if (aDB.dbName === bRow[0]) {
                        DB_LIST[aIdx].tableLen++;
                        USER_NAME_LIST.map((aUser: string, bIdx: number) => {
                            if (bRow[1] === aUser) {
                                DB_LIST[aIdx]['userList'][bIdx].total++;
                                DB_LIST[aIdx]['userList'][bIdx].tableList[TableTypeConverter(bRow[4])].push(bRow);
                            }
                        });
                    }
                });
            });
            setDBList(DB_LIST);
        } else setDBList([]);
    };
    /** Get backup database list */
    const getBackupDatabaseList = async () => {
        if (!isCurUserEqualAdmin()) return;
        const sBackupListRes: any = await getBackupDBList();
        if (sBackupListRes && sBackupListRes?.success) {
            setBackupList(sBackupListRes?.data || []);
        } else setBackupList([]);
    };
    /** Handle mount db modal */
    const mountDBModal = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMountModalOpen(true);
    };
    const init = (aEvent?: any) => {
        setDBList([]);
        if (aEvent) aEvent.stopPropagation();
        getDatabaseList();
        getBackupDatabaseList();
    };
    /** handle backup page */
    const handleBackupPage = async (e: React.MouseEvent) => {
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

        if (sStatusCode.path === '') getBackupDatabaseList();

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
    const handleDropTable = async () => {
        if (sIsDrop) return;
        const sCasCade = CheckTableFlag(sDropTableInfo?.table?.[E_TABLE_INFO.TB_TYPE] as any) === E_TABLE_TYPE.TAG ? sDropTableInfo?.cascade : false;
        setIsDrop(true);
        const sQuery = `DROP TABLE ${sDropTableInfo?.table?.[E_TABLE_INFO.USER_NM]}.${sDropTableInfo?.table?.[E_TABLE_INFO.TB_NM]}${sCasCade ? ' CASCADE' : ''}`;
        const { svrState, svrReason } = await fetchQuery(sQuery);
        if (svrState) init();
        else Toast.error(svrReason);
        /** Initial */
        setDropTableInfo({ label: '', table: [], cascade: false });
        setIsDrop(false);
        setIsDropModal(false);
    };
    const handleDropTableModal = (aKey: E_DB_DDL | '', aOpt: typeof TABLE_CONTEXT_MENU_INITIAL_VALUE.options) => {
        if (aKey === E_DB_DDL.DELETE) {
            const sLabel = aOpt.table[0] === 'MACHBASEDB' && aOpt.table[1] === aOpt.userNm ? aOpt.table[3] : `${aOpt.table[1]}.${aOpt.table[3]}`;
            setDropTableInfo({ label: sLabel as string, table: aOpt.table, cascade: false });
            setIsDropModal(true);
        }
        setIsContextMenu(TABLE_CONTEXT_MENU_INITIAL_VALUE);
    };
    const handleContextMenu = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, aTable: (string | number)[], aLoginUser: string, pPriv: string) => {
        if (!getExperiment()) return;
        if (aTable[E_TABLE_INFO.DB_ID] === -1) {
            const userPermissions = pPriv && pPriv !== '' ? pPriv?.split('|')?.[0].trim() : 0;
            if (
                isCurUserEqualAdmin() ||
                (aTable[E_TABLE_INFO.USER_NM] as string).toUpperCase() === aLoginUser.toUpperCase()
                // || hasTablePermission(userPermissions as number, TABLE_PERMISSION.DELETE)
            ) {
                e.preventDefault();
                setIsContextMenu({ open: true, x: e.pageX, y: e.pageY, options: { table: aTable, userNm: aLoginUser, permissions: userPermissions as number } });
            }
        }
    };

    useEffect(() => {
        init();
    }, []);

    return (
        <>
            <Side.Container splitSizes={sSideSizes} onSplitChange={setSideSizes}>
                <Side.Section>
                    <Side.Collapse pCallback={() => setCollapseTree(!sCollapseTree)} pCollapseState={sCollapseTree}>
                        <span>DB EXPLORER</span>
                        <Button.Group>
                            {isCurUserEqualAdmin() && (
                                <>
                                    <Button
                                        size="side"
                                        variant="ghost"
                                        icon={<LuDatabaseBackup size={12} style={{ padding: 4 }} />}
                                        isToolTip
                                        toolTipContent="Database backup"
                                        toolTipPlace="bottom-end"
                                        onClick={handleBackupPage}
                                        aria-label="Database backup"
                                    />
                                    <Button
                                        size="side"
                                        variant="ghost"
                                        icon={<TbDatabasePlus size={14} style={{ padding: 4 }} />}
                                        isToolTip
                                        toolTipContent="Database mount"
                                        toolTipPlace="bottom-end"
                                        onClick={mountDBModal}
                                        aria-label="Database mount"
                                    />
                                </>
                            )}
                            <Button
                                size="side"
                                variant="ghost"
                                icon={<MdRefresh size={16} />}
                                isToolTip
                                toolTipContent="Refresh"
                                onClick={(aEvent: any) => init(aEvent)}
                                aria-label="Refresh"
                            />
                        </Button.Group>
                    </Side.Collapse>
                    <Side.List>
                        {/* DB LIST */}
                        {sDBList &&
                            sDBList.length !== 0 &&
                            sCollapseTree &&
                            sDBList.map((aDB: any, aIdx: number) => {
                                return <TableInfo pShowHiddenObj={true} key={aIdx} pValue={aDB} pRefresh={sRefresh} pUpdate={init} pContextMenu={handleContextMenu} />;
                            })}
                    </Side.List>
                </Side.Section>
                <Side.Section>
                    {/* BACKUP DB LIST */}
                    {isCurUserEqualAdmin() && sBackupList && sBackupList.length !== 0 && (
                        <BackupTableInfo pValue={sBackupList} pRefresh={init} pBackupRefresh={getBackupDatabaseList} />
                    )}
                </Side.Section>
            </Side.Container>
            {/* Context menu */}
            <DBExplorerContextMenu pContextInfo={sIsContextMenu} pCallback={handleDropTableModal} />
            {mountModalOpen && <DBMountModal setIsOpen={setMountModalOpen} pRefresh={init} />}
            {sIsDropModal && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={setIsDropModal}
                    pCallback={handleDropTable}
                    pState={sIsDrop}
                    pContents={
                        <div className="body-content">
                            <span>{`Do you want to drop this table (${sDropTableInfo?.label})`}</span>
                            {CheckTableFlag(sDropTableInfo?.table?.[E_TABLE_INFO.TB_TYPE] as any) === E_TABLE_TYPE.TAG ? (
                                <>
                                    <div style={{ height: '10px' }} />
                                    <Checkbox
                                        size="sm"
                                        label="Cascade delete table"
                                        checked={sDropTableInfo.cascade}
                                        onChange={(e) => {
                                            setDropTableInfo((prev) => {
                                                return { ...prev, cascade: e.target.checked };
                                            });
                                        }}
                                    />
                                </>
                            ) : null}
                        </div>
                    }
                />
            )}
        </>
    );
};
