import './PanelChartHeader.scss';
import type { MouseEvent } from 'react';
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
import type {
    PanelHeaderActions,
    PanelHeaderState,
} from './PanelTypes';

const PanelHeader = ({
    pHeaderState,
    pHeaderActions,
}: {
    pHeaderState: PanelHeaderState;
    pHeaderActions: PanelHeaderActions;
}) => {
    const { getExperiment } = useExperiment();
    const sIntervalSummaryText =
        !pHeaderState.isRaw && pHeaderState.intervalText
            ? ` ( interval : ${pHeaderState.intervalText} )`
            : '';

    const handleDelete = (clickEvent: MouseEvent) => {
        clickEvent.stopPropagation();
        pHeaderActions.onOpenDeleteConfirm();
    };

    return (
        <div className="panel-header">
            <Button
                size="xsm"
                variant="ghost"
                style={{ minWidth: '80px', maxWidth: '100px' }}
                isToolTip
                toolTipContent={
                    pHeaderState.isSelectedForOverlap
                        ? 'Disable overlap mode'
                        : 'Enable overlap mode'
                }
                icon={
                    <div className="title">
                        {pHeaderState.isOverlapAnchor && (
                            <MdFlagCircle size={16} style={{ color: '#fdb532' }} />
                        )}
                        {pHeaderState.title}
                    </div>
                }
                onClick={pHeaderActions.onToggleOverlap}
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
                        !pHeaderState.isRaw ? 'Enable raw data mode' : 'Disable raw data mode'
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
                    onClick={pHeaderActions.onToggleRaw}
                    style={{ minWidth: '36px' }}
                />
                <Page.Divi />
                <Button
                    size="xsm"
                    variant="ghost"
                    active={pHeaderState.isHighlightActive}
                    onClick={pHeaderActions.onToggleHighlight}
                >
                    Highlight
                </Button>
                <Button
                    size="xsm"
                    variant="ghost"
                    active={pHeaderState.isAnnotationActive}
                    icon={<VscNote size={14} />}
                    onClick={pHeaderActions.onToggleAnnotation}
                >
                    Annotation
                </Button>
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Select data range for stats and FFT'}
                    active={pHeaderState.isDragSelectActive}
                    icon={
                        <PiSelectionPlusBold
                            size={16}
                            style={{
                                color: pHeaderState.isDragSelectActive ? '#f8f8f8' : '',
                            }}
                        />
                    }
                    onClick={pHeaderActions.onToggleDragSelect}
                />
                {pHeaderState.canOpenFft && (
                    <Button
                        size="xsm"
                        variant="ghost"
                        isToolTip
                        toolTipContent={'FFT chart'}
                        icon={<LineChart size={16} />}
                        onClick={pHeaderActions.onOpenFft}
                    />
                )}
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Set global time'}
                    icon={<TbTimezone size={15} />}
                    disabled={!pHeaderState.canSetGlobalTime}
                    onClick={pHeaderActions.onSetGlobalTime}
                />
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Refresh data'}
                    icon={<Refresh size={14} />}
                    onClick={pHeaderActions.onRefreshData}
                />
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Refresh time'}
                    icon={<LuTimerReset size={16} style={{ marginTop: '-1px' }} />}
                    onClick={pHeaderActions.onRefreshTime}
                />
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={pHeaderState.isEditing ? 'Close editor' : 'Open editor'}
                    active={pHeaderState.isEditing}
                    icon={<GearFill size={14} />}
                    onClick={pHeaderActions.onToggleEdit}
                />
                {getExperiment() && pHeaderState.canSaveLocal && (
                    <Button
                        size="xsm"
                        variant="ghost"
                        isToolTip
                        toolTipContent={'Saved to local'}
                        icon={<Download size={16} />}
                        onClick={pHeaderActions.onOpenExportCsv}
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

