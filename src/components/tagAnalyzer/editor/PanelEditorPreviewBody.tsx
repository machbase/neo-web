import NewEChart from '../panel/NewEChart';
import { VscChevronLeft, VscChevronRight } from '@/assets/icons/Icon';
import { Button } from '@/design-system/components';
import type {
    PanelChartHandlers,
    PanelChartRefs,
    PanelChartState,
    PanelNavigateState,
    PanelState,
    PanelShiftHandlers,
} from '../panel/TagAnalyzerPanelTypes';

const PanelEditorPreviewBody = ({
    pChartRefs,
    pChartState,
    pPanelState,
    pNavigateState,
    pChartHandlers,
    pShiftHandlers,
}: {
    pChartRefs: PanelChartRefs;
    pChartState: PanelChartState;
    pPanelState: PanelState;
    pNavigateState: PanelNavigateState;
    pChartHandlers: PanelChartHandlers;
    pShiftHandlers: Pick<PanelShiftHandlers, 'onShiftPanelRangeLeft' | 'onShiftPanelRangeRight'>;
}) => {
    return (
        <div className="chart">
            <Button
                size="md"
                variant="secondary"
                isToolTip
                toolTipContent="Move range backward"
                icon={<VscChevronLeft size={16} />}
                onClick={pShiftHandlers.onShiftPanelRangeLeft}
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
                onClick={pShiftHandlers.onShiftPanelRangeRight}
            />
        </div>
    );
};

export default PanelEditorPreviewBody;
