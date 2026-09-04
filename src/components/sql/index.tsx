import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { SplitPane, Pane, Page, Tabs } from '@/design-system/components';
import RESULT from './result';
import CHART from '@/components/chart';
import { gBoardList, GBoardListType } from '@/recoil/recoil';
import { useRecoilState } from 'recoil';
import { getTqlChart } from '@/api/repository/machiot';
import { envDirectiveWarning, SQL_BASE_LIMIT, sqlBasicFormatter, sqlCsvDownloadUrl, STATEMENT_TYPE } from '@/utils/sqlFormatter';
import { Button } from '@/design-system/components';
import './index.scss';
import { BarChart, AiOutlineFileDone, Save, LuFlipVertical, Play, SaveAs, Download, RowNumberOn, RowNumberOff } from '@/assets/icons/Icon';
import { FaStop } from 'react-icons/fa';
import { useAbortController } from '@/hooks/useAbortController';
import { isJsonString } from '@/utils/utils';
import { PositionType, SelectionType } from '@/utils/sqlQueryParser';
import { MonacoEditor } from '../monaco/MonacoEditor';
import { DOWNLOADER_EXTENSION, sqlOriginDataDownloader } from '@/utils/sqlOriginDataDownloader';
import { postSplitter } from '@/api/repository/api';
import { Loader } from '../loader';
import { SqlSplitHelper, SplitItemType } from '@/utils/TQL/SqlSplitHelper';
import { RiTimeZoneLine } from 'react-icons/ri';
import { TimeZoneModal } from '../modal/TimeZoneModal';
import { isKnownDatabase, TargetDatabaseChip, useTabTargetDatabase } from '@/components/database/targetDatabase';
import { applyTargetDatabase } from '@/utils/sqlTargetDatabase';
import { touchRecentDatabase } from '@/utils/targetDatabaseStore';

/**
 * `4.100208ms` from the TQL sink, as `4.1 ms` for the result footer. An unfamiliar shape is passed
 * through untouched rather than dropped — a number we cannot parse is still information.
 */
const formatElapse = (aElapse: unknown): string => {
    const sText = String(aElapse ?? '').trim();
    const sMatch = /^([0-9]*\.?[0-9]+)\s*([a-zµ]+)$/i.exec(sText);
    if (!sMatch) return sText;
    return `${Number(sMatch[1]).toFixed(1)} ${sMatch[2]}`;
};

/** `10 rows`, `1 row`. */
const formatRows = (aCount: number): string => `${aCount} ${aCount === 1 ? 'row' : 'rows'}`;

