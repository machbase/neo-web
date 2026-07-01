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
    CiCircleMore,
    Delete,
    Download,
    GearFill,
    GoArrowBoth,
    LuTimerReset,
    PiHighlighterLight,
    PiSelectionPlusBold,
    Refresh,
    TbTimezone,
    VscNote,
    VscThreeBars,
} from '@/assets/icons/Icon';
import { Button, ContextMenu, Menu } from '@/design-system/components';
import { useExperiment } from '@/hooks/useExperiment';
import { PanelOverlayMode } from '../domain/panel/PanelActions';
import type {
    IntervalOption,
    TimeRangeMs,
} from '../domain/time/TimeTypes';
import { formatRangeEndpointLabel } from '../formatting/TimeFormatters';
import { isValidTimeRange } from '../domain/time/TimeRangeUtils';

export enum PanelActionKey {
    TOGGLE_RAW = 'TOGGLE_RAW',
    TOGGLE_HIGHLIGHT = 'TOGGLE_HIGHLIGHT',
    TOGGLE_ANNOTATION = 'TOGGLE_ANNOTATION',
    TOGGLE_DRAG_SELECT = 'TOGGLE_DRAG_SELECT',
    SET_GLOBAL_TIME = 'SET_GLOBAL_TIME',
    REFRESH_DATA = 'REFRESH_DATA',
    REFRESH_TIME = 'REFRESH_TIME',
    EXPAND_FULL_RANGE = 'EXPAND_FULL_RANGE',
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
    isNumericXAxis: boolean;
    overlayMode: PanelOverlayMode;
    isEditing: boolean;
    isRaw: boolean;
    isOverlapSelected: boolean;
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
    PanelActionKey.SET_GLOBAL_TIME,
    PanelActionKey.REFRESH_DATA,
    PanelActionKey.REFRESH_TIME,
    PanelActionKey.EXPAND_FULL_RANGE,
    PanelActionKey.TOGGLE_EDIT,
    PanelActionKey.OPEN_DELETE_CONFIRM,
];
const PANEL_EXTRA_ACTION_KEYS = new Set<PanelActionKey>([
    PanelActionKey.TOGGLE_HIGHLIGHT,
    PanelActionKey.TOGGLE_ANNOTATION,
    PanelActionKey.SET_GLOBAL_TIME,
    PanelActionKey.REFRESH_DATA,
    PanelActionKey.EXPAND_FULL_RANGE,
    PanelActionKey.OPEN_EXPORT_CSV,
]);
const RAW_BUTTON_STYLE = { minWidth: 34, maxWidth: 34, minHeight: 22, maxHeight: 22 } as const;
const DRAG_SELECT_BUTTON_STYLE = { minWidth: 24, maxWidth: 24, minHeight: 22, maxHeight: 22 } as const;

