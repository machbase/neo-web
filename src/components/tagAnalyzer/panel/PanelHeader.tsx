import './PanelChartHeader.scss';
import type { CSSProperties, ReactNode } from 'react';
import {
    Refresh,
    GearFill,
    Delete,
    PiSelectionPlusBold,
    LineChart,
    LuTimerReset,
    Download,
    TbTimezone,
    VscNote,
    VscThreeBars,
    MdFlagCircle,
} from '@/assets/icons/Icon';
import { useExperiment } from '@/hooks/useExperiment';
import { Button, Menu } from '@/design-system/components';
import type { PanelOverlayMode } from '../domain/PanelChartModel';
import type {
    IntervalOption,
    TimeRangeMs,
} from '../domain/time/TimeTypes';
import { formatLocalRangeLabel } from '../domain/time/TimeFormatters';

type PanelHeaderActionPriority = 'primary' | 'secondary' | 'wide';

type PanelHeaderAction = {
    key: string;
    label: string;
    tooltip: string;
    icon: ReactNode;
    onClick: () => void;
    priority: PanelHeaderActionPriority;
    active?: boolean;
    disabled?: boolean;
    className?: string;
    buttonStyle?: CSSProperties;
};

function getPanelHeaderActionClass(action: PanelHeaderAction): string {
    const sClassNames = [
        'panel-header__action',
        `panel-header__action--${action.priority}`,
        action.className,
        action.active ? 'panel-header__action--active' : undefined,
    ];

    return sClassNames.filter(Boolean).join(' ');
}

function PanelHeaderActionButton({ action }: { action: PanelHeaderAction }) {
    return (
        <span className={getPanelHeaderActionClass(action)}>
            <Button
                aria-label={action.label}
                size="xsm"
                variant="ghost"
                isToolTip
                toolTipContent={action.tooltip}
                active={action.active}
                disabled={action.disabled}
                icon={action.icon}
                onClick={action.onClick}
                style={action.buttonStyle}
            />
        </span>
    );
}

