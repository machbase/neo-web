import { useEffect, useState, useRef } from 'react';
import { SplitPane, Pane, Page, Tabs } from '@/design-system/components';
import RESULT from './result';
import CHART from '@/components/chart';
import { gBoardList } from '@/recoil/recoil';
import { useRecoilState } from 'recoil';
import { getTqlChart } from '@/api/repository/machiot';
import { SQL_BASE_LIMIT, sqlBasicFormatter, STATEMENT_TYPE } from '@/utils/sqlFormatter';
import { Button } from '@/design-system/components';
import './index.scss';
import { BarChart, AiOutlineFileDone, Save, LuFlipVertical, Play, SaveAs, Download } from '@/assets/icons/Icon';
import { fixedEncodeURIComponent, isJsonString } from '@/utils/utils';
import { PositionType, SelectionType } from '@/utils/sqlQueryParser';
import { MonacoEditor } from '../monaco/MonacoEditor';
import { DOWNLOADER_EXTENSION, sqlOriginDataDownloader } from '@/utils/sqlOriginDataDownloader';
import { postSplitter } from '@/api/repository/api';
import { Loader } from '../loader';
import { SqlSplitHelper } from '@/utils/TQL/SqlSplitHelper';
import { RiTimeZoneLine } from 'react-icons/ri';
import { TimeZoneModal } from '../modal/TimeZoneModal';

const Sql = ({
    pInfo,
    pHandleSaveModalOpen,
    setIsSaveModal,
    pSetDragStat,
    pIsActiveTab,
}: {
    pInfo: any;
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
    const [sTextField, setTextField] = useState<string>('');
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
        const splitList = await fetchSplitter();
        const location = aLocation ?? sSqlLocation;
        const sParsedQuery = SqlSplitHelper(location, splitList);

        setSqlLocation(location);
        if (!sParsedQuery || sParsedQuery?.length === 0 || (sParsedQuery?.length === 1 && sParsedQuery[0]?.length === 0)) return;
        fetchSql(sParsedQuery);
    };

    const fetchSplitter = async () => {
        const splitRes: any = await postSplitter(sSqlQueryTxt);
        if (splitRes?.success) return splitRes.data.statements;
        return undefined;
    };

    const fetchSql = async (aParsedQuery: STATEMENT_TYPE[]) => {
        setEndRecord(() => false);
        setTextField('Processing...');
        const sQueryReslutList: any = [];
        try {
            for (const curQuery of aParsedQuery) {
                const sQueryResult = await getTqlChart(sqlBasicFormatter(curQuery.text, 1, sTimeRange, sTimeZone, SQL_BASE_LIMIT, curQuery.env?.bridge));
                sQueryReslutList.push(sQueryResult);
                if (!sQueryResult?.data?.success) throw new Error('Query failed');
            }
        } catch {
            setErrLog(sQueryReslutList?.at(-1)?.data?.reason);
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
            setTextField('');
            setEndRecord(sQueryReslutList.at(-1).data.data.rows.length < SQL_BASE_LIMIT);
            setSelectedSubTab('RESULT');
            setOldFetchTxt(sLowerQuery);
            return true;
        } else {
            setTextField('');
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
        }
    };

    const onMoreResult = () => {
        setMoreResult(true);
    };

    const fetchMoreResult = async () => {
        const paredQuery = sOldFetchTxt;
        if (!paredQuery?.text) return;
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
                            <Button size="icon" variant="ghost" isToolTip toolTipContent="Run code" icon={<Play size={16} />} onClick={checkCtrl} />
                            <Button.Group>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    isToolTip
                                    toolTipContent="Time format / Time zone"
                                    icon={<RiTimeZoneLine size={16} />}
                                    onClick={() => setIsTimeZoneModal(!sIsTimeZoneModal)}
                                />
                                <Button size="icon" variant="ghost" isToolTip toolTipContent="Save" icon={<Save size={16} />} onClick={pHandleSaveModalOpen} />
                                <Button size="icon" variant="ghost" isToolTip toolTipContent="Save as" icon={<SaveAs size={16} />} onClick={() => setIsSaveModal(true)} />
                            </Button.Group>
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
                                sErrLog ? (
                                    <div className="sql-error-body" style={{ padding: '0 1rem' }}>
                                        {sErrLog}
                                    </div>
                                ) : sTextField === 'Processing...' ? (
                                    <div className="sql-processing-body" style={{ padding: '0 1rem', display: 'flex', alignItems: 'center' }}>
                                        <span>{sTextField}</span>
                                        <div style={{ marginLeft: '4px' }}>
                                            <Loader width="12px" height="12px" borderRadius="90%" />
                                        </div>
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

                            <CHART
                                pQueryList={sChartQueryList}
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
