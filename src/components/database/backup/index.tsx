import { Page } from '@/design-system/components';
import { SplitPane, Pane } from '@/design-system/components';
import { SashContent } from 'split-pane-react';
import { useEffect, useState } from 'react';
import { backupStatus, databaseBackup, getAllowBackupTable, getBackupDBList } from '@/api/repository/api';
import { IconButton } from '@/components/buttons/IconButton';
import { LuFlipVertical } from 'react-icons/lu';
import { backupSyntax, backupTable, exampleBackup, explainEtc1, explainEtc2, explainEtc3, explainEtc4, explainPathAndTime } from './contents';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { gBackupList, gBoardList, gSelectedTab } from '@/recoil/recoil';
import moment from 'moment';
import { changeUtcToText } from '@/utils/helpers/date';
import { useSchedule } from '@/hooks/useSchedule';

export const BackupDatabase = ({ pCode }: { pCode: any }) => {
    const [sPayload, setPayload] = useState<any>(pCode);
    const [sPageMode, setPageMode] = useState<'VIEW' | 'CREATE'>('CREATE');
    const [isVertical, setIsVertical] = useState<boolean>(true);
    const [sGroupWidth, setGroupWidth] = useState<any[]>(['50', '50']);
    const [sTableList, setTableList] = useState<any[]>([]);
    const [sCreateRes, setCreateRes] = useState<any>(undefined);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const setBackupList = useSetRecoilState<any[]>(gBackupList);
    const [sTimestampErr, setTimestampErr] = useState<any>({ from: undefined, to: undefined });
    const sSelectedTab = useRecoilValue<any>(gSelectedTab);
    const [sLastCheckTime, setLastCheckTime] = useState<any>(undefined);

    const setDurationTypeSelect = (aSelectedItem: 'full' | 'incremental' | 'time range') => {
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
    /** convert timestamp format */
    const convertTimestamp = (aTime: string) => {
        const sUnixTimestamp = moment(aTime).unix();
        if (!isNaN(sUnixTimestamp)) return sUnixTimestamp;
        else return aTime;
    };
    const handleTime = (aKey: string, aTime: string) => {
        const sMomentValid = ['YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm', 'YYYY-MM-DD HH', 'YYYY-MM-DD', 'YYYY-MM', 'YYYY'];
        const sIsVaildTime = moment(aTime, sMomentValid, true).isValid() || aTime === '';
        if (!sIsVaildTime)
            setTimestampErr((prev: any) => {
                return { ...prev, [aKey]: 'Please check the entered time.' };
            });
        else
            setTimestampErr((prev: any) => {
                return { ...prev, [aKey]: undefined };
            });

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
        if (sResTableList && sResTableList?.data && sResTableList?.data?.rows) setTableList(sResTableList.data.rows);
        else setTableList([]);
    };
    const handleBackup = async () => {
        const sResBackupStatus: any = await backupStatus();
        updateLastCheckTime();
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

        if (!sResBackupStatus || !sResBackupStatus?.success) {
            setCreateRes(sResBackupStatus?.data?.reason ?? sResBackupStatus?.statusText);
            return;
        }
        setCreateRes(undefined);

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
    const updateBakcupList = async () => {
        const sBackupListRes: any = await getBackupDBList();
        if (sBackupListRes && sBackupListRes?.success) setBackupList(sBackupListRes?.data || []);
        else setBackupList([]);
    };
    const updateLastCheckTime = () => {
        const sDate = new Date();
        setLastCheckTime(moment(sDate).format('yyyy-MM-DD HH:mm:ss'));
    };
    const handleStatusRefresh = async () => {
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
        updateLastCheckTime();
        if (sStatusCode.path === '') updateBakcupList();

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
    };
    const createBackup = async () => {
        const sVaildPayload = JSON.parse(JSON.stringify(sPayload));
        if (sVaildPayload?.type === '' || sVaildPayload?.path === '') return; // Common
        if (sVaildPayload?.type === 'table' && sVaildPayload?.tableName === '') return; // Table name
        if (sVaildPayload?.duration && sVaildPayload?.duration?.type === '') return; // FULL BACKUP
        if (sVaildPayload?.duration && sVaildPayload?.duration?.type === 'incremental' && sVaildPayload?.duration?.after === '') return; // INCREMENTAL BACKUP
        if (sTimestampErr.from || sTimestampErr.to) return;
        if (sVaildPayload?.duration && sVaildPayload?.duration?.type === 'time range') {
            sVaildPayload.duration.from = convertTimestamp(sVaildPayload.duration.from) + '';
            sVaildPayload.duration.to = convertTimestamp(sVaildPayload.duration.to) + '';
            sVaildPayload.duration.type = 'time';
        }
        const sResBackup: any = await databaseBackup(sVaildPayload);
        if (sResBackup && sResBackup?.success) {
            await handleBackup();
        } else setCreateRes(sResBackup?.data?.reason ?? sResBackup?.statusText);
    };
    const Resizer = () => {
        return <SashContent className={`security-key-sash-style`} />;
    };

    useEffect(() => {
        setCreateRes(undefined);
        setTimestampErr({ from: undefined, to: undefined });
        if (pCode?.code?.path !== '') setPageMode('VIEW');
        else setPageMode('CREATE');
        setPayload(pCode.code);
    }, [pCode]);
    useEffect(() => {
        if (pCode.id === sSelectedTab && sPageMode === 'VIEW') handleStatusRefresh();
    }, [sSelectedTab]);

    useSchedule(pCode.id === sSelectedTab && sPageMode === 'VIEW' ? handleStatusRefresh : undefined, 1000 * 30);

    return (
        <>
            <Page>
                <SplitPane sashRender={() => Resizer()} split={isVertical ? 'vertical' : 'horizontal'} sizes={sGroupWidth} onChange={setGroupWidth}>
                    {
                        <Pane minSize={400}>
                            <Page.Header />
                            <Page.Body>
                                {/* VIEW Backup in progress */}
                                {sPageMode === 'VIEW' && (
                                    <Page.ContentBlock>
                                        <Page.DpRowBetween>
                                            <Page.SubTitle>Backup in progress...</Page.SubTitle>
                                            <div style={{ display: 'flex', marginTop: '12px', flexDirection: 'column', alignItems: 'end' }}>
                                                <Page.TextButton pText="Check" pType="CREATE" pCallback={handleStatusRefresh} />
                                                <div style={{ marginRight: '16px', marginTop: '-12px' }}>
                                                    <span style={{ fontSize: '10px', color: '#5d5d5d' }}>last checked at {sLastCheckTime}</span>
                                                </div>
                                            </div>
                                        </Page.DpRowBetween>
                                    </Page.ContentBlock>
                                )}
                                {/* Backup type */}
                                <Page.ContentBlock>
                                    <Page.ContentTitle>backup type</Page.ContentTitle>
                                    {sPageMode === 'CREATE' && (
                                        <>
                                            <Page.Selector
                                                pList={[
                                                    { name: 'database', data: 'database' },
                                                    { name: 'table', data: 'table' },
                                                ]}
                                                pSelectedItem={sPayload?.type}
                                                pCallback={(aSelectedItem: any) => {
                                                    setTypeSelect(aSelectedItem);
                                                }}
                                            />
                                        </>
                                    )}
                                    {sPageMode === 'VIEW' && <Page.ContentDesc>{sPayload.type.toUpperCase()}</Page.ContentDesc>}
                                    {/* Table name & CREATE */}
                                    {sPayload?.type === 'table' && sPageMode === 'CREATE' && (
                                        <Page.ContentBlock>
                                            <Page.ContentText pContent="Table name" />
                                            {sPageMode === 'CREATE' && (
                                                <div onClick={getTableNameList}>
                                                    <Page.Selector
                                                        pWidth="365px"
                                                        pList={
                                                            sTableList.map((aItem: any) => {
                                                                return { name: aItem[3], data: aItem[3] };
                                                            }) ?? []
                                                        }
                                                        pSelectedItem={sPayload?.tableName || ''}
                                                        pCallback={(aSelectedItem: any) => {
                                                            setTableName(aSelectedItem);
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </Page.ContentBlock>
                                    )}
                                </Page.ContentBlock>
                                {/* Table name & VIEW*/}
                                {sPayload?.type === 'table' && sPageMode === 'VIEW' && (
                                    <Page.ContentBlock>
                                        <Page.ContentTitle>Table name</Page.ContentTitle>
                                        <Page.ContentDesc>{sPayload.tableName.toUpperCase()}</Page.ContentDesc>
                                    </Page.ContentBlock>
                                )}
                                {/* Backup duration type  */}
                                <Page.ContentBlock>
                                    <Page.ContentTitle>time duration</Page.ContentTitle>
                                    {sPageMode === 'CREATE' && (
                                        <Page.Selector
                                            pList={[
                                                { name: 'full', data: 'full' },
                                                { name: 'incremental', data: 'incremental' },
                                                { name: 'time range', data: 'time range' },
                                            ]}
                                            pSelectedItem={sPayload?.duration?.type}
                                            pCallback={(aSelectedItem: any) => {
                                                setDurationTypeSelect(aSelectedItem);
                                            }}
                                        />
                                    )}
                                    {sPageMode === 'VIEW' && (
                                        <Page.ContentDesc>{sPayload.duration.type === 'time' ? 'time range'.toUpperCase() : sPayload.duration.type}</Page.ContentDesc>
                                    )}
                                    {/* Incremental backup */}
                                    {sPayload?.duration?.type === 'incremental' && sPageMode === 'CREATE' && (
                                        <>
                                            <Page.Space />
                                            <Page.ContentText pContent="Previous backup directory"></Page.ContentText>
                                            <Page.ContentDesc>Path of full or previous incremental backup.</Page.ContentDesc>
                                            <Page.Input pAutoFocus pCallback={(event: React.FormEvent<HTMLInputElement>) => setDurationAfter(event)} pWidth="365px" />
                                        </>
                                    )}
                                    {/* Time Duration backup */}
                                    {sPayload?.duration?.type === 'time range' && sPageMode === 'CREATE' && (
                                        <>
                                            <Page.Space />
                                            <Page.ContentText pContent="From" />
                                            <Page.DateTimePicker pTime={sPayload?.duration?.from} pSetApply={(e: any) => handleTime('from', e)} />
                                            <Page.ContentText pContent="to" />
                                            <Page.DateTimePicker pTime={sPayload?.duration?.to} pSetApply={(e: any) => handleTime('to', e)} />
                                            <Page.Space />
                                            {((sTimestampErr?.from && String(sTimestampErr?.from)) || (sTimestampErr?.to && String(sTimestampErr?.to))) && (
                                                <Page.ContentDesc>
                                                    <Page.TextResErr pText={sTimestampErr?.from ?? sTimestampErr?.to} />
                                                </Page.ContentDesc>
                                            )}
                                        </>
                                    )}
                                </Page.ContentBlock>
                                {/* Incremental bakcup VIEW */}
                                {sPayload?.duration?.type === 'incremental' && sPageMode === 'VIEW' && (
                                    <>
                                        <Page.Space />
                                        <Page.ContentTitle>Previous backup directory</Page.ContentTitle>
                                        <Page.ContentDesc>{sPayload.duration.after}</Page.ContentDesc>
                                    </>
                                )}
                                {/* Time Duration VIEW */}
                                {sPayload?.duration?.type === 'time' && sPageMode === 'VIEW' && (
                                    <>
                                        <Page.ContentBlock>
                                            <Page.ContentTitle>From</Page.ContentTitle>
                                            <Page.ContentDesc>{sPayload.duration.from ? changeUtcToText(Number(sPayload.duration.from)) : sPayload.duration.from}</Page.ContentDesc>
                                        </Page.ContentBlock>
                                        <Page.ContentBlock>
                                            <Page.ContentTitle>to</Page.ContentTitle>
                                            <Page.ContentDesc>{sPayload.duration.to ? changeUtcToText(Number(sPayload.duration.to)) : sPayload.duration.to}</Page.ContentDesc>
                                        </Page.ContentBlock>
                                    </>
                                )}
                                {/* Backup path */}
                                <Page.ContentBlock>
                                    <Page.ContentTitle>destination Path</Page.ContentTitle>
                                    {sPageMode === 'CREATE' && (
                                        <>
                                            <Page.ContentDesc>Absolute and relative path can be used for backup directory.</Page.ContentDesc>
                                            <Page.Input pAutoFocus pValue={sPayload?.path ?? ''} pCallback={(event: React.FormEvent<HTMLInputElement>) => setPath(event)} />
                                        </>
                                    )}
                                    {sPageMode === 'VIEW' && <Page.ContentDesc>{sPayload.path}</Page.ContentDesc>}
                                </Page.ContentBlock>
                                {/* Create btn */}
                                {sPageMode === 'CREATE' && (
                                    <Page.ContentBlock>
                                        <Page.TextButton pText="Backup" pType="CREATE" pCallback={createBackup} />
                                        {sCreateRes && (
                                            <Page.ContentDesc>
                                                <div style={{ marginTop: '-10px' }}>
                                                    <Page.TextResErr pText={sCreateRes} />
                                                </div>
                                            </Page.ContentDesc>
                                        )}
                                    </Page.ContentBlock>
                                )}
                            </Page.Body>
                        </Pane>
                    }
                    <Pane>
                        <Page.Header>
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
                        </Page.Header>
                        {sPageMode === 'CREATE' && (
                            <Page.Body>
                                <Page.ContentBlock>
                                    <Page.SubTitle>Database Backup</Page.SubTitle>
                                    <Page.ContentDesc>
                                        Machbase’s database backup is classified as follows, and either backup of the entire database or backup of the specific table is possible.
                                    </Page.ContentDesc>
                                </Page.ContentBlock>
                                <Page.ContentBlock>
                                    <div style={{ width: 'auto', maxWidth: '1000px' }}>
                                        <Page.Table pList={backupTable} dotted />
                                    </div>
                                </Page.ContentBlock>
                                <Page.ContentBlock>
                                    <Page.ContentDesc>Syntax:</Page.ContentDesc>
                                    <Page.CopyBlock pContent={backupSyntax} />
                                </Page.ContentBlock>
                                <Page.ContentBlock>
                                    <Page.ContentDesc>{explainPathAndTime}</Page.ContentDesc>
                                </Page.ContentBlock>
                                <Page.ContentBlock>
                                    <Page.ContentDesc>Example:</Page.ContentDesc>
                                    <Page.CopyBlock pContent={exampleBackup} />
                                </Page.ContentBlock>
                                <Page.ContentBlock>
                                    <Page.ContentTitle>backup type</Page.ContentTitle>
                                    <Page.ContentDesc>{explainEtc1}</Page.ContentDesc>
                                </Page.ContentBlock>
                                <Page.ContentBlock>
                                    <Page.ContentTitle>Time Duration</Page.ContentTitle>
                                    <Page.ContentDesc>{explainEtc2}</Page.ContentDesc>
                                </Page.ContentBlock>
                                <Page.ContentBlock>
                                    <Page.ContentTitle>destination Path</Page.ContentTitle>
                                    <Page.ContentDesc>{explainEtc3}</Page.ContentDesc>
                                    <Page.ContentDesc>{explainEtc4}</Page.ContentDesc>
                                </Page.ContentBlock>
                            </Page.Body>
                        )}
                    </Pane>
                </SplitPane>
            </Page>
        </>
    );
};
