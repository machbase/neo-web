import TagAnalyzerPanel from '../panel/TagAnalyzerPanel';
import { Page, Pane } from '@/design-system/components';

// Renders the live chart preview while the panel is being edited.
// It isolates the preview-pane layout from the rest of the editor controls.
const PanelEditorPreview = ({
    pPanelInfo,
    pBgnEndTimeRange,
    pNavigatorRange,
    pBoardInfo,
    pIsLoading,
}: any) => {
    return (
        <Pane minSize="330px">
            <Page style={{ padding: '8px 16px' }}>
                {pPanelInfo.index_key && !pIsLoading && (
                    <TagAnalyzerPanel
                        pBgnEndTimeRange={pBgnEndTimeRange}
                        pNavigatorRange={pNavigatorRange}
                        pBoardInfo={pBoardInfo}
                        pPanelInfo={pPanelInfo}
                        pIsEdit={true}
                    />
                )}
            </Page>
        </Pane>
    );
};

export default PanelEditorPreview;
