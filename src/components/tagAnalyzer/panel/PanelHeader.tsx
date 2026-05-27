import './PanelChartHeader.scss';
import type { CSSProperties, ReactNode } from 'react';
import {
    Delete,
    Download,
    GearFill,
    LineChart,
    LuTimerReset,
    MdFlagCircle,
    PiSelectionPlusBold,
    Refresh,
    TbTimezone,
    VscNote,
    VscThreeBars,
} from '@/assets/icons/Icon';
import { Button, ContextMenu, Menu } from '@/design-system/components';
import { useExperiment } from '@/hooks/useExperiment';
import type { PanelOverlayMode } from '../domain/PanelDomain';
import type {
    IntervalOption,
    TimeRangeMs,
} from '../domain/time/TimeTypes';
import { formatRangeBoundaryLabel } from '../domain/time/TimeFormatters';

type PanelActionKey =
    | 'overlap'
    | 'raw'
    | 'highlight'
    | 'annotation'
    | 'drag-select'
    | 'fft'
    | 'global-time'
    | 'refresh-data'
    | 'refresh-time'
    | 'edit'
    | 'export-csv'
    | 'delete';
type PanelActionPriority = 'primary' | 'secondary' | 'wide';

export type PanelHeaderState = {
    title: string;
    panelRange: TimeRangeMs;
    resolvedIntervalOption: IntervalOption | undefined;
    canSetGlobalTime: boolean;
    canSaveLocal: boolean;
};

export type PanelActionState = {
    headerState: PanelHeaderState;
    overlayMode: PanelOverlayMode;
    isEditing: boolean;
    isRaw: boolean;
    isRawLocked: boolean;
    isOverlap: boolean;
};

export type PanelActionHandlers = {
    onToggleOverlap: () => void;
    onToggleRaw: () => void;
    onToggleHighlight?: () => void;
    onToggleAnnotation?: () => void;
    onToggleDragSelect: () => void;
    onOpenFft: (() => void) | undefined;
    onSetGlobalTime: () => void;
    onRefreshData: () => void;
    onRefreshTime: () => void;
    onToggleEdit: () => void;
    onOpenExportCsv?: () => void;
    onOpenDeleteConfirm: () => void;
};

export type PanelActionDescriptor = {
    key: PanelActionKey;
    label: string;
    tooltip: string;
    icon: ReactNode;
    onClick: () => void;
    priority: PanelActionPriority;
    active?: boolean;
    disabled?: boolean;
    className?: string;
    buttonStyle?: CSSProperties;
    contextLabel?: string;
};

const PANEL_CONTEXT_ACTION_KEYS: PanelActionKey[] = [
    'overlap',
    'raw',
    'drag-select',
    'fft',
    'global-time',
    'refresh-data',
    'refresh-time',
    'edit',
    'delete',
];
const RAW_BUTTON_STYLE = {
    minWidth: 34,
    maxWidth: 34,
    minHeight: 22,
    maxHeight: 22,
} as const;
const DRAG_SELECT_BUTTON_STYLE = {
    minWidth: 24,
    maxWidth: 24,
    minHeight: 22,
    maxHeight: 22,
} as const;

