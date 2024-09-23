import { useEffect, useRef, useState } from 'react';
import { MonacoEditor } from '@/components/monaco/MonacoEditor';
import { getTqlChart } from '@/api/repository/machiot';
import { ShowChart } from '@/components/tql/ShowChart';
import { Markdown } from '@/components/worksheet/Markdown';
import { getId, isValidJSON, getMonacoLines } from '@/utils';
import useOutsideClick from '@/hooks/useOutsideClick';
import { sqlSheetFormatter } from '@/utils/sqlFormatter';
import TABLE from '@/components/table';
import './WorkSheetEditor.scss';
import { Delete, Play, ArrowUpDouble, ArrowDown, InsertRowTop, HideOn, HideOff } from '@/assets/icons/Icon';
import { PositionType, SelectionType, sqlQueryParser } from '@/utils/sqlQueryParser';
import { IconButton } from '../buttons/IconButton';
import { useSetRecoilState } from 'recoil';
import { gConsoleSelector } from '@/recoil/recoil';
import { sqlMultiQueryParser } from '@/utils/sqlMultiQueryParser';
import { ShowMap } from '../tql/ShowMap';
import { TqlCsvParser } from '@/utils/tqlCsvParser';
import { ConfirmModal } from '../modal/ConfirmModal';
import { Loader } from '../loader';
import { GrClearOption } from 'react-icons/gr';

type Lang = 'SQL' | 'TQL' | 'Markdown' | 'Shell';
type MonacoLang = 'sql' | 'markdown' | 'go' | 'shell';
type ServerLang = 'markdown' | 'SQL' | 'go' | 'shell';
type ServerLangType = 'tql' | 'mrk' | 'sql' | 'shell';
type CallbackEventType = 'LocUp' | 'LocDown' | 'AddTop' | 'AddBottom' | 'Delete';
type ShowResultType = 'brief' | 'all';

interface WorkSheetEditorProps {
    pData: any;
    pIdx: number;
    pWrkId: string;
    pWorkSheets: any[];
    pAllRunCodeStatus: boolean;
    pAllRunCodeList: boolean[];
    pAllRunCodeTargetIdx: number | undefined;
    pAllRunCodeCallback: (aStatus: boolean) => void;
    setSheet: React.Dispatch<React.SetStateAction<any>>;
    pCallback: (aData: { id: string; event: CallbackEventType }) => void;
}

type LocationType = {
    position: PositionType;
    selection: SelectionType;
};

const defaultSqlLocation = {
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
};

