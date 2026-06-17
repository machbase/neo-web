import './PanelChartHeader.scss';
import {
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type KeyboardEvent,
    type ReactNode,
} from 'react';
import {
    Check,
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
} from '../domain/time/model/TimeTypes';
import { formatRangeBoundaryLabel } from '../domain/time/formatting/TimeFormatters';
import { isValidTimeRange } from '../domain/time/range/TimeRangeUtils';

export enum PanelActionKey {
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

enum PanelActionVisibilityPriority {
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
    visibilityPriority: PanelActionVisibilityPriority;
    active?: boolean;
    disabled?: boolean;
    className?: string;
    buttonStyle?: CSSProperties;
    contextLabel?: string;
};

const PANEL_CONTEXT_ACTION_KEYS: PanelActionKey[] = [
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
    const sRawLabel = state.isRaw
        ? 'Disable raw data mode'
        : 'Enable raw data mode';
    const sEditLabel = state.isEditing ? 'Close editor' : 'Open editor';
    const sActions: PanelActionDescriptor[] = [
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
            visibilityPriority: PanelActionVisibilityPriority.PRIMARY,
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
            visibilityPriority: PanelActionVisibilityPriority.PRIMARY,
            active: state.overlayMode === PanelOverlayMode.HIGHLIGHT,
        },
        {
            key: PanelActionKey.TOGGLE_ANNOTATION,
            label: 'Annotation',
            tooltip: 'Click chart to create annotation',
            icon: <VscNote size={15} />,
            visibilityPriority: PanelActionVisibilityPriority.PRIMARY,
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
            visibilityPriority: PanelActionVisibilityPriority.PRIMARY,
            active: state.overlayMode === PanelOverlayMode.DRAG_SELECT,
            buttonStyle: DRAG_SELECT_BUTTON_STYLE,
        },
        {
            key: PanelActionKey.OPEN_FFT,
            label: 'FFT chart',
            contextLabel: 'Open FFT chart',
            icon: <LineChart size={16} />,
            visibilityPriority: PanelActionVisibilityPriority.SECONDARY,
            disabled: !state.canOpenFft,
        },
        {
            key: PanelActionKey.SET_GLOBAL_TIME,
            label: 'Set global time',
            icon: <TbTimezone size={15} />,
            visibilityPriority: PanelActionVisibilityPriority.SECONDARY,
            disabled: !state.canSetGlobalTime,
        },
        {
            key: PanelActionKey.REFRESH_DATA,
            label: 'Refresh data',
            icon: <Refresh size={14} />,
            visibilityPriority: PanelActionVisibilityPriority.SECONDARY,
        },
        {
            key: PanelActionKey.REFRESH_TIME,
            label: 'Refresh time',
            icon: <LuTimerReset size={16} />,
            visibilityPriority: PanelActionVisibilityPriority.SECONDARY,
        },
        {
            key: PanelActionKey.TOGGLE_EDIT,
            label: sEditLabel,
            contextLabel: state.isEditing ? 'Close editor' : 'Edit panel',
            icon: <GearFill size={14} />,
            visibilityPriority: PanelActionVisibilityPriority.PRIMARY,
            active: state.isEditing,
        },
        {
            key: PanelActionKey.OPEN_DELETE_CONFIRM,
            label: 'Delete panel',
            icon: <Delete size={16} />,
            visibilityPriority: PanelActionVisibilityPriority.WIDE,
        },
    ];