function buildPanelActions(
    state: PanelActionState,
    handlers: PanelActionHandlers,
    options: { showExportCsv?: boolean } = {},
): PanelActionDescriptor[] {
    const sOverlapLabel = state.isOverlap
        ? 'Disable overlap mode'
        : 'Enable overlap mode';
    const sRawLabel = state.isRaw
        ? 'Disable raw data mode'
        : 'Enable raw data mode';
    const sEditLabel = state.isEditing ? 'Close editor' : 'Open editor';
    const sActions: PanelActionDescriptor[] = [
        {
            key: 'overlap',
            label: sOverlapLabel,
            tooltip: sOverlapLabel,
            icon: (
                <MdFlagCircle
                    size={15}
                    style={{ color: state.isOverlap ? '#fdb532' : undefined }}
                />
            ),
            onClick: handlers.onToggleOverlap,
            priority: 'secondary',
            active: state.isOverlap,
        },
        {
            key: 'raw',
            label: sRawLabel,
            tooltip: state.isRawLocked
                ? 'Raw mode is required for numeric x-axis'
                : sRawLabel,
            icon: (
                <span
                    className="panel-header__raw-label"
                    style={{ color: state.isRaw ? '#fdb532' : undefined }}
                >
                    RAW
                </span>
            ),
            onClick: handlers.onToggleRaw,
            priority: 'primary',
            active: state.isRaw,
            disabled: state.isRawLocked,
            className: 'panel-header__action--raw',
            buttonStyle: RAW_BUTTON_STYLE,
        },
        {
            key: 'highlight',
            label: 'Highlight',
            tooltip: 'Drag on chart to create highlight',
            icon: <MdFlagCircle size={15} />,
            onClick: handlers.onToggleHighlight ?? (() => undefined),
            priority: 'primary',
            active: state.overlayMode === 'highlight',
            disabled: !handlers.onToggleHighlight,
        },
        {
            key: 'annotation',
            label: 'Annotation',
            tooltip: 'Click chart to create annotation',
            icon: <VscNote size={15} />,
            onClick: handlers.onToggleAnnotation ?? (() => undefined),
            priority: 'primary',
            active: state.overlayMode === 'annotation',
            disabled: !handlers.onToggleAnnotation,
        },
        {
            key: 'drag-select',
            label: 'Select data range',
            contextLabel: state.overlayMode === 'dragSelect'
                ? 'Disable range selection'
                : 'Enable range selection',
            tooltip: 'Select data range for stats and FFT',
            icon: <PiSelectionPlusBold size={18} />,
            onClick: handlers.onToggleDragSelect,
            priority: 'primary',
            active: state.overlayMode === 'dragSelect',
            buttonStyle: DRAG_SELECT_BUTTON_STYLE,
        },
        {
            key: 'fft',
            label: 'FFT chart',
            contextLabel: 'Open FFT chart',
            tooltip: 'FFT chart',
            icon: <LineChart size={16} />,
            onClick: handlers.onOpenFft ?? (() => undefined),
            priority: 'secondary',
            disabled: !handlers.onOpenFft,
        },
        {
            key: 'global-time',
            label: 'Set global time',
            tooltip: 'Set global time',
            icon: <TbTimezone size={15} />,
            onClick: handlers.onSetGlobalTime,
            priority: 'secondary',
            disabled: !state.headerState.canSetGlobalTime,
        },
        {
            key: 'refresh-data',
            label: 'Refresh data',
            tooltip: 'Refresh data',
            icon: <Refresh size={14} />,
            onClick: handlers.onRefreshData,
            priority: 'secondary',
        },
        {
            key: 'refresh-time',
            label: 'Refresh time',
            tooltip: 'Refresh time',
            icon: <LuTimerReset size={16} />,
            onClick: handlers.onRefreshTime,
            priority: 'secondary',
        },
        {
            key: 'edit',
            label: sEditLabel,
            contextLabel: state.isEditing ? 'Close editor' : 'Edit panel',
            tooltip: sEditLabel,
            icon: <GearFill size={14} />,
            onClick: handlers.onToggleEdit,
            priority: 'primary',
            active: state.isEditing,
        },
        {
            key: 'delete',
            label: 'Delete panel',
            tooltip: 'Delete panel',
            icon: <Delete size={16} />,
            onClick: handlers.onOpenDeleteConfirm,
            priority: 'wide',
        },
    ];

    if (options.showExportCsv && state.headerState.canSaveLocal) {
        if (!handlers.onOpenExportCsv) {
            throw new Error('Export CSV action requires an export handler.');
        }

        sActions.splice(sActions.length - 1, 0, {
            key: 'export-csv',
            label: 'Export CSV',
            tooltip: 'Export CSV',
            icon: <Download size={16} />,
            onClick: handlers.onOpenExportCsv,
            priority: 'wide',
        });
    }

    return sActions;
}

