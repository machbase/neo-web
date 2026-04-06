import Panel from '../panel/Panel';
import { Page, Pane } from '@/design-system/components';
import type { TagAnalyzerBoardInfo } from '../TagAnalyzerType';
import type { TagAnalyzerBgnEndTimeRange, TagAnalyzerPanelInfo, TagAnalyzerTimeRange } from '../panel/TagAnalyzerPanelTypes';

type PanelEditorPreviewSource = {
    panelInfo: TagAnalyzerPanelInfo | null;
    bgnEndTimeRange?: Partial<TagAnalyzerBgnEndTimeRange>;
    navigatorRange: TagAnalyzerTimeRange;
    boardInfo: TagAnalyzerBoardInfo;
};

type PanelEditorPreviewState = {
    isLoading: boolean;
};

// Renders the live chart preview while the panel is being edited.
// It isolates the preview-pane layout from the rest of the editor controls.
const PanelEditorPreview = ({
    pPreviewSource,
    pPreviewState,
}: {
    pPreviewSource: PanelEditorPreviewSource;
    pPreviewState: PanelEditorPreviewState;
}) => {
    return (
        <Pane minSize="330px">
            <Page style={{ padding: '8px 16px' }}>
                {pPreviewSource.panelInfo?.meta?.index_key && !pPreviewState.isLoading && (
                    <Panel
                        pBgnEndTimeRange={pPreviewSource.bgnEndTimeRange}
                        pFooterRange={pPreviewSource.navigatorRange}
                        pBoardInfo={pPreviewSource.boardInfo}
                        pPanelInfo={pPreviewSource.panelInfo}
                        pIsEdit={true}
                    />
                )}
            </Page>
        </Pane>
    );
};

export default PanelEditorPreview;
