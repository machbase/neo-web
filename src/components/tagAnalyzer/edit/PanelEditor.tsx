import { useEffect, useState } from 'react';
import PanelEditorPreview from './PanelEditorPreview';
import PanelEditorSettings from './sections/PanelEditorSettings';
import { useRecoilState } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { IoArrowBackOutline } from '@/assets/icons/Icon';
import { deepEqual } from '@/utils/index';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { getBgnEndTimeRange, subtractTime } from '@/utils/bgnEndTimeRange';
import { convertTimeToFullDate } from '@/utils/helpers/date';
import { fetchVirtualStatTable } from '@/api/repository/machiot';
import { Page, Button } from '@/design-system/components';

const PanelEditor = ({ pPanelInfo, pBoardInfo, pSetEditPanel, pSetSaveEditedInfo, pNavigatorRange }: any) => {
    const [sBoardList, setBoardList] = useRecoilState<any>(gBoardList);
    const [sGlobalSelectedTab] = useRecoilState<any>(gSelectedTab);
    const [sBgnEndTimeRange, setBgnEndTimeRange] = useState<any>(undefined);
    const [sSelectedTab, setSelectedTab] = useState('General');
    const [sPanelInfo, setPanelInfo] = useState<any>({});
    const [sCopyPanelInfo, setCopyPanelInfo] = useState<any>({});
    const [sIsConfirmModal, setIsConfirmModal] = useState<boolean>(false);
    const [sLoading] = useState<boolean>(false);
    const [sData] = useState<any>(['General', 'Data', 'Axes', 'Display', 'Time']);

    const timeConverter = async (aTargetTime: any) => {
        let sData: any = { bgn_min: 0, bgn_max: 0, end_min: 0, end_max: 0 };
        // Set last
        if (typeof aTargetTime.range_bgn === 'string' && aTargetTime.range_bgn.includes('last')) {
            const sLastRange = await getBgnEndTimeRange(aTargetTime.tag_set, { bgn: aTargetTime.range_bgn, end: aTargetTime.range_end }, { bgn: '', end: '' });
            sData = {
                bgn_min: subtractTime(sLastRange.end_max as number, aTargetTime.range_bgn),
                bgn_max: subtractTime(sLastRange.end_max as number, aTargetTime.range_bgn),
                end_min: subtractTime(sLastRange.end_max as number, aTargetTime.range_end),
                end_max: subtractTime(sLastRange.end_max as number, aTargetTime.range_end),
            };
        }
        // Set now
       if (typeof aTargetTime.range_bgn === 'string' && aTargetTime.range_bgn.includes('now')) {
            const sNowTimeBgn = convertTimeToFullDate(aTargetTime.range_bgn);
            const sNowTimeEnd = convertTimeToFullDate(aTargetTime.range_end);
            sData = { bgn_min: sNowTimeBgn, bgn_max: sNowTimeBgn, end_min: sNowTimeEnd, end_max: sNowTimeEnd };
        } 
        // Set range
        if (typeof aTargetTime.range_bgn === 'number') {
            sData = { bgn_min: aTargetTime.range_bgn, bgn_max: aTargetTime.range_bgn, end_min: aTargetTime.range_end, end_max: aTargetTime.range_end };
        }
        // Set defulat ('')
        if (aTargetTime.range_bgn === '' || aTargetTime.range_end === '') {
            sData = {
                bgn_min: pNavigatorRange.startTime,
                bgn_max: pNavigatorRange.startTime,
                end_min: pNavigatorRange.endTime,
                end_max: pNavigatorRange.endTime,
            };
        }
        return sData;
    };
    const apply = async () => {
        let sData: any = { bgn_min: 0, bgn_max: 0, end_min: 0, end_max: 0 };
        if (sCopyPanelInfo.range_bgn !== '') sData = await timeConverter(sCopyPanelInfo);
        else if (pBoardInfo.range_bgn !== '')
            sData = await timeConverter({ range_end: pBoardInfo.range_end, range_bgn: pBoardInfo.range_bgn, tag_set: pBoardInfo.panels[0].tag_set });
        else {
            const sVirtualStatInfo = await fetchVirtualStatTable(sCopyPanelInfo.tag_set[0].table, [sCopyPanelInfo.tag_set[0].tagName], sCopyPanelInfo.tag_set[0]);
            sData = {
                bgn_min: sVirtualStatInfo[0][0] / 1000000,
                bgn_max: sVirtualStatInfo[0][0] / 1000000,
                end_min: sVirtualStatInfo[0][1] / 1000000,
                end_max: sVirtualStatInfo[0][1] / 1000000,
            };
        }
        setPanelInfo(() => sCopyPanelInfo);
        setBgnEndTimeRange(() => sData);
    };
    const save = () => {
        setBoardList(
            sBoardList.map((aItem: any) => {
                return aItem.id === sGlobalSelectedTab
                    ? {
                          ...aItem,
                          panels: aItem.panels.map((bItem: any) => {
                              return bItem.index_key === pPanelInfo.index_key ? sPanelInfo : bItem;
                          }),
                      }
                    : aItem;
            })
        );
        pSetSaveEditedInfo(true);
        pSetEditPanel(false);
    };
    const checkSameWithConfirmModal = () => {
        const sIsSame = deepEqual(sPanelInfo, sCopyPanelInfo);
        if (!sIsSame) {
            setIsConfirmModal(true);
            return;
        } else {
            save();
            return;
        }
    };
    const setInit = async () => {
        let sData: any = { bgn_min: 0, bgn_max: 0, end_min: 0, end_max: 0 };
        if (pPanelInfo.range_bgn !== '') sData = await timeConverter(pPanelInfo);
        else if (pBoardInfo.range_bgn !== '') {
            sData = await timeConverter({ range_end: pBoardInfo.range_end, range_bgn: pBoardInfo.range_bgn, tag_set: pBoardInfo.panels[0].tag_set });
        } else {
            const sVirtualStatInfo = await fetchVirtualStatTable(pPanelInfo.tag_set[0].table, [pPanelInfo.tag_set[0].tagName], pPanelInfo.tag_set[0]);
            sData = {
                bgn_min: sVirtualStatInfo[0][0] / 1000000,
                bgn_max: sVirtualStatInfo[0][0] / 1000000,
                end_min: sVirtualStatInfo[0][1] / 1000000,
                end_max: sVirtualStatInfo[0][1] / 1000000,
            };
        }
        setBgnEndTimeRange(() => sData);
        setPanelInfo(pPanelInfo);
        setCopyPanelInfo(pPanelInfo);
    };

    useEffect(() => {
        setInit();
    }, []);

    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                height: '100%',
                zIndex: 9999,
                backgroundColor: 'var(--color-background-primary)',
            }}
        >
            <Page style={{ width: '100%', height: '100%' }}>
                <Page.Header>
                    <Page.DpRow>
                        <Button variant="ghost" size="icon" icon={<IoArrowBackOutline size={16} />} onClick={() => pSetEditPanel(false)} aria-label="Back" />
                        Edit panel
                    </Page.DpRow>
                    <Page.DpRow>
                        <Page.TextButton pText="Discard" pType="DELETE" pCallback={() => pSetEditPanel(false)} pWidth="75px" mb="0px" mr="4px" />
                        <Page.TextButton pText="Apply" pType="STATUS" pCallback={apply} pWidth="75px" mb="0px" mr="4px" />
                        <Page.TextButton pText="Save" pType="CREATE" pCallback={checkSameWithConfirmModal} pWidth="65px" mb="0px" mr="4px" />
                    </Page.DpRow>
                </Page.Header>

                <PanelEditorPreview
                    pPanelInfo={sPanelInfo}
                    pBgnEndTimeRange={sBgnEndTimeRange}
                    pNavigatorRange={pNavigatorRange}
                    pBoardInfo={pBoardInfo}
                    pIsLoading={sLoading}
                />
                <Page style={{ height: 2 }}>
                    <Page.Divi spacing="0" />
                </Page>
                <PanelEditorSettings
                    pTabs={sData}
                    pSelectedTab={sSelectedTab}
                    pSetSelectedTab={setSelectedTab}
                    pPanelInfo={sCopyPanelInfo}
                    pSetCopyPanelInfo={setCopyPanelInfo}
                />
            </Page>

            {sIsConfirmModal && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={setIsConfirmModal}
                    pCallback={save}
                    pContents={
                        <>
                            <div className="body-content">There are contents that have not been applied.</div>
                            <div className="body-content">Are you sure you want to save it?</div>
                        </>
                    }
                />
            )}
        </div>
    );
};

export default PanelEditor;