function getAction(
    actions: PanelActionDescriptor[],
    key: PanelActionKey,
): PanelActionDescriptor {
    const sAction = actions.find((action) => action.key === key);
    if (!sAction) {
        throw new Error(`Missing panel action: ${key}`);
    }

    return sAction;
}

function getActionClass(action: PanelActionDescriptor): string {
    return [
        'panel-header__action',
        `panel-header__action--${action.priority}`,
        action.className,
        action.active ? 'panel-header__action--active' : undefined,
    ]
        .filter(Boolean)
        .join(' ');
}

function PanelHeaderActionButton({ action }: { action: PanelActionDescriptor }) {
    return (
        <span className={getActionClass(action)}>
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

function PanelHeaderMoreMenu({ actions }: { actions: PanelActionDescriptor[] }) {
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

type PanelHeaderProps = PanelActionState &
    PanelActionHandlers & {
        isNumericXAxis: boolean;
        onToggleHighlight: () => void;
        onToggleAnnotation: () => void;
        onOpenExportCsv: () => void;
    };

const PanelHeader = (props: PanelHeaderProps) => {
    const { getExperiment } = useExperiment();
    const {
        headerState: pHeaderState,
        isNumericXAxis,
        isRaw,
        isOverlap,
        onToggleOverlap,
    } = props;
    const sTimeText = Number.isFinite(pHeaderState.panelRange.startTime) &&
        Number.isFinite(pHeaderState.panelRange.endTime) &&
        pHeaderState.panelRange.endTime > pHeaderState.panelRange.startTime
        ? `${formatRangeBoundaryLabel(
              pHeaderState.panelRange.startTime,
              isNumericXAxis,
          )} ~ ${formatRangeBoundaryLabel(
              pHeaderState.panelRange.endTime,
              isNumericXAxis,
          )}`
        : '';
    const sIntervalText =
        !isRaw && pHeaderState.resolvedIntervalOption
            ? `${pHeaderState.resolvedIntervalOption.IntervalValue}${pHeaderState.resolvedIntervalOption.IntervalType}`
            : '';
    const sTimeSummaryText =
        sTimeText && sIntervalText
            ? `${sTimeText} (interval: ${sIntervalText})`
            : sTimeText;
    const sActions = buildPanelActions(props, props, {
        showExportCsv: getExperiment(),
    });
    const sHeaderActions = sActions.filter((action) => action.key !== 'overlap');
    const sMoreActions = [
        getAction(sActions, 'overlap'),
        ...sHeaderActions.filter((action) => action.priority !== 'primary'),
    ];
    const sOverlapLabel = getAction(sActions, 'overlap').label;

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
            <div className="panel-header__time" title={sTimeSummaryText}>
                {sTimeText}
                {sIntervalText && (
                    <span className="panel-header__interval">
                        {` (interval: ${sIntervalText})`}
                    </span>
                )}
            </div>
            <div className="panel-header__actions">
                {sHeaderActions.map((action) => (
                    <PanelHeaderActionButton key={action.key} action={action} />
                ))}
                <PanelHeaderMoreMenu actions={sMoreActions} />
            </div>
        </div>
    );
};

export type PanelContextMenuProps = PanelActionState &
    Omit<
        PanelActionHandlers,
        'onToggleHighlight' | 'onToggleAnnotation' | 'onOpenExportCsv'
    > & {
        position: { x: number; y: number };
        onClose: () => void;
    };

export function PanelContextMenu(props: PanelContextMenuProps) {
    const { position, onClose } = props;
    const sActions = buildPanelActions(props, props);

    function runActionAfterClose(action: () => void) {
        onClose();
        action();
    }

    return (
        <ContextMenu isOpen position={position} onClose={onClose}>
            {PANEL_CONTEXT_ACTION_KEYS.map((key) => {
                const action = getAction(sActions, key);

                return (
                    <ContextMenu.Item
                        key={action.key}
                        onClick={() => runActionAfterClose(action.onClick)}
                        disabled={action.disabled}
                    >
                        {action.contextLabel ?? action.label}
                    </ContextMenu.Item>
                );
            })}
        </ContextMenu>
    );
}

export default PanelHeader;
