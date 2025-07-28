import { useEffect, useState, useRef } from 'react';
import SplitPane, { Pane, SashContent } from 'split-pane-react';
import { getTqlChart } from '@/api/repository/machiot';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { gBoardList, gConsoleSelector, gSelectedTab } from '@/recoil/recoil';
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
import { IconButton } from '../buttons/IconButton';
import { ClipboardCopy } from '@/utils/ClipboardCopy';
import { TqlCsvParser } from '@/utils/tqlCsvParser';
import { Loader } from '../loader';
import { ShowVisualization } from './ShowVisualization';
import { DetermineTqlResultType, E_TQL_SCR, TqlResType } from '@/utils/TQL/TqlResParser';
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
    const [sIsHeader, setHeader] = useState<boolean>(false);
    const [sMarkdown, setMarkdown] = useState<any>('');
    const [sVisualData, setVisualData] = useState<string>('');
    // const [sMapData, setMapData] = useState<any>(undefined);
    const [sResultType, setResultType] = useState<string>('text');
    const [sTextField, setTextField] = useState<string>('');
    const [sIsPrettier, setIsPrettier] = useState<boolean>(false);
    const [sizes, setSizes] = useState<string[] | number[]>(['50%', '50%']);
    const [sCurrentLang, setCurrentLang] = useState<string>('');
    const setConsoleList = useSetRecoilState<any>(gConsoleSelector);
    const tqlResultBodyRef = useRef(null);
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
        } else HandleResutTypeAndTxt(parsedData, false);

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
        <div style={{ width: '100%', height: '100%' }}>
            <SplitPane
                sashRender={() => Resizer()}
                split={isVertical ? 'vertical' : 'horizontal'}
                sizes={sizes}
                onDragEnd={() => pSetDragStat(false)}
                onDragStart={() => pSetDragStat(true)}
                onChange={setSizes}
            >
                <Pane minSize={50}>
                    <div className="tql-editor-header">
                        <IconButton pIsToopTip pToolTipContent="Run code" pToolTipId="tql-tab-explorer-run-code" pIcon={<Play />} onClick={() => getTqlData(sText)} />
                        <div style={{ display: 'flex' }}>
                            <IconButton pIsToopTip pToolTipContent="Save" pToolTipId="tql-tab-explorer-save" pIcon={<Save />} onClick={pHandleSaveModalOpen} />
                            <IconButton pIsToopTip pToolTipContent="Save as" pToolTipId="tql-tab-explorer-save-as" pIcon={<SaveAs />} onClick={() => setIsSaveModal(true)} />
                            {pIsSave && <IconButton pIsToopTip pToolTipContent="Copy link" pToolTipId="tql-tab-explorer-copy-link" pIcon={<MdLink />} onClick={handleCopyLink} />}
                        </div>
                    </div>
                    <div style={{ width: '100%', height: 'calc(100% - 40px)' }}>
                        <MonacoEditor pIsActiveTab={pIsActiveTab} pText={sText} pLang={sCurrentLang} onSelectLine={() => null} onChange={handleChangeText} onRunCode={getTqlData} />
                    </div>
                </Pane>
                <Pane style={{ overflow: 'initial' }}>
                    <div className="tql-result-wrapper">
                        <div className="tql-result-header">
                            <div className="tql-result-tab result-icon">
                                <div className="round_right_wrap">
                                    <div className="round_right" />
                                </div>
                                {sResultType === 'text' || sResultType === 'ndjson' ? <AiOutlineFileDone color="#fdb532" /> : null}
                                {sResultType === 'mrk' ? <AiOutlineFileMarkdown color="#fdb532" /> : null}
                                {sResultType === 'csv' ? <PiFileCsvThin color="#fdb532" /> : null}
                                {sResultType === 'html' ? <BarChart color="#fdb532" /> : null}
                                RESULT
                                <div className="round_left_wrap">
                                    <div className="round_left" />
                                </div>
                            </div>
                            <div className="tql-result-btn-group">
                                {sResultType === 'text' && sTextField !== '' ? (
                                    <IconButton
                                        pIsToopTip
                                        pToolTipContent="JSON format"
                                        pToolTipId="tql-tab-divider-explorer-json-format"
                                        pIcon={<VscJson />}
                                        pIsActive={sIsPrettier}
                                        onClick={() => setIsPrettier(!sIsPrettier)}
                                    />
                                ) : null}
                                {sResultType === 'csv' ? (
                                    <IconButton
                                        pIsToopTip
                                        pToolTipContent={`${sIsHeader ? 'Hide' : 'Show'} header`}
                                        pToolTipId="tql-tab-divider-explorer-csv-format"
                                        pIcon={sIsHeader ? <TableHeader /> : <TableNotHeader />}
                                        pIsActive={sIsHeader}
                                        onClick={() => handleChangeHeader(sCsv)}
                                    />
                                ) : null}
                                <div className="divider" />
                                <IconButton
                                    pIsToopTip
                                    pToolTipContent="Vertical"
                                    pToolTipId="tql-tab-divider-explorer-hori"
                                    pIcon={<LuFlipVertical style={{ transform: 'rotate(90deg)' }} />}
                                    pIsActive={isVertical}
                                    onClick={handleSplitVertical}
                                />
                                <IconButton
                                    pIsToopTip
                                    pToolTipContent="Horizontal"
                                    pToolTipId="tql-tab-divider-explorer-ver"
                                    pIcon={<LuFlipVertical />}
                                    pIsActive={!isVertical}
                                    onClick={handleSplitHorizontal}
                                />
                            </div>
                        </div>
                        <div ref={tqlResultBodyRef} className="tql-result-body" style={{ backgroundColor: '#1B1C21' }}>
                            {sResultType === 'csv' ? <Table headers={sCsvHeader} items={sIsHeader ? sCsv : sCsv.filter((_, aIdx) => aIdx !== 0)} /> : null}
                            {sResultType === 'text' && sTextField ? (
                                sIsPrettier && isValidJSON(sTextField) ? (
                                    <pre>{JSON.stringify(JSON.parse(sTextField), null, 4)}</pre>
                                ) : (
                                    <div style={!sLoadState ? { padding: '0 1rem' } : { padding: '0 1rem', display: 'flex', alignItems: 'center' }}>
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
                        </div>
                    </div>
                </Pane>
            </SplitPane>
        </div>
    );
};

export default Tql;
