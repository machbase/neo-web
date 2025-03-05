import { useEffect, useState, useRef } from 'react';
import SplitPane, { Pane } from 'split-pane-react';
import RESULT from './result';
import CHART from '@/components/chart';
import AUTOCOMBOBOX from './autoCombobox';
import { gBoardList } from '@/recoil/recoil';
import { useRecoilState } from 'recoil';
import { getTqlChart } from '@/api/repository/machiot';
import { SQL_BASE_LIMIT, sqlBasicFormatter, STATEMENT_TYPE } from '@/utils/sqlFormatter';
import { IANA_TIMEZONES } from '@/assets/ts/timezones';
import { TIME_FORMAT_LIST } from '@/assets/ts/timeFormat';
import './index.scss';
import { BarChart, AiOutlineFileDone, AiOutlineSnippets, Save, LuFlipVertical, Play, SaveAs, Download } from '@/assets/icons/Icon';
import { fixedEncodeURIComponent, isJsonString } from '@/utils/utils';
import { PositionType, SelectionType } from '@/utils/sqlQueryParser';
import { MonacoEditor } from '../monaco/MonacoEditor';
import { IconButton } from '@/components/buttons/IconButton';
import { DOWNLOADER_EXTENSION, sqlOriginDataDownloader } from '@/utils/sqlOriginDataDownloader';
import { postSplitter } from '@/api/repository/api';

