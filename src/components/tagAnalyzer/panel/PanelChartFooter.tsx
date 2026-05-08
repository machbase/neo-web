import './PanelChartFooter.scss';
import { MdCenterFocusStrong, VscChevronLeft, VscChevronRight } from '@/assets/icons/Icon';
import { changeUtcToText } from '@/utils/helpers/date';
import { Button } from '@/design-system/components';
import ZoomInTwo from '@/assets/image/btn_zoom in x2@3x.png';
import ZoomInFour from '@/assets/image/btn_zoom in x4@3x.png';
import ZoomOutTwo from '@/assets/image/btn_zoom out x2@3x.png';
import ZoomOutFour from '@/assets/image/btn_zoom out x4@3x.png';
import type { PanelNavigatorActions } from './PanelTypes';
import type { ResolvedTimeRangeMs } from '../time/TimeTypes';
import { getChartLayoutMetrics } from '../chart/options/OptionBuildHelpers/PanelChartSectionOptionBuilder';

const NAVIGATOR_BUTTON_ICON_STYLE = { width: '20px', height: '20px' };

const PanelChartFooter = ({
    pShowLegend,
    pVisiblePanelRange,
    pNavigatorActions,
    pIsLoading = false,
}: {
    pShowLegend: boolean;
    pVisiblePanelRange: ResolvedTimeRangeMs;
    pNavigatorActions: PanelNavigatorActions;
    pIsLoading?: boolean;
}) => {
    if (pIsLoading) {
        return null;
    }

    const sLayout = getChartLayoutMetrics(pShowLegend);
    const sToolbarTop = `${sLayout.toolbarTop}px`;
    const sNavigatorShiftTop = `${sLayout.sliderTop + 1}px`;
    const sRangeLabelsTop = `${sLayout.sliderTop + sLayout.sliderHeight + 4}px`;
    const navigatorControls = [
        {
            key: 'zoomIn4',
            tooltip: 'Zoom in',
            icon: <img src={ZoomInFour} style={NAVIGATOR_BUTTON_ICON_STYLE} />,
            action: () => pNavigatorActions.onZoomIn(0.4),
        },
        {
            key: 'zoomIn2',
            tooltip: 'Zoom in',
            icon: <img src={ZoomInTwo} style={NAVIGATOR_BUTTON_ICON_STYLE} />,
            action: () => pNavigatorActions.onZoomIn(0.2),
        },
        {
            key: 'focus',
            tooltip: 'Focus',
            icon: <MdCenterFocusStrong style={NAVIGATOR_BUTTON_ICON_STYLE} />,
            action: pNavigatorActions.onFocus,
        },
        {
            key: 'zoomOut2',
            tooltip: 'Zoom out',
            icon: <img src={ZoomOutTwo} style={NAVIGATOR_BUTTON_ICON_STYLE} />,
            action: () => pNavigatorActions.onZoomOut(0.2),
        },
        {
            key: 'zoomOut4',
            tooltip: 'Zoom out',
            icon: <img src={ZoomOutFour} style={NAVIGATOR_BUTTON_ICON_STYLE} />,
            action: () => pNavigatorActions.onZoomOut(0.4),
        },
    ];

    return (
        <div className="footer-form">
            <div style={{ top: sToolbarTop }} className="toolbar-controls">
                <Button.Group
                    style={{ border: 'solid 0.5px #454545', borderRadius: '4px' }}
                >
                    {navigatorControls.map((control) => (
                        <Button
                            key={control.key}
                            size="icon"
                            variant="ghost"
                            isToolTip
                            toolTipContent={control.tooltip}
                            icon={control.icon}
                            onClick={control.action}
                        />
                    ))}
                </Button.Group>
            </div>
            <div
                style={{ top: sNavigatorShiftTop }}
                className="navigator-shift-controls"
            >
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent="Move navigator backward"
                    icon={<VscChevronLeft size={16} />}
                    onClick={pNavigatorActions.onShiftLeft}
                />
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent="Move navigator forward"
                    icon={<VscChevronRight size={16} />}
                    onClick={pNavigatorActions.onShiftRight}
                />
            </div>
            <div style={{ top: sRangeLabelsTop }} className="range-labels">
                <div className="range-label">
                    {pVisiblePanelRange.startTime &&
                        changeUtcToText(pVisiblePanelRange.startTime)}
                </div>
                <div className="range-label">
                    {pVisiblePanelRange.endTime &&
                        changeUtcToText(pVisiblePanelRange.endTime)}
                </div>
            </div>
        </div>
    );
};

export default PanelChartFooter;