function PanelHeaderMoreMenu({ actions }: { actions: PanelHeaderAction[] }) {
    return (
        <span className="panel-header__more">
            <Menu.Root>
                <Menu.Trigger>
                    <Button
                        aria-label="More panel actions"
                        size="xsm"
                        variant="ghost"
                        isToolTip
                        toolTipContent="More"
                        icon={<VscThreeBars size={15} />}
                    />
                </Menu.Trigger>
                <Menu.Content align="right">
                    {actions.map((action) => (
                        <Menu.Item
                            key={action.key}
                            className={action.active ? 'selected' : undefined}
                            disabled={action.disabled}
                            icon={action.icon}
                            onClick={action.onClick}
                        >
                            {action.label}
                        </Menu.Item>
                    ))}
                </Menu.Content>
            </Menu.Root>
        </span>
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
    const sTimeSummaryText =
        sTimeText && sIntervalText
            ? `${sTimeText} (interval: ${sIntervalText})`
            : sTimeText;
    const sOverlapLabel = isOverlap
        ? 'Disable overlap mode'
        : 'Enable overlap mode';

    const sHeaderActions: PanelHeaderAction[] = [
        {
            key: 'raw',
            label: isRaw ? 'Disable raw data mode' : 'Enable raw data mode',
            tooltip: isRaw ? 'Disable raw data mode' : 'Enable raw data mode',
            icon: (
                <span
                    className="panel-header__raw-label"
                    style={{ color: isRaw ? '#fdb532' : undefined }}
                >
                    RAW
                </span>
            ),
            onClick: onToggleRaw,
            priority: 'primary',
            active: isRaw,
            className: 'panel-header__action--raw',
            buttonStyle: {
                minWidth: 34,
                maxWidth: 34,
                minHeight: 22,
                maxHeight: 22,
            },
        },
        {
            key: 'highlight',
            label: 'Highlight',
            tooltip: 'Drag on chart to create highlight',
            icon: <MdFlagCircle size={15} />,
            onClick: onToggleHighlight,
            priority: 'primary',
            active: overlayMode === 'highlight',
        },
        {
            key: 'annotation',
            label: 'Annotation',
            tooltip: 'Click chart to create annotation',
            icon: <VscNote size={15} />,
            onClick: onToggleAnnotation,
            priority: 'primary',
            active: overlayMode === 'annotation',
        },
        {
            key: 'drag-select',
            label: 'Select data range',
            tooltip: 'Select data range for stats and FFT',
            icon: <PiSelectionPlusBold size={18} />,
            onClick: onToggleDragSelect,
            priority: 'primary',
            active: overlayMode === 'dragSelect',
            buttonStyle: {
                minWidth: 24,
                maxWidth: 24,
                minHeight: 22,
                maxHeight: 22,
            },
        },
        {
            key: 'fft',
            label: 'FFT chart',
            tooltip: 'FFT chart',
            icon: <LineChart size={16} />,
            onClick: onOpenFft ?? (() => undefined),
            priority: 'secondary',
            disabled: !onOpenFft,
        },
        {
            key: 'global-time',
            label: 'Set global time',
            tooltip: 'Set global time',
            icon: <TbTimezone size={15} />,
            onClick: onSetGlobalTime,
            priority: 'secondary',
            disabled: !pHeaderState.canSetGlobalTime,
        },
        {
            key: 'refresh-data',
            label: 'Refresh data',
            tooltip: 'Refresh data',
            icon: <Refresh size={14} />,
            onClick: onRefreshData,
            priority: 'secondary',
        },
        {
            key: 'refresh-time',
            label: 'Refresh time',
            tooltip: 'Refresh time',
            icon: <LuTimerReset size={16} />,
            onClick: onRefreshTime,
            priority: 'secondary',
        },
        {
            key: 'edit',
            label: isEditing ? 'Close editor' : 'Open editor',
            tooltip: isEditing ? 'Close editor' : 'Open editor',
            icon: <GearFill size={14} />,
            onClick: onToggleEdit,
            priority: 'primary',
            active: isEditing,
        },
        ...(getExperiment() && pHeaderState.canSaveLocal
            ? [
                  {
                      key: 'export-csv',
                      label: 'Export CSV',
                      tooltip: 'Export CSV',
                      icon: <Download size={16} />,
                      onClick: onOpenExportCsv,
                      priority: 'wide' as const,
                  },
              ]
            : []),
        {
            key: 'delete',
            label: 'Delete panel',
            tooltip: 'Delete panel',
            icon: <Delete size={16} />,
            onClick: onOpenDeleteConfirm,
            priority: 'wide',
        },
    ];
    const sMoreActions: PanelHeaderAction[] = [
        {
            key: 'overlap',
            label: sOverlapLabel,
            tooltip: sOverlapLabel,
            icon: <PanelHeaderOverlapIcon isOverlap={isOverlap} />,
            onClick: onToggleOverlap,
            priority: 'secondary',
            active: isOverlap,
        },
        ...sHeaderActions.filter((action) => action.priority !== 'primary'),
    ];

    return (
        <div className="panel-header">
            <Button
                aria-label={sOverlapLabel}
                className="panel-header__title-button"
                size="fit"
                variant="ghost"
                isToolTip
                toolTipContent={`${pHeaderState.title} - ${sOverlapLabel}`}
                active={isOverlap}
                icon={
                    <span
                        className="panel-header__title"
                        title={pHeaderState.title}
                    >
                        {pHeaderState.title}
                    </span>
                }
                onClick={onToggleOverlap}
            />
            <div
                className="panel-header__time"
                title={sTimeSummaryText}
            >
                {sTimeText}
                {sIntervalText && (
                    <span className="panel-header__interval">
                        {` (interval: ${sIntervalText})`}
                    </span>
                )}
            </div>
            <div className="panel-header__actions">
                {sHeaderActions.map((action) => (
                    <PanelHeaderActionButton
                        key={action.key}
                        action={action}
                    />
                ))}
                <PanelHeaderMoreMenu actions={sMoreActions} />
            </div>
        </div>
    );
};

function PanelHeaderOverlapIcon({ isOverlap }: { isOverlap: boolean }) {
    return (
        <MdFlagCircle
            size={15}
            style={{ color: isOverlap ? '#fdb532' : undefined }}
        />
    );
}

export default PanelHeader;
