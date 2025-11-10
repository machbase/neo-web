import { useEffect, useRef, useState } from 'react';
import { MonacoEditor } from '@/components/monaco/MonacoEditor';
import { getTqlChart } from '@/api/repository/machiot';
import { Markdown } from '@/components/worksheet/Markdown';
import { getId, isValidJSON, getMonacoLines } from '@/utils';
import useOutsideClick from '@/hooks/useOutsideClick';
import { sqlSheetFormatter, STATEMENT_TYPE } from '@/utils/sqlFormatter';
import TABLE from '@/components/table';
import './WorkSheetEditor.scss';
import { Delete, Play, ArrowUpDouble, ArrowDown, InsertRowTop, HideOn, HideOff, IoPlayForwardSharp } from '@/assets/icons/Icon';
import { IconButton } from '../buttons/IconButton';
import { useSetRecoilState } from 'recoil';
import { TqlCsvParser } from '@/utils/tqlCsvParser';
import { ConfirmModal } from '../modal/ConfirmModal';
import { Loader } from '../loader';
import { GrClearOption } from 'react-icons/gr';
import { postSplitter } from '@/api/repository/api';
import { ShowVisualization } from '../tql/ShowVisualization';
import { DetermineTqlResultType, E_TQL_SCR, TqlResType } from '@/utils/TQL/TqlResParser';
import { LocationType, PositionType, SelectionType, SplitItemType, SqlSplitHelper } from '@/utils/TQL/SqlSplitHelper';
import { gWsLog } from '@/recoil/websocket';
import { useChat } from '@/hooks/useChat';
import { ChatMessageList } from '../chat/components/ChatMessageList';
import { ModelDropDown } from '../chat/components/DropDown';
import { FaStop } from 'react-icons/fa';
import { useExperiment } from '@/hooks/useExperiment';

type Lang = 'SQL' | 'TQL' | 'Markdown' | 'Shell' | 'Chat';
type MonacoLang = 'sql' | 'markdown' | 'go' | 'shell' | 'chat';
type ServerLang = 'markdown' | 'SQL' | 'go' | 'shell' | 'chat';
type ServerLangType = 'tql' | 'mrk' | 'sql' | 'shell' | 'chat';
type CallbackEventType = 'LocUp' | 'LocDown' | 'AddTop' | 'AddBottom' | 'Delete';
type ShowResultType = 'brief' | 'all';