export const WorkSheetEditor = (props: WorkSheetEditorProps) => {
    const { pData, pWrkId, pIdx, pAllRunCodeStatus, pAllRunCodeTargetIdx, pAllRunCodeList, pAllRunCodeCallback, setSheet, pWorkSheets, pCallback } = props;
    const sInitHeight = 200;
    const resizeRef = useRef<HTMLDivElement | null>(null);
    const [sText, setText] = useState<string>(pData.contents);
    const [initialPos, setInitialPos] = useState<number>(0);
    const [initialSize, setInitialSize] = useState<number>(pData.height ?? sInitHeight);
    const [sSelectedLang, setSelectedLang] = useState<Lang | undefined>(undefined);
    const [sShowLang, setShowLang] = useState<boolean>(false);
    const [sTqlResultType, setTqlResultType] = useState<'html' | 'csv' | 'mrk' | 'text' | 'xhtml' | 'map'>(pData.tqlType ?? 'text');
    const [sTqlTextResult, setTqlTextResult] = useState<string>('');
    const [sShellResult, setShellTextResult] = useState<string[] | undefined>(undefined);
    const [sTqlChartData, setTqlChartData] = useState<string>('');
    const [sTqlMapData, setTqlMapData] = useState<string>('');
    const [sTqlMarkdown, setTqlMarkdown] = useState<any>('');
    const [sTqlCsv, setTqlCsv] = useState<string[][]>([]);
    const [sTqlCsvHeader, setTqlCsvHeader] = useState<string[]>([]);
    const [sMonacoLanguage, setMonacoLanguage] = useState<MonacoLang | undefined>(undefined);
    const [sMarkdown, setMarkdown] = useState<string>('');
    const [sSql, setSql] = useState<any>(null);
    const [sCollapse, setCollapse] = useState<boolean>(pData.minimal ?? false);
    const [sResultContentType, setResultContentType] = useState<ShowResultType>(pData.brief ? 'brief' : pData.brief === undefined ? 'brief' : 'all');
    const [sSqlLocation, setSqlLocation] = useState<LocationType>(defaultSqlLocation);
    const [sSqlReason, setSqlReason] = useState<string>('');
    const dropDownRef = useRef(null);
    const ResultContentTypeRef = useRef(null);
    const [sShowResultContentType, setShowResultContentType] = useState<boolean>(false);
    const [sMonacoLineHeight, setMonacoLineHeight] = useState<number>(pData.lineHeight ?? 19);
    const setConsoleList = useSetRecoilState<any>(gConsoleSelector);
    const wrkEditorRef = useRef<HTMLDivElement>(null);
    const [sIsDeleteModal, setIsDeleteModal] = useState<boolean>(false);
    const [sProcessing, setProcessing] = useState<boolean>(false);
    const LANG = [
        ['markdown', 'Markdown'],
        ['SQL', 'SQL'],
        ['go', 'TQL'],
        ['shell', 'Shell'],
    ];
    useEffect(() => {
        if (pAllRunCodeList.length > 0 && pAllRunCodeStatus && typeof pAllRunCodeTargetIdx === 'number' && pAllRunCodeList[pIdx] && pIdx === pAllRunCodeTargetIdx) {
            handleRunCode(sText);
        }
    }, [pAllRunCodeList]);
    useEffect(() => {
        if (sSelectedLang === undefined) return;
        if (sMonacoLanguage === undefined) return;
        const sCopyWorkSheets = JSON.parse(JSON.stringify(pWorkSheets));
        const sIndex = sCopyWorkSheets.findIndex((aSheet: any) => aSheet.id === pData.id);
        const sPayload: any = {
            id: pData.id ?? getId(),
            contents: sText,
            height: initialSize,
            lineHeight: sMonacoLineHeight,
            minimal: sCollapse,
            type: sSelectedLang === 'Markdown' ? 'mrk' : sSelectedLang.toLowerCase(),
            tqlType: sSelectedLang === 'TQL' ? sTqlResultType : null,
            lang: LANG,
            result: '',
            status: true,
        };

        if (sMonacoLanguage === 'sql') sPayload.brief = sResultContentType === 'brief';
        if (sIndex !== -1) {
            sCopyWorkSheets[sIndex] = sPayload;
            setSheet(sCopyWorkSheets);
        }
    }, [sText, initialSize, sCollapse, sSelectedLang, sResultContentType, sMonacoLineHeight]);
    useEffect(() => {
        if (resizeRef.current) {
            resizeRef.current.style.height = pData.height ? pData.height + 'px' : sInitHeight + 'px';
            langConverter(pData.type);
        }
    }, []);
    useEffect(() => {
        if (resizeRef.current) {
            const sLines = getMonacoLines(pData.height ? pData.height : sInitHeight, pData.lineHeight ? pData.lineHeight : sMonacoLineHeight);
            const sCurrentHeight = sLines * sMonacoLineHeight;
            resizeRef.current.style.height = sCurrentHeight + 'px';
        }
    }, [sMonacoLineHeight]);

    const langConverter = (aTxt: ServerLangType) => {
        switch (aTxt) {
            case 'sql':
                setSelectedLang('SQL');
                setMonacoLanguage('sql');
                setSql(pData.resul);
                return;
            case 'tql':
                setSelectedLang('TQL');
                setMonacoLanguage('go');
                return;
            case 'shell':
                setSelectedLang('Shell');
                setMonacoLanguage('go');
                return;
            default:
                setSelectedLang('Markdown');
                setMonacoLanguage('markdown');
                setMarkdown(pData.contents);
                return;
        }
    };
    const initValue = (aEvent: React.DragEvent<HTMLDivElement>) => {
        if (resizeRef.current) {
            setInitialPos(aEvent.clientY);
            setInitialSize(resizeRef.current.offsetHeight);
        }
    };
    const resize = (aEvent: React.MouseEvent<HTMLDivElement>) => {
        if (aEvent.clientY && resizeRef.current) {
            const sHeight = initialSize + (aEvent.clientY - initialPos);
            resizeRef.current.style.height = `${sHeight}px`;
        }
    };
    const setHeight = (aEvent: React.DragEvent<HTMLDivElement>) => {
        if (aEvent.clientY && resizeRef.current) {
            const sHeight = Number(resizeRef.current.style.height.replace(/[^0-9.]/g, ''));
            setInitialSize(sHeight);
        }
    };
    const handleText = (aText: any) => {
        setText(aText);
    };
    const handleRunCode = (
        aText: string,
        aLocation?: {
            position: PositionType;
            selection: SelectionType;
        }
    ) => {
        setProcessing(true);
        if (sSelectedLang === 'TQL') getTqlData(aText);
        if (sSelectedLang === 'Markdown') {
            if (pAllRunCodeStatus) {
                pAllRunCodeCallback(true);
            }
            setMarkdown(aText);
            setProcessing(false);
        }
        if (sSelectedLang === 'SQL') getSqlData(aText, aLocation);
        if (sSelectedLang === 'Shell') getShellData(aText);
    };
    const getShellData = async (aText: string) => {
        const sShellQuery = `FAKE(once(1))\nSHELL(${'`' + aText + '`'})\nJSON(rowsFlatten(true))`;
        const sResult: any = await getTqlChart(sShellQuery);
        if (sResult?.data && typeof sResult?.data === 'object' && sResult?.data?.success && sResult?.data?.data?.rows) {
            setShellTextResult(sResult?.data?.data?.rows);
            pAllRunCodeCallback(true);
        } else {
            setShellTextResult([sResult?.data]);
            pAllRunCodeCallback(false);
        }
        setProcessing(false);
    };
    const changeLanguage = (aLang: ServerLang) => {
        setSqlReason('');
        setTqlTextResult('');
        if (aLang === 'SQL') {
            setSelectedLang('SQL');
            setMonacoLanguage('sql');
        } else if (aLang === 'go') {
            setSelectedLang('TQL');
            setMonacoLanguage('go');
        } else if (aLang === 'shell') {
            setSelectedLang('Shell');
            setMonacoLanguage('go');
        } else {
            setSelectedLang('Markdown');
            setMonacoLanguage('markdown');
        }
    };
    const getSqlData = (aText: string, aLocation?: LocationType) => {
        let parsedQuery: any = '';
        if (!aLocation) {
            // SINGLE
            if (sSqlLocation.selection.endColumn === sSqlLocation.selection.startColumn && sSqlLocation.selection.endLineNumber === sSqlLocation.selection.startLineNumber)
                parsedQuery = [sqlQueryParser(aText, sSqlLocation.position, sSqlLocation.selection)];
            // MULTIPLE
            else parsedQuery = sqlMultiQueryParser(aText, sSqlLocation.position, sSqlLocation.selection);
        } else {
            // SINGLE
            if (aLocation.selection.endColumn === aLocation.selection.startColumn && aLocation.selection.endLineNumber === aLocation.selection.startLineNumber)
                parsedQuery = [sqlQueryParser(aText, aLocation.position, aLocation.selection)];
            // MULTIPLE
            else parsedQuery = sqlMultiQueryParser(aText, aLocation.position, aLocation.selection);
            setSqlLocation(aLocation);
        }
        if (!parsedQuery || parsedQuery.length === 0 || (parsedQuery.length === 1 && parsedQuery[0].length === 0)) {
            if (pAllRunCodeStatus) pAllRunCodeCallback(true);
            return;
        }
        fetchSql(parsedQuery);
    };
    const fetchSql = async (aParsedQuery: string[]) => {
        const sQueryReslutList: any = [];
        try {
            const fetchQuery = (aQuery: string) => {
                return new Promise((resolve, reject) => {
                    setTimeout(async () => {
                        const sQueryResult = await getTqlChart(sqlSheetFormatter(aQuery.trim(), sResultContentType === 'brief'));
                        sQueryReslutList.push(sQueryResult);
                        if (sQueryResult.status === 200) resolve(true);
                        else reject(false);
                    }, 1);
                });
            };
            await aParsedQuery.reduce(async (previousPromise: any, curQuery: string) => {
                await previousPromise;
                return fetchQuery(curQuery);
            }, Promise.resolve());
        } catch {
            setSqlReason(sQueryReslutList.at(-1)?.data?.reason);
        }
        if (sQueryReslutList.at(-1).status === 200 && aParsedQuery.length === sQueryReslutList.length) {
            const sLastQueryResult = sQueryReslutList.at(-1);
            if (sLastQueryResult.headers['content-type'] === 'application/json') {
                setSql('');
                setSqlReason(sLastQueryResult.data.reason);
            } else {
                setSql(sLastQueryResult.data);
            }
            if (pAllRunCodeStatus) pAllRunCodeCallback(true);
        } else {
            if (pAllRunCodeStatus) pAllRunCodeCallback(false);
        }
        setProcessing(false);
    };
    const ErrorConsole = (aMessage: string) => {
        setConsoleList((prev: any) => [
            ...prev,
            {
                timestamp: new Date().getTime(),
                level: 'ERROR',
                task: '',
                message: aMessage,
            },
        ]);
    };
    const HandleResutTypeAndTxt = (aText: string, aUseErrorConsole: boolean) => {
        setTqlResultType('text');
        setTqlTextResult(aText);
        aUseErrorConsole && ErrorConsole(aText);
    };
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDeleteModal(true);
    };
    const getTqlData = async (aText: string) => {
        // TODO C:\Users\MACH-NOT-23\Documents\GitHub\neo-web\src\components\tql\index.tsx - getTqlData
        const sResult: any = await getTqlChart(aText);

        if (sResult.status === 200) {
            if (pAllRunCodeStatus) pAllRunCodeCallback(true);
        } else {
            if (pAllRunCodeStatus) pAllRunCodeCallback(false);
        }

        if (sResult.status === 200 && sResult.headers && sResult.data && sResult.headers['x-chart-type'] === 'echarts') {
            if (sResult.data && sResult.data.chartID) {
                setTqlResultType('html');
                setTqlChartData(sResult.data);
            } else {
                setTqlChartData('');
                // SyntaxError: CHART
                HandleResutTypeAndTxt(sResult.data.reason ? sResult.data.reason : JSON.stringify(sResult.data), false);
            }
        } else if (sResult.status === 200 && sResult.headers && sResult.data && sResult.headers['x-chart-type'] === 'geomap') {
            if (sResult.data && sResult.data.ID) {
                setTqlResultType('map');
                setTqlMapData(sResult.data);
            } else {
                setTqlMapData('');
                // SyntaxError: GEOMAP
                HandleResutTypeAndTxt(sResult.data.reason ? sResult.data.reason : JSON.stringify(sResult.data), false);
            }
        } else if (sResult.status === 200 && sResult.headers && sResult.headers['content-type'].includes('markdown')) {
            if (sResult.data && typeof sResult.data === 'string') {
                setTqlResultType('mrk');
                setTqlMarkdown(sResult.data);
            } else {
                setTqlMarkdown('');
                HandleResutTypeAndTxt(sResult.data.reason ? sResult.data.reason : JSON.stringify(sResult.data), false);
            }
        } else if (sResult.status === 200 && sResult.headers && sResult.headers['content-type'].includes('xhtml+xml')) {
            if (sResult.data && typeof sResult.data === 'string') {
                setTqlResultType('xhtml');
                setTqlMarkdown(sResult.data);
            } else {
                setTqlMarkdown('');
                HandleResutTypeAndTxt(JSON.stringify(sResult.data), false);
            }
        } else if (sResult.status === 200 && sResult.headers && sResult.headers['content-type'].includes('csv')) {
            if (typeof sResult.data === 'object') {
                setTqlCsv([]);
                setTqlCsvHeader([]);
                HandleResutTypeAndTxt(sResult.data.reason ? sResult.data.reason : JSON.stringify(sResult.data), false);
            } else {
                setTqlResultType('csv');
                const [sParsedCsvBody, sParsedCsvHeader] = TqlCsvParser(typeof sResult.data === 'string' ? sResult.data : JSON.stringify(sResult.data));
                setTqlCsv(sParsedCsvBody);
                setTqlCsvHeader(sParsedCsvHeader);
            }
        } else if (sResult.status === 200 && sResult.headers && sResult.headers['content-type'].includes('json')) {
            if (sResult.data && typeof sResult.data === 'object' && sResult.data.success) {
                if (sResult.data.data.rows && sResult.data.data.rows.length > 10) {
                    const sLength = sResult.data.data.rows.length;
                    sResult.data.data.rows = sResult.data.data.rows.filter((_: number[], aIdx: number) => aIdx < 6 || sLength - 6 < aIdx);
                    sResult.data.data.rows.splice(5, 0, '....');
                } else if (sResult.data.data.cols && sResult.data.data.cols.length > 0 && sResult.data.data.cols[0].length > 10) {
                    const sTempList: any = [];
                    sResult.data.data.cols.forEach((col: any) => {
                        const sColLength = col.length;
                        const sColResult = col.filter((_: number[], aIdx: number) => aIdx < 6 || sColLength - 6 < aIdx);
                        sColResult.splice(5, 0, '....');
                        sTempList.push(sColResult);
                    });
                    sResult.data.data.cols = sTempList;
                }
                HandleResutTypeAndTxt(JSON.stringify(sResult.data), false);
            } else {
                HandleResutTypeAndTxt(typeof sResult.data === 'object' ? JSON.stringify(sResult.data) : sResult.data, false);
            }
        } else {
            if (sResult.status === 200) HandleResutTypeAndTxt(typeof sResult.data === 'object' ? JSON.stringify(sResult.data) : sResult.data, false);
            else HandleResutTypeAndTxt(typeof sResult.data === 'object' ? (sResult.data.reason ? sResult.data.reason : JSON.stringify(sResult.data)) : sResult.data, false);
        }

        setProcessing(false);
    };
    const VerticalDivision = () => {
        return <div className="worksheet-ctr-verti-divi" />;
    };
    const Result = () => {
        return (
            <div className={`result${sProcessing ? ' result-processed' : ''}`}>
                {sSelectedLang === 'TQL' ? TqlResult() : null}
                {sSelectedLang === 'SQL' ? SqlResult() : null}
                {sSelectedLang === 'Markdown' ? <Markdown pIdx={pIdx} pContents={sMarkdown} pType="wrk-mrk" pData={pWrkId} /> : null}
                {sSelectedLang === 'Shell' ? ShellResult() : null}
            </div>
        );
    };
    const ShellResult = () => {
        if (!sShellResult) return;
        const sParsedShellResult: any = [];
        let sContentsNum: number = 0;
        let sIsCommand: boolean = true;

        sShellResult.map((aLine: string) => {
            if (aLine !== '' && sIsCommand) {
                sParsedShellResult[sContentsNum] = { command: aLine, contents: '' };
                sIsCommand = false;
            } else if (aLine !== '' && !sIsCommand) {
                sParsedShellResult[sContentsNum].contents += aLine + '\n';
            } else if (aLine === '') {
                sIsCommand = true;
                sContentsNum += 1;
            }
        });
        return (
            <div className="shell-result-wrapper">
                {sParsedShellResult.map((aItem: any, aIdx: number) => {
                    return (
                        <div className="shell-result" key={'wrk-shell-result-' + aIdx}>
                            <div className="shell-result-command-wrapper">
                                <pre>{aItem.command}</pre>
                            </div>
                            <div className="shell-result-contents-wrapper">
                                <pre>{aItem.contents}</pre>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };
    const SqlResult = () => {
        return sSql ? (
            <>
                <div className="result-worksheet">
                    <div className="result-worksheet-sql" dangerouslySetInnerHTML={{ __html: sSql }}></div>
                </div>
            </>
        ) : (
            <div className="result-worksheet-total">
                <span>{sSqlReason}</span>
            </div>
        );
    };
    const TqlResult = () => {
        return (
            <>
                {sTqlResultType === 'csv' ? (
                    sTqlCsv ? (
                        <>
                            <div className="result-worksheet">
                                <TABLE pTableData={{ columns: sTqlCsvHeader, rows: sTqlCsv, types: [] }} pMaxShowLen={false} clickEvent={() => {}} />
                            </div>
                            <div className="result-worksheet-total">
                                <span>{`Total ${sTqlCsv && sTqlCsv.length} records`}</span>
                            </div>
                        </>
                    ) : (
                        <div className="result-worksheet-total">
                            <span>{sTqlTextResult}</span>
                        </div>
                    )
                ) : null}
                {sTqlResultType === 'map' && sTqlMapData && (
                    <ShowMap
                        pData={sTqlMapData}
                        pBodyRef={{
                            current: {
                                clientWidth: wrkEditorRef && wrkEditorRef.current && wrkEditorRef.current.clientWidth ? wrkEditorRef.current.clientWidth : 500,
                                clientHeight: 500,
                            },
                        }}
                    />
                )}
                {sTqlResultType === 'html' && sTqlChartData ? <ShowChart pData={sTqlChartData} pIsCenter pLoopMode={false} /> : null}
                {sTqlResultType === 'mrk' ? <Markdown pIdx={pIdx} pContents={sTqlMarkdown} pType="wrk-mrk" /> : null}
                {sTqlResultType === 'xhtml' ? <Markdown pIdx={pIdx} pContents={sTqlMarkdown} /> : null}
                {sTqlResultType === 'text' && sTqlTextResult ? (
                    isValidJSON(sTqlTextResult) ? (
                        <pre>{JSON.stringify(JSON.parse(sTqlTextResult), null, 4)}</pre>
                    ) : (
                        <div className="result-worksheet-total">
                            <span>{sTqlTextResult}</span>
                        </div>
                    )
                ) : null}
            </>
        );
    };
    const DropDown = () => {
        return (
            <div ref={dropDownRef} className="worksheet-ctr-lang" onClick={() => setShowLang(!sShowLang)}>
                <div className="dropdown">
                    <div className="worksheet-ctr-lang-selected">{sSelectedLang}</div>
                    <ArrowDown style={{ transform: sShowLang ? 'rotate(180deg)' : '' }} />
                    {sShowLang && (
                        <div className="worksheet-ctr-lang-content-list">
                            {LANG.map((aLang: string[]) => {
                                return (
                                    <div key={aLang[0]} className="worksheet-ctr-lang-content" onClick={() => changeLanguage(aLang[0] as ServerLang)}>
                                        {aLang[1]}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    };
    const ResultContentType = () => {
        return sMonacoLanguage === 'sql' ? (
            <>
                <div ref={ResultContentTypeRef} className="worksheet-ctr-lang" style={{ minWidth: '50px' }} onClick={() => setShowResultContentType(!sShowResultContentType)}>
                    <div className="dropdown" style={{ width: '100%', justifyContent: 'space-between', marginLeft: '4px', marginRight: '4px' }}>
                        <div className="worksheet-ctr-lang-selected">{sResultContentType}</div>
                        <ArrowDown style={{ transform: sShowResultContentType ? 'rotate(180deg)' : '' }} />
                        {sShowResultContentType && (
                            <div className="worksheet-ctr-lang-content-list">
                                <div className="worksheet-ctr-lang-content" onClick={() => setResultContentType('all')}>
                                    Show result all
                                </div>
                                <div className="worksheet-ctr-lang-content" onClick={() => setResultContentType('brief')}>
                                    Show result brief
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {VerticalDivision()}
            </>
        ) : (
            <></>
        );
    };
    const handleResultClear = () => {
        setSql('');
        setSqlReason('');
        setShellTextResult(undefined);
        setMarkdown('');
        setTqlTextResult('');
        setTqlMapData('');
        setTqlChartData('');
        setTqlCsvHeader([]);
        setTqlCsv([]);
    };

    useOutsideClick(dropDownRef, () => setShowLang(false));
    useOutsideClick(ResultContentTypeRef, () => setShowResultContentType(false));

    return (
        <div className="worksheet-editor-wrapper">
            <div ref={wrkEditorRef} className="worksheet-editor">
                <div style={{ display: 'flex', width: '100%', justifyContent: 'end' }}>
                    <div className="worksheet-content" style={{ display: !sCollapse ? 'block' : 'none' }}>
                        <div className="worksheet-ctr">
                            {DropDown()}
                            {VerticalDivision()}
                            {ResultContentType()}
                            <IconButton pIsToopTip pToolTipContent="Run code" pToolTipId="wrk-tab-panel-run" pIcon={<Play />} pIsActiveHover onClick={() => handleRunCode(sText)} />
                            {VerticalDivision()}
                            <IconButton
                                pIsToopTip
                                pToolTipContent="Move to upper"
                                pToolTipId="wrk-tab-panel-move-up"
                                pIcon={<ArrowUpDouble />}
                                pIsActiveHover
                                onClick={() => pCallback({ id: pData.id, event: 'LocUp' })}
                            />
                            <IconButton
                                pIsToopTip
                                pToolTipContent="Move to down"
                                pToolTipId="wrk-tab-panel-move-down"
                                pIcon={<ArrowUpDouble style={{ transform: 'rotate(180deg)' }} />}
                                pIsActiveHover
                                onClick={() => pCallback({ id: pData.id, event: 'LocDown' })}
                            />
                            {VerticalDivision()}
                            <IconButton
                                pIsToopTip
                                pToolTipContent="Add to upper"
                                pToolTipId="wrk-tab-panel-add-up"
                                pIcon={<InsertRowTop />}
                                pIsActiveHover
                                onClick={() => pCallback({ id: pData.id, event: 'AddTop' })}
                            />
                            <IconButton
                                pIsToopTip
                                pToolTipContent="Add to down"
                                pToolTipId="wrk-tab-panel-add-down"
                                pIcon={<InsertRowTop style={{ transform: 'rotate(180deg)' }} />}
                                pIsActiveHover
                                onClick={() => pCallback({ id: pData.id, event: 'AddBottom' })}
                            />
                            {VerticalDivision()}
                            <IconButton
                                pIsToopTip
                                pToolTipContent="Delete"
                                pToolTipId="wrk-tab-panel-delete"
                                pIcon={<Delete />}
                                pDisabled={!(pWorkSheets.length > 1)}
                                pIsActiveHover
                                // onClick={pWorkSheets.length > 1 ? () => pCallback({ id: pData.id, event: 'Delete' }) : () => null}
                                onClick={pWorkSheets.length > 1 ? handleDelete : () => null}
                            />
                        </div>
                        <div ref={resizeRef} className="editor">
                            <MonacoEditor
                                pText={sText}
                                pLang={sMonacoLanguage ?? 'Markdown'}
                                onChange={handleText}
                                onRunCode={handleRunCode}
                                onSelectLine={sMonacoLanguage === 'sql' ? setSqlLocation : () => {}}
                                setLineHeight={setMonacoLineHeight}
                            />
                            <div className="drag-stick" draggable onDragStart={initValue} onDrag={resize} onDragEnd={setHeight}></div>
                        </div>
                    </div>
                    <div style={{ marginLeft: '5px', justifyContent: 'end' }}>
                        <IconButton
                            pIsToopTip
                            pToolTipContent={`${!sCollapse ? 'Collapse' : 'Expand'}`}
                            pToolTipId="wrk-tab-panel-collapse"
                            pWidth={40}
                            pHeight={40}
                            pIcon={!sCollapse ? <HideOn size={18} /> : <HideOff size={18} style={{ transform: 'rotate(90deg)' }} />}
                            pIsActiveHover
                            onClick={() => setCollapse(!sCollapse)}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', width: '100%', justifyContent: 'end', position: 'relative' }}>
                    {Result()}
                    <div style={{ margin: '1rem 0' }}>
                        <IconButton
                            pIsToopTip
                            pToolTipContent="Clear"
                            pToolTipId="wrk-tab-panel-clear"
                            pWidth={40}
                            pHeight={40}
                            pIcon={<GrClearOption size={18} />}
                            pIsActiveHover
                            onClick={handleResultClear}
                        />
                    </div>
                    {sProcessing && (
                        <div className="wrk-result-processed-wrap" style={{ display: 'flex', flexDirection: 'row' }}>
                            <span>Processing...</span>
                            <div style={{ marginLeft: '4px', display: 'flex', alignItems: 'center' }}>
                                <Loader width="12px" height="12px" borderRadius="90%" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {sIsDeleteModal && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={setIsDeleteModal}
                    pCallback={() => pCallback({ id: pData.id, event: 'Delete' })}
                    pContents={<div className="body-content">{`Do you want to delete this panel?`}</div>}
                />
            )}
        </div>
    );
};
