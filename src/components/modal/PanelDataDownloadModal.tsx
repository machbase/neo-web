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
import { replaceVariablesInTql } from '@/utils/TqlVariableReplacer';

export interface PanelDataDownloadModalProps {
    setIsOpen: any;
    pIsDarkMode?: boolean;
    pPanelInfo: any;
    pDashboardTime: any;
    pBoardInfo?: any;
}

export const PanelDataDownloadModal = (props: PanelDataDownloadModalProps) => {
    const { setIsOpen, pIsDarkMode, pPanelInfo, pDashboardTime, pBoardInfo } = props;
    const [sSaveFileName, setSaveFileName] = useState<string>('');
    const sRollupTableList = useRecoilValue(gRollupTableList);
    // Always use CSV output
    const sOutput = 'DATA(CSV)';
    const [sBlockList, setBlockList] = useState<any>([]);
    const [sSelectedBlock, setSelectedBlock] = useState<any>({ idx: 0, name: '', value: '' });
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
        // Set first block as default selection
        if (sAliasList && sAliasList.length > 0) {
            setSelectedBlock({ idx: 0, name: sAliasList[0].name, value: sAliasList[0].name });
        }
    };

    const handleClose = () => {
        setIsOpen(false);
    };

    const changeSaveFileName = (aEvent: React.ChangeEvent<HTMLInputElement>) => {
        setSaveFileName(aEvent.target.value);
    };

    // Removed HandleOutput function as we always use CSV

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
        const { min: sStartTime, max: sEndTime } = await resolveTimeRange();
        const sIntervalInfo = pPanelInfo.isAxisInterval ? pPanelInfo.axisInterval : calcInterval(sStartTime, sEndTime, pPanelInfo.w * 50);
        
        const sOutputStr: string = sOutput === 'DATA(JSON)' ? 'JSON()' : 'CSV()';
        const sTargetItem = sParsedQuery[blockIndex];
        let sResult = '';
        
        // Apply variables replacement if board info and variables are available
        let processedSql = sTargetItem.sql;
        if (pBoardInfo?.dashboard?.variables && pBoardInfo.dashboard.variables.length > 0) {
            const sTimeContext = {
                interval: sIntervalInfo,
                start: sStartTime,
                end: sEndTime,
            };
            processedSql = replaceVariablesInTql(sTargetItem.sql, pBoardInfo.dashboard.variables, sTimeContext);
        }
        
        if (CheckObjectKey(sTargetItem, 'trx')) {
            sResult = processedSql + '\n' + sOutputStr;
        } else sResult = `SQL("${processedSql}")\n` + sOutputStr;
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
                    
                    // Generate filename - always use CSV
                    const extension = DOWNLOADER_EXTENSION.CSV;
                    let filename: string;
                    
                    if (sSelectedBlock.idx === -1) {
                        // All blocks selected - use base filename with numbering
                        const baseFileName = sSaveFileName.trim() || 
                            (blockInfo.name || 'panel_data').replace(/[^a-zA-Z0-9_-]/g, '_');
                        const baseWithoutExt = baseFileName.replace(/\.(json|csv)$/i, '');
                        const blockNumber = blockIndex + 1;
                        filename = `${baseWithoutExt}_${blockNumber}`;
                    } else {
                        // Single block selected - use filename as is
                        const baseFileName = sSaveFileName.trim() || 
                            (blockInfo.name || 'panel_data').replace(/[^a-zA-Z0-9_-]/g, '_');
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
            
            // Don't show toast messages
            
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
        // Set initial filename based on first tag name
        const firstTagName = pPanelInfo?.blockList?.[0]?.name || 'panel_data';
        setSaveFileName(firstTagName.replace(/[^a-zA-Z0-9_-]/g, '_'));
    }, []);

    return (
        <div className="tql tql-download">
            <Modal pIsDarkMode={pIsDarkMode} onOutSideClose={handleClose}>
                <Modal.Header>
                    <div className="title">
                        <div className="title-content">
                            <Download />
                            <span>Download Panel Data (CSV)</span>
                        </div>
                        <Close onClick={handleClose} />
                    </div>
                </Modal.Header>
                <Modal.Body>
                </Modal.Body>
                <Modal.Footer>
                    <div className="save-option">
                        <div className="save-file-name" style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                                <span>File Name</span>
                                <div className={`input-wrapper ${pIsDarkMode ? 'input-wrapper-dark' : ''}`}>
                                    <input autoFocus onChange={changeSaveFileName} value={sSaveFileName}></input>
                                </div>
                            </div>
                            <span style={{ color: '#ccc', fontSize: '12px', paddingBottom: '8px' }}> .csv</span>
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
                                pOptions={[...sBlockList.map((aAlias: any) => aAlias.name), 'All']}
                                pIsToolTip={true}
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
