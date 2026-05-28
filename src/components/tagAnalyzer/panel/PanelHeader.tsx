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
import { PanelOverlayMode } from '../domain/PanelDomain';
import type {
    IntervalOption,
    TimeRangeMs,
} from '../domain/time/TimeTypes';
import { formatRangeBoundaryLabel } from '../domain/time/TimeFormatters';

export enum PanelActionKey {
    TOGGLE_OVERLAP = 'TOGGLE_OVERLAP',
    TOGGLE_RAW = 'TOGGLE_RAW',
    TOGGLE_HIGHLIGHT = 'TOGGLE_HIGHLIGHT',
    TOGGLE_ANNOTATION = 'TOGGLE_ANNOTATION',
    TOGGLE_DRAG_SELECT = 'TOGGLE_DRAG_SELECT',
    OPEN_FFT = 'OPEN_FFT',
    SET_GLOBAL_TIME = 'SET_GLOBAL_TIME',
    REFRESH_DATA = 'REFRESH_DATA',
    REFRESH_TIME = 'REFRESH_TIME',
    TOGGLE_EDIT = 'TOGGLE_EDIT',
    OPEN_EXPORT_CSV = 'OPEN_EXPORT_CSV',
    OPEN_DELETE_CONFIRM = 'OPEN_DELETE_CONFIRM',
}
enum PanelActionPriority {
    PRIMARY = 'primary',
    SECONDARY = 'secondary',
    WIDE = 'wide',
}

export type PanelHeaderRuntimeState = {
    title: string;
    panelRange: TimeRangeMs;
    resolvedIntervalOption: IntervalOption | undefined;
    canSetGlobalTime: boolean;
    canSaveLocal: boolean;
    canOpenFft: boolean;
    isNumericXAxis: boolean;
    overlayMode: PanelOverlayMode;
    isEditing: boolean;
    isRaw: boolean;
    isRawLocked: boolean;
    isOverlap: boolean;
};

type PanelActionDescriptor = {
    key: PanelActionKey;
    label: string;
    tooltip?: string;
    icon: ReactNode;
    priority: PanelActionPriority;
    active?: boolean;
    disabled?: boolean;
    className?: string;
    buttonStyle?: CSSProperties;
    contextLabel?: string;
};

const PANEL_CONTEXT_ACTION_KEYS: PanelActionKey[] = [
    PanelActionKey.TOGGLE_OVERLAP,
    PanelActionKey.TOGGLE_RAW,
    PanelActionKey.TOGGLE_DRAG_SELECT,
    PanelActionKey.OPEN_FFT,
    PanelActionKey.SET_GLOBAL_TIME,
    PanelActionKey.REFRESH_DATA,
    PanelActionKey.REFRESH_TIME,
    PanelActionKey.TOGGLE_EDIT,
    PanelActionKey.OPEN_DELETE_CONFIRM,
];
const RAW_BUTTON_STYLE = { minWidth: 34, maxWidth: 34, minHeight: 22, maxHeight: 22 } as const;
const DRAG_SELECT_BUTTON_STYLE = { minWidth: 24, maxWidth: 24, minHeight: 22, maxHeight: 22 } as const;

