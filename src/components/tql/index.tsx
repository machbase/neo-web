import { useEffect, useState } from 'react';
import SplitPane, { Pane, SashContent } from 'split-pane-react';
import { getTqlChart } from '@/api/repository/machiot';
import { useRecoilState, useRecoilValue } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { Table } from './Table';
import './index.scss';
import { ShowChart } from './ShowChart';
import { Markdown } from '../worksheet/Markdown';
import { isValidJSON } from '@/utils';
import { MonacoEditor } from '@/components/monaco/MonacoEditor';
import { AiOutlineFileDone, AiOutlineFileMarkdown, BarChart, Save, VscJson, PiFileCsvThin, TableHeader, TableNotHeader, LuFlipVertical, Play, SaveAs } from '@/assets/icons/Icon';
import { IconButton } from '../buttons/IconButton';

interface TqlProps {
    setIsSaveModal: React.Dispatch<React.SetStateAction<boolean>>;
    pHandleSaveModalOpen: any;
}

const Tql = (props: TqlProps) => {
    const { pHandleSaveModalOpen, setIsSaveModal } = props;
    const [isVertical, setIsVertical] = useState<boolean>(true);
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const sSelectedTab = useRecoilValue(gSelectedTab);
    const [sText, setText] = useState<string>(``);
    const [sCsv, setCsv] = useState<string[][]>([]);
    const [sCsvHeader, setCsvHeader] = useState<string[]>([]);
    const [sIsHeader, setHeader] = useState<boolean>(false);
    const [sMarkdown, setMarkdown] = useState<any>('');
    const [sChartData, setChartData] = useState<string>('');
    const [sResultType, setResultType] = useState<string>('text');
    const [sTextField, setTextField] = useState<string>('');
    const [sIsPrettier, setIsPrettier] = useState<boolean>(false);
    const [sizes, setSizes] = useState<string[] | number[]>(['50%', '50%']);

    useEffect(() => {
        const sIsExist = sBoardList.findIndex((aItem) => aItem.id === sSelectedTab);
        if (sIsExist !== -1 && sBoardList[sIsExist].code) {
            setText(sBoardList[sIsExist].code);
        }
    }, []);

    const handleSplitVertical = () => {
        setIsVertical(true);
    };
    const handleSplitHorizontal = () => {
        setIsVertical(false);
    };

    const getTqlData = async (aText: string) => {
        const sResult: any = await getTqlChart(aText);

        if (sResult.status === 200 && sResult.headers && sResult.headers['x-chart-type'] === 'echarts') {
            setResultType('html');
            setChartData(sResult.data);
        } else if (sResult.status === 200 && sResult.headers && sResult.headers['content-type'] === 'text/markdown') {
            setResultType('mrk');
            setMarkdown(sResult.data);
        } else if (sResult.status === 200 && sResult.headers && sResult.headers['content-type'] === 'text/csv') {
            setResultType('csv');

            const sTempCsv: string[][] = [];

            sResult.data.split('\n').map((aItem: string) => {
                sTempCsv.push(aItem.split(','));
            });

            const tempHeaders: string[] = [];
            sTempCsv[0].map((_, aIdx) => {
                tempHeaders.push('column' + aIdx);
            });
            setCsvHeader(tempHeaders);
            setHeader(true);

            setCsv(sTempCsv);
            return;
        } else if (sResult.status === 200 && sResult.headers && sResult.headers['content-type'] === 'application/xhtml+xml') {
            setResultType('xhtml');
            setMarkdown(sResult.data);
        } else {
            setResultType('text');
            if (sResult.status === 200) {
                setTextField(JSON.stringify(sResult.data));
                return;
            } else {
                setTextField(sResult.data.reason);
                return;
            }
        }
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

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <SplitPane sashRender={() => Resizer()} split={isVertical ? 'vertical' : 'horizontal'} sizes={sizes} onChange={setSizes}>
                <Pane minSize={50}>
                    <div className="tql-editor-header">
                        <IconButton pIcon={<Play />} onClick={() => getTqlData(sText)} />
                        <div style={{ display: 'flex' }}>
                            <IconButton pIcon={<Save />} onClick={pHandleSaveModalOpen} />
                            <IconButton pIcon={<SaveAs />} onClick={() => setIsSaveModal(true)} />
                        </div>
                    </div>
                    <div style={{ width: '100%', height: 'calc(100% - 40px)' }}>
                        <MonacoEditor pText={sText} pLang="go" onSelectLine={() => {}} onChange={handleChangeText} onRunCode={getTqlData} />
                    </div>
                </Pane>
                <Pane style={{ overflow: 'initial' }}>
                    <div className="tql-result-wrapper" style={{ marginTop: isVertical ? '' : '10px' }}>
                        <div className="tql-result-header">
                            <div className="tql-result-tab result-icon" style={{ color: '#fdb532' }}>
                                <div className="round_right_wrap">
                                    <div className="round_right"></div>
                                </div>
                                {sResultType === 'text' ? <AiOutlineFileDone color="#fdb532" /> : null}
                                {sResultType === 'mrk' ? <AiOutlineFileMarkdown color="#fdb532" /> : null}
                                {sResultType === 'csv' ? <PiFileCsvThin color="#fdb532" /> : null}
                                {sResultType === 'html' ? <BarChart color="#fdb532" /> : null}
                                RESULT
                                <div className="round_left_wrap">
                                    <div className="round_left"></div>
                                </div>
                            </div>
                            <div className="tql-result-btn-group">
                                {sResultType === 'text' && sTextField !== '' ? (
                                    <IconButton pIcon={<VscJson />} pIsActive={sIsPrettier} onClick={() => setIsPrettier(!sIsPrettier)} />
                                ) : null}
                                {sResultType === 'csv' ? (
                                    <IconButton pIcon={sIsHeader ? <TableHeader /> : <TableNotHeader />} pIsActive={sIsHeader} onClick={() => handleChangeHeader(sCsv)} />
                                ) : null}
                                <div className="divider" style={{ margin: '12px 3px' }}></div>
                                <IconButton pIcon={<LuFlipVertical style={{ transform: 'rotate(90deg)' }} />} pIsActive={isVertical} onClick={handleSplitVertical} />
                                <IconButton pIcon={<LuFlipVertical />} pIsActive={!isVertical} onClick={handleSplitHorizontal} />
                            </div>
                        </div>
                        <div className="tql-result-body" style={{ backgroundColor: '#1B1C21' }}>
                            {sResultType === 'csv' ? <Table headers={sCsvHeader} items={sIsHeader ? sCsv : sCsv.filter((_, aIdx) => aIdx !== 0)} /> : null}
                            {sResultType === 'text' && sTextField ? (
                                sIsPrettier && isValidJSON(sTextField) ? (
                                    <pre>{JSON.stringify(JSON.parse(sTextField), null, 4)}</pre>
                                ) : (
                                    <div style={{ padding: '0 1rem' }}>{sTextField}</div>
                                )
                            ) : null}
                            {sResultType === 'html' ? <ShowChart pData={sChartData} /> : null}
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
