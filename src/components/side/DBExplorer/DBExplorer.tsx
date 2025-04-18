import { backupStatus, getBackupDBList, getTableList } from '@/api/repository/api';
import { TbEyeMinus, MdRefresh } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { useEffect, useState } from 'react';
import { VscChevronDown, VscChevronRight } from '@/assets/icons/Icon';
import { BackupTableInfo, TableInfo } from './TableInfo';
import { generateUUID, isCurUserEqualAdmin } from '@/utils';
import { TbDatabasePlus } from 'react-icons/tb';
import { DBMountModal } from './DBMountModal';
import { LuDatabaseBackup } from 'react-icons/lu';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { gBackupList, gBoardList, gSelectedTab } from '@/recoil/recoil';

export const DBExplorer = ({ pServer }: any) => {
    const [sDBList, setDBList] = useState<any>([]);
    const [sCollapseTree, setCollapseTree] = useState(true);
    const [sShowHiddenObj, setShowHiddenObj] = useState(true);
    const [sRefresh, setRefresh] = useState<number>(0);
    const [mountModalOpen, setMountModalOpen] = useState<boolean>(false);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sBackupList, setBackupList] = useRecoilState<any[]>(gBackupList);
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
    /** Handle hidden table */
    const setHiddenObj = (aEvent: any) => {
        aEvent.stopPropagation();
        setShowHiddenObj(!sShowHiddenObj);
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

    useEffect(() => {
        init();
    }, []);

    return (
        <div className="side-form">
            <div className="side-title">
                <span>machbase-neo {pServer && pServer.version}</span>
            </div>
            <div className="side-sub-title editors-title" onClick={() => setCollapseTree(!sCollapseTree)}>
                <div className="collapse-icon">{sCollapseTree ? <VscChevronDown /> : <VscChevronRight />}</div>
                <div className="files-open-option">
                    <span className="title-text">DB EXPLORER</span>
                    <span className="sub-title-navi">
                        {isCurUserEqualAdmin() && (
                            <>
                                <IconButton
                                    pPlace="bottom-end"
                                    pIsToopTip
                                    pToolTipContent={`Database backup`}
                                    pToolTipId="db-explorer-backup"
                                    pWidth={20}
                                    pHeight={20}
                                    pIcon={<LuDatabaseBackup size={12} />}
                                    onClick={handleBackupPage}
                                />
                                <IconButton
                                    pPlace="bottom-end"
                                    pIsToopTip
                                    pToolTipContent={`Database mount`}
                                    pToolTipId="db-explorer-mount"
                                    pWidth={20}
                                    pHeight={20}
                                    pIcon={<TbDatabasePlus size={13} />}
                                    onClick={mountDBModal}
                                />
                            </>
                        )}
                        <IconButton
                            pIsToopTip
                            pToolTipContent={`${sShowHiddenObj ? 'Show hidden' : 'Hide'} table`}
                            pToolTipId="db-explorer-show-table"
                            pWidth={20}
                            pHeight={20}
                            pIsActive={!sShowHiddenObj}
                            pIcon={<TbEyeMinus size={15} />}
                            onClick={setHiddenObj}
                        />
                        <IconButton
                            pIsToopTip
                            pToolTipContent="Refresh"
                            pToolTipId="db-explorer-refresh"
                            pWidth={20}
                            pHeight={20}
                            pIcon={<MdRefresh size={15} />}
                            onClick={(aEvent: any) => init(aEvent)}
                        />
                    </span>
                </div>
            </div>
            <div style={{ overflow: 'auto', height: 'calc(100% - 62px)' }}>
                {sCollapseTree &&
                    sDBList &&
                    sDBList.length !== 0 &&
                    sDBList.map((aDB: any, aIdx: number) => {
                        return <TableInfo pShowHiddenObj={sShowHiddenObj} key={aIdx} pValue={aDB} pRefresh={sRefresh} pUpdate={init} />;
                    })}
                {/* BACKUP DB LIST */}
                {isCurUserEqualAdmin() && sBackupList && sBackupList.length !== 0 && (
                    <BackupTableInfo pValue={sBackupList} pRefresh={init} pBackupRefresh={getBackupDatabaseList} />
                )}
            </div>
            {mountModalOpen && <DBMountModal setIsOpen={setMountModalOpen} pRefresh={init} />}
        </div>
    );
};
