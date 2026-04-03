import Panel from '../panel/Panel';
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
                {pPanelInfo.meta?.index_key && !pIsLoading && (
                    <Panel
                        pBgnEndTimeRange={pBgnEndTimeRange}
                        pFooterRange={pNavigatorRange}
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
