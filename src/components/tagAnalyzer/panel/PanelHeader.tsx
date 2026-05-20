import './PanelChartHeader.scss';
import { useId, type MouseEvent, type ReactNode } from 'react';
import { Tooltip } from 'react-tooltip';
import {
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
import type { PanelOverlayMode } from '../domain/PanelChartModel';
import type {
    IntervalOption,
    TimeRangeMs,
} from '../domain/time/TimeTypes';
import { formatLocalRangeLabel } from '../domain/time/TimeFormatters';

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
    overlayMode,
    isEditing,
    isRaw,
    isOverlap,
    onToggleOverlap,
    onToggleRaw,
    onToggleHighlight,
    onToggleAnnotation,
    onToggleDragSelect,
    onOpenFft,
    onSetGlobalTime,
    onRefreshData,
    onRefreshTime,
    onToggleEdit,
    onOpenExportCsv,
    onOpenDeleteConfirm,
}: {
    headerState: {
        title: string;
        panelRange: TimeRangeMs;
        resolvedIntervalOption: IntervalOption | undefined;
        canSetGlobalTime: boolean;
        canSaveLocal: boolean;
    };
    overlayMode: PanelOverlayMode;
    isEditing: boolean;
    isRaw: boolean;
    isOverlap: boolean;
    onToggleOverlap: () => void;
    onToggleRaw: () => void;
    onToggleHighlight: () => void;
    onToggleAnnotation: () => void;
    onToggleDragSelect: () => void;
    onOpenFft: (() => void) | undefined;
    onSetGlobalTime: () => void;
    onRefreshData: () => void;
    onRefreshTime: () => void;
    onToggleEdit: () => void;
    onOpenExportCsv: () => void;
    onOpenDeleteConfirm: () => void;
}) => {
    const { getExperiment } = useExperiment();
    const sTimeText = pHeaderState.panelRange.startTime
        ? `${formatLocalRangeLabel(pHeaderState.panelRange.startTime)} ~ ${formatLocalRangeLabel(pHeaderState.panelRange.endTime)}`
        : '';
    const sIntervalText =
        !isRaw && pHeaderState.resolvedIntervalOption
            ? `${pHeaderState.resolvedIntervalOption.IntervalValue}${pHeaderState.resolvedIntervalOption.IntervalType}`
            : '';
    const sIntervalSummaryText =
        !isRaw && sIntervalText
            ? ` ( interval : ${sIntervalText} )`
            : '';

    const handleDelete = (clickEvent: MouseEvent) => {
        clickEvent.stopPropagation();
        onOpenDeleteConfirm();
    };

    return (
        <div className="panel-header">
            <Button
                size="xsm"
                variant="ghost"
                style={{ minWidth: '80px', maxWidth: '100px' }}
                isToolTip
                toolTipContent={
                    isOverlap
                        ? 'Disable overlap mode'
                        : 'Enable overlap mode'
                }
                icon={
                    <div className="title">
                        {pHeaderState.title}
                    </div>
                }
                onClick={onToggleOverlap}
            />
            <div className="time">
                {sTimeText}
                <span>{' ' + sIntervalSummaryText}</span>
            </div>
            <Button.Group>
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={
                        !isRaw
                            ? 'Enable raw data mode'
                            : 'Disable raw data mode'
                    }
                    icon={
                        <MdRawOn
                            size={16}
                            style={{
                                color: isRaw ? '#fdb532 ' : '',
                                height: '32px',
                                width: '32px',
                            }}
                        />
                    }
                    onClick={onToggleRaw}
                    style={{ minWidth: '36px' }}
                />
                <Page.Divi />
                <PanelHeaderTooltipButton
                    toolTipContent="Drag on chart to create highlight"
                    active={overlayMode === 'highlight'}
                    onClick={onToggleHighlight}
                >
                    Highlight
                </PanelHeaderTooltipButton>
                <PanelHeaderTooltipButton
                    toolTipContent="Click chart to create annotation"
                    active={overlayMode === 'annotation'}
                    icon={<VscNote size={14} />}
                    onClick={onToggleAnnotation}
                >
                    Annotation
                </PanelHeaderTooltipButton>
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Select data range for stats and FFT'}
                    active={overlayMode === 'dragSelect'}
                    icon={
                        <PiSelectionPlusBold
                            size={16}
                            style={{
                                color: overlayMode === 'dragSelect'
                                    ? '#f8f8f8'
                                    : '',
                            }}
                        />
                    }
                    onClick={onToggleDragSelect}
                />
                {onOpenFft && (
                    <Button
                        size="xsm"
                        variant="ghost"
                        isToolTip
                        toolTipContent={'FFT chart'}
                        icon={<LineChart size={16} />}
                        onClick={onOpenFft}
                    />
                )}
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Set global time'}
                    icon={<TbTimezone size={15} />}
                    disabled={!pHeaderState.canSetGlobalTime}
                    onClick={onSetGlobalTime}
                />
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Refresh data'}
                    icon={<Refresh size={14} />}
                    onClick={onRefreshData}
                />
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Refresh time'}
                    icon={<LuTimerReset size={16} style={{ marginTop: '-1px' }} />}
                    onClick={onRefreshTime}
                />
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={
                        isEditing ? 'Close editor' : 'Open editor'
                    }
                    active={isEditing}
                    icon={<GearFill size={14} />}
                    onClick={onToggleEdit}
                />
                {getExperiment() && pHeaderState.canSaveLocal && (
                    <Button
                        size="xsm"
                        variant="ghost"
                        isToolTip
                        toolTipContent={'Saved to local'}
                        icon={<Download size={16} />}
                        onClick={onOpenExportCsv}
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
