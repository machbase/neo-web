import './PanelHeader.scss';
import {
    useEffect,
    useId,
    useRef,
    useState,
    type CSSProperties,
    type KeyboardEvent,
    type ReactNode,
} from 'react';
import { Tooltip } from 'react-tooltip';
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
import { Button, ContextMenu, Menu, type ContextMenuPosition } from '@/design-system/components';
import { useExperiment } from '@/hooks/useExperiment';
import type { IntervalOption } from '../range/intervalResolver';
import type { AxisRange } from '../range/rangeModel';
import { formatAxisRange } from '../format/axisFormat';
import { formatNumericInterval } from '../format/numericFormat';
import { formatTimeInterval } from '../format/timeFormat';
import { PanelOverlayMode } from './panelInteraction';

export const PanelActionKey = {
    TOGGLE_RAW: 'TOGGLE_RAW',
    TOGGLE_HIGHLIGHT: 'TOGGLE_HIGHLIGHT',
    TOGGLE_ANNOTATION: 'TOGGLE_ANNOTATION',
    TOGGLE_DRAG_SELECT: 'TOGGLE_DRAG_SELECT',
    SET_GLOBAL_TIME: 'SET_GLOBAL_TIME',
    REFRESH_DATA: 'REFRESH_DATA',
    REFRESH_TIME: 'REFRESH_TIME',
    EXPAND_FULL_RANGE: 'EXPAND_FULL_RANGE',
    TOGGLE_EDIT: 'TOGGLE_EDIT',
    OPEN_EXPORT_CSV: 'OPEN_EXPORT_CSV',
    OPEN_DELETE_CONFIRM: 'OPEN_DELETE_CONFIRM',
} as const;

export type PanelActionKey =
    (typeof PanelActionKey)[keyof typeof PanelActionKey];

type PanelHeaderRuntimeState = {
    title: string;
    mainRange: AxisRange | undefined;
    resolvedIntervalOption: IntervalOption | undefined;
    resolvedNumericInterval: number | undefined;
    seriesRollupStatusList: Array<{
        seriesName: string;
        usesRollup: boolean;
    }>;
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
    active?: boolean;
    disabled?: boolean;
    className?: string;
    buttonStyle?: CSSProperties;
    contextLabel?: string;
    showInMoreMenu?: boolean;
    showInExtraMenu?: boolean;
    showInContextMenu?: boolean;
};

function joinClassNames(
    ...names: Array<string | false | undefined | null>
): string {
    return names.filter(Boolean).join(' ');
}

function buildPanelActions(
    state: PanelHeaderRuntimeState,
    showExportCsv = false,
): PanelActionDescriptor[] {
    const sActions: PanelActionDescriptor[] = [
        {
            key: PanelActionKey.TOGGLE_RAW,
            label: state.isRaw
                ? 'Disable raw data mode'
                : 'Enable raw data mode',
            icon: <span className="panel-header__raw-label">RAW</span>,
            active: state.isRaw,
            className: 'panel-header__action--raw',
            buttonStyle: { minWidth: 34, maxWidth: 34, minHeight: 22, maxHeight: 22 },
            showInContextMenu: true,
        },
        {
            key: PanelActionKey.TOGGLE_HIGHLIGHT,
            label: 'Highlight',
            tooltip: 'Drag on chart to create highlight',
            icon: <PiHighlighterLight size={16} />,
            active: state.overlayMode === PanelOverlayMode.HIGHLIGHT,
            showInExtraMenu: true,
        },
        {
            key: PanelActionKey.TOGGLE_ANNOTATION,
            label: 'Annotation',
            tooltip: 'Click chart to create annotation',
            icon: <VscNote size={15} />,
            active: state.overlayMode === PanelOverlayMode.ANNOTATION,
            showInExtraMenu: true,
        },
        {
            key: PanelActionKey.TOGGLE_DRAG_SELECT,
            label: 'Select data range',
            contextLabel: state.overlayMode === PanelOverlayMode.DRAG_SELECT
                ? 'Disable range selection'
                : 'Enable range selection',
            tooltip: 'Select data range for stats and FFT',
            icon: <PiSelectionPlusBold size={18} />,
            active: state.overlayMode === PanelOverlayMode.DRAG_SELECT,
            buttonStyle: { minWidth: 24, maxWidth: 24, minHeight: 22, maxHeight: 22 },
            showInContextMenu: true,
        },
        {
            key: PanelActionKey.SET_GLOBAL_TIME,
            label: 'Set global time',
            icon: <TbTimezone size={15} />,
            disabled: !state.canSetGlobalTime,
            showInExtraMenu: true,
            showInContextMenu: true,
        },
        {
            key: PanelActionKey.REFRESH_DATA,
            label: 'Reload data',
            icon: <Refresh size={14} />,
            showInExtraMenu: true,
            showInContextMenu: true,
        },
        {
            key: PanelActionKey.REFRESH_TIME,
            label: 'Refresh time',
            icon: <LuTimerReset size={16} />,
            showInMoreMenu: true,
            showInContextMenu: true,
        },
        {
            key: PanelActionKey.EXPAND_FULL_RANGE,
            label: 'Expand to full data range',
            icon: <GoArrowBoth size={15} />,
            showInExtraMenu: true,
            showInContextMenu: true,
        },
        {
            key: PanelActionKey.TOGGLE_EDIT,
            label: state.isEditing ? 'Close editor' : 'Open editor',
            contextLabel: state.isEditing ? 'Close editor' : 'Edit panel',
            icon: <GearFill size={14} />,
            active: state.isEditing,
            showInContextMenu: true,
        },
        {
            key: PanelActionKey.OPEN_DELETE_CONFIRM,
            label: 'Delete panel',
            icon: <Delete size={16} />,
            showInMoreMenu: true,
            showInContextMenu: true,
        },
    ];

    if (showExportCsv && state.canSaveLocal) {
        sActions.splice(sActions.length - 1, 0, {
            key: PanelActionKey.OPEN_EXPORT_CSV,
            label: 'Export CSV',
            icon: <Download size={16} />,
            showInExtraMenu: true,
        });
    }

    return sActions;
}