const Sql = ({
    pInfo,
    pHandleSaveModalOpen,
    setIsSaveModal,
    pSetDragStat,
    pIsActiveTab,
}: {
    pInfo: GBoardListType;
    pHandleSaveModalOpen: any;
    setIsSaveModal: (aValue: boolean) => void;
    pSetDragStat: any;
    pIsActiveTab: boolean;
}) => {
    const [isVertical, setIsVertical] = useState<boolean>(true);
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const [sizes, setSizes] = useState<string[] | number[]>(['50%', '50%']);
    const [sTimeRange, setTimeRange] = useState('2006-01-02 15:04:05');
    const [sTimeZone, setTimeZone] = useState('LOCAL');
    const [sIsTimeZoneModal, setIsTimeZoneModal] = useState<boolean>(false);
    const [sSelectedSubTab, setSelectedSubTab] = useState<'RESULT' | 'CHART'>('RESULT');
    // const [sLogList, setLogList] = useState<string[]>([]);
    const [sSqlQueryTxt, setSqlQueryTxt] = useState<string>(pInfo.code);
    const [sSqlResponseData, setSqlResponseData] = useState<any>();
    const [sResultLimit, setResultLimit] = useState<number>(1);
    const [sErrLog, setErrLog] = useState<string | null>(null);
    // The error is "the chip points at a database that no longer exists", which gets its own banner colour.
    const [sDbNotFound, setDbNotFound] = useState<boolean>(false);
    // `-- env:` directives the splitter could not apply. Non-blocking: shown next to the result, never instead of it.
    const [sEnvWarnLog, setEnvWarnLog] = useState<string | null>(null);
    // The toolbar's target database. Never written into the worksheet — only into `env.use` at TQL assembly time.
    const {
        targetDatabase: sTargetDb,
        setTargetDatabase: setTargetDb,
        databases: sDatabaseList,
        sessionDatabase: sSessionDb,
        reload: reloadDatabases,
    } = useTabTargetDatabase();
    const [sElapse, setElapse] = useState<string>('');
    const [sTextField, setTextField] = useState<string>('');
    const [sMoreResult, setMoreResult] = useState<boolean>(false);
    const [sShowRowNumber, setShowRowNumber] = useState<boolean>(true);
    const [sChartAxisList, setChartAxisList] = useState<string[]>([]);
    const [sChartQueryList, setChartQueryList] = useState<STATEMENT_TYPE[] | []>([]);
    const sSaveCommand = useRef<any>(null);
    const sNavi = useRef(null);
    const [sProcessing, setProcessing] = useState<boolean>(false);
    const { createSignal, abort } = useAbortController();
    const [sOldFetchTxt, setOldFetchTxt] = useState<STATEMENT_TYPE | undefined>(undefined);
    const [sEndRecord, setEndRecord] = useState<boolean>(false);
    const [sSqlLocation, setSqlLocation] = useState<{
        position: PositionType;
        selection: SelectionType;
    }>({
        position: { column: 1, lineNumber: 1 },
        selection: {
            endColumn: 1,
            endLineNumber: 1,
            positionColumn: 1,
            positionLineNumber: 1,
            selectionStartColumn: 1,
            selectionStartLineNumber: 1,
            startColumn: 1,
            startLineNumber: 1,
        },
    });

    const handleMouseWheel = (e: any) => {
        const scrollable: any = sNavi.current;

        if (scrollable) {
            scrollable.scrollLeft += e.deltaY;
        }
    };
    enum SqlTabType {
        RESULT = 'RESULT',
        CHART = 'CHART',
    }
    const sSqlTabList: SqlTabType[] = [SqlTabType.RESULT, SqlTabType.CHART];

    const handleSplitVertical = () => {
        setIsVertical(true);
    };
    const handleSplitHorizontal = () => {
        setIsVertical(false);
    };

    const handleChangeText = (aText: any) => {
        setSqlQueryTxt(JSON.parse(JSON.stringify(aText)));
        setBoardList(
            sBoardList.map((aItem) => {
                return aItem.id === pInfo.id ? { ...aItem, code: aText } : aItem;
            })
        );
    };

    const checkCtrl = async () => {
        sqlMultiLineParser();
    };

    const getTargetQuery = (): string => {
        return sOldFetchTxt?.text ?? '';
    };

    /**
     * Picking a database says nothing anywhere else. The console is shared by every tab, so a line
     * about this worksheet's chip would surface while the user is running something in another one
     * — the chip's own label and the result footer say which database is in play, and both are
     * scoped to the tab they belong to.
     */
    const handleChangeTargetDb = (aDatabase: string | null) => {
        setTargetDb(aDatabase);
        if (aDatabase) touchRecentDatabase(aDatabase);
        if (sDbNotFound) {
            setDbNotFound(false);
            setErrLog(null);
        }
    };

    const sqlMultiLineParser = async (
        _?: string,
        aLocation?: {
            position: PositionType;
            selection: SelectionType;
        }
    ) => {
        // The chip may still point at a database another session dropped. Answer that here rather
        // than sending a query we know the server will refuse.
        if (sTargetDb && !isKnownDatabase(sTargetDb)) {
            // Word for word what the server answers for `use()` on a name it does not have —
            // measured on v8.7 — so the banner reads the same whether we caught it or it did.
            const sReason = `MACHCLI-ERR-2839, Database (${sTargetDb}) does not exist.`;
            setSqlResponseData(undefined);
            setChartQueryList([]);
            setChartAxisList([]);
            setEnvWarnLog(null);
            setDbNotFound(true);
            setErrLog(sReason);
            setTextField('');
            setProcessing(false);
            return;
        }

        setProcessing(true);
        setTextField('Processing...');
        setSqlResponseData(undefined);
        setErrLog(null);
        setDbNotFound(false);
        setEnvWarnLog(null);
        setChartQueryList([]);
        setChartAxisList([]);
        const signal = createSignal();

        try {
            const splitList = await fetchSplitter(signal);
            const location = aLocation ?? sSqlLocation;
            // The chip's value joins `env` here, once — the grid, "more rows" and the CSV download
            // all read the statement this produces, so they stay pinned to the database the run used.
            // Filter first, then merge, so the raw and merged arrays stay index-aligned. The CHART
            // tab needs the raw one: it issues its own query and has to re-apply the *current*
            // chip, which it cannot do to a statement that already carries an injected `env.use`.
            const sRawQuery = SqlSplitHelper(location, splitList);
            const sParsedQuery = applyTargetDatabase<SplitItemType>(sRawQuery, sTargetDb);

            setSqlLocation(location);
            if (!sParsedQuery || sParsedQuery?.length === 0 || (sParsedQuery?.length === 1 && sParsedQuery[0]?.length === 0)) {
                setProcessing(false);
                setTextField('');
                return;
            }
            await fetchSql(sParsedQuery, sRawQuery, signal);
        } catch (e: any) {
            if (e?.code === 'ERR_CANCELED') {
                setTextField('Cancelled.');
                setProcessing(false);
                return;
            }
            // Query failed - let fetchSql's internal error handling apply
            setProcessing(false);
        }
    };

    const fetchSplitter = async (signal?: AbortSignal) => {
        const splitRes: any = await postSplitter(sSqlQueryTxt, signal);
        if (splitRes?.success) return splitRes.data.statements;
        return undefined;
    };

    const fetchSql = useCallback(
        async (aParsedQuery: STATEMENT_TYPE[], aRawQuery: STATEMENT_TYPE[], signal: AbortSignal) => {
            setEndRecord(() => false);
            setEnvWarnLog(envDirectiveWarning(aParsedQuery));
            const sQueryReslutList: any = [];

            try {
                for (const curQuery of aParsedQuery) {
                    const sQueryResult = await getTqlChart(sqlBasicFormatter(curQuery.text, 1, sTimeRange, sTimeZone, SQL_BASE_LIMIT, curQuery.env), undefined, signal);
                    sQueryReslutList.push(sQueryResult);
                    if (!sQueryResult?.data?.success) throw new Error('Query failed');
                }
            } catch (e: any) {
                if (e?.code === 'ERR_CANCELED') throw e;
                setErrLog(sQueryReslutList?.at(-1)?.data?.reason);
                setTextField('');
                setProcessing(false);
                return false;
            }

            const sLowerQuery = aParsedQuery[sQueryReslutList.length - 1];
            // The chart gets the statement as the splitter reported it — `-- env: use=` intact, no
            // chip value merged in — so a later chip change is not mistaken for a directive.
            const sLowerRawQuery = aRawQuery[sQueryReslutList.length - 1] ?? sLowerQuery;

            // insert, create, delete, update...
            if (sQueryReslutList.at(-1)?.data?.success && sQueryReslutList.at(-1)?.data?.data && sQueryReslutList.at(-1)?.data?.data?.columns) {
                setChartQueryList([sLowerRawQuery]);
                setChartAxisList(sQueryReslutList.at(-1).data.data.columns);
            } else {
                setChartQueryList([]);
                setChartAxisList([]);
            }

            setResultLimit(2);
            setElapse(String(sQueryReslutList.at(-1)?.data?.elapse ?? ''));
            setSqlResponseData(sQueryReslutList.at(-1).data.data);

            if (sQueryReslutList.at(-1).data.success === true) {
                setErrLog(null);
                setTextField('');
                setEndRecord(sQueryReslutList.at(-1).data.data.rows.length < SQL_BASE_LIMIT);
                setSelectedSubTab('RESULT');
                setOldFetchTxt(sLowerQuery);
                setProcessing(false);
                return true;
            } else {
                setTextField('');
                setProcessing(false);
                return false;
            }
        },
        [sTimeRange, sTimeZone]
    );

    const getSubTabIcon = (aTarget: string) => {
        switch (aTarget) {
            case SqlTabType.RESULT:
                return <AiOutlineFileDone />;
            case SqlTabType.CHART:
                return <BarChart />;
        }
    };

    const onMoreResult = () => {
        setMoreResult(true);
    };

    const fetchMoreResult = async () => {
        const paredQuery = sOldFetchTxt;
        if (!paredQuery?.text) return;
        if (sEndRecord) return;
        const sSqlResult = await getTqlChart(sqlBasicFormatter(paredQuery?.text, sResultLimit, sTimeRange, sTimeZone, SQL_BASE_LIMIT, paredQuery?.env));
        const sParsedSqlResult = JSON.parse(isJsonString(sSqlResult.request.response) ? sSqlResult.request.response : '{}');
        if (sSqlResult.data.data && sParsedSqlResult) {
            setResultLimit(sResultLimit + 1);
            setSqlResponseData(
                JSON.parse(
                    JSON.stringify({
                        columns: sSqlResponseData.columns,
                        rows: [...sSqlResponseData.rows, ...sParsedSqlResult.data.rows],
                        types: sSqlResponseData.types,
                    })
                )
            );
            setEndRecord(sParsedSqlResult.data.rows.length < SQL_BASE_LIMIT);
        }
    };

    const handleDownloadCSV = () => {
        if (sOldFetchTxt && sOldFetchTxt?.text !== '' && sSqlResponseData && !(sSqlResponseData?.rows?.length === 1 && sSqlResponseData?.columns?.length === 1)) {
            const sql = sqlCsvDownloadUrl({
                aUrl: window.location.origin + '/web/api/tql-exec',
                aSql: sOldFetchTxt.text,
                aTimeFormat: sTimeRange,
                aTimeZone: sTimeZone,
                aToken: localStorage.getItem('accessToken'),
                env: sOldFetchTxt?.env,
            });
            sqlOriginDataDownloader(sql, DOWNLOADER_EXTENSION.CSV);
        }
    };
    const handleTimeZone = (time: { timeFormat: string; timeZone: string }) => {
        setTimeRange(time.timeFormat);
        setTimeZone(time.timeZone);
        setIsTimeZoneModal(false);
    };

    useEffect(() => {
        if (sMoreResult) {
            fetchMoreResult();
            setMoreResult(false);
        }
    }, [sMoreResult]);

    /**
     * `10 rows · elapsed 4.1 ms`.
     *
     * No database here. The footer used to name one, and it could not be right: a statement that
     * names `db.user.table` reads that database whatever `use()` says (measured both ways on
     * v8.7), and a join can span several — so "the database this result came from" has no single
     * answer to print. Reporting the `use()` scope instead would be true but reads as the same
     * claim, which is worse than saying nothing.
     */
    const sResultMeta = useMemo(() => {
        if (!sSqlResponseData) return '';
        const sParts = [formatRows(sSqlResponseData?.rows?.length ?? 0)];
        const sElapsed = formatElapse(sElapse);
        if (sElapsed) sParts.push(`elapsed ${sElapsed}`);
        return sParts.join(' · ');
    }, [sSqlResponseData, sElapse]);

    /**
     * The statement the CHART tab draws from, with the chip's value merged in.
     *
     * The chip rides on `pQueryList` rather than CHART's `pTargetDb` on purpose. Both reach the
     * same place — `applyTargetDatabase` inside the chart is a no-op once `pTargetDb` is null, so
     * `env.use` set here is what the chart query carries — but only `pTargetDb` sits in the
     * chart's redraw effect. Handing the value over this way means picking a database costs
     * nothing: the drawing stays as it is until the user presses the chart's own play button,
     * which reads this prop at click time and redraws against whatever the chip says then.
     *
     * If CHART's effect ever grows a `pQueryList` dependency, that gating is gone and every chip
     * change fires a query again.
     */
    const sChartQueryListForDraw = useMemo(() => applyTargetDatabase<STATEMENT_TYPE>(sChartQueryList, sTargetDb), [sChartQueryList, sTargetDb]);

    return (
        <>
            <Page pRef={sSaveCommand}>
                <SplitPane
                    sashRender={() => <></>}
                    split={isVertical ? 'vertical' : 'horizontal'}
                    onDragEnd={() => pSetDragStat(false)}
                    onDragStart={() => pSetDragStat(true)}
                    sizes={sizes}
                    onChange={setSizes}
                >
                    <Pane minSize={50}>
                        <Page.Header>
                            <Button
                                size="icon"
                                variant="ghost"
                                isToolTip
                                toolTipContent={sProcessing ? 'Stop code' : 'Run code'}
                                icon={sProcessing ? <FaStop size={14} /> : <Play size={16} />}
                                onClick={() => (sProcessing ? abort() : checkCtrl())}
                            />
                            <div className="editor-header-actions">
                                <Button.Group>
                                    {/* Only where there is a choice to make — an empty catalogue is every pre-v8.7 server. */}
                                    {sDatabaseList.length > 1 ? (
                                        <TargetDatabaseChip
                                            sessionDatabase={sSessionDb}
                                            databases={sDatabaseList}
                                            value={sTargetDb}
                                            onChange={handleChangeTargetDb}
                                            onOpen={reloadDatabases}
                                        />
                                    ) : null}
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        isToolTip
                                        toolTipContent="Time format / Time zone"
                                        icon={<RiTimeZoneLine size={16} />}
                                        onClick={() => setIsTimeZoneModal(!sIsTimeZoneModal)}
                                    />
                                </Button.Group>
                                <span className="editor-header-divider" />
                                <Button.Group>
                                    <Button size="icon" variant="ghost" isToolTip toolTipContent="Save" icon={<Save size={16} />} onClick={pHandleSaveModalOpen} />
                                    <Button size="icon" variant="ghost" isToolTip toolTipContent="Save as" icon={<SaveAs size={16} />} onClick={() => setIsSaveModal(true)} />
                                </Button.Group>
                            </div>
                        </Page.Header>
                        <Page.Body>
                            <MonacoEditor
                                pIsActiveTab={pIsActiveTab}
                                pText={sSqlQueryTxt}
                                pLang="sql"
                                onChange={handleChangeText}
                                onRunCode={sqlMultiLineParser}
                                onSelectLine={setSqlLocation}
                            />
                        </Page.Body>
                    </Pane>
                    <Pane style={{ overflow: 'initial' }} minSize={50}>
                        <Page.Header>
                            <Tabs.Root
                                selectedTab={sSelectedSubTab}
                                onTabSelect={(tab) => {
                                    const tabValue = tab.id as 'RESULT' | 'CHART';
                                    setSelectedSubTab(tabValue);
                                }}
                            >
                                <Tabs.Header variant="sub">
                                    <Tabs.List onWheel={handleMouseWheel}>
                                        {sSqlTabList.map((aTab: SqlTabType) => {
                                            return (
                                                <Tabs.Item key={aTab} value={aTab} variant="sub">
                                                    {getSubTabIcon(aTab)}
                                                    <span>{aTab}</span>
                                                </Tabs.Item>
                                            );
                                        })}
                                    </Tabs.List>
                                </Tabs.Header>
                            </Tabs.Root>
                            <Button.Group>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    isToolTip
                                    toolTipContent={`${sShowRowNumber ? 'Hide' : 'Show'} row number`}
                                    icon={sShowRowNumber ? <RowNumberOn size={16} /> : <RowNumberOff size={16} />}
                                    active={sShowRowNumber}
                                    onClick={() => setShowRowNumber((prev) => !prev)}
                                    aria-label={`${sShowRowNumber ? 'Hide' : 'Show'} row number`}
                                />
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    disabled={!sOldFetchTxt || !sSqlResponseData || (sSqlResponseData?.rows?.length === 1 && sSqlResponseData?.columns?.length === 1)}
                                    isToolTip
                                    toolTipContent="Download CSV"
                                    icon={<Download size={16} />}
                                    onClick={handleDownloadCSV}
                                />
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    isToolTip
                                    toolTipContent="Vertical"
                                    icon={<LuFlipVertical style={{ transform: 'rotate(90deg)' }} size={16} />}
                                    active={isVertical}
                                    onClick={handleSplitVertical}
                                />
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    isToolTip
                                    toolTipContent="Horizontal"
                                    icon={<LuFlipVertical size={16} />}
                                    active={!isVertical}
                                    onClick={handleSplitHorizontal}
                                />
                            </Button.Group>
                        </Page.Header>
                        <Page.Body>
                            {sSelectedSubTab === 'RESULT' ? (
                                <div className="sql-result-body">
                                    {/* `-- env:` directives the splitter rejected: a banner above the body, so a successful result stays visible. */}
                                    {sEnvWarnLog ? <div className="sql-env-warn-body">{sEnvWarnLog}</div> : null}
                                    <div className="sql-result-body-content">
                                        {sErrLog ? (
                                            <div className={sDbNotFound ? 'sql-error-body sql-error-body--db-not-found' : 'sql-error-body'} style={{ padding: '0 1rem' }}>
                                                {sErrLog}
                                            </div>
                                        ) : sTextField ? (
                                            <div className="sql-processing-body" style={{ padding: '0 1rem', display: 'flex', alignItems: 'center' }}>
                                                <span>{sTextField}</span>
                                                {sProcessing && (
                                                    <div style={{ marginLeft: '4px' }}>
                                                        <Loader width="12px" height="12px" borderRadius="90%" />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <RESULT
                                                pDisplay={sSelectedSubTab === 'RESULT' ? '' : 'none'}
                                                pSqlResponseData={sSqlResponseData}
                                                pShowRowNumber={sShowRowNumber}
                                                pExcludeRowNumberFromSelection={true}
                                                onMoreResult={() => onMoreResult()}
                                                pHelpTxt={sOldFetchTxt?.text ?? ''}
                                            />
                                        )}
                                    </div>
                                    {/* Which database these rows came from — the chip leaves no trace in the worksheet, so this is the record. */}
                                    {!sErrLog && !sTextField && sSqlResponseData ? <div className="sql-result-meta">{sResultMeta}</div> : null}
                                </div>
                            ) : null}

                            <CHART
                                pQueryList={sChartQueryListForDraw}
                                pDisplay={sSelectedSubTab === 'CHART' ? '' : 'none'}
                                pChartAixsList={sChartAxisList}
                                pIsVertical={isVertical}
                                pSqlQueryTxt={getTargetQuery}
                                pSizes={sizes}
                            />
                        </Page.Body>
                    </Pane>
                </SplitPane>
            </Page>
            <TimeZoneModal isOpen={sIsTimeZoneModal} formatInitValue={sTimeRange} zoneInitValue={sTimeZone} onClose={handleTimeZone} />
        </>
    );
};

export default Sql;
