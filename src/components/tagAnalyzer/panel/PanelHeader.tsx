import './PanelChartHeader.scss';
import { useId, type MouseEvent, type ReactNode } from 'react';
import { Tooltip } from 'react-tooltip';
import {
    MdFlagCircle,
    Refresh,
    GearFill,
    Delete,
    MdRawOn,
    PiSelectionPlusBold,
    LineChart,
    LuTimerReset,
    Download,
    TbTimezone,
    VscNote,
} from '@/assets/icons/Icon';
import { useExperiment } from '@/hooks/useExperiment';
import { Button, Page } from '@/design-system/components';
import type { PanelOverlapSelection } from './PanelContainer';
import type {
    PanelHeaderCommandDispatch,
    PanelHeaderState,
    PanelOverlayModeDispatch,
    PanelOverlayModeState,
} from './PanelTypes';

function PanelHeaderTooltipButton({
    active,
    children,
    icon,
    onClick,
    toolTipContent,
}: {
    active: boolean;
    children: ReactNode;
    icon?: ReactNode;
    onClick: () => void;
    toolTipContent: string;
}) {
    const sTooltipId = useId().replace(/:/g, '');
    const sTooltipAnchorClass = `panel-header-tooltip-${sTooltipId}`;

    return (
        <>
            <span className={`panel-header-tooltip-anchor ${sTooltipAnchorClass}`}>
                <Button
                    size="xsm"
                    variant="ghost"
                    active={active}
                    icon={icon}
                    onClick={onClick}
                    style={{ maxWidth: 'none', paddingInline: '6px' }}
                >
                    {children}
                </Button>
            </span>
            <Tooltip
                className="tooltip-div"
                place="top-end"
                positionStrategy="absolute"
                anchorSelect={`.${sTooltipAnchorClass}`}
                content={toolTipContent}
                delayShow={700}
            />
        </>
    );
}

const PanelHeader = ({
    headerState: pHeaderState,
    overlayModeState: pOverlayModeState,
    overlapSelection,
    dispatchHeaderCommand: pHeaderCommandDispatch,
    dispatchOverlayModeCommand: pOverlayModeDispatch,
}: {
    headerState: PanelHeaderState;
    overlayModeState: PanelOverlayModeState;
    overlapSelection: PanelOverlapSelection;
    dispatchHeaderCommand: PanelHeaderCommandDispatch;
    dispatchOverlayModeCommand: PanelOverlayModeDispatch;
}) => {
    const { getExperiment } = useExperiment();
    const sIntervalSummaryText =
        !pHeaderState.isRaw && pHeaderState.intervalText
            ? ` ( interval : ${pHeaderState.intervalText} )`
            : '';

    const handleDelete = (clickEvent: MouseEvent) => {
        clickEvent.stopPropagation();
        pHeaderCommandDispatch({ type: 'open-delete-confirm' });
    };

    return (
        <div className="panel-header">
            <Button
                size="xsm"
                variant="ghost"
                style={{ minWidth: '80px', maxWidth: '100px' }}
                isToolTip
                toolTipContent={
                    overlapSelection.isSelected
                        ? 'Disable overlap mode'
                        : 'Enable overlap mode'
                }
                icon={
                    <div className="title">
                        {overlapSelection.isAnchor && (
                            <MdFlagCircle size={16} style={{ color: '#fdb532' }} />
                        )}
                        {pHeaderState.title}
                    </div>
                }
                onClick={() => pHeaderCommandDispatch({ type: 'toggle-overlap' })}
            />
            <div className="time">
                {pHeaderState.timeText}
                <span>{' ' + sIntervalSummaryText}</span>
            </div>
            <Button.Group>
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={
                        !pHeaderState.isRaw
                            ? 'Enable raw data mode'
                            : 'Disable raw data mode'
                    }
                    icon={
                        <MdRawOn
                            size={16}
                            style={{
                                color: pHeaderState.isRaw ? '#fdb532 ' : '',
                                height: '32px',
                                width: '32px',
                            }}
                        />
                    }
                    onClick={() => pHeaderCommandDispatch({ type: 'toggle-raw' })}
                    style={{ minWidth: '36px' }}
                />
                <Page.Divi />
                <PanelHeaderTooltipButton
                    toolTipContent="Drag on chart to create highlight"
                    active={pOverlayModeState.isHighlightActive}
                    onClick={() =>
                        pOverlayModeDispatch({ type: 'toggle-highlight' })
                    }
                >
                    Highlight
                </PanelHeaderTooltipButton>
                <PanelHeaderTooltipButton
                    toolTipContent="Click chart to create annotation"
                    active={pOverlayModeState.isAnnotationActive}
                    icon={<VscNote size={14} />}
                    onClick={() =>
                        pOverlayModeDispatch({ type: 'toggle-annotation' })
                    }
                >
                    Annotation
                </PanelHeaderTooltipButton>
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Select data range for stats and FFT'}
                    active={pOverlayModeState.isDragSelectActive}
                    icon={
                        <PiSelectionPlusBold
                            size={16}
                            style={{
                                color: pOverlayModeState.isDragSelectActive
                                    ? '#f8f8f8'
                                    : '',
                            }}
                        />
                    }
                    onClick={() =>
                        pOverlayModeDispatch({ type: 'toggle-drag-select' })
                    }
                />
                {pHeaderState.canOpenFft && (
                    <Button
                        size="xsm"
                        variant="ghost"
                        isToolTip
                        toolTipContent={'FFT chart'}
                        icon={<LineChart size={16} />}
                        onClick={() => pOverlayModeDispatch({ type: 'open-fft' })}
                    />
                )}
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Set global time'}
                    icon={<TbTimezone size={15} />}
                    disabled={!pHeaderState.canSetGlobalTime}
                    onClick={() => pHeaderCommandDispatch({ type: 'set-global-time' })}
                />
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Refresh data'}
                    icon={<Refresh size={14} />}
                    onClick={() => pHeaderCommandDispatch({ type: 'refresh-data' })}
                />
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Refresh time'}
                    icon={<LuTimerReset size={16} style={{ marginTop: '-1px' }} />}
                    onClick={() => pHeaderCommandDispatch({ type: 'refresh-time' })}
                />
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={
                        pOverlayModeState.isEditing ? 'Close editor' : 'Open editor'
                    }
                    active={pOverlayModeState.isEditing}
                    icon={<GearFill size={14} />}
                    onClick={() => pOverlayModeDispatch({ type: 'toggle-edit' })}
                />
                {getExperiment() && pHeaderState.canSaveLocal && (
                    <Button
                        size="xsm"
                        variant="ghost"
                        isToolTip
                        toolTipContent={'Saved to local'}
                        icon={<Download size={16} />}
                        onClick={() =>
                            pHeaderCommandDispatch({ type: 'open-export-csv' })
                        }
                    />
                )}
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Delete'}
                    icon={<Delete size={16} />}
                    onClick={handleDelete}
                />
            </Button.Group>
        </div>
    );
};
export default PanelHeader;
