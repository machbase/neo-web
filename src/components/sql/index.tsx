import { useEffect, useState, useRef } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
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
    const monaco = useMonaco();
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
    const [sEditor, setEditor] = useState<any>(null);
    const [sChartAxisList, setChartAxisList] = useState<string[]>([]);
    const sSaveCommand = useRef<any>(null);

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
        if (!sSqlQueryTxt) return '';
        const tmpquerylist = JSON.parse(JSON.stringify(sSqlQueryTxt)).split('\n');
        let TargetQuery = '';
        let preTargetQuery = '';

        if (!sEditor) return '';
        tmpquerylist.map((aRow: string, aIdx: number) => {
            TargetQuery = `${TargetQuery} ${aRow}`;
            if (aRow.includes(';') && aIdx + 1 < sEditor.getPosition().lineNumber) {
                preTargetQuery = TargetQuery;
                TargetQuery = '';
            }
        });
        return TargetQuery.split(';')[0].trim() ? TargetQuery.split(';')[0].trim() : preTargetQuery.split(';')[0].trim();
    };

    const sqlMultiLineParser = () => {
        const paredQuery: any = getTargetQuery();
        (async () => {
            const sSqlResult = await getTqlChart(sqlBasicFormatter(paredQuery, 1, sTimeRange, sTimeZone));
            switch (sSqlResult.status) {
                case 200:
                    setSelectedSubTab('RESULT');
                    break;
                default:
                    setSelectedSubTab('LOG');
            }
            setChartAxisList(sSqlResult.data.data.columns);
            setResultLimit(sResultLimit + 1);
            setSqlResponseData(sSqlResult.data.data);
            setLogList([...sLogList, `${paredQuery}\n${sSqlResult.data.reason} : ${sSqlResult.data.success}`]);
        })();
    };

    const handleDownKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (window.navigator.platform.includes('Win') && e.ctrlKey && e.key === 'Enter') {
            e.stopPropagation();
            sqlMultiLineParser();
        }
        if (!window.navigator.platform.includes('Win') && e.metaKey && e.key === 'Enter') {
            e.stopPropagation();
            sqlMultiLineParser();
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
        if (!monaco) return;
        monaco.editor.defineTheme('my-theme', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                {
                    token: '',
                    fontStyle: 'D2Coding',
                },
            ],
            colors: {
                'editor.background': '#262831',
            },
        });
        monaco.editor.setTheme('my-theme');
        new monaco.Position(0, 0);
        new monaco.Selection(0, 0, 0, 0);
    }, [monaco]);

    const handleMount = (editor: any) => {
        setEditor(editor);
    };

    const monacoOptions = {
        minimap: {
            enabled: false,
        },
        scrollBeyondLastLine: false,
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
                    >
                        <Play size="20px" color="#939498" onClick={checkCtrl} />
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
                    <div ref={sEditorRef} onKeyDownCapture={handleDownKey} style={{ height: '100%', width: '100%' }}>
                        <Editor
                            height="100%"
                            width="100%"
                            defaultLanguage="sql"
                            defaultValue={pInfo.code}
                            theme="my-theme"
                            onChange={handleChangeText}
                            onMount={handleMount}
                            options={monacoOptions}
                        />
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
                            pSqlQueryTxt={getTargetQuery()}
                            pSizes={sizes}
                        />
                    </div>
                </Pane>
            </SplitPane>
        </div>
    );
};

export default Sql;
