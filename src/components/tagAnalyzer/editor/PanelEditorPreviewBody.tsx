import PanelBody from '../panel/PanelBody';
import type {
    PanelChartHandlers,
    PanelChartRefs,
    PanelChartState,
    PanelNavigateState,
    PanelState,
    PanelShiftHandlers,
} from '../panel/TagAnalyzerPanelTypes';
import type { TagAnalyzerTagItem } from '../panel/TagAnalyzerPanelModelTypes';

const PanelEditorPreviewBody = ({
    pChartRefs,
    pChartState,
    pPanelState,
    pNavigateState,
    pChartHandlers,
    pShiftHandlers,
    pTagSet,
}: {
    pChartRefs: PanelChartRefs;
    pChartState: PanelChartState;
    pPanelState: PanelState;
    pNavigateState: PanelNavigateState;
    pChartHandlers: Omit<PanelChartHandlers, 'onSelection'>;
    pShiftHandlers: Pick<PanelShiftHandlers, 'onShiftPanelRangeLeft' | 'onShiftPanelRangeRight'>;
    pTagSet: TagAnalyzerTagItem[];
}) => {
    return (
        <PanelBody
            pChartRefs={pChartRefs}
            pChartState={pChartState}
            pPanelState={pPanelState}
            pNavigateState={pNavigateState}
            pChartHandlers={pChartHandlers}
            pShiftHandlers={pShiftHandlers}
            pTagSet={pTagSet}
            pSetIsFFTModal={() => undefined}
            pOnDragSelectStateChange={() => undefined}
        />
    );
};

export default PanelEditorPreviewBody;
