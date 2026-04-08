import type { Dispatch, SetStateAction } from 'react';
import TagAnalyzerBoard from './TagAnalyzerBoard';
import TagAnalyzerBoardToolbar from './TagAnalyzerBoardToolbar';
import TagAnalyzerNewPanelButton from './TagAnalyzerNewPanelButton';
import TimeRangeModal from '../modal/TimeRangeModal';
import OverlapModal from './modal/OverlapModal';
import PanelEditor from './editor/PanelEditor';
import { Page } from '@/design-system/components';
import type {
    TagAnalyzerBoardSourceInfo,
} from './TagAnalyzerTypes';
import { useTagAnalyzerWorkspaceController } from './useTagAnalyzerWorkspaceController';

/**
 * Renders the TagAnalyzer workspace using a focused controller boundary for top-level orchestration.
 * @param props The board source info and save-modal handlers for the current workspace.
 * @returns The TagAnalyzer workspace view once the controller finishes bootstrapping.
 */
const TagAnalyzer = ({
    pInfo,
    pHandleSaveModalOpen: pOnSave,
    pSetIsSaveModal
}: {
    pInfo: TagAnalyzerBoardSourceInfo;
    pHandleSaveModalOpen: () => void;
    pSetIsSaveModal: Dispatch<SetStateAction<boolean>>;
}) => {
    const sController = useTagAnalyzerWorkspaceController({
        pInfo,
        pHandleSaveModalOpen: pOnSave,
        pSetIsSaveModal,
    });

    return (
        !sController.isLoadRollupTable && (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                {sController.editingPanel ? (
                    <PanelEditor
                        pPanelInfo={sController.editingPanel.pPanelInfo}
                        pNavigatorRange={sController.editingPanel.pNavigatorRange}
                        pSetEditPanel={() => sController.setEditingPanel(null)}
                        pSetSaveEditedInfo={sController.editingPanel.pSetSaveEditedInfo}
                    />
                ) : (
                    <>
                        <Page>
                            <TagAnalyzerBoardToolbar
                                pBoardSource={pInfo}
                                pPanelsInfoCount={sController.overlapPanels.length}
                                pActionHandlers={sController.toolbarActionHandlers}
                            />
                            <Page.Body>
                                <TagAnalyzerBoard
                                    pInfo={sController.boardInfo}
                                    pPanelBoardState={sController.panelBoardState}
                                    pPanelBoardActions={sController.panelBoardActions}
                                />
                                <Page.ContentBlock pHoverNone style={{ padding: '24px 32px' }}>
                                    <TagAnalyzerNewPanelButton />
                                </Page.ContentBlock>
                            </Page.Body>
                        </Page>
                        {sController.isDisplayOverlapModal && (
                            <OverlapModal
                                pPanelsInfo={sController.overlapPanels}
                                pSetIsModal={sController.setIsOverlapModal}
                            />
                        )}
                        {sController.isDisplayTimeRangeModal && (
                            <TimeRangeModal
                                pUseRecoil={true}
                                pType={'tag'}
                                pSetTimeRangeModal={sController.setTimeRangeModal}
                                pShowRefresh={false}
                                pSaveCallback={sController.updateTopLevelBgnEndTime}
                            />
                        )}
                    </>
                )}
            </div>
        )
    );
};
export default TagAnalyzer;