function formatPanelTimeText(state: PanelHeaderRuntimeState): string {
    if (!state.mainRange) return '';
    const sFormattedRange = formatAxisRange(
        state.mainRange,
        state.isNumericXAxis,
    );
    return `${sFormattedRange.start} ~ ${sFormattedRange.end}`;
}

function formatIntervalText(state: PanelHeaderRuntimeState): string {
    if (state.isRaw) return '';

    return state.isNumericXAxis
        ? formatNumericInterval(state.resolvedNumericInterval)
        : state.resolvedIntervalOption
          ? formatTimeInterval(state.resolvedIntervalOption)
          : '';
}

function getRollupHeaderSummary(state: PanelHeaderRuntimeState) {
    if (state.isRaw || state.seriesRollupStatusList.length === 0) {
        return undefined;
    }

    const sRollupCount = state.seriesRollupStatusList.filter(
        (status) => status.usesRollup,
    ).length;
    const sTotalCount = state.seriesRollupStatusList.length;

    if (sRollupCount === sTotalCount) {
        return { shortText: 'rollup', titleText: 'all series use rollup' };
    }

    if (sRollupCount === 0) {
        return { shortText: 'no rollup', titleText: 'no series use rollup' };
    }

    return {
        shortText: `rollup ${sRollupCount}/${sTotalCount}`,
        titleText: `${sRollupCount}/${sTotalCount} series use rollup`,
    };
}

