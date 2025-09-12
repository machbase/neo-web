import { useState, useEffect } from 'react';
import { fetchMountTimeMinMax, fetchTimeMinMax } from '@/api/repository/machiot';
import Modal from './Modal';
import './SaveDashboardModal.scss';
import { gRollupTableList } from '@/recoil/recoil';
import { useRecoilValue } from 'recoil';
import { Error, Success } from '@/components/toast/Toast';
import { Download, Close } from '@/assets/icons/Icon';
import { TextButton } from '../buttons/TextButton';
import { calcInterval, CheckObjectKey, setUnitTime } from '@/utils/dashboardUtil';
import { timeMinMaxConverter } from '@/utils/bgnEndTimeRange';
import { DashboardQueryParser, SqlResDataType } from '@/utils/DashboardQueryParser';
import { Select } from '@/components/inputs/Select';
import { chartTypeConverter } from '@/utils/eChartHelper';
import { IconButton } from '../buttons/IconButton';
import { sqlOriginDataDownloader, DOWNLOADER_EXTENSION } from '@/utils/sqlOriginDataDownloader';
import { fixedEncodeURIComponent } from '@/utils/utils';

export interface PanelDataDownloadModalProps {
    setIsOpen: any;
    pIsDarkMode?: boolean;
    pPanelInfo: any;
    pDashboardTime: any;
}