function buildPanelActions(
    state: PanelHeaderRuntimeState,
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
            key: PanelActionKey.TOGGLE_OVERLAP,
            label: sOverlapLabel,
            icon: (
                <MdFlagCircle
                    size={15}
                    style={{ color: state.isOverlap ? '#fdb532' : undefined }}
                />
            ),
            priority: PanelActionPriority.SECONDARY,
            active: state.isOverlap,
        },
        {
            key: PanelActionKey.TOGGLE_RAW,
            label: sRawLabel,
            tooltip: state.isRawLocked
                ? 'Raw mode is required for numeric x-axis'
                : undefined,
            icon: (
                <span
                    className="panel-header__raw-label"
                    style={{ color: state.isRaw ? '#fdb532' : undefined }}
                >
                    RAW
                </span>
            ),
            priority: PanelActionPriority.PRIMARY,
            active: state.isRaw,
            disabled: state.isRawLocked,
            className: 'panel-header__action--raw',
            buttonStyle: RAW_BUTTON_STYLE,
        },
        {
            key: PanelActionKey.TOGGLE_HIGHLIGHT,
            label: 'Highlight',
            tooltip: 'Drag on chart to create highlight',
            icon: <MdFlagCircle size={15} />,
            priority: PanelActionPriority.PRIMARY,
            active: state.overlayMode === PanelOverlayMode.HIGHLIGHT,
        },
        {
            key: PanelActionKey.TOGGLE_ANNOTATION,
            label: 'Annotation',
            tooltip: 'Click chart to create annotation',
            icon: <VscNote size={15} />,
            priority: PanelActionPriority.PRIMARY,
            active: state.overlayMode === PanelOverlayMode.ANNOTATION,
        },
        {
            key: PanelActionKey.TOGGLE_DRAG_SELECT,
            label: 'Select data range',
            contextLabel: state.overlayMode === PanelOverlayMode.DRAG_SELECT
                ? 'Disable range selection'
                : 'Enable range selection',
            tooltip: 'Select data range for stats and FFT',
            icon: <PiSelectionPlusBold size={18} />,
            priority: PanelActionPriority.PRIMARY,
            active: state.overlayMode === PanelOverlayMode.DRAG_SELECT,
            buttonStyle: DRAG_SELECT_BUTTON_STYLE,
        },
        {
            key: PanelActionKey.OPEN_FFT,
            label: 'FFT chart',
            contextLabel: 'Open FFT chart',
            icon: <LineChart size={16} />,
            priority: PanelActionPriority.SECONDARY,
            disabled: !state.canOpenFft,
        },
        {
            key: PanelActionKey.SET_GLOBAL_TIME,
            label: 'Set global time',
            icon: <TbTimezone size={15} />,
            priority: PanelActionPriority.SECONDARY,
            disabled: !state.canSetGlobalTime,
        },
        {
            key: PanelActionKey.REFRESH_DATA,
            label: 'Refresh data',
            icon: <Refresh size={14} />,
            priority: PanelActionPriority.SECONDARY,
        },
        {
            key: PanelActionKey.REFRESH_TIME,
            label: 'Refresh time',
            icon: <LuTimerReset size={16} />,
            priority: PanelActionPriority.SECONDARY,
        },
        {
            key: PanelActionKey.TOGGLE_EDIT,
            label: sEditLabel,
            contextLabel: state.isEditing ? 'Close editor' : 'Edit panel',
            icon: <GearFill size={14} />,
            priority: PanelActionPriority.PRIMARY,
            active: state.isEditing,
        },
        {
            key: PanelActionKey.OPEN_DELETE_CONFIRM,
            label: 'Delete panel',
            icon: <Delete size={16} />,
            priority: PanelActionPriority.WIDE,
        },
    ];

    if (options.showExportCsv && state.canSaveLocal) {
        sActions.splice(sActions.length - 1, 0, {
            key: PanelActionKey.OPEN_EXPORT_CSV,
            label: 'Export CSV',
            icon: <Download size={16} />,
            priority: PanelActionPriority.WIDE,
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

function PanelHeaderActionButton({
    action,
    onAction,
}: {
    action: PanelActionDescriptor;
    onAction: (actionKey: PanelActionKey) => void;
}) {
    return (
        <span className={getActionClass(action)}>
            <Button
                aria-label={action.label}
                size="xsm"
                variant="ghost"
                isToolTip
                toolTipContent={action.tooltip ?? action.label}
                active={action.active}
                disabled={action.disabled}
                icon={action.icon}
                onClick={() => onAction(action.key)}
                style={action.buttonStyle}
            />
        </span>
    );
}

function PanelHeaderMoreMenu({
    actions,
    onAction,
}: {
    actions: PanelActionDescriptor[];
    onAction: (actionKey: PanelActionKey) => void;
}) {
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
                            onClick={() => onAction(action.key)}
                        >
                            {action.label}
                        </Menu.Item>
                    ))}
                </Menu.Content>
            </Menu.Root>
        </span>
    );
}

