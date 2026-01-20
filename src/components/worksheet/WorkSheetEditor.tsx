import { useEffect, useRef, useState } from 'react';
import { MonacoEditor } from '@/components/monaco/MonacoEditor';
import { getTqlChart } from '@/api/repository/machiot';
import { Markdown } from '@/components/worksheet/Markdown';
import { getId, isValidJSON, getMonacoLines } from '@/utils';
import { sqlSheetFormatter, STATEMENT_TYPE } from '@/utils/sqlFormatter';
import TABLE from '@/components/table';
import './WorkSheetEditor.scss';
import { Delete, Play, ArrowUpDouble, ArrowDown, InsertRowTop, HideOn, HideOff, IoPlayForwardSharp } from '@/assets/icons/Icon';
import { Button, DragHandle, Menu, Page } from '@/design-system/components';
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
    pScrollToElement: (targetScrollTop: number, isLastChild?: boolean, forceScroll?: boolean) => void;
    pScrollContainerRef: React.RefObject<HTMLDivElement>;
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
        pScrollContainerRef,
    } = props;
    const sInitHeight = 200;
    const resizeRef = useRef<HTMLDivElement | null>(null);
    const sScrollSpyRef = useRef<HTMLDivElement | null>(null);
    const [sText, setText] = useState<string>(pData.contents);
    const [initialPos, setInitialPos] = useState<number>(0);
    const [initialSize, setInitialSize] = useState<number>(pData.height ?? sInitHeight);
    const [sSelectedLang, setSelectedLang] = useState<Lang | undefined>(undefined);
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
    const [sMonacoLineHeight, setMonacoLineHeight] = useState<number>(pData.lineHeight ?? 19);
    const setConsoleList = useSetRecoilState<any>(gWsLog);
    const wrkEditorRef = useRef<HTMLDivElement>(null);
    const [sIsDeleteModal, setIsDeleteModal] = useState<boolean>(false);
    const [sProcessing, setProcessing] = useState<boolean>(false);
    const [sIsInitialLoad, setIsInitialLoad] = useState<boolean>(true);
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

        // Mark initial load as complete after mount
        setIsInitialLoad(false);

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
    const initValue = (aEvent: React.MouseEvent<HTMLDivElement>) => {
        if (resizeRef.current) {
            setInitialPos(aEvent.clientY);
            setInitialSize(resizeRef.current.offsetHeight);
        }
    };
    const resize = (aEvent: MouseEvent) => {
        if (aEvent.clientY && resizeRef.current) {
            const sHeight = initialSize + (aEvent.clientY - initialPos);
            resizeRef.current.style.height = `${sHeight}px`;
        }
    };
    const setHeight = (aEvent: MouseEvent) => {
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
            setMarkdown(aText);
            handleStopState(false);
            if (pAllRunCodeStatus) {
                pAllRunCodeCallback(true);
            }
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
    const VerticalDivision = () => <Page.Divi direction="vertical" spacing="0" style={{ marginTop: '5px', height: '20px', alignItems: 'center', justifyContent: 'center' }} />;
    const Result = () => {
        if (sSelectedLang === 'Chat') return <div className="result scrollbar-dark">{ChatResult()}</div>;

        return (
            <div className={`result scrollbar-dark${sProcessing ? ' result-processed' : ''}`}>
                {sSelectedLang === 'TQL' ? TqlResult() : null}
                {sSelectedLang === 'SQL' ? SqlResult() : null}
                {sSelectedLang === 'Markdown' ? <Markdown pIdx={pIdx} pContents={sMarkdown} pType="wrk-mrk" pData={pWrkId} /> : null}
                {sSelectedLang === 'Shell' ? ShellResult() : null}
            </div>
        );
    };
    const ChatResult = () => {
        return <ChatMessageList messages={chatLogic.messages} pWrkId={pWrkId} pIdx={pIdx} isProcessingAnswer={chatLogic.isProcessingAnswer} />;
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
            <Menu.Root>
                <Menu.Trigger>
                    <Button size="sm" variant="ghost" style={{ width: '100%', height: '22px', minHeight: '22px' }}>
                        <p>{sSelectedLang}</p>
                        <ArrowDown size={16} />
                    </Button>
                </Menu.Trigger>
                <Menu.Content>
                    {LANG.map((aLang: string[]) => (
                        <Menu.Item key={aLang[0]} className={sSelectedLang === aLang[1] ? 'selected' : ''} onClick={() => changeLanguage(aLang[0] as ServerLang)}>
                            {aLang[1]}
                        </Menu.Item>
                    ))}
                </Menu.Content>
            </Menu.Root>
        );
    };
    const ResultContentType = () => {
        return sMonacoLanguage === 'sql' ? (
            <>
                <Menu.Root>
                    <Menu.Trigger>
                        <Button size="sm" variant="ghost" style={{ width: '100%', height: '22px', minHeight: '22px' }}>
                            <p>{sResultContentType}</p>
                            <ArrowDown size={16} />
                        </Button>
                    </Menu.Trigger>
                    <Menu.Content>
                        <Menu.Item className={sResultContentType === 'all' ? 'selected' : ''} onClick={() => setResultContentType('all')}>
                            Show result all
                        </Menu.Item>
                        <Menu.Item className={sResultContentType === 'brief' ? 'selected' : ''} onClick={() => setResultContentType('brief')}>
                            Show result brief
                        </Menu.Item>
                    </Menu.Content>
                </Menu.Root>
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
        // Skip auto-scroll on initial load, only scroll after actual code execution
        if (!sIsInitialLoad && pAllRunCodeStatus && !sProcessing && sScrollSpyRef?.current) {
            // Use requestAnimationFrame to ensure DOM is fully updated before calculating scroll position
            requestAnimationFrame(() => {
                if (sScrollSpyRef?.current) {
                    const scrollTop = getScrollTopToElement(sScrollSpyRef.current);
                    // Pass forceScroll=true in all-run mode to ensure scroll even if position hasn't changed much
                    pScrollToElement(scrollTop, isLastChild(), true);
                }
            });
        }
    }, [sProcessing, sSql, sTqlTextResult, sTqlVisualData, sTqlCsv, sMarkdown, sShellResult, chatLogic.messages]);

    // Calculate scroll position to element relative to parent container
    const getScrollTopToElement = (element: HTMLElement | null): number => {
        if (!element) return 0;
        const parentContainer = pScrollContainerRef.current;
        if (!parentContainer) return 0;
        const elementRect = element.getBoundingClientRect();
        const containerRect = parentContainer.getBoundingClientRect();
        return parentContainer.scrollTop + (elementRect.top - containerRect.top);
    };

    // Check if this is the last child
    const isLastChild = (): boolean => {
        return pIdx + 1 === pWorkSheets?.length;
    };

    return (
        <div className="worksheet-editor-wrapper">
            <div ref={wrkEditorRef} className="worksheet-editor">
                <div style={{ display: 'flex', width: '100%', justifyContent: 'end' }}>
                    <div className={`worksheet-content ${sSelectedLang === 'Chat' ? ' chat' : null}`} style={{ display: !sCollapse ? 'block' : 'none' }}>
                        <div className="worksheet-ctr">
                            <Button.Group style={{ padding: '0 8px' }}>
                                {DropDown()}
                                {VerticalDivision()}
                                {ResultContentType()}
                                {sSelectedLang === 'Chat' && (
                                    <>
                                        <ModelDropDown
                                            pList={chatLogic.modelList}
                                            pSelectedItem={chatLogic.selectedModel}
                                            onSelect={chatLogic.setSelectedModel}
                                            onFetch={chatLogic.getListModels}
                                            style={{ width: '100%', height: '22px', minHeight: '22px' }}
                                        />
                                        {VerticalDivision()}
                                    </>
                                )}
                                <Button
                                    size="xsm"
                                    variant="ghost"
                                    isToolTip
                                    toolTipContent={sProcessing ? 'Stop code' : 'Run code'}
                                    icon={sProcessing ? <FaStop size={14} /> : <Play size={14} />}
                                    onClick={sProcessing ? () => handleInterrupt() : () => handleRunCode(sText)}
                                    style={{ padding: '10px' }}
                                />
                                {sSelectedLang === 'SQL' && !sProcessing ? (
                                    <Button
                                        size="xsm"
                                        variant="ghost"
                                        isToolTip
                                        toolTipContent="Run all code"
                                        icon={<IoPlayForwardSharp size={16} />}
                                        onClick={() => handleRunCodeAll(sText)}
                                        style={{ padding: '10px' }}
                                    />
                                ) : null}
                                {VerticalDivision()}
                                <Button
                                    size="xsm"
                                    variant="ghost"
                                    isToolTip
                                    toolTipContent="Move to upper"
                                    icon={<ArrowUpDouble size={16} />}
                                    onClick={() => pCallback({ id: pData.id, event: 'LocUp' })}
                                    style={{ padding: '10px' }}
                                />
                                <Button
                                    size="xsm"
                                    variant="ghost"
                                    isToolTip
                                    toolTipContent="Move to down"
                                    icon={<ArrowUpDouble size={16} style={{ transform: 'rotate(180deg)' }} />}
                                    onClick={() => pCallback({ id: pData.id, event: 'LocDown' })}
                                    style={{ padding: '10px' }}
                                />
                                {VerticalDivision()}
                                <Button
                                    size="xsm"
                                    variant="ghost"
                                    isToolTip
                                    toolTipContent="Add to upper"
                                    icon={<InsertRowTop size={16} />}
                                    onClick={() => pCallback({ id: pData.id, event: 'AddTop' })}
                                    style={{ padding: '10px' }}
                                />
                                <Button
                                    size="xsm"
                                    variant="ghost"
                                    isToolTip
                                    toolTipContent="Add to down"
                                    icon={<InsertRowTop size={16} style={{ transform: 'rotate(180deg)' }} />}
                                    onClick={() => pCallback({ id: pData.id, event: 'AddBottom' })}
                                    style={{ padding: '10px' }}
                                />

                                {VerticalDivision()}
                                <Button
                                    size="xsm"
                                    variant="ghost"
                                    isToolTip
                                    toolTipContent="Delete"
                                    icon={<Delete size={16} />}
                                    disabled={!(pWorkSheets.length > 1)}
                                    onClick={pWorkSheets.length > 1 ? handleDelete : () => null}
                                    style={{ padding: '10px' }}
                                />
                            </Button.Group>
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
                        </div>
                    </div>
                    <div style={{ marginLeft: '24px', justifyContent: 'end' }}>
                        <Button
                            size="sm"
                            variant="secondary"
                            isToolTip
                            toolTipContent={`${!sCollapse ? 'Collapse' : 'Expand'}`}
                            active={sCollapse}
                            icon={!sCollapse ? <HideOn size={18} /> : <HideOff size={18} style={{ transform: 'rotate(90deg)' }} />}
                            onClick={() => setCollapse(!sCollapse)}
                        />
                    </div>
                </div>
                <DragHandle onMouseDown={initValue} onMouseMove={resize} onMouseUp={setHeight} style={{ visibility: sCollapse ? 'hidden' : 'visible' }} />
                <div style={{ display: 'flex', width: '100%', justifyContent: 'end', position: 'relative' }}>
                    {Result()}
                    <div style={{ margin: '1rem 0 1rem 24px' }}>
                        <Button size="sm" variant="secondary" isToolTip toolTipContent="Clear" icon={<GrClearOption size={16} />} onClick={handleResultClear} />
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
