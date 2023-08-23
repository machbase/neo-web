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
    const [sTqlResultType, setTqlResultType] = useState<'html' | 'csv' | 'mrk' | 'text'>(pData.tqlType ?? 'text');
    const [sTqlTextResult, setTqlTextResult] = useState<string>('');
    const [sTqlChartData, setTqlChartData] = useState<string>('');
    const [sTqlMarkdown, setTqlMarkdown] = useState<any>('');
    const [sTqlCsv, setTqlCsv] = useState<string[][]>([]);
    const [sTqlCsvHeader, setTqlCsvHeader] = useState<string[]>([]);
    const [sMonacoLanguage, setMonacoLanguage] = useState<MonacoLang>('markdown');
    const [sMarkdown, setMarkdown] = useState<string>('');
    const [sSql, setSql] = useState<any>(null);
    const [sCollapse, setCollapse] = useState<boolean>(pData.minimal ?? false);
    const [sSqlLineNumber, setSqlLineNumber] = useState<number>(1);
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

    const handleRunCode = (aText: string, aLineNum?: number) => {
        if (sSelectedLang === 'TQL') getTqlData(aText);
        if (sSelectedLang === 'Markdown') setMarkdown(aText);
        if (sSelectedLang === 'SQL') getSqlData(aText, aLineNum);
    };

    const changeLanguage = (aLang: ServerLang) => {
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

    const getTargetQuery = (aText: string, aLineNum: number): string => {
        if (!aText) return '';
        const tmpquerylist = JSON.parse(JSON.stringify(aText)).split('\n');
        let TargetQuery = '';
        let preTargetQuery = '';

        tmpquerylist.map((aRow: string, aIdx: number) => {
            TargetQuery = `${TargetQuery} ${aRow}`;
            if (aRow.includes(';') && aIdx + 1 < aLineNum) {
                preTargetQuery = TargetQuery;
                TargetQuery = '';
            }
        });
        return TargetQuery.split(';')[0].trim() ? TargetQuery.split(';')[0].trim() : preTargetQuery.split(';')[0].trim();
    };

    const getSqlData = (aText: string, aLineNum?: number) => {
        let sTmpLineNum = 1;
        if (aLineNum) {
            sTmpLineNum = aLineNum;
            setSqlLineNumber(aLineNum);
        } else sTmpLineNum = sSqlLineNumber;

        const parsedQuery = getTargetQuery(aText, sTmpLineNum);
        (async () => {
            const sSqlResult = await getTqlChart(sqlBasicFormatter(parsedQuery, 1, '2006-01-02 15:04:05', 'UTC'));
            switch (sSqlResult.status) {
                case 200:
                    setSql(sSqlResult.data.data);
                    break;
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
        } else if (sResult.status === 200 && sResult.headers && sResult.headers['content-type'] === 'text/csv') {
            setTqlResultType('csv');

            const sTempCsv: string[][] = [];

            sResult.data.split('\n').map((aItem: string) => {
                sTempCsv.push(aItem.split(','));
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
                <div className="result-worksheet-sql">
                    <TABLE pTableData={sSql} pMaxShowLen={true} clickEvent={() => {}} />
                </div>
                <div className="result-worksheet-sql-total">
                    <span>{`Total ${sSql && sSql.rows.length} records`}</span>
                </div>
            </>
        ) : (
            <div className="result-worksheet-sql-total" />
        );
    };

    const TqlResult = () => {
        return (
            <>
                {sTqlResultType === 'csv' ? (
                    sTqlCsv ? (
                        <>
                            <div className="result-worksheet-sql">
                                <TABLE pTableData={{ columns: sTqlCsvHeader, rows: sTqlCsv, types: [] }} pMaxShowLen={true} clickEvent={() => {}} />
                            </div>
                            <div className="result-worksheet-sql-total">
                                <span>{`Total ${sTqlCsv && sTqlCsv.length} records`}</span>
                            </div>
                        </>
                    ) : (
                        <div className="result-worksheet-sql-total">
                            <span>{'no result'}</span>
                        </div>
                    )
                ) : null}
                {sTqlResultType === 'html' && sTqlChartData ? <ShowChart pData={sTqlChartData} pIsCenter /> : null}
                {sTqlResultType === 'mrk' ? <Markdown pIdx={pIdx} pContents={sTqlMarkdown} pType="mrk" /> : null}
                {sTqlResultType === 'text' && sTqlTextResult && isValidJSON(sTqlTextResult) ? <pre>{JSON.stringify(JSON.parse(sTqlTextResult), null, 4)}</pre> : null}
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
                            onSelectLine={sMonacoLanguage === 'sql' ? setSqlLineNumber : () => {}}
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