type PanelHeaderProps = {
    runtimeState: PanelHeaderRuntimeState;
    onAction: (actionKey: PanelActionKey) => void;
};

const PanelHeader = (props: PanelHeaderProps) => {
    const { getExperiment } = useExperiment();
    const {
        runtimeState,
        onAction,
    } = props;
    const sTimeText = Number.isFinite(runtimeState.panelRange.startTime) &&
        Number.isFinite(runtimeState.panelRange.endTime) &&
        runtimeState.panelRange.endTime > runtimeState.panelRange.startTime
        ? `${formatRangeBoundaryLabel(
              runtimeState.panelRange.startTime,
              runtimeState.isNumericXAxis,
          )} ~ ${formatRangeBoundaryLabel(
              runtimeState.panelRange.endTime,
              runtimeState.isNumericXAxis,
          )}`
        : '';
    const sIntervalText =
        !runtimeState.isRaw && runtimeState.resolvedIntervalOption
            ? `${runtimeState.resolvedIntervalOption.IntervalValue}${runtimeState.resolvedIntervalOption.IntervalType}`
            : '';
    const sTimeSummaryText =
        sTimeText && sIntervalText
            ? `${sTimeText} (interval: ${sIntervalText})`
            : sTimeText;
    const sActions = buildPanelActions(runtimeState, {
        showExportCsv: getExperiment(),
    });
    const sHeaderActions = sActions.filter(
        (action) => action.key !== PanelActionKey.TOGGLE_OVERLAP,
    );
    const sMoreActions = [
        getAction(sActions, PanelActionKey.TOGGLE_OVERLAP),
        ...sHeaderActions.filter(
            (action) => action.priority !== PanelActionPriority.PRIMARY,
        ),
    ];
    const sOverlapLabel = getAction(
        sActions,
        PanelActionKey.TOGGLE_OVERLAP,
    ).label;

    return (
        <div className="panel-header">
            <Button
                aria-label={sOverlapLabel}
                className="panel-header__title-button"
                size="fit"
                variant="ghost"
                isToolTip
                toolTipContent={`${runtimeState.title} - ${sOverlapLabel}`}
                active={runtimeState.isOverlap}
                icon={
                    <span
                        className="panel-header__title"
                        title={runtimeState.title}
                    >
                        {runtimeState.title}
                    </span>
                }
                onClick={() => onAction(PanelActionKey.TOGGLE_OVERLAP)}
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
                    <PanelHeaderActionButton
                        key={action.key}
                        action={action}
                        onAction={onAction}
                    />
                ))}
                <PanelHeaderMoreMenu
                    actions={sMoreActions}
                    onAction={onAction}
                />
            </div>
        </div>
    );
};

type PanelContextMenuProps = {
    runtimeState: PanelHeaderRuntimeState;
    position: { x: number; y: number };
    onClose: () => void;
    onAction: (actionKey: PanelActionKey) => void;
};

export function PanelContextMenu(props: PanelContextMenuProps) {
    const { runtimeState, position, onClose, onAction } = props;
    const sActions = buildPanelActions(runtimeState);

    function runActionAfterClose(actionKey: PanelActionKey) {
        onClose();
        onAction(actionKey);
    }

    return (
        <ContextMenu isOpen position={position} onClose={onClose}>
            {PANEL_CONTEXT_ACTION_KEYS.map((key) => {
                const action = getAction(sActions, key);

                return (
                    <ContextMenu.Item
                        key={action.key}
                        onClick={() => runActionAfterClose(action.key)}
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
