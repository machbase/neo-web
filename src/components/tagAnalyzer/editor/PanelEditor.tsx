import { useEffect, useState } from 'react';
import PanelEditorPreviewChart from './PanelEditorPreviewChart';
import PanelEditorSettings from './sections/PanelEditorSettings';
import { IoArrowBackOutline } from '@/assets/icons/Icon';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { Page, Button, Pane } from '@/design-system/components';
import type { Dispatch, SetStateAction } from 'react';
import type { PanelInfo } from '../utils/panelModelTypes';
import type { TimeRange } from '../utils/time/timeTypes';
import type { EditTabPanelType, TagAnalyzerPanelEditorConfig } from './PanelEditorTypes';
import { deepEqual } from '@/utils';
import {
    mergeEditorConfigIntoPanelInfo,
} from './PanelEditorConfigConverter';
import {
    EDITOR_TABS,
    resolveEditorTimeBounds,
} from './PanelEditorUtils';
import { useSavePanelToGlobalRecoilState } from './useSavePanelToGlobalRecoilState';

/**
 * Renders the full editor shell for one panel.
 * Intent: Keep the editor workflow, preview, and save flow together while the user edits a panel.
 * @param {TagAnalyzerPanelEditorConfig} pInitialEditorConfig The initial editor draft state.
 * @param {PanelInfo} pPanelInfo The panel being edited.
 * @param {() => void} pSetEditPanel Exits the editor view.
 * @param {Dispatch<SetStateAction<boolean>>} pSetSaveEditedInfo Marks the panel as saved.
 * @param {TimeRange} pNavigatorRange The navigator range used for preview bounds.
 * @returns {JSX.Element}
 */
const PanelEditor = ({
    pInitialEditorConfig,
    pPanelInfo,
    pSetEditPanel,
    pSetSaveEditedInfo,
    pNavigatorRange,
}: {
    pInitialEditorConfig: TagAnalyzerPanelEditorConfig;
    pPanelInfo: PanelInfo;
    pSetEditPanel: () => void;
    pSetSaveEditedInfo: Dispatch<SetStateAction<boolean>>;
    pNavigatorRange: TimeRange;
}) => {
    const savePanelToGlobalRecoilState = useSavePanelToGlobalRecoilState();
    const [sPreviewRange, setPreviewRange] = useState<TimeRange>(pNavigatorRange);
    const [sSelectedTab, setSelectedTab] = useState<EditTabPanelType>('General');
    const [sPanelInfo, setPanelInfo] = useState<PanelInfo>(pPanelInfo);
    const [sEditorConfig, setEditorConfig] = useState<TagAnalyzerPanelEditorConfig>(pInitialEditorConfig);
    const [sIsConfirmModal, setIsConfirmModal] = useState<boolean>(false);

    /**
     * Applies the current editor draft into the preview chart state and preview time bounds.
     * Intent: Let the user verify the edited config before committing it to the board.
     * @returns {Promise<void>}
     */
    const applyEditorChanges = async () => {
        const sNextPanelInfo = mergeEditorConfigIntoPanelInfo(pPanelInfo, sEditorConfig);
        const sData = await resolveEditorTimeBounds({
            timeConfig: sEditorConfig.time,
            tag_set: sNextPanelInfo.data.tag_set,
            navigatorRange: pNavigatorRange,
        });
        setPanelInfo(sNextPanelInfo);
        setPreviewRange(sData);
    };

    /**
     * Saves the currently applied preview panel back into the selected board.
     * Intent: Persist the previewed state without reapplying draft conversion logic.
     * @returns {void}
     */
    const saveEditorChanges = () => {
        savePanelToGlobalRecoilState(sPanelInfo);
        pSetSaveEditedInfo(true);
        pSetEditPanel();
    };

    /**
     * Opens the confirm modal when the draft differs from the applied preview panel.
     * Intent: Prevent accidental saves when the preview state is out of sync with the draft.
     * @returns {void}
     */
    const confirmSaveIfNeeded = () => {
        const sDraftPanelInfo = mergeEditorConfigIntoPanelInfo(pPanelInfo, sEditorConfig);
        if (!deepEqual(sPanelInfo, sDraftPanelInfo)) {
            setIsConfirmModal(true);
            return;
        }
        saveEditorChanges();
    };

    useEffect(() => {
        let sIsActive = true;
        void (async () => {
            const sData = await resolveEditorTimeBounds({
                timeConfig: pInitialEditorConfig.time,
                tag_set: pPanelInfo.data.tag_set,
                navigatorRange: pNavigatorRange,
            });
            if (!sIsActive) {
                return;
            }
            setPreviewRange(sData);
            setPanelInfo(pPanelInfo);
            setEditorConfig(pInitialEditorConfig);
            setSelectedTab('General');
        })();
        return () => {
            sIsActive = false;
        };
    }, [pInitialEditorConfig, pPanelInfo, pNavigatorRange]);

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
