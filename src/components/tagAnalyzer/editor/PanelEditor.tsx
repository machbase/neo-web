import { useEffect, useState } from 'react';
import PanelEditorPreviewChart from './PanelEditorPreviewChart';
import PanelEditorSettings from './sections/PanelEditorSettings';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { IoArrowBackOutline } from '@/assets/icons/Icon';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { Page, Button, Pane } from '@/design-system/components';
import type { Dispatch, SetStateAction } from 'react';
import type { TagAnalyzerPanelInfo, TimeRange } from '../common/CommonTypes';
import type { EditTabPanelType, TagAnalyzerPanelEditorConfig } from './PanelEditorTypes';
import { deepEqual } from '@/utils';
import {
    EDITOR_TABS,
    createPanelEditorConfig,
    mergePanelEditorConfig,
    resolveEditorTimeBounds,
} from './PanelEditorUtils';
import { getNextBoardListWithSavedPanel } from '../utils/TagAnalyzerSaveUtils';

const PanelEditor = ({
    pPanelInfo,
    pSetEditPanel,
    pSetSaveEditedInfo,
    pNavigatorRange,
}: {
    pPanelInfo: TagAnalyzerPanelInfo;
    pSetEditPanel: () => void;
    pSetSaveEditedInfo: Dispatch<SetStateAction<boolean>>;
    pNavigatorRange: TimeRange;
}) => {
    const setBoardList = useSetRecoilState(gBoardList);
    const sGlobalSelectedTab = useRecoilValue(gSelectedTab);
    const [sPreviewRange, setPreviewRange] = useState<TimeRange>(pNavigatorRange);
    const [sSelectedTab, setSelectedTab] = useState<EditTabPanelType>('General');
    const [sPanelInfo, setPanelInfo] = useState<TagAnalyzerPanelInfo>(pPanelInfo);
    const [sEditorConfig, setEditorConfig] = useState<TagAnalyzerPanelEditorConfig>(() =>
        createPanelEditorConfig(pPanelInfo),
    );
    const [sIsConfirmModal, setIsConfirmModal] = useState<boolean>(false);

    // Applies the current editor draft into the preview chart state and preview time bounds.
    const applyEditorChanges = async () => {
        const sNextPanelInfo = mergePanelEditorConfig(pPanelInfo, sEditorConfig);
        const sData = await resolveEditorTimeBounds({
            timeConfig: sEditorConfig.time,
            tag_set: sNextPanelInfo.data.tag_set,
            navigatorRange: pNavigatorRange,
        });
        setPanelInfo(sNextPanelInfo);
        setPreviewRange(sData);
    };

    // Saves the currently applied preview panel back into the selected board.
    const saveEditorChanges = () => {
        setBoardList((aPrev) =>
            getNextBoardListWithSavedPanel(
                aPrev,
                sGlobalSelectedTab,
                pPanelInfo.meta.index_key,
                sPanelInfo,
            ),
        );
        pSetSaveEditedInfo(true);
        pSetEditPanel();
    };

    // Shows a confirm modal when the draft differs from the currently applied preview panel.
    const confirmSaveIfNeeded = () => {
        const sDraftPanelInfo = mergePanelEditorConfig(pPanelInfo, sEditorConfig);
        if (!deepEqual(sPanelInfo, sDraftPanelInfo)) {
            setIsConfirmModal(true);
            return;
        }
        saveEditorChanges();
    };

    useEffect(() => {
        let sIsActive = true;
        void (async () => {
            const sNextEditorConfig = createPanelEditorConfig(pPanelInfo);
            const sData = await resolveEditorTimeBounds({
                timeConfig: sNextEditorConfig.time,
                tag_set: pPanelInfo.data.tag_set,
                navigatorRange: pNavigatorRange,
            });
            if (!sIsActive) {
                return;
            }
            setPreviewRange(sData);
            setPanelInfo(pPanelInfo);
            setEditorConfig(sNextEditorConfig);
            setSelectedTab('General');
        })();
        return () => {
            sIsActive = false;
        };
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
            <Page style={{ width: '100%', height: '100%' }} pRef={undefined} className={undefined}>
                <Page.Header>
                    <Page.DpRow style={undefined} className={undefined}>
                        <Button
                            variant="ghost"
                            size="icon"
                            icon={<IoArrowBackOutline size={16} />}
                            onClick={pSetEditPanel}
                            aria-label="Back"
                            loading={undefined}
                            active={undefined}
                            iconPosition={undefined}
                            fullWidth={undefined}
                            children={undefined}
                            isToolTip={undefined}
                            toolTipContent={undefined}
                            toolTipPlace={undefined}
                            toolTipMaxWidth={undefined}
                            forceOpacity={undefined}
                            shadow={undefined}
                            label={undefined}
                            labelPosition={undefined}
                        />
                        Edit panel
                    </Page.DpRow>
                    <Page.DpRow style={undefined} className={undefined}>
                        <Page.TextButton
                            pText="Discard"
                            pType="DELETE"
                            pCallback={pSetEditPanel}
                            pWidth="75px"
                            mb="0px"
                            mr="4px"
                            pIsDisable={undefined}
                            onMouseOut={undefined}
                            mt={undefined}
                            pLoad={undefined}
                            pIcon={undefined}
                        />
                        <Page.TextButton
                            pText="Apply"
                            pType="STATUS"
                            pCallback={applyEditorChanges}
                            pWidth="75px"
                            mb="0px"
                            mr="4px"
                            pIsDisable={undefined}
                            onMouseOut={undefined}
                            mt={undefined}
                            pLoad={undefined}
                            pIcon={undefined}
                        />
                        <Page.TextButton
                            pText="Save"
                            pType="CREATE"
                            pCallback={confirmSaveIfNeeded}
                            pWidth="65px"
                            mb="0px"
                            mr="4px"
                            pIsDisable={undefined}
                            onMouseOut={undefined}
                            mt={undefined}
                            pLoad={undefined}
                            pIcon={undefined}
                        />
                    </Page.DpRow>
                </Page.Header>

                <Pane minSize="330px">
                    <Page style={{ padding: '8px 16px' }} pRef={undefined} className={undefined}>
                        {sPanelInfo.meta.index_key && (
                            <PanelEditorPreviewChart
                                pPreviewRange={sPreviewRange}
                                pFooterRange={pNavigatorRange}
                                pPanelInfo={sPanelInfo}
                            />
                        )}
                    </Page>
                </Pane>
                <Page style={{ height: 2 }} pRef={undefined} className={undefined}>
                    <Page.Divi spacing="0" direction={undefined} style={undefined} />
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
                            <div className="body-content">
                                There are contents that have not been applied.
                            </div>
                            <div className="body-content">Are you sure you want to save it?</div>
                        </>
                    }
                    pState={undefined}
                />
            )}
        </div>
    );
};

export default PanelEditor;