const Sql = ({
    pInfo,
    pHandleSaveModalOpen,
    setIsSaveModal,
    pSetDragStat,
}: {
    pInfo: any;
    pHandleSaveModalOpen: any;
    setIsSaveModal: (aValue: boolean) => void;
    pSetDragStat: any;
}) => {
    const [isVertical, setIsVertical] = useState<boolean>(true);
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const [sizes, setSizes] = useState<string[] | number[]>(['50%', '50%']);
    const [sTimeRange, setTimeRange] = useState('2006-01-02 15:04:05');
    const [sTimeZone, setTimeZone] = useState('LOCAL');
    const [sSelectedSubTab, setSelectedSubTab] = useState<'RESULT' | 'CHART' | 'LOG'>('RESULT');
    // const [sLogList, setLogList] = useState<string[]>([]);
    const [sSqlQueryTxt, setSqlQueryTxt] = useState<string>(pInfo.code);
    const [sSqlResponseData, setSqlResponseData] = useState<any>();
    const [sResultLimit, setResultLimit] = useState<number>(1);
    const sEditorRef = useRef(null);
    const [sErrLog, setErrLog] = useState<string | null>(null);
    const [sMoreResult, setMoreResult] = useState<boolean>(false);
    const [sChartAxisList, setChartAxisList] = useState<string[]>([]);
    const [sChartQueryList, setChartQueryList] = useState<STATEMENT_TYPE[] | []>([]);
    const sSaveCommand = useRef<any>(null);
    const sNavi = useRef(null);
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
        LOG = 'LOG',
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

    const sqlMultiLineParser = async (
        _?: string,
        aLocation?: {
            position: PositionType;
            selection: SelectionType;
        }
    ) => {
        let parsedQuery: any = '';
        const splitList = await fetchSplitter();
        const location = aLocation ?? sSqlLocation;

        // SINGLE
        if (location.selection.endColumn === location.selection.startColumn && location.selection.endLineNumber === location.selection.startLineNumber) {
            parsedQuery = splitList.filter((statement: any) => {
                if (!statement.isComment && statement.beginLine <= location.selection.startLineNumber && location.selection.startLineNumber <= statement.endLine) {
                    return statement;
                }
            });
        }
        // MULTIPLE
        else {
            parsedQuery = splitList.filter((statement: any) => {
                if (!statement.isComment && statement.endLine >= location.selection.startLineNumber && statement.beginLine <= location.selection.endLineNumber) return statement;
            });
        }
        setSqlLocation(location);
        if (!parsedQuery || parsedQuery.length === 0 || (parsedQuery.length === 1 && parsedQuery[0].length === 0)) return;
        fetchSql(parsedQuery);
    };

    const fetchSplitter = async () => {
        const splitRes: any = await postSplitter(sSqlQueryTxt);
        if (splitRes?.success) return splitRes.data.statements;
        return undefined;
    };

    const fetchSql = async (aParsedQuery: STATEMENT_TYPE[]) => {
        setEndRecord(() => false);
        const sQueryReslutList: any = [];
        try {
            const fetchQuery = (aQuery: STATEMENT_TYPE) => {
                return new Promise((resolve, reject) => {
                    setTimeout(async () => {
                        const sQueryResult = await getTqlChart(sqlBasicFormatter(aQuery.text, 1, sTimeRange, sTimeZone, SQL_BASE_LIMIT, aQuery.env?.bridge));
                        sQueryReslutList.push(sQueryResult);
                        if (sQueryResult.data.success) resolve(true);
                        else reject(false);
                    }, 1);
                });
            };

            await aParsedQuery.reduce(async (previousPromise: any, curQuery: STATEMENT_TYPE) => {
                await previousPromise;
                return fetchQuery(curQuery);
            }, Promise.resolve());
        } catch {
            setErrLog(sQueryReslutList.at(-1).data.reason);
        }

        if (
            !sTimeRange.includes('ns') &&
            !sTimeRange.includes('us') &&
            !sTimeRange.includes('ms') &&
            !sTimeRange.includes('s') &&
            !sTimeZone.includes('LOCAL') &&
            !sTimeZone.includes('UTC')
        ) {
            const sAddTimezoneTxt = sTimeZone.split('/')[0];
            sQueryReslutList[sQueryReslutList.length - 1].data.data.columns[1] += ` (${sAddTimezoneTxt})`;
        }

        const sLowerQuery = aParsedQuery[sQueryReslutList.length - 1];

        // insert, create, delete, update...
        if (sQueryReslutList.at(-1)?.data?.success && sQueryReslutList.at(-1)?.data?.data && sQueryReslutList.at(-1)?.data?.data?.columns) {
            setChartQueryList([sLowerQuery]);
            setChartAxisList(sQueryReslutList.at(-1).data.data.columns);
        } else {
            setChartQueryList([]);
            setChartAxisList([]);
        }

        setResultLimit(2);
        setSqlResponseData(sQueryReslutList.at(-1).data.data);
        // setLogList([...sLogList, `${aParsedQuery}\n${sQueryReslutList[sQueryReslutList.length - 1].data.reason} : ${sQueryReslutList[sQueryReslutList.length - 1].data.success}`]);

        if (sQueryReslutList.at(-1).data.success === true) {
            setErrLog(null);
            setEndRecord(sQueryReslutList.at(-1).data.data.rows.length < SQL_BASE_LIMIT);
            setSelectedSubTab('RESULT');
            setOldFetchTxt(sLowerQuery);
            return true;
        } else {
            // setSelectedSubTab('LOG');
            return false;
        }
    };

    const getSubTabIcon = (aTarget: string) => {
        switch (aTarget) {
            case SqlTabType.RESULT:
                return <AiOutlineFileDone />;
            case SqlTabType.CHART:
                return <BarChart />;
            case SqlTabType.LOG:
                return <AiOutlineSnippets />;
        }
    };

    const onMoreResult = () => {
        setMoreResult(true);
    };

    const fetchMoreResult = async () => {
        // const paredQuery = sOldFetchTxt ?? getTargetQuery();
        const paredQuery = sOldFetchTxt;
        if (!paredQuery?.text) return;
        if (paredQuery?.text?.toLowerCase().includes('limit')) return;
        if (sEndRecord) return;
        const sSqlResult = await getTqlChart(sqlBasicFormatter(paredQuery?.text, sResultLimit, sTimeRange, sTimeZone, SQL_BASE_LIMIT, paredQuery?.env?.bridge));
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
            // setLogList([...sLogList, `${paredQuery}\n${sParsedSqlResult.elapse} : ${sParsedSqlResult.success}`]);
        }
    };

    const handleDownloadCSV = () => {
        if (sOldFetchTxt && sOldFetchTxt?.text !== '' && sSqlResponseData && !(sSqlResponseData?.rows?.length === 1 && sSqlResponseData?.columns?.length === 1)) {
            const url = window.location.origin + '/web/api/tql-exec';
            const token = localStorage.getItem('accessToken');
            const bridgeText = sOldFetchTxt?.env?.bridge ? encodeURI(`bridge("`) + fixedEncodeURIComponent(sOldFetchTxt?.env?.bridge) + encodeURI(`"),`) : '';
            const sEncodedText = fixedEncodeURIComponent(sOldFetchTxt.text);
            const sql =
                encodeURI(`${url}?$=SQL(`) +
                bridgeText +
                encodeURI(`\u0060`) +
                sEncodedText +
                encodeURI(`\u0060)\u000ACSV(timeformat("${sTimeRange}"), tz("${sTimeZone}"), httpHeader("Content-Disposition", "attachment"), heading(true))\u0026$token=${token}`);
            sqlOriginDataDownloader(sql, DOWNLOADER_EXTENSION.CSV);
        }
    };

    useEffect(() => {
        if (sMoreResult) {
            fetchMoreResult();
            setMoreResult(false);
        }
    }, [sMoreResult]);

    return (
        <div ref={sSaveCommand} style={{ width: '100%', height: '100%' }}>
            <SplitPane
                sashRender={() => <></>}
                split={isVertical ? 'vertical' : 'horizontal'}
                onDragEnd={() => pSetDragStat(false)}
                onDragStart={() => pSetDragStat(true)}
                sizes={sizes}
                onChange={setSizes}
            >
                <Pane minSize={50}>
                    <div
                        className="sql-header"
                        style={{
                            height: '40px',
                            background: '#262831',
                            justifyContent: 'space-between',
                        }}
                        ref={sNavi}
                        onWheel={handleMouseWheel}
                    >
                        <IconButton pIsToopTip pToolTipContent="Run code" pToolTipId="sql-tab-explorer-run-code" pIcon={<Play />} onClick={checkCtrl} />
                        <div className="sql-option-ctr">
                            <AUTOCOMBOBOX pName="sTimeRange" pList={TIME_FORMAT_LIST} pTarget={sTimeRange} pCallback={setTimeRange} />
                            <AUTOCOMBOBOX pName="sTimeZone" pList={IANA_TIMEZONES} pTarget={sTimeZone} pCallback={setTimeZone} />
                            <IconButton pIsToopTip pToolTipContent="Save" pToolTipId="sql-tab-explorer-save" pIcon={<Save />} onClick={pHandleSaveModalOpen} />
                            <IconButton pIsToopTip pToolTipContent="Save as" pToolTipId="sql-tab-explorer-save-as" pIcon={<SaveAs />} onClick={() => setIsSaveModal(true)} />
                        </div>
                    </div>
                    <div ref={sEditorRef} style={{ height: 'calc(100% - 40px)', width: '100%' }}>
                        <MonacoEditor pText={sSqlQueryTxt} pLang="sql" onChange={handleChangeText} onRunCode={sqlMultiLineParser} onSelectLine={setSqlLocation} />
                    </div>
                </Pane>
                <Pane style={{ overflow: 'initial' }}>
                    <div className={'sql-body'} style={{ height: '100%', marginLeft: '1px' }}>
                        <div
                            className="sql_tab"
                            style={{
                                height: '40px',
                                background: '#262831',
                                display: 'flex',
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                            }}
                        >
                            <div className="sql-tab-round-wrapper">
                                {sSqlTabList.map((aTab: SqlTabType) => {
                                    return (
                                        <div className="sql-tab-round" key={aTab} style={{ display: 'flex', flexDirection: 'row' }}>
                                            {sSelectedSubTab === aTab ? (
                                                <div className="round_right_wrap">
                                                    <div className="round_right"></div>
                                                </div>
                                            ) : (
                                                <></>
                                            )}
                                            <button
                                                className={sSelectedSubTab === aTab ? 'sql_tab_button sql_tab_select' : 'sql_tab_button sql_tab_none_select'}
                                                onClick={() => setSelectedSubTab(aTab)}
                                            >
                                                {getSubTabIcon(aTab)}
                                                <span>{aTab}</span>
                                            </button>
                                            {sSelectedSubTab === aTab ? (
                                                <div className="round_left_wrap">
                                                    <div className="round_left"></div>
                                                </div>
                                            ) : (
                                                <></>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="sub-tab-header-icon-ctr">
                                <IconButton
                                    pIsToopTip
                                    pToolTipContent="Download CSV"
                                    pToolTipId="sql-tab-divider-explorer-download"
                                    pIcon={<Download />}
                                    pDisabled={!sOldFetchTxt || !sSqlResponseData || (sSqlResponseData?.rows?.length === 1 && sSqlResponseData?.columns?.length === 1)}
                                    onClick={handleDownloadCSV}
                                />
                                <IconButton
                                    pIsToopTip
                                    pToolTipContent="Vertical"
                                    pToolTipId="sql-tab-divider-explorer-hori"
                                    pIcon={<LuFlipVertical style={{ transform: 'rotate(90deg)' }} />}
                                    pIsActive={isVertical}
                                    onClick={handleSplitVertical}
                                />
                                <IconButton
                                    pIsToopTip
                                    pToolTipContent="Horizontal"
                                    pToolTipId="sql-tab-divider-explorer-ver"
                                    pIcon={<LuFlipVertical />}
                                    pIsActive={!isVertical}
                                    onClick={handleSplitHorizontal}
                                />
                            </div>
                        </div>
                        {sSelectedSubTab === 'RESULT' ? (
                            sErrLog ? (
                                <div className="sql-error-body" style={{ padding: '0 1rem' }}>
                                    {sErrLog}
                                </div>
                            ) : (
                                <RESULT
                                    pDisplay={sSelectedSubTab === 'RESULT' ? '' : 'none'}
                                    pSqlResponseData={sSqlResponseData}
                                    onMoreResult={() => onMoreResult()}
                                    pHelpTxt={sOldFetchTxt?.text ?? ''}
                                />
                            )
                        ) : null}

                        {/* <LOG pDisplay={sSelectedSubTab === 'LOG' ? '' : 'none'} pLogList={sLogList} onClearLog={() => onClearLog()} /> */}
                        <CHART
                            pQueryList={sChartQueryList}
                            pDisplay={sSelectedSubTab === 'CHART' ? '' : 'none'}
                            pChartAixsList={sChartAxisList}
                            pIsVertical={isVertical}
                            pSqlQueryTxt={getTargetQuery}
                            pSizes={sizes}
                        />
                    </div>
                </Pane>
            </SplitPane>
        </div>
    );
};

export default Sql;
