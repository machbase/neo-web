import { useEffect, useState } from 'react';
import PanelEditorPreview from './PanelEditorPreview';
import PanelEditorSettings from './sections/PanelEditorSettings';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { IoArrowBackOutline } from '@/assets/icons/Icon';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { Page, Button } from '@/design-system/components';
import type { Dispatch, SetStateAction } from 'react';
import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerPanelInfo,
    TagAnalyzerTimeRange,
} from '../panel/TagAnalyzerPanelModelTypes';
import type {
    EditTabPanelType,
    TagAnalyzerPanelEditorConfig,
} from './PanelEditorTypes';
import {
    EDITOR_TABS,
    createPanelEditorConfig,
    hasUnappliedEditorChanges,
    mergePanelEditorConfig,
    replaceEditedPanelInBoardList,
    resolveEditorTimeBounds,
} from './PanelEditorUtil';

const PanelEditor = ({
    pPanelInfo,
    pSetEditPanel,
    pSetSaveEditedInfo,
    pNavigatorRange,
}: {
    pPanelInfo: TagAnalyzerPanelInfo;
    pSetEditPanel: () => void;
    pSetSaveEditedInfo: Dispatch<SetStateAction<boolean>>;
    pNavigatorRange: TagAnalyzerTimeRange;
}) => {
    const setBoardList = useSetRecoilState(gBoardList);
    const sGlobalSelectedTab = useRecoilValue(gSelectedTab);
    const [sBgnEndTimeRange, setBgnEndTimeRange] = useState<Partial<TagAnalyzerBgnEndTimeRange>>({});
    const [sSelectedTab, setSelectedTab] = useState<EditTabPanelType>('General');
    const [sPanelInfo, setPanelInfo] = useState<TagAnalyzerPanelInfo>(pPanelInfo);
    const [sEditorConfig, setEditorConfig] = useState<TagAnalyzerPanelEditorConfig>(() => createPanelEditorConfig(pPanelInfo));
    const [sIsConfirmModal, setIsConfirmModal] = useState<boolean>(false);

    // Applies the current editor draft into the preview chart state and preview time bounds.
    const applyEditorChanges = async () => {
        const sNextPanelInfo = mergePanelEditorConfig(pPanelInfo, sEditorConfig);
        const sData = await resolveEditorTimeBounds({
            range_bgn: sNextPanelInfo.time.range_bgn,
            range_end: sNextPanelInfo.time.range_end,
            tag_set: sNextPanelInfo.data.tag_set,
            navigatorRange: pNavigatorRange,
        });
        setPanelInfo(sNextPanelInfo);
        setBgnEndTimeRange(sData);
    };

    // Saves the currently applied preview panel back into the selected board.
    const saveEditorChanges = () => {
        setBoardList((aPrev) =>
            replaceEditedPanelInBoardList(aPrev, sGlobalSelectedTab, pPanelInfo.meta.index_key, sPanelInfo),
        );
        pSetSaveEditedInfo(true);
        pSetEditPanel();
    };

    // Shows a confirm modal when the draft differs from the currently applied preview panel.
    const confirmSaveIfNeeded = () => {
        const sDraftPanelInfo = mergePanelEditorConfig(pPanelInfo, sEditorConfig);
        if (hasUnappliedEditorChanges(sPanelInfo, sDraftPanelInfo)) {
            setIsConfirmModal(true);
            return;
        }
        saveEditorChanges();
    };

    // Initializes the editor draft and preview state from the incoming panel.
    const initializeEditorState = async () => {
        const sData = await resolveEditorTimeBounds({
            range_bgn: pPanelInfo.time.range_bgn,
            range_end: pPanelInfo.time.range_end,
            tag_set: pPanelInfo.data.tag_set,
            navigatorRange: pNavigatorRange,
        });
        setBgnEndTimeRange(sData);
        setPanelInfo(pPanelInfo);
        setEditorConfig(createPanelEditorConfig(pPanelInfo));
        setSelectedTab('General');
    };

    useEffect(() => {
        void initializeEditorState();
    }, [pPanelInfo, pNavigatorRange]);

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
                        <Button variant="ghost" size="icon" icon={<IoArrowBackOutline size={16} />} onClick={pSetEditPanel} aria-label="Back" />
                        Edit panel
                    </Page.DpRow>
                    <Page.DpRow>
                        <Page.TextButton pText="Discard" pType="DELETE" pCallback={pSetEditPanel} pWidth="75px" mb="0px" mr="4px" />
                        <Page.TextButton pText="Apply" pType="STATUS" pCallback={applyEditorChanges} pWidth="75px" mb="0px" mr="4px" />
                        <Page.TextButton pText="Save" pType="CREATE" pCallback={confirmSaveIfNeeded} pWidth="65px" mb="0px" mr="4px" />
                    </Page.DpRow>
                </Page.Header>

                <PanelEditorPreview
                    pPanelInfo={sPanelInfo}
                    pBgnEndTimeRange={sBgnEndTimeRange}
                    pNavigatorRange={pNavigatorRange}
                />
                <Page style={{ height: 2 }}>
                    <Page.Divi spacing="0" />
                </Page>
                <PanelEditorSettings
                    pTabs={[...EDITOR_TABS]}
                    pSelectedTab={sSelectedTab}
                    pSetSelectedTab={setSelectedTab}
                    pEditorConfig={sEditorConfig}
                    pSetEditorConfig={setEditorConfig}
                />
            </Page>

            {sIsConfirmModal && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={setIsConfirmModal}
                    pCallback={saveEditorChanges}
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
