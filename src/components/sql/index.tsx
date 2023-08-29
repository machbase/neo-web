import { useEffect, useState, useRef } from 'react';
import SplitPane, { Pane } from 'split-pane-react';
import RESULT from './result';
import CHART from '@/components/chart';
import { LOG } from './log';
import AUTOCOMBOBOX from './autoCombobox';
import { gBoardList } from '@/recoil/recoil';
import { useRecoilState } from 'recoil';
import { getTqlChart } from '@/api/repository/machiot';
import { sqlBasicFormatter } from '@/utils/sqlFormatter';
import { IANA_TIMEZONES } from '@/assets/ts/timezones';
import { TIME_FORMAT_LIST } from '@/assets/ts/timeFormat';
import './index.scss';
import { BarChart, AiOutlineFileDone, AiOutlineSnippets, Save, LuFlipVertical, Play, SaveAs } from '@/assets/icons/Icon';
import { isJsonString } from '@/utils/utils';
import { PositionType, SelectionType, sqlQueryParser } from '@/utils/sqlQueryParser';
import { MonacoEditor } from '../monaco/MonacoEditor';

const Sql = ({
    pInfo,
    pHandleSaveModalOpen,
    setIsSaveModal,
}: {
    pInfo: any;
    pHandleSaveModalOpen: any;
    setIsSaveModal: (aValue: boolean) => void;
    setIsOpenModal: (aValue: boolean) => void;
}) => {
    // const monaco = useMonaco();
    const [isVertical, setIsVertical] = useState<boolean>(true);
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const [sizes, setSizes] = useState<string[] | number[]>(['50%', '50%']);
    const [sTimeRange, setTimeRange] = useState('2006-01-02 15:04:05');
    const [sTimeZone, setTimeZone] = useState('LOCAL');
    const [sSelectedSubTab, setSelectedSubTab] = useState<'RESULT' | 'CHART' | 'LOG'>('RESULT');
    const [sLogList, setLogList] = useState<string[]>([]);
    const [sSqlQueryTxt, setSqlQueryTxt] = useState<string>(pInfo.code);
    const [sSqlResponseData, setSqlResponseData] = useState<any>();
    const [sResultLimit, setResultLimit] = useState<number>(1);
    const sEditorRef = useRef(null);
    const [sMoreResult, setMoreResult] = useState<boolean>(false);
    const [sChartAxisList, setChartAxisList] = useState<string[]>([]);
    const sSaveCommand = useRef<any>(null);
    const sNavi = useRef(null);
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
    const sSqlTabList: SqlTabType[] = [SqlTabType.RESULT, SqlTabType.CHART, SqlTabType.LOG];

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

    const onClearLog = () => {
        setLogList([]);
    };

    const getTargetQuery = (): string => {
        return sqlQueryParser(sSqlQueryTxt, sSqlLocation.position, sSqlLocation.selection);
    };

    const sqlMultiLineParser = (
        _?: string,
        aLocation?: {
            position: PositionType;
            selection: SelectionType;
        }
    ) => {
        let parsedQuery = '';
        if (!aLocation) parsedQuery = sqlQueryParser(sSqlQueryTxt, sSqlLocation.position, sSqlLocation.selection);
        else {
            parsedQuery = sqlQueryParser(sSqlQueryTxt, aLocation.position, aLocation.selection);
            setSqlLocation(aLocation);
        }
        if (!parsedQuery) return;
        (async () => {
            const sSqlResult = await getTqlChart(sqlBasicFormatter(parsedQuery.trim(), 1, sTimeRange, sTimeZone));
            switch (sSqlResult.status) {
                case 200:
                    setSelectedSubTab('RESULT');
                    break;
                default:
                    setSelectedSubTab('LOG');
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
                sSqlResult.data.data.columns[1] += ` (${sAddTimezoneTxt})`;
            }

            if (sSqlResult.data.data) setChartAxisList(sSqlResult.data.data.columns);
            setResultLimit(2);
            setSqlResponseData(sSqlResult.data.data);
            setLogList([...sLogList, `${parsedQuery}\n${sSqlResult.data.reason} : ${sSqlResult.data.success}`]);
        })();
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

    const handleSaveModalOpen = () => {
        setIsSaveModal(true);
    };

    const fetchMoreResult = async () => {
        const paredQuery = getTargetQuery();
        const sSqlResult = await getTqlChart(sqlBasicFormatter(paredQuery, sResultLimit, sTimeRange, sTimeZone));
        const sParsedSqlResult = await JSON.parse(isJsonString(sSqlResult.request.response) ? sSqlResult.request.response : '{}');

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
            setLogList([...sLogList, `${paredQuery}\n${sParsedSqlResult.elapse} : ${sParsedSqlResult.success}`]);
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
            <SplitPane sashRender={() => <></>} split={isVertical ? 'vertical' : 'horizontal'} sizes={sizes} onChange={setSizes}>
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
                        <div className="sql-header-play-btn">
                            <Play size="20px" color="#939498" onClick={checkCtrl} />
                        </div>
                        <div className="sql-option-ctr" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                            <div style={{ marginRight: '8px' }}>
                                <AUTOCOMBOBOX pName="sTimeRange" pList={TIME_FORMAT_LIST} pTarget={sTimeRange} pCallback={setTimeRange} />
                            </div>
                            <div style={{ marginRight: '8px' }}>
                                <AUTOCOMBOBOX pName="sTimeZone" pList={IANA_TIMEZONES} pTarget={sTimeZone} pCallback={setTimeZone} />
                            </div>
                            <div className="btn-cover">
                                <Save className="header-icon" style={{ cursor: 'pointer' }} onClick={pHandleSaveModalOpen} />
                            </div>
                            <div className="btn-cover">
                                <SaveAs className="header-icon" onClick={handleSaveModalOpen} />
                            </div>
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
                                <div className={isVertical ? 'sub-tab-header-active-icon' : 'sub-tab-header-icon'}>
                                    <LuFlipVertical style={{ transform: 'rotate(90deg)' }} onClick={handleSplitVertical} />
                                </div>
                                <div className={isVertical ? 'sub-tab-header-icon' : 'sub-tab-header-active-icon'}>
                                    <LuFlipVertical onClick={handleSplitHorizontal} />
                                </div>
                            </div>
                        </div>
                        <RESULT pDisplay={sSelectedSubTab === 'RESULT' ? '' : 'none'} pSqlResponseData={sSqlResponseData} onMoreResult={() => onMoreResult()} />
                        <LOG pDisplay={sSelectedSubTab === 'LOG' ? '' : 'none'} pLogList={sLogList} onClearLog={() => onClearLog()} />
                        <CHART
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
