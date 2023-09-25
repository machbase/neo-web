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
import { gConsoleList } from '@/recoil/recoil';

type Lang = 'SQL' | 'TQL' | 'Markdown';
type MonacoLang = 'sql' | 'markdown' | 'go';
type ServerLang = 'markdown' | 'SQL' | 'go';
type ServerLangType = 'tql' | 'mrk' | 'sql';
type CallbackEventType = 'LocUp' | 'LocDown' | 'AddTop' | 'AddBottom' | 'Delete';
type ShowResultType = 'brief' | 'all';

interface WorkSheetEditorProps {
    pData: any;
    pIdx: number;
    pWorkSheets: any[];
    pAllRunCodeStatus: boolean;
    pAllRunCodeList: boolean[];
    pAllRunCodeTargetIdx: number | undefined;
    pAllRunCodeCallback: (aStatus: boolean) => void;
    setSheet: React.Dispatch<React.SetStateAction<any>>;
    pCallback: (aData: { id: string; event: CallbackEventType }) => void;
}

export const WorkSheetEditor = (props: WorkSheetEditorProps) => {
    const { pData, pIdx, pAllRunCodeStatus, pAllRunCodeTargetIdx, pAllRunCodeList, pAllRunCodeCallback, setSheet, pWorkSheets, pCallback } = props;
    const sInitHeight = 200;
    const resizeRef = useRef<HTMLDivElement | null>(null);
    const [sText, setText] = useState<string>(pData.contents);
    const [initialPos, setInitialPos] = useState<number>(0);
    const [initialSize, setInitialSize] = useState<number>(pData.height ?? sInitHeight);
    const [sSelectedLang, setSelectedLang] = useState<Lang>('Markdown');
    const [sShowLang, setShowLang] = useState<boolean>(false);
    const [sTqlResultType, setTqlResultType] = useState<'html' | 'csv' | 'mrk' | 'text' | 'xhtml'>(pData.tqlType ?? 'text');
    const [sTqlTextResult, setTqlTextResult] = useState<string>('');
    const [sTqlChartData, setTqlChartData] = useState<string>('');
    const [sTqlMarkdown, setTqlMarkdown] = useState<any>('');
    const [sTqlCsv, setTqlCsv] = useState<string[][]>([]);
    const [sTqlCsvHeader, setTqlCsvHeader] = useState<string[]>([]);
    const [sMonacoLanguage, setMonacoLanguage] = useState<MonacoLang>('markdown');
    const [sMarkdown, setMarkdown] = useState<string>('');
    const [sSql, setSql] = useState<any>(null);
    const [sCollapse, setCollapse] = useState<boolean>(pData.minimal ?? false);
    const [sResultContentType, setResultContentType] = useState<ShowResultType>(pData.brief ? 'brief' : pData.brief === undefined ? 'brief' : 'all');
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
    const [sSqlReason, setSqlReason] = useState<string>('');
    const dropDownRef = useRef(null);
    const ResultContentTypeRef = useRef(null);
    const [sShowResultContentType, setShowResultContentType] = useState<boolean>(false);
    const [sMonacoLineHeight, setMonacoLineHeight] = useState<number>(pData.lineHeight ?? 19);
    const setConsoleList = useSetRecoilState<any>(gConsoleList);

    useEffect(() => {
        if (pAllRunCodeList.length > 0 && pAllRunCodeStatus && typeof pAllRunCodeTargetIdx === 'number' && pAllRunCodeList[pIdx] && pIdx === pAllRunCodeTargetIdx) {
            handleRunCode(sText);
        }
    }, [pAllRunCodeList]);

    useEffect(() => {
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
            lang: [
                ['markdown', 'Markdown'],
                ['SQL', 'SQL'],
                ['go', 'TQL'],
            ],
            result: '',
            status: true,
        };

        if (sMonacoLanguage === 'sql') sPayload.brief = sResultContentType === 'brief';
        if (sIndex !== -1) {
            sCopyWorkSheets[sIndex] = sPayload;
            setSheet(sCopyWorkSheets);
        }
    }, [sText, initialSize, sCollapse, sSelectedLang, sResultContentType, sMonacoLineHeight]);

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
            default:
                setSelectedLang('Markdown');
                setMonacoLanguage('markdown');
                setMarkdown(pData.contents);
                return;
        }
    };

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
    }, [sMonacoLineHeight])

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
        if (sSelectedLang === 'TQL') getTqlData(aText);
        if (sSelectedLang === 'Markdown') {
            if (pAllRunCodeStatus) {
                pAllRunCodeCallback(true);
            }
            setMarkdown(aText);
        }
        if (sSelectedLang === 'SQL') getSqlData(aText, aLocation);
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
        } else {
            setSelectedLang('Markdown');
            setMonacoLanguage('markdown');
        }
    };

    const getSqlData = (
        aText: string,
        aLocation?: {
            position: PositionType;
            selection: SelectionType;
        }
    ) => {
        let parsedQuery = '';
        if (!aLocation) parsedQuery = sqlQueryParser(aText, sSqlLocation.position, sSqlLocation.selection);
        else {
            parsedQuery = sqlQueryParser(aText, aLocation.position, aLocation.selection);
            setSqlLocation(aLocation);
        }
        (async () => {
            const sSqlResult = await getTqlChart(sqlSheetFormatter(parsedQuery, sResultContentType === 'brief'));
            switch (sSqlResult.status) {
                case 200:
                    setSql(sSqlResult.data);
                    if (pAllRunCodeStatus) pAllRunCodeCallback(true);
                    break;
                default:
                    if (pAllRunCodeStatus) pAllRunCodeCallback(false);
            }
            if (sSqlResult.data.reason) {
                setSqlReason(sSqlResult.data.reason);
            } else {
                setSqlReason('');
            }
        })();
    };

    const getTqlData = async (aText: string) => {
        const sResult: any = await getTqlChart(aText);

        if (sResult.status === 200) {
            if (pAllRunCodeStatus) pAllRunCodeCallback(true);
        } else {
            if (pAllRunCodeStatus) pAllRunCodeCallback(false);
        }

        if (sResult.status === 200 && sResult.headers && sResult.data && sResult.headers['x-chart-type'] === 'echarts') {
            setTqlResultType('html');
            setTqlChartData(sResult.data);
            return;
        } else if (sResult.status === 200 && sResult.headers && sResult.headers['content-type'] === 'text/markdown') {
            setTqlResultType('mrk');
            setTqlMarkdown(sResult.data);
            return;
        } else if (sResult.status === 200 && sResult.headers && sResult.headers['content-type'] === 'application/xhtml+xml') {
            setTqlResultType('xhtml');
            setTqlMarkdown(sResult.data);
        } else if (sResult.status === 200 && sResult.headers && sResult.headers['content-type'] === 'text/csv') {
            setTqlResultType('csv');

            const sTempCsv: string[][] = [];

            sResult.data.split('\n').forEach((aItem: string) => {
                if (aItem) sTempCsv.push(aItem.split(','));
            });

            const tempHeaders: string[] = [];
            sTempCsv[0] && sTempCsv[0].map((_, aIdx) => {
                tempHeaders.push('COLUMN' + aIdx);
            });

            setTqlCsv(sTempCsv);
            setTqlCsvHeader(tempHeaders);
            return;
        } else {
            setTqlResultType('text');
            if (sResult.status === 200) {
                if (sResult.data && typeof sResult.data === 'object') {
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
                    } else if (sResult.data.data.message) {
                        setTqlTextResult(sResult.data.data.message);
                        return;
                    }
                    setTqlTextResult(JSON.stringify(sResult.data));
                    return;
                } else {
                    setTqlTextResult('');
                    setConsoleList((prev: any) => [
                        ...prev,
                        {
                            timestamp: new Date().getTime(),
                            level: 'ERROR',
                            task: '',
                            message: sResult.statusText,
                        },
                    ]);
                    return;
                }
            } else {
                if (sResult.data.reason) {
                    setTqlTextResult(sResult.data.reason);
                } else {
                    setTqlTextResult('');
                    setConsoleList((prev: any) => [
                        ...prev,
                        {
                            timestamp: new Date().getTime(),
                            level: 'ERROR',
                            task: '',
                            message: sResult.statusText,
                        },
                    ]);
                }
                return;
            }
        }
    };

    const VerticalDivision = () => {
        return <div className="worksheet-ctr-verti-divi" />;
    };

    const Result = () => {
        return (
            <div className="result">
                {sSelectedLang === 'TQL' ? TqlResult() : null}
                {sSelectedLang === 'SQL' ? SqlResult() : null}
                {sSelectedLang === 'Markdown' ? <Markdown pIdx={pIdx} pContents={sMarkdown} pType="mrk" /> : null}
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
                {sTqlResultType === 'html' && sTqlChartData ? <ShowChart pData={sTqlChartData} pIsCenter /> : null}
                {sTqlResultType === 'mrk' ? <Markdown pIdx={pIdx} pContents={sTqlMarkdown} pType="mrk" /> : null}
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
                            {pData.lang.map((aLang: string[]) => {
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

    useOutsideClick(dropDownRef, () => setShowLang(false));
    useOutsideClick(ResultContentTypeRef, () => setShowResultContentType(false));

    return (
        <div className="worksheet-editor-wrapper">
            <div className="worksheet-editor">
                <div className="worksheet-content" style={{ display: !sCollapse ? 'block' : 'none' }}>
                    <div className="worksheet-ctr" style={{ display: 'flex', height: '40px', justifyContent: 'end' }}>
                        {DropDown()}
                        {VerticalDivision()}
                        {ResultContentType()}
                        <IconButton pIcon={<Play />} pIsActiveHover onClick={() => handleRunCode(sText)} />
                        {VerticalDivision()}
                        <IconButton pIcon={<ArrowUpDouble />} pIsActiveHover onClick={() => pCallback({ id: pData.id, event: 'LocUp' })} />
                        <IconButton
                            pIcon={<ArrowUpDouble style={{ transform: 'rotate(180deg)' }} />}
                            pIsActiveHover
                            onClick={() => pCallback({ id: pData.id, event: 'LocDown' })}
                        />
                        {VerticalDivision()}
                        <IconButton pIcon={<InsertRowTop />} pIsActiveHover onClick={() => pCallback({ id: pData.id, event: 'AddTop' })} />
                        <IconButton
                            pIcon={<InsertRowTop style={{ transform: 'rotate(180deg)' }} />}
                            pIsActiveHover
                            onClick={() => pCallback({ id: pData.id, event: 'AddBottom' })}
                        />
                        {VerticalDivision()}
                        <IconButton
                            pIcon={<Delete />}
                            pDisabled={!(pWorkSheets.length > 1)}
                            pIsActiveHover
                            onClick={pWorkSheets.length > 1 ? () => pCallback({ id: pData.id, event: 'Delete' }) : () => null}
                        />
                    </div>
                    <div ref={resizeRef} className="editor" style={{ borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }}>
                        <MonacoEditor
                            pText={sText}
                            pLang={sMonacoLanguage}
                            onChange={handleText}
                            onRunCode={handleRunCode}
                            onSelectLine={sMonacoLanguage === 'sql' ? setSqlLocation : () => {}}
                            setLineHeight={setMonacoLineHeight}
                        />
                        <div className="drag-stick" draggable onDragStart={initValue} onDrag={resize} onDragEnd={setHeight}></div>
                    </div>
                </div>
                {Result()}
            </div>
            <div style={{ marginLeft: '5px' }}>
                <IconButton
                    pWidth={40}
                    pHeight={40}
                    pIcon={!sCollapse ? <HideOn size={18} /> : <HideOff size={18} style={{ transform: 'rotate(90deg)' }} />}
                    pIsActiveHover
                    onClick={() => setCollapse(!sCollapse)}
                />
            </div>
        </div>
    );
};
