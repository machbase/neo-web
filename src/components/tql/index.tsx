import { useEffect, useState } from 'react';
import { SplitPane, Pane, Page, Tabs, Button } from '@/design-system/components';
import { SashContent } from 'split-pane-react';
import { getTqlChart } from '@/api/repository/machiot';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { Table } from './Table';
import './index.scss';
import { Markdown } from '../worksheet/Markdown';
import { isValidJSON } from '@/utils';
import { MonacoEditor } from '@/components/monaco/MonacoEditor';
import {
    AiOutlineFileDone,
    AiOutlineFileMarkdown,
    BarChart,
    Save,
    VscJson,
    PiFileCsvThin,
    TableHeader,
    TableNotHeader,
    LuFlipVertical,
    Play,
    SaveAs,
    MdLink,
} from '@/assets/icons/Icon';
import { ClipboardCopy } from '@/utils/ClipboardCopy';
import { TqlCsvParser } from '@/utils/tqlCsvParser';
import { Loader } from '../loader';
import { ShowVisualization } from './ShowVisualization';
import { DetermineTqlResultType, E_TQL_SCR, TqlResType } from '@/utils/TQL/TqlResParser';
import { gWsLog } from '@/recoil/websocket';
interface TqlProps {
    pIsActiveTab: boolean;
    pCode: string;
    pIsSave: any;
    setIsSaveModal: React.Dispatch<React.SetStateAction<boolean>>;
    pHandleSaveModalOpen: any;
    pSetDragStat: any;
}

