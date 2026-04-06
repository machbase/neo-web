import PanelEditorPreviewChart from './PanelEditorPreviewChart';
import { Page, Pane } from '@/design-system/components';
import type { TagAnalyzerBgnEndTimeRange, TagAnalyzerPanelInfo, TagAnalyzerTimeRange } from '../panel/TagAnalyzerPanelModelTypes';

// Renders the live chart preview while the panel is being edited.
// It isolates the preview-pane layout from the rest of the editor controls.
const PanelEditorPreview = ({
    pPanelInfo,
    pBgnEndTimeRange,
    pNavigatorRange,
}: {
    pPanelInfo: TagAnalyzerPanelInfo;
    pBgnEndTimeRange: Partial<TagAnalyzerBgnEndTimeRange>;
    pNavigatorRange: TagAnalyzerTimeRange;
}) => {
    return (
        <Pane minSize="330px">
            <Page style={{ padding: '8px 16px' }}>
                {pPanelInfo.meta.index_key && (
                    <PanelEditorPreviewChart
                        pBgnEndTimeRange={pBgnEndTimeRange}
                        pFooterRange={pNavigatorRange}
                        pPanelInfo={pPanelInfo}
                    />
                )}
            </Page>
        </Pane>
    );
};

export default PanelEditorPreview;
