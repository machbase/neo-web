import PanelEditorPreviewChart from './PanelEditorPreviewChart';
import { Page, Pane } from '@/design-system/components';
import type { TagAnalyzerBoardInfo } from '../TagAnalyzerType';
import type { TagAnalyzerBgnEndTimeRange, TagAnalyzerPanelInfo, TagAnalyzerTimeRange } from '../panel/TagAnalyzerPanelModelTypes';

type PanelEditSource = {
    panelInfo: TagAnalyzerPanelInfo | null;
    bgnEndTimeRange: Partial<TagAnalyzerBgnEndTimeRange>;
    navigatorRange: TagAnalyzerTimeRange;
    boardInfo: TagAnalyzerBoardInfo;
};

type PanelLoadState = {
    isLoading: boolean;
};

// Renders the live chart preview while the panel is being edited.
// It isolates the preview-pane layout from the rest of the editor controls.
const PanelEditorPreview = ({
    pPanelSource,
    pLoadState,
}: {
    pPanelSource: PanelEditSource;
    pLoadState: PanelLoadState;
}) => {
    return (
        <Pane minSize="330px">
            <Page style={{ padding: '8px 16px' }}>
                {pPanelSource.panelInfo?.meta?.index_key && !pLoadState.isLoading && (
                    <PanelEditorPreviewChart
                        pBgnEndTimeRange={pPanelSource.bgnEndTimeRange}
                        pFooterRange={pPanelSource.navigatorRange}
                        pBoardInfo={pPanelSource.boardInfo}
                        pPanelInfo={pPanelSource.panelInfo}
                    />
                )}
            </Page>
        </Pane>
    );
};

export default PanelEditorPreview;