interface WorkSheetEditorProps {
    pTimeRange: string;
    pTimeZone: string;
    pIsActiveTab: boolean;
    pData: any;
    pIdx: number;
    pWrkId: string;
    pWorkSheets: any[];
    pAllRunCodeStatus: boolean;
    pAllRunCodeList: boolean[];
    pAllRunCodeTargetIdx: number | undefined;
    pStopState: boolean[];
    pSetStopState: React.Dispatch<React.SetStateAction<any>>;
    pAllRunCodeCallback: (aStatus: boolean) => void;
    setSheet: React.Dispatch<React.SetStateAction<any>>;
    pCallback: (aData: { id: string; event: CallbackEventType }) => void;
    pScrollToElement: (element: HTMLElement) => void;
}

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
    const {
        pTimeRange,
        pTimeZone,
        pIsActiveTab,
        pData,
        pWrkId,
        pIdx,
        pAllRunCodeStatus,
        pAllRunCodeTargetIdx,
        pAllRunCodeList,
        pStopState,
        pSetStopState,
        pCallback,
        pAllRunCodeCallback,
        setSheet,
        pWorkSheets,
        pScrollToElement,
    } = props;
    const sInitHeight = 200;
    const resizeRef = useRef<HTMLDivElement | null>(null);
    const sScrollSpyRef = useRef<HTMLDivElement | null>(null);
    const [sText, setText] = useState<string>(pData.contents);
    const [initialPos, setInitialPos] = useState<number>(0);
    const [initialSize, setInitialSize] = useState<number>(pData.height ?? sInitHeight);
    const [sSelectedLang, setSelectedLang] = useState<Lang | undefined>(undefined);
    const [sShowLang, setShowLang] = useState<boolean>(false);
    const [sTqlResultType, setTqlResultType] = useState<'html' | TqlResType>(pData.tqlType ?? 'text');
    const [sTqlTextResult, setTqlTextResult] = useState<string>('');
    const [sShellResult, setShellTextResult] = useState<string[] | undefined>(undefined);
    const [sTqlVisualData, setTqlVisualData] = useState<string>('');
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
    const setConsoleList = useSetRecoilState<any>(gWsLog);
    const wrkEditorRef = useRef<HTMLDivElement>(null);
    const [sIsDeleteModal, setIsDeleteModal] = useState<boolean>(false);
    const [sProcessing, setProcessing] = useState<boolean>(false);
    const chatLogic = useChat(pWrkId, pIdx, { model: pData?.chat?.model ?? '', provider: pData?.chat?.provider, name: pData?.chat?.name }, pData?.chat?.response);
    const { getExperiment } = useExperiment();

    const LANG = getExperiment()
        ? [
              ['markdown', 'Markdown'],
              ['SQL', 'SQL'],
              ['go', 'TQL'],
              ['shell', 'Shell'],
              ['chat', 'Chat'],
          ]
        : [
              ['markdown', 'Markdown'],
              ['SQL', 'SQL'],
              ['go', 'TQL'],
              ['shell', 'Shell'],
          ];

    useEffect(() => {
        if (pAllRunCodeList.length > 0 && pAllRunCodeStatus && typeof pAllRunCodeTargetIdx === 'number' && pAllRunCodeList[pIdx] && pIdx === pAllRunCodeTargetIdx) {
            handleRunCode(sText);
        } else {
            setProcessing(false);
            switch (sSelectedLang) {
                case 'Chat':
                    if (chatLogic && chatLogic.isProcessingAnswer) chatLogic.handleInterruptMessage();
                    break;
                case 'Markdown':
                case 'TQL':
                case 'Shell':
                case 'SQL':
                    break;
            }
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
        if (sMonacoLanguage === 'chat')
            sPayload.chat = {
                response: chatLogic.messages,
                ...chatLogic.selectedModel,
            };
        if (sIndex !== -1) {
            sCopyWorkSheets[sIndex] = sPayload;
            setSheet(sCopyWorkSheets);
        }
    }, [chatLogic.messages, sText, initialSize, sCollapse, sSelectedLang, sResultContentType, sMonacoLineHeight]);
    useEffect(() => {
        if (resizeRef.current) {
            const sLines = getMonacoLines(pData.height ? pData.height : sInitHeight, pData.lineHeight ? pData.lineHeight : sMonacoLineHeight);
            const sCurrentHeight = sLines * sMonacoLineHeight;
            resizeRef.current.style.height = sCurrentHeight + 'px';
        }
    }, [sMonacoLineHeight]);
    useEffect(() => {
        if (resizeRef.current) {
            resizeRef.current.style.height = pData.height ? pData.height + 'px' : sInitHeight + 'px';
            langConverter(pData.type);
        }

        return () => {
            if (chatLogic && chatLogic?.processingAnswerRef?.current) {
                chatLogic.handleInterruptMessage();
                setProcessing(false);
            }
        };
    }, []);

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
            case 'chat':
                setSelectedLang('Chat');
                setMonacoLanguage('chat');
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
        handleStopState(true);
        if (sSelectedLang === 'TQL') {
            setProcessing(true);
            getTqlData(aText);
        }
        if (sSelectedLang === 'Markdown') {
            if (pAllRunCodeStatus) {
                pAllRunCodeCallback(true);
                pScrollToElement(sScrollSpyRef?.current as HTMLDivElement);
            }
            setMarkdown(aText);
            handleStopState(false);
        }
        if (sSelectedLang === 'SQL') getSqlData(aText, { aLocation });
        if (sSelectedLang === 'Shell') {
            setProcessing(true);
            getShellData(aText);
        }
        if (sSelectedLang === 'Chat') {
            setProcessing(true);
            chatLogic.setMessages([]);

            if (!chatLogic.selectedModel.model || !aText.trim()) {
                setProcessing(false);
                if (pAllRunCodeStatus) pAllRunCodeCallback(true);
                handleStopState(false);
                chatLogic.setMessages([
                    {
                        id: 'error-msg',
                        content: 'Please enter model or content.',
                        timestamp: 0,
                        role: 'assistant',
                        type: 'error',
                        isProcess: false,
                        isInterrupt: false,
                    },
                ]);
                return;
            }

            if (pAllRunCodeStatus)
                chatLogic.sendMessageWithText(aText, () => {
                    pAllRunCodeCallback(true);
                    setProcessing(false);
                });
            else
                chatLogic.sendMessageWithText(aText, () => {
                    setProcessing(false);
                });
        }
    };
    const handleRunCodeAll = (aText: string) => {
        if (sSelectedLang === 'SQL') getSqlData(aText, { aRunAll: true });
        return;
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
        } else if (aLang === 'chat') {
            setSelectedLang('Chat');
            setMonacoLanguage('chat');
        } else {
            setSelectedLang('Markdown');
            setMonacoLanguage('markdown');
        }
    };
    const fetchSplitter = async (atxt: string) => {
        const splitRes: any = await postSplitter(atxt);
        if (splitRes?.success) return splitRes.data.statements;
        return undefined;
    };
    const getSqlData = async (aText: string, aOpt: { aLocation?: LocationType; aRunAll?: boolean }) => {
        setProcessing(true);
        const splitList = await fetchSplitter(aText);
        const location = aOpt.aLocation ?? sSqlLocation;
        const sRunAllState = pAllRunCodeStatus ? true : aOpt.aRunAll ? true : false;
        const sParsedQuery: SplitItemType[] = SqlSplitHelper(location, splitList, sRunAllState);

        setSqlLocation(location);
        if (!sParsedQuery || sParsedQuery?.length === 0 || (sParsedQuery?.length === 1 && sParsedQuery[0]?.length === 0)) {
            setProcessing(false);
            if (pAllRunCodeStatus) pAllRunCodeCallback(true);
            return;
        }
        fetchSql(sParsedQuery);
    };
    const fetchSql = async (aParsedQuery: STATEMENT_TYPE[]) => {
        const sQueryReslutList: any = [];
        try {
            for (const curQuery of aParsedQuery) {
                const sQueryResult = await getTqlChart(
                    sqlSheetFormatter({ aSql: curQuery.text, aBrief: sResultContentType === 'brief', bridge: curQuery.env?.bridge, aTimeFormat: pTimeRange, aTimeZone: pTimeZone })
                );
                sQueryReslutList.push(sQueryResult);
                if (sQueryResult?.status !== 200) throw new Error('Query failed');
            }
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
        setTqlResultType(TqlResType.TEXT);
        setTqlTextResult(aText);
        aUseErrorConsole && ErrorConsole(aText);
    };
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDeleteModal(true);
    };
    const getTqlData = async (aText: string) => {
        const sResult: any = await getTqlChart(aText);
        const { parsedStatus, parsedType, parsedData } = DetermineTqlResultType(E_TQL_SCR.WRK, { status: sResult?.status, headers: sResult?.headers, data: sResult?.data });

        if (parsedStatus) {
            if (pAllRunCodeStatus) pAllRunCodeCallback(true);
        } else {
            if (pAllRunCodeStatus) pAllRunCodeCallback(false);
        }

        setTqlResultType(parsedType);
        if (parsedType === TqlResType.VISUAL) {
            setTqlVisualData('');
            setTqlVisualData(parsedData);
        } else if (parsedType === TqlResType.MRK) {
            setTqlMarkdown('');
            setTqlMarkdown(parsedData);
        } else if (parsedType === TqlResType.XHTML) {
            setTqlMarkdown('');
            setTqlMarkdown(parsedData);
        } else if (parsedType === TqlResType.CSV) {
            setTqlCsv([]);
            setTqlCsvHeader([]);
            const [sParsedCsvBody, sParsedCsvHeader] = TqlCsvParser(parsedData);
            setTqlCsv(sParsedCsvBody);
            setTqlCsvHeader(sParsedCsvHeader);
        } else if (parsedType === TqlResType.NDJSON) {
            setTqlTextResult(parsedData);
        } else HandleResutTypeAndTxt(parsedData, false);

        setProcessing(false);
    };
    const VerticalDivision = () => {
        return <div className="worksheet-ctr-verti-divi" />;
    };
    const Result = () => {
        if (sSelectedLang === 'Chat') return <div className="result">{ChatResult()}</div>;

        return (
            <div className={`result${sProcessing ? ' result-processed' : ''}`}>
                {sSelectedLang === 'TQL' ? TqlResult() : null}
                {sSelectedLang === 'SQL' ? SqlResult() : null}
                {sSelectedLang === 'Markdown' ? <Markdown pIdx={pIdx} pContents={sMarkdown} pType="wrk-mrk" pData={pWrkId} /> : null}
                {sSelectedLang === 'Shell' ? ShellResult() : null}
            </div>
        );
    };
    const ChatResult = () => {
        return (
            <div className="chat-result-wrapper">
                <ChatMessageList messages={chatLogic.messages} pWrkId={pWrkId} pIdx={pIdx} isProcessingAnswer={chatLogic.isProcessingAnswer} />
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
            <div className="result-worksheet">
                <div className="result-worksheet-sql" dangerouslySetInnerHTML={{ __html: sSql }} />
            </div>
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
                {sTqlResultType === 'visual' ? (
                    <ShowVisualization
                        pData={sTqlVisualData}
                        pIsCenter
                        pLoopMode={false}
                        pSize={{ w: wrkEditorRef && wrkEditorRef.current && wrkEditorRef.current.clientWidth ? wrkEditorRef.current.clientWidth - 40 : 500, h: 300 }}
                    />
                ) : null}
                {sTqlResultType === 'mrk' ? <Markdown pIdx={pIdx} pContents={sTqlMarkdown} pType="wrk-mrk" /> : null}
                {sTqlResultType === 'xhtml' ? <Markdown pIdx={pIdx} pContents={sTqlMarkdown} /> : null}
                {sTqlResultType === 'text' && sTqlTextResult ? (
                    isValidJSON(sTqlTextResult) ? (
                        <pre>{JSON.stringify(JSON.parse(sTqlTextResult), null, 4)}</pre>
                    ) : (
                        <div className="result-worksheet-pre">
                            <pre>{sTqlTextResult}</pre>
                        </div>
                    )
                ) : null}
                {sTqlResultType === 'ndjson' && <pre>{sTqlTextResult}</pre>}
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
        setTqlVisualData('');
        setTqlCsvHeader([]);
        setTqlCsv([]);
        chatLogic.setMessages([]);
    };
    const handleStopState = (aState: boolean) => {
        if (pIdx + 1 === pWorkSheets?.length && pAllRunCodeStatus) pScrollToElement(sScrollSpyRef?.current as HTMLDivElement);

        pSetStopState((prev: boolean[]) => {
            const sTmp = JSON.parse(JSON.stringify(prev));
            sTmp[pIdx] = aState;
            return sTmp;
        });
    };
    const handleInterrupt = () => {
        setProcessing(false);
        handleStopState(false);
        if (sSelectedLang === 'Chat' && chatLogic && chatLogic.isProcessingAnswer) chatLogic.handleInterruptMessage();
    };

    useEffect(() => {
        if (!sProcessing) {
            handleStopState(false);
        }
    }, [sProcessing]);
    useEffect(() => {
        if (!pStopState[pIdx]) {
            handleStopState(false);
        }
    }, [pStopState[pIdx]]);

    // Notify parent to scroll after result is rendered
    useEffect(() => {
        if (pAllRunCodeStatus && !sProcessing && sScrollSpyRef?.current) {
            pScrollToElement(sScrollSpyRef.current);
        }
    }, [sProcessing, sSql, sTqlTextResult, sTqlVisualData, sTqlCsv, sMarkdown, sShellResult, chatLogic.messages]);

    useOutsideClick(dropDownRef, () => setShowLang(false));
    useOutsideClick(ResultContentTypeRef, () => setShowResultContentType(false));

    return (
        <div className="worksheet-editor-wrapper">
            <div ref={wrkEditorRef} className="worksheet-editor">
                <div style={{ display: 'flex', width: '100%', justifyContent: 'end' }}>
                    <div className={`worksheet-content ${sSelectedLang === 'Chat' ? ' chat' : null}`} style={{ display: !sCollapse ? 'block' : 'none' }}>
                        <div className="worksheet-ctr">
                            {DropDown()}
                            {VerticalDivision()}
                            {ResultContentType()}
                            {sSelectedLang === 'Chat' && (
                                <div style={{ display: 'flex' }}>
                                    <ModelDropDown
                                        pList={chatLogic.modelList}
                                        pSelectedItem={chatLogic.selectedModel}
                                        onSelect={chatLogic.setSelectedModel}
                                        onFetch={chatLogic.getListModels}
                                    />
                                    {VerticalDivision()}
                                </div>
                            )}
                            <IconButton
                                pIsToopTip
                                pToolTipContent={sProcessing ? 'Stop code' : 'Run code'}
                                pToolTipId="wrk-tab-panel-run"
                                pIcon={sProcessing ? <FaStop /> : <Play />}
                                pIsActiveHover
                                onClick={sProcessing ? () => handleInterrupt() : () => handleRunCode(sText)}
                            />
                            {sSelectedLang === 'SQL' && !sProcessing ? (
                                <IconButton
                                    pIsToopTip
                                    pToolTipContent="Run all code"
                                    pToolTipId="wrk-tab-panel-run-all"
                                    pIcon={<IoPlayForwardSharp />}
                                    pIsActiveHover
                                    onClick={() => handleRunCodeAll(sText)}
                                />
                            ) : null}
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
                                pIsActiveTab={pIsActiveTab}
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
                    {sProcessing && sSelectedLang !== 'Chat' && (
                        <div className="wrk-result-processed-wrap" style={{ display: 'flex', flexDirection: 'row' }}>
                            <span>Processing...</span>
                            <div style={{ marginLeft: '4px', display: 'flex', alignItems: 'center' }}>
                                <Loader width="12px" height="12px" borderRadius="90%" />
                            </div>
                        </div>
                    )}
                </div>
                <div ref={sScrollSpyRef} style={{ height: '1px', width: '100%' }} />
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
