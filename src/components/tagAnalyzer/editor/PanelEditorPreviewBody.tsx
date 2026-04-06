import NewEChart from '../panel/NewEChart';
import { VscChevronLeft, VscChevronRight } from '@/assets/icons/Icon';
import { Button } from '@/design-system/components';
import type {
    PanelChartHandlers,
    PanelChartRefs,
    PanelChartState,
    PanelNavigateState,
    PanelNavigationHandlers,
    PanelState,
} from '../panel/TagAnalyzerPanelTypes';

const PanelEditorPreviewBody = ({
    pChartRefs,
    pChartState,
    pPanelState,
    pNavigateState,
    pChartHandlers,
    pNavigationHandlers,
}: {
    pChartRefs: PanelChartRefs;
    pChartState: PanelChartState;
    pPanelState: PanelState;
    pNavigateState: PanelNavigateState;
    pChartHandlers: PanelChartHandlers;
    pNavigationHandlers: PanelNavigationHandlers;
}) => {
    return (
        <div className="chart">
            <Button
                size="md"
                variant="secondary"
                isToolTip
                toolTipContent="Move range backward"
                icon={<VscChevronLeft size={16} />}
                onClick={() => pNavigationHandlers.onShiftPanelRange('left')}
            />
            <div className="chart-body" ref={pChartRefs.areaChart as any}>
                <NewEChart
                    pChartRefs={pChartRefs}
                    pChartState={pChartState}
                    pPanelState={pPanelState}
                    pNavigateState={pNavigateState}
                    pChartHandlers={pChartHandlers}
                />
            </div>
            <Button
                size="md"
                variant="secondary"
                isToolTip
                toolTipContent="Move range forward"
                icon={<VscChevronRight size={16} />}
                onClick={() => pNavigationHandlers.onShiftPanelRange('right')}
            />
        </div>
    );
};

export default PanelEditorPreviewBody;