    if (options.showExportCsv && state.canSaveLocal) {
        sActions.splice(sActions.length - 1, 0, {
            key: PanelActionKey.OPEN_EXPORT_CSV,
            label: 'Export CSV',
            icon: <Download size={16} />,
            visibilityPriority: PanelActionVisibilityPriority.WIDE,
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
        `panel-header__action--${action.visibilityPriority}`,
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
    onToggleOverlap: () => void;
    onRenamePanelTitle: (title: string) => void;
    onOpenTimeRangeModal: () => void;
};

const PanelHeader = (props: PanelHeaderProps) => {
    const { getExperiment } = useExperiment();
    const {
        runtimeState,
        onAction,
        onToggleOverlap,
        onRenamePanelTitle,
        onOpenTimeRangeModal,
    } = props;
    const [isRenamingTitle, setIsRenamingTitle] = useState(false);
    const [titleDraft, setTitleDraft] = useState(runtimeState.title);
    const titleInputRef = useRef<HTMLInputElement | null>(null);
    const titleRenameCloseReasonRef = useRef<'apply' | 'cancel' | undefined>(
        undefined,
    );
    const sHasPanelRange = isValidTimeRange(runtimeState.panelRange);
    const sTimeText = sHasPanelRange
        ? `${formatRangeBoundaryLabel(
              runtimeState.panelRange.startTime,
              runtimeState.isNumericXAxis,
              runtimeState.panelRange,
          )} ~ ${formatRangeBoundaryLabel(
              runtimeState.panelRange.endTime,
              runtimeState.isNumericXAxis,
              runtimeState.panelRange,
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
    const sMoreActions = sActions.filter(
        (action) =>
            action.visibilityPriority !==
            PanelActionVisibilityPriority.PRIMARY,
    );
    const sOverlapLabel = runtimeState.isOverlap
        ? 'Remove from overlap chart'
        : 'Add to overlap chart';
    const sOverlapBoxClassName = [
        'panel-header__overlap-box',
        runtimeState.isOverlap ? 'panel-header__overlap-box--active' : undefined,
    ]
        .filter(Boolean)
        .join(' ');

    useEffect(() => {
        if (!isRenamingTitle) {
            setTitleDraft(runtimeState.title);
        }
    }, [isRenamingTitle, runtimeState.title]);

    useEffect(() => {
        if (!isRenamingTitle) {
            return;
        }

        titleInputRef.current?.focus();
        titleInputRef.current?.select();
    }, [isRenamingTitle]);

    function openTitleRename(): void {
        titleRenameCloseReasonRef.current = undefined;
        setTitleDraft(runtimeState.title);
        setIsRenamingTitle(true);
    }

    function applyTitleRename(): void {
        if (titleRenameCloseReasonRef.current !== undefined) {
            return;
        }

        titleRenameCloseReasonRef.current = 'apply';
        const sNextTitle = titleDraft.trim();

        setIsRenamingTitle(false);

        if (sNextTitle.length === 0 || sNextTitle === runtimeState.title) {
            setTitleDraft(runtimeState.title);
            return;
        }

        onRenamePanelTitle(sNextTitle);
    }

    function cancelTitleRename(): void {
        if (titleRenameCloseReasonRef.current !== undefined) {
            return;
        }

        titleRenameCloseReasonRef.current = 'cancel';
        setTitleDraft(runtimeState.title);
        setIsRenamingTitle(false);
    }

    function handleTitleRenameKeyDown(
        event: KeyboardEvent<HTMLInputElement>,
    ): void {
        if (event.key === 'Enter') {
            event.preventDefault();
            applyTitleRename();
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            cancelTitleRename();
        }
    }

    return (
        <div className="panel-header">
            <div className="panel-header__title-group">
                <button
                    type="button"
                    className={sOverlapBoxClassName}
                    title={sOverlapLabel}
                    aria-label={sOverlapLabel}
                    aria-pressed={runtimeState.isOverlap}
                    onClick={onToggleOverlap}
                >
                    {runtimeState.isOverlap && <Check size={11} />}
                </button>
                {isRenamingTitle ? (
                    <input
                        ref={titleInputRef}
                        className="panel-header__title-input"
                        value={titleDraft}
                        aria-label="Chart title"
                        onChange={(event) => setTitleDraft(event.target.value)}
                        onBlur={applyTitleRename}
                        onKeyDown={handleTitleRenameKeyDown}
                    />
                ) : (
                    <button
                        type="button"
                        className="panel-header__title-button"
                        title="Rename chart"
                        onClick={openTitleRename}
                    >
                        <span
                            className="panel-header__title"
                            title={runtimeState.title}
                        >
                            {runtimeState.title}
                        </span>
                    </button>
                )}
            </div>
            <div className="panel-header__time" title={sTimeSummaryText}>
                <span className="panel-header__time-part">
                    <button
                        type="button"
                        className="panel-header__time-button panel-header__time-range-button"
                        title={
                            runtimeState.isNumericXAxis
                                ? 'Set current visible main chart value range'
                                : 'Set current visible main chart range'
                        }
                        disabled={!sHasPanelRange}
                        onClick={onOpenTimeRangeModal}
                    >
                        {sTimeText}
                    </button>
                </span>
                {sIntervalText && (
                    <span className="panel-header__interval">
                        {` (interval: ${sIntervalText})`}
                    </span>
                )}
            </div>
            <div className="panel-header__actions">
                {sActions.map((action) => (
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