function joinClassNames(
    ...names: Array<string | false | undefined | null>
): string {
    return names.filter(Boolean).join(' ');
}

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
            tooltip: state.isNumericXAxis
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
            disabled: state.isNumericXAxis,
            className: 'panel-header__action--raw',
            buttonStyle: RAW_BUTTON_STYLE,
        },
        {
            key: PanelActionKey.TOGGLE_HIGHLIGHT,
            label: 'Highlight',
            tooltip: 'Drag on chart to create highlight',
            icon: <PiHighlighterLight size={16} />,
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
            key: PanelActionKey.SET_GLOBAL_TIME,
            label: 'Set global time',
            icon: <TbTimezone size={15} />,
            visibilityPriority: PanelActionVisibilityPriority.SECONDARY,
            disabled: !state.canSetGlobalTime,
        },
        {
            key: PanelActionKey.REFRESH_DATA,
            label: 'Reload data',
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
            key: PanelActionKey.EXPAND_FULL_RANGE,
            label: 'Expand to full data range',
            icon: <GoArrowBoth size={15} />,
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

function partitionPanelActions(actions: PanelActionDescriptor[]): {
    direct: PanelActionDescriptor[];
    extra: PanelActionDescriptor[];
    more: PanelActionDescriptor[];
} {
    const sDirect: PanelActionDescriptor[] = [];
    const sExtra: PanelActionDescriptor[] = [];
    const sMore: PanelActionDescriptor[] = [];

    for (const action of actions) {
        if (PANEL_EXTRA_ACTION_KEYS.has(action.key)) {
            sExtra.push(action);
        } else {
            sDirect.push(action);
            if (action.visibilityPriority !== PanelActionVisibilityPriority.PRIMARY) {
                sMore.push(action);
            }
        }
    }

    return { direct: sDirect, extra: sExtra, more: sMore };
}

function getActionClass(action: PanelActionDescriptor): string {
    return joinClassNames(
        'panel-header__action',
        `panel-header__action--${action.visibilityPriority}`,
        action.className,
        action.active && 'panel-header__action--active',
    );
}

function formatPanelTimeText(state: PanelHeaderRuntimeState): string {
    if (!isValidTimeRange(state.panelRange)) return '';
    const sStart = formatRangeEndpointLabel(
        state.panelRange.startTime,
        state.isNumericXAxis,
        state.panelRange,
    );
    const sEnd = formatRangeEndpointLabel(
        state.panelRange.endTime,
        state.isNumericXAxis,
        state.panelRange,
    );
    return `${sStart} ~ ${sEnd}`;
}

function formatIntervalText(state: PanelHeaderRuntimeState): string {
    if (state.isRaw || !state.resolvedIntervalOption) return '';
    return `${state.resolvedIntervalOption.IntervalValue}${state.resolvedIntervalOption.IntervalType}`;
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

type PanelHeaderMenuProps = {
    actions: PanelActionDescriptor[];
    onAction: (actionKey: PanelActionKey) => void;
    containerClassName: string;
    activeContainerClassName?: string;
    activeItemClassName: string;
    triggerAriaLabel: string;
    triggerIcon: ReactNode;
    triggerLabel?: string;
    triggerIconPosition?: 'right';
    triggerToolTipContent?: string;
    showActiveOnTrigger?: boolean;
    getItemLabel?: (action: PanelActionDescriptor) => string;
};

function PanelHeaderMenu({
    actions,
    onAction,
    containerClassName,
    activeContainerClassName,
    activeItemClassName,
    triggerAriaLabel,
    triggerIcon,
    triggerLabel,
    triggerIconPosition,
    triggerToolTipContent,
    showActiveOnTrigger,
    getItemLabel,
}: PanelHeaderMenuProps) {
    const sIsActive =
        (showActiveOnTrigger ?? false) &&
        actions.some((action) => action.active === true);
    const sResolveLabel = getItemLabel ?? ((action) => action.label);

    return (
        <span
            className={joinClassNames(
                containerClassName,
                sIsActive && activeContainerClassName,
            )}
        >
            <Menu.Root>
                <Menu.Trigger>
                    <Button
                        aria-label={triggerAriaLabel}
                        size="xsm"
                        variant="ghost"
                        isToolTip={triggerToolTipContent !== undefined}
                        toolTipContent={triggerToolTipContent}
                        active={showActiveOnTrigger ? sIsActive : undefined}
                        icon={triggerIcon}
                        iconPosition={triggerIconPosition}
                    >
                        {triggerLabel}
                    </Button>
                </Menu.Trigger>
                <Menu.Content align="right">
                    {actions.map((action) => (
                        <Menu.Item
                            key={action.key}
                            className={action.active ? activeItemClassName : undefined}
                            disabled={action.disabled}
                            icon={action.icon}
                            onClick={() => onAction(action.key)}
                        >
                            {sResolveLabel(action)}
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
    const titleRenameClosingRef = useRef(false);
    const sHasPanelRange = isValidTimeRange(runtimeState.panelRange);
    const sTimeText = formatPanelTimeText(runtimeState);
    const sIntervalText = formatIntervalText(runtimeState);
    const sTimeSummaryText =
        sTimeText && sIntervalText
            ? `${sTimeText} (interval: ${sIntervalText})`
            : sTimeText;
    const sActions = buildPanelActions(runtimeState, {
        showExportCsv: getExperiment(),
    });
    const {
        direct: sDirectActions,
        extra: sExtraActions,
        more: sMoreActions,
    } = partitionPanelActions(sActions);
    const sOverlapLabel = runtimeState.isOverlapSelected
        ? 'Remove from overlap chart'
        : 'Add to overlap chart';
    const sOverlapBoxClassName = joinClassNames(
        'panel-header__overlap-box',
        runtimeState.isOverlapSelected && 'panel-header__overlap-box--active',
    );

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
        titleRenameClosingRef.current = false;
        setTitleDraft(runtimeState.title);
        setIsRenamingTitle(true);
    }

    function applyTitleRename(): void {
        if (titleRenameClosingRef.current) return;
        titleRenameClosingRef.current = true;
        const sNextTitle = titleDraft.trim();
        setIsRenamingTitle(false);
        if (sNextTitle.length === 0 || sNextTitle === runtimeState.title) {
            setTitleDraft(runtimeState.title);
            return;
        }
        onRenamePanelTitle(sNextTitle);
    }

    function cancelTitleRename(): void {
        if (titleRenameClosingRef.current) return;
        titleRenameClosingRef.current = true;
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
                    aria-pressed={runtimeState.isOverlapSelected}
                    onClick={onToggleOverlap}
                >
                    {runtimeState.isOverlapSelected && <Check size={11} />}
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
                {sDirectActions.map((action) => (
                    <PanelHeaderActionButton
                        key={action.key}
                        action={action}
                        onAction={onAction}
                    />
                ))}
                <PanelHeaderMenu
                    actions={sExtraActions}
                    onAction={onAction}
                    containerClassName="panel-header__extra"
                    activeContainerClassName="panel-header__extra--active"
                    activeItemClassName="panel-header__extra-item--active"
                    triggerAriaLabel="Extra panel actions"
                    triggerIcon={<CiCircleMore size={15} />}
                    triggerLabel="Extra"
                    triggerIconPosition="right"
                    showActiveOnTrigger
                    getItemLabel={(action) => action.contextLabel ?? action.label}
                />
                <PanelHeaderMenu
                    actions={sMoreActions}
                    onAction={onAction}
                    containerClassName="panel-header__more"
                    activeItemClassName="selected"
                    triggerAriaLabel="More panel actions"
                    triggerIcon={<VscThreeBars size={15} />}
                    triggerToolTipContent="More"
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
                const sAction = sActions.find((action) => action.key === key);
                if (!sAction) return null;
                return (
                    <ContextMenu.Item
                        key={sAction.key}
                        onClick={() => runActionAfterClose(sAction.key)}
                        disabled={sAction.disabled}
                    >
                        {sAction.contextLabel ?? sAction.label}
                    </ContextMenu.Item>
                );
            })}
        </ContextMenu>
    );
}

export default PanelHeader;
