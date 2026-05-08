export type PanelChartInteractionHintMode = 'annotation' | 'highlight';

const PANEL_CHART_INTERACTION_HINT_TEXT: Record<
    PanelChartInteractionHintMode,
    string
> = {
    annotation: 'Click to create annotation',
    highlight: 'Drag to create highlight',
};

const PanelChartInteractionHint = ({
    pMode,
    pPosition,
}: {
    pMode: PanelChartInteractionHintMode | undefined;
    pPosition: { x: number; y: number } | undefined;
}) => {
    if (!pMode || !pPosition) {
        return null;
    }

    return (
        <span
            className="panel-chart-interaction-hint"
            style={{
                left: pPosition.x + 14,
                top: Math.max(6, pPosition.y - 34),
            }}
        >
            {PANEL_CHART_INTERACTION_HINT_TEXT[pMode]}
        </span>
    );
};

export default PanelChartInteractionHint;
