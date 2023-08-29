import { useEffect, useRef, useState } from 'react';
import { MonacoEditor } from '@/components/monaco/MonacoEditor';
import { getTqlChart } from '@/api/repository/machiot';
import { ShowChart } from '@/components/tql/ShowChart';
import { Markdown } from '@/components/worksheet/Markdown';
import { getId, isValidJSON } from '@/utils';
import useOutsideClick from '@/hooks/useOutsideClick';
import { sqlBasicFormatter } from '@/utils/sqlFormatter';
import TABLE from '@/components/table';
import './WorkSheetEditor.scss';
import { Delete, Play, ArrowUpDouble, ArrowDown, InsertRowTop, HideOn, HideOff } from '@/assets/icons/Icon';
import { PositionType, SelectionType, sqlQueryParser } from '@/utils/sqlQueryParser';

type Lang = 'SQL' | 'TQL' | 'Markdown';
type MonacoLang = 'sql' | 'markdown' | 'go';
type ServerLang = 'markdown' | 'SQL' | 'go';
type ServerLangType = 'tql' | 'mrk' | 'sql';
type CallbackEventType = 'LocUp' | 'LocDown' | 'AddTop' | 'AddBottom' | 'Delete';

interface WorkSheetEditorProps {
    pData: any;
    pIdx: number;
    pAllRunCode: number;
    pWorkSheets: any[];
    setSheet: React.Dispatch<React.SetStateAction<any>>;
    pCallback: (aData: { id: string; event: CallbackEventType }) => void;
}