const Tql = (props: TqlProps) => {
    const { pIsActiveTab, pCode, pHandleSaveModalOpen, setIsSaveModal, pSetDragStat, pIsSave } = props;
    const [isVertical, setIsVertical] = useState<boolean>(true);
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const sSelectedTab = useRecoilValue(gSelectedTab);
    const [sText, setText] = useState<string>('');
    const [sCsv, setCsv] = useState<string[][]>([]);
    const [sCsvHeader, setCsvHeader] = useState<string[]>([]);
    const [sIsHeader, setHeader] = useState<boolean>(true);
    const [sMarkdown, setMarkdown] = useState<any>('');
    const [sVisualData, setVisualData] = useState<string>('');
    // const [sMapData, setMapData] = useState<any>(undefined);
    const [sResultType, setResultType] = useState<string>('text');
    const [sTextField, setTextField] = useState<string>('');
    const [sIsPrettier, setIsPrettier] = useState<boolean>(false);
    const [sizes, setSizes] = useState<string[] | number[]>(['50%', '50%']);
    const [sCurrentLang, setCurrentLang] = useState<string>('');
    const setConsoleList = useSetRecoilState<any>(gWsLog);
    const [sLoadState, setLoadState] = useState<boolean>(false);

    useEffect(() => {
        setText(pCode);
        setCurrentLang('go');
    }, []);

    useEffect(() => {
        if (sText !== pCode && sCurrentLang) setText(pCode);
    }, [pCode]);

    const handleSplitVertical = () => {
        setIsVertical(true);
    };
    const handleSplitHorizontal = () => {
        setIsVertical(false);
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
        setResultType('text');
        setTextField(aText);
        aUseErrorConsole && ErrorConsole(aText);
    };

    const getTqlData = async (aText: string) => {
        setIsPrettier(false);
        setLoadState(true);
        HandleResutTypeAndTxt('Processing...', false);
        const sResult: any = await getTqlChart(aText);

        const { parsedType, parsedData } = DetermineTqlResultType(E_TQL_SCR.TQL, { status: sResult?.status, headers: sResult?.headers, data: sResult?.data });

        setResultType(parsedType);
        if (parsedType === TqlResType.VISUAL) {
            setVisualData('');
            setVisualData(parsedData);
        } else if (parsedType === TqlResType.MRK) {
            setMarkdown('');
            setMarkdown(parsedData);
        } else if (parsedType === TqlResType.XHTML) {
            setMarkdown('');
            setMarkdown(parsedData);
        } else if (parsedType === TqlResType.CSV) {
            setCsv([]);
            setCsvHeader([]);
            const [sParsedCsvBody, sParsedCsvHeader] = TqlCsvParser(parsedData);
            setCsv(sParsedCsvBody);
            setCsvHeader(sParsedCsvHeader);
        } else if (parsedType === TqlResType.NDJSON) {
            setTextField(parsedData);
        } else {
            setIsPrettier(true);
            HandleResutTypeAndTxt(parsedData, false);
        }

        setLoadState(false);
    };

    const handleChangeText = (aText: any) => {
        setText(aText);

        setBoardList(
            sBoardList.map((aItem) => {
                return aItem.id === sSelectedTab ? { ...aItem, code: aText } : aItem;
            })
        );
    };

    const handleChangeHeader = (aValue: any[]) => {
        const tempHeaders: string[] = [];
        aValue[0].map((aItem: string, aIdx: number) => {
            if (sIsHeader) {
                tempHeaders.push(aItem);
            } else {
                tempHeaders.push('column' + aIdx);
            }
        });
        setCsvHeader(tempHeaders);
        setHeader(!sIsHeader);
    };

    const Resizer = () => {
        return <SashContent className={`${isVertical ? 'sash-style-vertical' : 'sash-style-horizontal'}`} />;
    };

    const handleCopyLink = () => {
        const sTargetBoard = sBoardList.find((aBoard) => aBoard.id === sSelectedTab);
        const sTargetPath = `${window.location.origin + '/db/tql' + sTargetBoard!.path + sTargetBoard!.name}`;
        ClipboardCopy(sTargetPath);
    };

    return (
        <Page>
            <SplitPane
                sashRender={() => Resizer()}
                split={isVertical ? 'vertical' : 'horizontal'}
                sizes={sizes}
                onDragEnd={() => pSetDragStat(false)}
                onDragStart={() => pSetDragStat(true)}
                onChange={setSizes}
            >
                <Pane minSize={50}>
                    <Page.Header>
                        <Button variant="ghost" size="icon" isToolTip toolTipContent="Run code" icon={<Play size={16} />} onClick={() => getTqlData(sText)} aria-label="Run code" />
                        <Button.Group>
                            <Button variant="ghost" size="icon" isToolTip toolTipContent="Save" icon={<Save size={16} />} onClick={pHandleSaveModalOpen} aria-label="Save" />
                            <Button
                                variant="ghost"
                                size="icon"
                                isToolTip
                                toolTipContent="Save as"
                                icon={<SaveAs size={16} />}
                                onClick={() => setIsSaveModal(true)}
                                aria-label="Save as"
                            />
                            {pIsSave && (
                                <Button
                                    icon={<MdLink size={16} />}
                                    variant="ghost"
                                    size="icon"
                                    isToolTip
                                    toolTipContent="Copy link"
                                    onClick={handleCopyLink}
                                    aria-label="Copy link"
                                />
                            )}
                        </Button.Group>
                    </Page.Header>
                    <Page.Body>
                        <MonacoEditor pIsActiveTab={pIsActiveTab} pText={sText} pLang={sCurrentLang} onSelectLine={() => null} onChange={handleChangeText} onRunCode={getTqlData} />
                    </Page.Body>
                </Pane>
                <Pane style={{ overflow: 'initial' }} minSize={50}>
                    <Page.Header>
                        <Tabs.Root selectedTab="RESULT" onTabSelect={() => {}}>
                            <Tabs.Header variant="sub">
                                <Tabs.List>
                                    <Tabs.Item value="RESULT" variant="sub">
                                        {sResultType === 'text' || sResultType === 'ndjson' ? <AiOutlineFileDone size={12} /> : null}
                                        {sResultType === 'mrk' ? <AiOutlineFileMarkdown size={12} /> : null}
                                        {sResultType === 'csv' ? <PiFileCsvThin size={12} /> : null}
                                        {sResultType === 'html' ? <BarChart size={12} /> : null}
                                        <span>RESULT</span>
                                    </Tabs.Item>
                                </Tabs.List>
                            </Tabs.Header>
                        </Tabs.Root>
                        <Button.Group>
                            {sResultType === 'text' && sTextField !== '' && !sLoadState ? (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    isToolTip
                                    toolTipContent="JSON format"
                                    icon={<VscJson size={16} />}
                                    active={sIsPrettier}
                                    onClick={() => setIsPrettier(!sIsPrettier)}
                                    aria-label="JSON format"
                                />
                            ) : null}
                            {sResultType === 'csv' ? (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    isToolTip
                                    toolTipContent={`${sIsHeader ? 'Hide' : 'Show'} header`}
                                    icon={sIsHeader ? <TableHeader size={16} /> : <TableNotHeader size={16} />}
                                    active={sIsHeader}
                                    onClick={() => handleChangeHeader(sCsv)}
                                    aria-label={`${sIsHeader ? 'Hide' : 'Show'} header`}
                                />
                            ) : null}
                            <Button
                                variant="ghost"
                                size="icon"
                                isToolTip
                                toolTipContent="Vertical"
                                icon={<LuFlipVertical size={16} style={{ transform: 'rotate(90deg)' }} />}
                                active={isVertical}
                                onClick={handleSplitVertical}
                                aria-label="Vertical"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                isToolTip
                                toolTipContent="Horizontal"
                                icon={<LuFlipVertical size={16} />}
                                active={!isVertical}
                                onClick={handleSplitHorizontal}
                                aria-label="Horizontal"
                            />
                        </Button.Group>
                    </Page.Header>
                    <Page.Body style={{ padding: '2px 4px' }}>
                        {sResultType === 'csv' ? <Table headers={sCsvHeader} items={sIsHeader ? sCsv : sCsv.filter((_, aIdx) => aIdx !== 0)} /> : null}
                        {sResultType === 'text' && sTextField ? (
                            sIsPrettier && isValidJSON(sTextField) ? (
                                <pre>{JSON.stringify(JSON.parse(sTextField), null, 4)}</pre>
                            ) : (
                                <div style={!sLoadState ? {} : { display: 'flex', alignItems: 'center' }}>
                                    <pre>{sTextField}</pre>
                                    {sLoadState && (
                                        <div style={{ marginLeft: '4px' }}>
                                            <Loader width="12px" height="12px" borderRadius="90%" />
                                        </div>
                                    )}
                                </div>
                            )
                        ) : null}
                        {sResultType === 'ndjson' && <pre>{sTextField}</pre>}
                        {/* Map & Chart */}
                        {sResultType === 'visual' ? <ShowVisualization pData={sVisualData} pLoopMode={false} /> : null}
                        {sResultType === 'mrk' ? <Markdown pIdx={1} pContents={sMarkdown} pType="mrk" /> : null}
                        {sResultType === 'xhtml' ? <Markdown pIdx={1} pContents={sMarkdown} /> : null}
                    </Page.Body>
                </Pane>
            </SplitPane>
        </Page>
    );
};

export default Tql;