export const PanelDataDownloadModal = (props: PanelDataDownloadModalProps) => {
    const { setIsOpen, pIsDarkMode, pPanelInfo, pDashboardTime } = props;
    const [sSaveFileName, setSaveFileName] = useState<string>('');
    const sRollupTableList = useRecoilValue(gRollupTableList);
    const [sOutput, setOutput] = useState<'DATA(JSON)' | 'DATA(CSV)'>('DATA(JSON)');
    const [sBlockList, setBlockList] = useState<any>([]);
    const [sSelectedBlock, setSelectedBlock] = useState<any>({ idx: -1, name: 'All', value: 'All' });
    const [sIsDownloading, setIsDownloading] = useState<boolean>(false);

    const defaultMinMax = () => {
        const now = Date.now();
        return { min: Math.floor(now - 60 * 60 * 1000), max: Math.floor(now) };
    };

    const fetchTableTimeMinMax = async (): Promise<{ min: number; max: number }> => {
        const sTargetTag = pPanelInfo?.blockList?.[0] ?? { tag: '' };
        const hasName = sTargetTag.tag && sTargetTag.tag !== '';
        const customName = sTargetTag.filter?.filter((aFilter: any) => {
            if (aFilter.column === 'NAME' && (aFilter.operator === '=' || aFilter.operator === 'in') && aFilter.value && aFilter.value !== '') return aFilter;
        })?.[0]?.value;
        if (hasName || (sTargetTag.useCustom && customName)) {
            if (sTargetTag.customTable) return defaultMinMax();
            let rows: any = undefined;
            if (sTargetTag.table?.split('.')?.length > 2) rows = await fetchMountTimeMinMax(sTargetTag);
            else rows = sTargetTag.useCustom ? await fetchTimeMinMax({ ...sTargetTag, tag: customName }) : await fetchTimeMinMax(sTargetTag);
            const res = { min: Math.floor(rows?.[0]?.[0] / 1000000), max: Math.floor(rows?.[0]?.[1] / 1000000) };
            if (!Number(res.min) || !Number(res.max)) return defaultMinMax();
            return res;
        }
        return defaultMinMax();
    };

    const resolveTimeRange = async () => {
        // Determine which time strings to use (panel custom vs dashboard)
        const startRaw = pPanelInfo.useCustomTime ? pPanelInfo.timeRange.start ?? '' : pDashboardTime.start;
        const endRaw = pPanelInfo.useCustomTime ? pPanelInfo.timeRange.end ?? '' : pDashboardTime.end;

        // If both are numeric, return directly
        if (!isNaN(Number(startRaw)) && !isNaN(Number(endRaw))) return { min: Number(startRaw), max: Number(endRaw) };

        // Fetch dataset min/max so 'last-*' can anchor to data's last timestamp
        const svr = await fetchTableTimeMinMax();
        const mm = timeMinMaxConverter(startRaw, endRaw, svr) ?? { min: setUnitTime(startRaw), max: setUnitTime(endRaw) };
        return mm;
    };

    const GetQuery = async () => {
        const { min: sStartTime, max: sEndTime } = await resolveTimeRange();
        const sIntervalInfo = pPanelInfo.isAxisInterval ? pPanelInfo.axisInterval : calcInterval(sStartTime, sEndTime, pPanelInfo.w * 50);
        const [sParsedQuery, sAliasList, sInjectionSrc] = DashboardQueryParser(
            chartTypeConverter(pPanelInfo.type),
            SqlResDataType(pPanelInfo.type),
            pPanelInfo.blockList,
            pPanelInfo.transformBlockList,
            sRollupTableList,
            pPanelInfo.xAxisOptions,
            {
                interval: sIntervalInfo,
                start: sStartTime,
                end: sEndTime,
            },
            undefined,
            true
        );

        return [sParsedQuery, sAliasList, sInjectionSrc];
    };

    const SetBlockAliasList = async () => {
        const [_, sAliasList] = await GetQuery();
        setBlockList(sAliasList as any);
    };

    const handleClose = () => {
        setIsOpen(false);
    };

    const changeSaveFileName = (aEvent: React.ChangeEvent<HTMLInputElement>) => {
        setSaveFileName(aEvent.target.value);
    };

    const HandleOutput = (aValue: 'DATA(JSON)' | 'DATA(CSV)') => {
        setOutput(aValue);
    };

    const HandleBlockSelection = (aEvent: any) => {
        const selectedValue = aEvent.target.value;
        if (selectedValue === 'All') {
            setSelectedBlock({ idx: -1, name: 'All', value: 'All' });
        } else {
            const blockIndex = sBlockList.findIndex((block: any) => block.name === selectedValue);
            setSelectedBlock({
                idx: blockIndex,
                name: selectedValue,
                value: selectedValue
            });
        }
    };

    const GetSaveDataText = async (blockIndex: number) => {
        const [sParsedQuery] = await GetQuery();
        const sOutputStr: string = sOutput === 'DATA(JSON)' ? 'JSON()' : 'CSV()';
        const sTargetItem = sParsedQuery[blockIndex];
        let sResult = '';
        if (CheckObjectKey(sTargetItem, 'trx')) {
            sResult = sTargetItem.sql + '\n' + sOutputStr;
        } else sResult = `SQL("${sTargetItem.sql}")\n` + sOutputStr;
        return sResult;
    };




    const handleDownload = async () => {
        if (sBlockList.length === 0) return;
        
        setIsDownloading(true);
        let successCount = 0;
        let errorCount = 0;
        
        try {
            // Determine which blocks to download
            const blocksToDownload = sSelectedBlock.idx === -1 
                ? Array.from({ length: sBlockList.length }, (_, index) => index)  // All blocks
                : [sSelectedBlock.idx];  // Single selected block

            for (const blockIndex of blocksToDownload) {
                try {
                    const blockInfo = sBlockList[blockIndex];
                    if (!blockInfo) {
                        Error(`Block not found at index ${blockIndex}`);
                        errorCount++;
                        continue;
                    }

                    // Generate TQL query string (same as GetSaveDataText)
                    const tqlQuery = await GetSaveDataText(blockIndex);
                    
                    // Create download URL (same as SQL download pattern)
                    const url = window.location.origin + '/web/api/tql-exec';
                    const token = localStorage.getItem('accessToken');
                    const encodedQuery = fixedEncodeURIComponent(tqlQuery);
                    const downloadUrl = `${url}?$=${encodedQuery}&$token=${token}`;
                    
                    // Generate filename
                    const extension = sOutput === 'DATA(JSON)' ? 'json' as DOWNLOADER_EXTENSION : DOWNLOADER_EXTENSION.CSV;
                    let filename: string;
                    
                    if (sSelectedBlock.idx === -1) {
                        // All blocks selected - use base filename with numbering
                        const baseFileName = sSaveFileName.trim() || 
                            (pPanelInfo.title || 'panel_data').replace(/[^a-zA-Z0-9_-]/g, '_');
                        const baseWithoutExt = baseFileName.replace(/\.(json|csv)$/i, '');
                        const blockNumber = blockIndex + 1;
                        filename = `${baseWithoutExt}_${blockNumber}`;
                    } else {
                        // Single block selected - use filename as is
                        const baseFileName = sSaveFileName.trim() || 
                            (pPanelInfo.title || 'panel_data').replace(/[^a-zA-Z0-9_-]/g, '_');
                        filename = baseFileName.replace(/\.(json|csv)$/i, '');
                    }
                    
                    // Direct URL download (same as SQL pattern)
                    sqlOriginDataDownloader(downloadUrl, extension, filename);
                    successCount++;
                    
                    // Add small delay between downloads to prevent browser issues
                    if (blocksToDownload.length > 1) {
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                    
                } catch (error) {
                    Error(`Failed to download block ${blockIndex + 1}`);
                    errorCount++;
                }
            }
            
            // Show success/error messages
            if (successCount > 0) {
                Success(`Successfully downloaded ${successCount} file${successCount > 1 ? 's' : ''}`);
            }
            if (errorCount > 0) {
                Error(`Failed to download ${errorCount} file${errorCount > 1 ? 's' : ''}`);
            }
            
        } catch (error) {
            Error('Download failed. Please try again.');
        } finally {
            setIsDownloading(false);
            if (successCount > 0 || (errorCount > 0 && successCount === 0)) {
                handleClose();
            }
        }
    };

    useEffect(() => {
        SetBlockAliasList();
        setSaveFileName(`${pPanelInfo.title !== '' ? pPanelInfo.title : 'panel_data'}`);
    }, []);

    return (
        <div className="tql">
            <Modal pIsDarkMode={pIsDarkMode} onOutSideClose={handleClose}>
                <Modal.Header>
                    <div className="title">
                        <div className="title-content">
                            <Download />
                            <span>Download Panel Data</span>
                        </div>
                        <Close onClick={handleClose} />
                    </div>
                </Modal.Header>
                <Modal.Body>
                </Modal.Body>
                <Modal.Footer>
                    <div className="save-option">
                        <div className="save-file-name">
                            <span>File Name</span>
                            <div className={`input-wrapper ${pIsDarkMode ? 'input-wrapper-dark' : ''}`}>
                                <input autoFocus onChange={changeSaveFileName} value={sSaveFileName}></input>
                            </div>
                        </div>
                        <div className="save-file-data">
                            <span>Output</span>
                            <Select
                                pFontSize={12}
                                pAutoChanged={true}
                                pWidth={175}
                                pBorderRadius={8}
                                pInitValue={sOutput}
                                pHeight={33}
                                onChange={(aEvent: any) => HandleOutput(aEvent.target.value)}
                                pOptions={['DATA(JSON)', 'DATA(CSV)']}
                            />
                        </div>
                        <div className="save-file-block">
                            <span>Block</span>
                            <Select
                                pFontSize={12}
                                pAutoChanged={true}
                                pWidth={175}
                                pBorderRadius={8}
                                pInitValue={sSelectedBlock.value}
                                pHeight={33}
                                onChange={HandleBlockSelection}
                                pOptions={['All', ...sBlockList.map((aAlias: any) => aAlias.name)]}
                            />
                        </div>
                    </div>
                    <div className="button-group">
                        <TextButton
                            pText={sIsDownloading ? "Downloading..." : "Download"}
                            pBackgroundColor="#4199ff"
                            pIsDisabled={sBlockList.length === 0 || sIsDownloading}
                            onClick={handleDownload}
                        />
                        <div style={{ width: '10px' }}></div>
                        <TextButton pText="Cancel" pBackgroundColor="#666979" onClick={handleClose} />
                    </div>
                </Modal.Footer>
            </Modal>
        </div>
    );
};