export const WorkSheetEditor = (props: WorkSheetEditorProps) => {
    const { pData, pIdx, pAllRunCode, setSheet, pWorkSheets, pCallback } = props;
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

    useEffect(() => {
        handleRunCode(sText);
    }, [pAllRunCode]);

    useEffect(() => {
        const sCopyWorkSheets = JSON.parse(JSON.stringify(pWorkSheets));
        const sIndex = sCopyWorkSheets.findIndex((aSheet: any) => aSheet.id === pData.id);
        const sPayload = {
            id: pData.id ?? getId(),
            contents: sText,
            height: initialSize,
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
        if (sIndex !== -1) {
            sCopyWorkSheets[sIndex] = sPayload;
            setSheet(sCopyWorkSheets);
        }
    }, [sText, initialSize, sCollapse, sSelectedLang]);

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

    const initValue = (aEvent: React.DragEvent<HTMLDivElement>) => {
        if (resizeRef.current) {
            setInitialPos(aEvent.clientY);
            setInitialSize(resizeRef.current.offsetHeight);
        }
    };

    const resize = (aEvent: React.DragEvent<HTMLDivElement>) => {
        if (aEvent.clientY && resizeRef.current) {
            resizeRef.current.style.height = `${initialSize + (aEvent.clientY - initialPos)}px`;
        }
    };

    const setHeight = (aEvent: React.DragEvent<HTMLDivElement>) => {
        if (aEvent.clientY && resizeRef.current) {
            setInitialSize(initialSize + (aEvent.clientY - initialPos));
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
        if (sSelectedLang === 'Markdown') setMarkdown(aText);
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
            const sSqlResult = await getTqlChart(sqlBasicFormatter(parsedQuery, 1, '2006-01-02 15:04:05', 'UTC'));
            switch (sSqlResult.status) {
                case 200:
                    setSql(sSqlResult.data.data);
                    break;
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

        if (sResult.status === 200 && sResult.headers && sResult.headers['x-chart-type'] === 'echarts') {
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
            sTempCsv[0].map((_, aIdx) => {
                tempHeaders.push('COLUMN' + aIdx);
            });

            setTqlCsv(sTempCsv);
            setTqlCsvHeader(tempHeaders);
            return;
        } else {
            setTqlResultType('text');
            if (sResult.status === 200) {
                if (typeof sResult.data !== 'string') {
                    const sLength = sResult.data.data.rows.length;
                    sResult.data.data.rows = sResult.data.data.rows.filter((_: number[], aIdx: number) => aIdx < 6 || sLength - 6 < aIdx);
                    sResult.data.data.rows.splice(5, 0, '....');
                }
                setTqlTextResult(JSON.stringify(sResult.data));
                return;
            } else {
                setTqlTextResult(sResult.data.reason);
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
                    <TABLE pTableData={sSql} pMaxShowLen={true} clickEvent={() => {}} />
                </div>
                <div className="result-worksheet-total">
                    <span>{`Total ${sSql && sSql.rows.length} records`}</span>
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
                                <TABLE pTableData={{ columns: sTqlCsvHeader, rows: sTqlCsv, types: [] }} pMaxShowLen={true} clickEvent={() => {}} />
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

    const ControlIcon = (aIcon: string, active: boolean) => {
        switch (aIcon) {
            case 'RunCode':
                return (
                    <div className="worksheet-ctr-icon-wrap">
                        <div className="worksheet-ctr-icon" onClick={() => handleRunCode(sText)}>
                            <Play />
                        </div>
                    </div>
                );
            case 'LocUp':
                return (
                    <div className="worksheet-ctr-icon-wrap">
                        <div className="worksheet-ctr-icon" onClick={() => pCallback({ id: pData.id, event: 'LocUp' })}>
                            <ArrowUpDouble />
                        </div>
                    </div>
                );
            case 'LocDown':
                return (
                    <div className="worksheet-ctr-icon-wrap">
                        <div className="worksheet-ctr-icon" onClick={() => pCallback({ id: pData.id, event: 'LocDown' })}>
                            <ArrowUpDouble style={{ transform: 'rotate(180deg)' }} />
                        </div>
                    </div>
                );
            case 'AddTop':
                return (
                    <div className="worksheet-ctr-icon-wrap">
                        <div className="worksheet-ctr-icon" onClick={() => pCallback({ id: pData.id, event: 'AddTop' })}>
                            <InsertRowTop />
                        </div>
                    </div>
                );
            case 'AddBottom':
                return (
                    <div className="worksheet-ctr-icon-wrap">
                        <div className="worksheet-ctr-icon" onClick={() => pCallback({ id: pData.id, event: 'AddBottom' })}>
                            <InsertRowTop style={{ transform: 'rotate(180deg)' }} />
                        </div>
                    </div>
                );
            case 'Delete':
                return (
                    <div className={active ? 'worksheet-ctr-icon-wrap' : 'worksheet-ctr-icon-disable'}>
                        <div className="worksheet-ctr-icon" onClick={active ? () => pCallback({ id: pData.id, event: 'Delete' }) : () => {}}>
                            <Delete />
                        </div>
                    </div>
                );
        }
    };

    useOutsideClick(dropDownRef, () => setShowLang(false));

    return (
        <div className="worksheet-editor-wrapper">
            <div className="worksheet-editor">
                <div className="worksheet-content" style={{ display: !sCollapse ? 'block' : 'none' }}>
                    <div className="worksheet-ctr" style={{ display: 'flex', height: '40px', justifyContent: 'end' }}>
                        {DropDown()}
                        {VerticalDivision()}
                        {ControlIcon('RunCode', true)}
                        {VerticalDivision()}
                        {ControlIcon('LocUp', true)}
                        {ControlIcon('LocDown', true)}
                        {VerticalDivision()}
                        {ControlIcon('AddTop', true)}
                        {ControlIcon('AddBottom', true)}
                        {VerticalDivision()}
                        {ControlIcon('Delete', pWorkSheets.length > 1)}
                    </div>
                    <div ref={resizeRef} className="editor">
                        <MonacoEditor
                            pText={sText}
                            pLang={sMonacoLanguage}
                            onChange={handleText}
                            onRunCode={handleRunCode}
                            onSelectLine={sMonacoLanguage === 'sql' ? setSqlLocation : () => {}}
                        />
                        <div className="drag-stick" draggable onDragStart={initValue} onDrag={resize} onDragEnd={setHeight}></div>
                    </div>
                </div>
                {Result()}
            </div>
            <div className="worksheet-collapse-ctr" onClick={() => setCollapse(!sCollapse)}>
                <div className="worksheet-collapse-ctr-icon">
                    {!sCollapse ? <HideOn /> : <HideOff className="worksheet-collapse-ctr-icon" style={{ transform: 'rotate(90deg)' }} />}
                </div>
            </div>
        </div>
    );
};
