import { ExtensionTab } from '@/components/extension/ExtensionTab';
import { Pane, SashContent } from 'split-pane-react';
import { useEffect, useState } from 'react';
import SplitPane from 'split-pane-react/esm/SplitPane';
import { backupStatus, databaseBackup, getAllowBackupTable } from '@/api/repository/api';
import { IconButton } from '@/components/buttons/IconButton';
import { LuFlipVertical } from 'react-icons/lu';
import { backupSyntax, backupTable, exampleBackup, explainEtc1, explainEtc2, explainEtc3, explainPathAndTime } from './contents';
import { VscWarning } from 'react-icons/vsc';
import { useRecoilState } from 'recoil';
import { gBoardList } from '@/recoil/recoil';

export const BackupDatabase = ({ pCode }: { pCode: any }) => {
    const [sPayload, setPayload] = useState<any>(pCode);
    const [sPageMode, setPageMode] = useState<'VIEW' | 'CREATE'>('CREATE');
    const [isVertical, setIsVertical] = useState<boolean>(true);
    const [sGroupWidth, setGroupWidth] = useState<any[]>(['50', '50']);
    const [sTableList, setTableList] = useState<any[]>([]);
    const [sCreateRes, setCreateRes] = useState<any>(undefined);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);

    const setDurationTypeSelect = (aSelectedItem: 'Full' | 'Incremental' | 'Time') => {
        setPayload((prev: any) => {
            return { ...prev, duration: { type: aSelectedItem, after: '', from: '', to: '' } };
        });
    };
    const setTypeSelect = (aSelectedItem: 'database' | 'table') => {
        setPayload((prev: any) => {
            return { ...prev, type: aSelectedItem };
        });
    };
    const setDurationAfter = (aEvent: React.FormEvent<HTMLInputElement>) => {
        setPayload((prev: any) => {
            return { ...prev, duration: { ...prev.duration, after: (aEvent.target as HTMLInputElement).value } };
        });
    };
    const setPath = (aEvent: React.FormEvent<HTMLInputElement>) => {
        setPayload((prev: any) => {
            return { ...prev, path: (aEvent.target as HTMLInputElement).value };
        });
    };
    const handleTime = (aKey: string, aTime: string) => {
        setPayload((prev: any) => {
            return { ...prev, duration: { ...prev.duration, [aKey]: aTime } };
        });
    };
    const setTableName = (aSelectedItem: string) => {
        setPayload((prev: any) => {
            return { ...prev, tableName: aSelectedItem };
        });
    };
    const getTableNameList = async () => {
        if (sTableList.length > 0) return;
        const sResTableList = await getAllowBackupTable();
        if (sResTableList && sResTableList?.data && sResTableList?.data?.rows) {
            const sParsedBackupList = sResTableList.data.rows.map((aItem: any) => {
                if (aItem[0] > 1) aItem[3] = aItem[1] + '.' + aItem[3];
                return aItem;
            });
            setTableList(sParsedBackupList);
        } else setTableList([]);
    };
    const handleBackup = async () => {
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
        return;
    };
    const createBackup = async () => {
        // Common
        if (sPayload?.type === '' || sPayload?.path === '') return;
        // Table name
        if (sPayload?.type === 'table' && sPayload?.tableName === '') return;
        // FULL BACKUP
        if (sPayload?.duration && sPayload?.duration?.type === '') return;
        // INCREMENTAL BACKUP
        if (sPayload?.duration && sPayload?.duration?.type === 'incremental' && sPayload?.duration?.after === '') return;
        // TIME BACKUP
        const sResBackup: any = await databaseBackup(sPayload);
        if (sResBackup && sResBackup?.success) {
            handleBackup();
            setCreateRes(undefined);
        } else setCreateRes(sResBackup?.data && sResBackup?.data !== '' ? sResBackup?.data?.reason : sResBackup?.statusText);
    };
    const Resizer = () => {
        return <SashContent className={`security-key-sash-style`} />;
    };

    useEffect(() => {
        if (pCode?.code?.path !== '') setPageMode('VIEW');
        else setPageMode('CREATE');
        setPayload(pCode.code);
    }, [pCode]);

    return (
        <>
            <ExtensionTab>
                <SplitPane sashRender={() => Resizer()} split={isVertical ? 'vertical' : 'horizontal'} sizes={sGroupWidth} onChange={setGroupWidth}>
                    {
                        <Pane minSize={400}>
                            <ExtensionTab.Header />
                            <ExtensionTab.Body>
                                {/* Backup type */}
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>type</ExtensionTab.ContentTitle>
                                    {sPageMode === 'CREATE' && (
                                        <>
                                            <ExtensionTab.Selector
                                                pList={['database', 'table']}
                                                pSelectedItem={sPayload?.type}
                                                pCallback={(aSelectedItem: any) => {
                                                    setTypeSelect(aSelectedItem);
                                                }}
                                            />
                                        </>
                                    )}
                                    {sPageMode === 'VIEW' && <ExtensionTab.ContentDesc>{sPayload.type.toUpperCase()}</ExtensionTab.ContentDesc>}
                                    {/* Table name & CREATE */}
                                    {sPayload?.type === 'table' && sPageMode === 'CREATE' && (
                                        <ExtensionTab.ContentBlock>
                                            <ExtensionTab.ContentText pContent="Table name" />
                                            {sPageMode === 'CREATE' && (
                                                <div onClick={getTableNameList}>
                                                    <ExtensionTab.Selector
                                                        pWidth="365px"
                                                        pList={sTableList.map((aItem: any) => aItem[3]) ?? []}
                                                        pSelectedItem={sPayload?.tableName || ''}
                                                        pCallback={(aSelectedItem: any) => {
                                                            setTableName(aSelectedItem);
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </ExtensionTab.ContentBlock>
                                    )}
                                </ExtensionTab.ContentBlock>
                                {/* Table name & VIEW*/}
                                {sPayload?.type === 'table' && sPageMode === 'VIEW' && (
                                    <ExtensionTab.ContentBlock>
                                        <ExtensionTab.ContentTitle>Table name</ExtensionTab.ContentTitle>
                                        <ExtensionTab.ContentDesc>{sPayload.tableName.toUpperCase()}</ExtensionTab.ContentDesc>
                                    </ExtensionTab.ContentBlock>
                                )}
                                {/* Backup duration type  */}
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>Destination</ExtensionTab.ContentTitle>
                                    {sPageMode === 'CREATE' && (
                                        <ExtensionTab.Selector
                                            pList={['full', 'incremental', 'time']}
                                            pSelectedItem={sPayload?.duration?.type}
                                            pCallback={(aSelectedItem: any) => {
                                                setDurationTypeSelect(aSelectedItem);
                                            }}
                                        />
                                    )}
                                    {sPageMode === 'VIEW' && <ExtensionTab.ContentDesc>{sPayload.duration.type.toUpperCase()}</ExtensionTab.ContentDesc>}
                                    {/* Incremental backup */}
                                    {sPayload?.duration?.type === 'incremental' && sPageMode === 'CREATE' && (
                                        <ExtensionTab.ContentBlock>
                                            <ExtensionTab.ContentText pContent="Previous backup directory"></ExtensionTab.ContentText>
                                            <ExtensionTab.ContentDesc>Path of full or previous incremental backup.</ExtensionTab.ContentDesc>
                                            <ExtensionTab.Input pAutoFocus pCallback={(event: React.FormEvent<HTMLInputElement>) => setDurationAfter(event)} pWidth="365px" />
                                        </ExtensionTab.ContentBlock>
                                    )}
                                    {/* Time Duration backup */}
                                    {sPayload?.duration?.type === 'time' && sPageMode === 'CREATE' && (
                                        <ExtensionTab.ContentBlock>
                                            <ExtensionTab.ContentText pContent="From"></ExtensionTab.ContentText>
                                            <ExtensionTab.DateTimePicker pTime={sPayload?.duration?.from} pSetApply={(e: any) => handleTime('from', e)} />
                                            <ExtensionTab.ContentText pContent="to"></ExtensionTab.ContentText>
                                            <ExtensionTab.DateTimePicker pTime={sPayload?.duration?.to} pSetApply={(e: any) => handleTime('to', e)} />
                                        </ExtensionTab.ContentBlock>
                                    )}
                                </ExtensionTab.ContentBlock>
                                {/* Incremental bakcup VIEW */}
                                {sPayload?.duration?.type === 'incremental' && sPageMode === 'VIEW' && (
                                    <ExtensionTab.ContentBlock>
                                        <ExtensionTab.ContentTitle>Previous backup directory</ExtensionTab.ContentTitle>
                                        <ExtensionTab.ContentDesc>{sPayload.duration.after}</ExtensionTab.ContentDesc>
                                    </ExtensionTab.ContentBlock>
                                )}
                                {/* Time Duration VIEW */}
                                {sPayload?.duration?.type === 'time' && sPageMode === 'VIEW' && (
                                    <>
                                        <ExtensionTab.ContentBlock>
                                            <ExtensionTab.ContentTitle>From</ExtensionTab.ContentTitle>
                                            <ExtensionTab.ContentDesc>{sPayload.duration.from}</ExtensionTab.ContentDesc>
                                        </ExtensionTab.ContentBlock>
                                        <ExtensionTab.ContentBlock>
                                            <ExtensionTab.ContentTitle>to</ExtensionTab.ContentTitle>
                                            <ExtensionTab.ContentDesc>{sPayload.duration.to}</ExtensionTab.ContentDesc>
                                        </ExtensionTab.ContentBlock>
                                    </>
                                )}
                                {/* Backup path */}
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>path</ExtensionTab.ContentTitle>
                                    {sPageMode === 'CREATE' && (
                                        <>
                                            <ExtensionTab.ContentDesc>Absolute and relative path can be used for backup directory.</ExtensionTab.ContentDesc>
                                            <ExtensionTab.Input pAutoFocus pValue={sPayload?.path ?? ''} pCallback={(event: React.FormEvent<HTMLInputElement>) => setPath(event)} />
                                        </>
                                    )}
                                    {sPageMode === 'VIEW' && <ExtensionTab.ContentDesc>{sPayload.path}</ExtensionTab.ContentDesc>}
                                </ExtensionTab.ContentBlock>
                                {/* Create btn */}
                                {sPageMode === 'CREATE' && (
                                    <ExtensionTab.ContentBlock>
                                        <ExtensionTab.TextButton pText="Create" pType="CREATE" pCallback={createBackup} />
                                        {sCreateRes && (
                                            <ExtensionTab.DpRow>
                                                <VscWarning style={{ fill: '#ff5353' }} />
                                                <span style={{ margin: '8px', color: '#ff5353' }}>{sCreateRes}</span>
                                            </ExtensionTab.DpRow>
                                        )}
                                    </ExtensionTab.ContentBlock>
                                )}
                            </ExtensionTab.Body>
                        </Pane>
                    }
                    <Pane>
                        <ExtensionTab.Header>
                            <div />
                            <div style={{ display: 'flex' }}>
                                <IconButton
                                    pIsToopTip
                                    pToolTipContent="Vertical"
                                    pToolTipId="timer-tab-hori"
                                    pIcon={<LuFlipVertical style={{ transform: 'rotate(90deg)' }} />}
                                    pIsActive={isVertical}
                                    onClick={() => setIsVertical(true)}
                                />
                                <IconButton
                                    pIsToopTip
                                    pToolTipContent="Horizontal"
                                    pToolTipId="timer-tab-ver"
                                    pIcon={<LuFlipVertical />}
                                    pIsActive={!isVertical}
                                    onClick={() => setIsVertical(false)}
                                />
                            </div>
                        </ExtensionTab.Header>
                        {sPageMode === 'CREATE' && (
                            <ExtensionTab.Body>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.SubTitle>Database Backup</ExtensionTab.SubTitle>
                                    <ExtensionTab.ContentDesc>
                                        Machbase’s database backup is classified as follows, and either backup of the entire database or backup of the specific table is possible.
                                    </ExtensionTab.ContentDesc>
                                </ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentBlock>
                                    <div style={{ width: 'auto', maxWidth: '1000px' }}>
                                        <ExtensionTab.Table pList={backupTable} dotted />
                                    </div>
                                </ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentDesc>Syntax:</ExtensionTab.ContentDesc>
                                    <ExtensionTab.CopyBlock pContent={backupSyntax} />
                                </ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentDesc>{explainPathAndTime}</ExtensionTab.ContentDesc>
                                </ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentDesc>Example:</ExtensionTab.ContentDesc>
                                    <ExtensionTab.CopyBlock pContent={exampleBackup} />
                                </ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>Type</ExtensionTab.ContentTitle>
                                    <ExtensionTab.ContentDesc>{explainEtc1}</ExtensionTab.ContentDesc>
                                </ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>Destination</ExtensionTab.ContentTitle>
                                    <ExtensionTab.ContentDesc>{explainEtc2}</ExtensionTab.ContentDesc>
                                </ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>Path</ExtensionTab.ContentTitle>
                                    <ExtensionTab.ContentDesc>{explainEtc3}</ExtensionTab.ContentDesc>
                                </ExtensionTab.ContentBlock>
                            </ExtensionTab.Body>
                        )}
                    </Pane>
                </SplitPane>
            </ExtensionTab>
        </>
    );
};