function PanelHeaderMenu({
    variant,
    actions,
    onAction,
}: {
    variant: 'extra' | 'more';
    actions: PanelActionDescriptor[];
    onAction: (actionKey: PanelActionKey) => void;
}) {
    const sIsExtra = variant === 'extra';
    const sIsActive = sIsExtra &&
        actions.some((action) => action.active === true);
    return (
        <span
            className={joinClassNames(
                sIsExtra ? 'panel-header__extra' : 'panel-header__more',
                sIsActive && 'panel-header__extra--active',
            )}
        >
            <Menu.Root>
                <Menu.Trigger>
                    <Button
                        aria-label={`${sIsExtra ? 'Extra' : 'More'} panel actions`}
                        size="xsm"
                        variant="ghost"
                        isToolTip={!sIsExtra}
                        toolTipContent={sIsExtra ? undefined : 'More'}
                        active={sIsExtra ? sIsActive : undefined}
                        icon={sIsExtra
                            ? <CiCircleMore size={15} />
                            : <VscThreeBars size={15} />}
                        iconPosition={sIsExtra ? 'right' : undefined}
                    >
                        {sIsExtra ? 'Extra' : undefined}
                    </Button>
                </Menu.Trigger>
                <Menu.Content align="right">
                    {actions.map((action) => (
                        <Menu.Item
                            key={action.key}
                            className={action.active
                                ? sIsExtra
                                    ? 'panel-header__extra-item--active'
                                    : 'selected'
                                : undefined}
                            disabled={action.disabled}
                            icon={action.icon}
                            onClick={() => onAction(action.key)}
                        >
                            {sIsExtra
                                ? action.contextLabel ?? action.label
                                : action.label}
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

function PanelHeader(props: PanelHeaderProps) {
    const { getExperiment } = useExperiment();
    const {
        runtimeState,
        onAction,
        onToggleOverlap,
        onRenamePanelTitle,
        onOpenTimeRangeModal,
    } = props;
    const [titleDraft, setTitleDraft] = useState<string | undefined>();
    const isRenamingTitle = titleDraft !== undefined;
    const titleInputRef = useRef<HTMLInputElement | null>(null);
    const titleRenameClosingRef = useRef(false);
    const sRollupTooltipId = `panel-rollup-tooltip-${useId().replace(/:/g, '')}`;
    const sTimeText = formatPanelTimeText(runtimeState);
    const sRangeLabel = runtimeState.isNumericXAxis
        ? 'Set current visible main chart value range'
        : 'Set current visible main chart range';
    const sIntervalText = formatIntervalText(runtimeState);
    const sRollupSummary = getRollupHeaderSummary(runtimeState);
    const sTimeSummaryBaseText =
        sTimeText && sIntervalText
            ? `${sTimeText} (${runtimeState.isNumericXAxis ? 'numeric interval' : 'interval'}: ${sIntervalText})`
            : sTimeText;
    const sTimeSummaryText = sRollupSummary
        ? `${sTimeSummaryBaseText}, ${sRollupSummary.titleText}`
        : sTimeSummaryBaseText;
    const sActions = buildPanelActions(runtimeState, getExperiment());
    const sExtraActions = sActions.filter((action) =>
        action.showInExtraMenu,
    );
    const sDirectActions = sActions.filter((action) =>
        !action.showInExtraMenu,
    );
    const sMoreActions = sDirectActions.filter((action) => action.showInMoreMenu);
    const sOverlapLabel = runtimeState.isOverlapSelected
        ? 'Remove from overlap chart'
        : 'Add to overlap chart';

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
    }

    function applyTitleRename(): void {
        if (titleRenameClosingRef.current || titleDraft === undefined) return;
        titleRenameClosingRef.current = true;
        const sNextTitle = titleDraft.trim();
        setTitleDraft(undefined);
        if (sNextTitle.length === 0 || sNextTitle === runtimeState.title) {
            return;
        }
        onRenamePanelTitle(sNextTitle);
    }

    function cancelTitleRename(): void {
        if (titleRenameClosingRef.current) return;
        titleRenameClosingRef.current = true;
        setTitleDraft(undefined);
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
                    className={joinClassNames(
                        'panel-header__overlap-box',
                        runtimeState.isOverlapSelected && 'panel-header__overlap-box--active',
                    )}
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
                        title={sRangeLabel}
                        aria-label={sRangeLabel}
                        disabled={!runtimeState.mainRange}
                        onClick={onOpenTimeRangeModal}
                    >
                        {sTimeText}
                    </button>
                </span>
                {sIntervalText && (
                    <>
                        <span className="panel-header__interval">
                            {` (interval: ${sIntervalText}`}
                            {sRollupSummary !== undefined && (
                                <span
                                    className="panel-header__rollup-status"
                                    data-tooltip-id={sRollupTooltipId}
                                >
                                    {` · ${sRollupSummary.shortText}`}
                                </span>
                            )}
                            {`)`}
                        </span>
                        {sRollupSummary !== undefined && (
                            <Tooltip
                                id={sRollupTooltipId}
                                place="bottom"
                                positionStrategy="fixed"
                                delayShow={250}
                                className="panel-header__rollup-tooltip"
                            >
                                <div className="panel-header__rollup-tooltip-content">
                                    {runtimeState.seriesRollupStatusList.map(
                                        (status, index) => (
                                            <div
                                                key={`${status.seriesName}-${index}`}
                                                className="panel-header__rollup-tooltip-row"
                                            >
                                                <span className="panel-header__rollup-tooltip-name">
                                                    {status.seriesName}
                                                </span>
                                                <span
                                                    className={joinClassNames(
                                                        'panel-header__rollup-tooltip-state',
                                                        status.usesRollup &&
                                                            'panel-header__rollup-tooltip-state--active',
                                                    )}
                                                >
                                                    {status.usesRollup
                                                        ? 'rollup'
                                                        : 'no rollup'}
                                                </span>
                                            </div>
                                        ),
                                    )}
                                </div>
                            </Tooltip>
                        )}
                    </>
                )}
            </div>
            <div className="panel-header__actions">
                {sDirectActions.map((action) => (
                    <span
                        key={action.key}
                        className={joinClassNames(
                            'panel-header__action',
                            action.showInMoreMenu && 'panel-header__action--overflow',
                            action.className,
                            action.active && 'panel-header__action--active',
                        )}
                    >
                        <Button
                            aria-label={action.label}
                            aria-pressed={action.active}
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
                ))}
                <PanelHeaderMenu
                    variant="extra"
                    actions={sExtraActions}
                    onAction={onAction}
                />
                <PanelHeaderMenu
                    variant="more"
                    actions={sMoreActions}
                    onAction={onAction}
                />
            </div>
        </div>
    );
}

type PanelContextMenuProps = {
    runtimeState: PanelHeaderRuntimeState;
    position: ContextMenuPosition;
    onClose: () => void;
    onAction: (actionKey: PanelActionKey) => void;
};

export function PanelContextMenu({
    runtimeState,
    position,
    onClose,
    onAction,
}: PanelContextMenuProps) {
    const sActions = buildPanelActions(runtimeState);

    return (
        <ContextMenu isOpen position={position} onClose={onClose}>
            {sActions
                .filter((action) => action.showInContextMenu)
                .map((sAction) => (
                    <ContextMenu.Item
                        key={sAction.key}
                        onClick={() => {
                            onClose();
                            onAction(sAction.key);
                        }}
                        disabled={sAction.disabled}
                    >
                        {sAction.contextLabel ?? sAction.label}
                    </ContextMenu.Item>
                ))}
        </ContextMenu>
    );
}

export default PanelHeader;
