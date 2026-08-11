import './PanelChrome.scss';
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
    MdCenterFocusStrong,
    PiHighlighterLight,
    PiSelectionPlusBold,
    Refresh,
    TbTimezone,
    VscChevronLeft,
    VscChevronRight,
    VscNote,
    VscThreeBars,
} from '@/assets/icons/Icon';
import ZoomInTwo from '@/assets/image/btn_zoom in x2@3x.png';
import ZoomInFour from '@/assets/image/btn_zoom in x4@3x.png';
import ZoomOutTwo from '@/assets/image/btn_zoom out x2@3x.png';
import ZoomOutFour from '@/assets/image/btn_zoom out x4@3x.png';
import { Button, ContextMenu, Menu, type ContextMenuPosition } from '@/design-system/components';
import { useExperiment } from '@/hooks/useExperiment';
import {
    getChartLayoutMetrics,
    PANEL_NAVIGATOR_GRID_SIDE,
} from '../../chart/chartGeometry';
import { formatAxisRange } from '../../format/axisFormat';
import type { AxisRange } from '../../range/rangeModel';
import type { RangeButtonAction } from '../../range/rangeResolver';

export const PanelActionKey = {
    TOGGLE_RAW: 'TOGGLE_RAW',
    TOGGLE_HIGHLIGHT: 'TOGGLE_HIGHLIGHT',
    TOGGLE_ANNOTATION: 'TOGGLE_ANNOTATION',
    TOGGLE_DRAG_SELECT: 'TOGGLE_DRAG_SELECT',
    SET_GLOBAL_RANGE: 'SET_GLOBAL_RANGE',
    REFRESH_DATA: 'REFRESH_DATA',
    REFRESH_RANGE: 'REFRESH_RANGE',
    EXPAND_FULL_RANGE: 'EXPAND_FULL_RANGE',
    TOGGLE_EDIT: 'TOGGLE_EDIT',
    OPEN_EXPORT_CSV: 'OPEN_EXPORT_CSV',
    OPEN_DELETE_CONFIRM: 'OPEN_DELETE_CONFIRM',
} as const;

export type PanelActionKey =
    (typeof PanelActionKey)[keyof typeof PanelActionKey];

type PanelActionState = {
    active: readonly PanelActionKey[];
    disabled: readonly PanelActionKey[];
};

type PanelHeaderState = {
    title: string;
    range:
        | { label: string; actionLabel: string }
        | undefined;
    resolution:
        | { label: string; kind: 'time' | 'numeric' }
        | undefined;
    seriesRollupStatusList: Array<{
        seriesName: string;
        usesRollup: boolean;
    }>;
    actionState: PanelActionState;
    canExportCsv: boolean;
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
    actionState: PanelActionState,
    includeExportCsv = false,
): PanelActionDescriptor[] {
    const isActive = (key: PanelActionKey): boolean =>
        actionState.active.includes(key);
    const isDisabled = (key: PanelActionKey): boolean =>
        actionState.disabled.includes(key);
    const sActions: PanelActionDescriptor[] = [
        {
            key: PanelActionKey.TOGGLE_RAW,
            label: isActive(PanelActionKey.TOGGLE_RAW)
                ? 'Disable raw data mode'
                : 'Enable raw data mode',
            icon: <span className="panel-header__raw-label">RAW</span>,
            active: isActive(PanelActionKey.TOGGLE_RAW),
            className: 'panel-header__action--raw',
            buttonStyle: { minWidth: 34, maxWidth: 34, minHeight: 22, maxHeight: 22 },
            showInContextMenu: true,
        },
        {
            key: PanelActionKey.TOGGLE_HIGHLIGHT,
            label: 'Highlight',
            tooltip: 'Drag on chart to create highlight',
            icon: <PiHighlighterLight size={16} />,
            active: isActive(PanelActionKey.TOGGLE_HIGHLIGHT),
            showInExtraMenu: true,
        },
        {
            key: PanelActionKey.TOGGLE_ANNOTATION,
            label: 'Annotation',
            tooltip: 'Click chart to create annotation',
            icon: <VscNote size={15} />,
            active: isActive(PanelActionKey.TOGGLE_ANNOTATION),
            showInExtraMenu: true,
        },
        {
            key: PanelActionKey.TOGGLE_DRAG_SELECT,
            label: 'Select data range',
            contextLabel: isActive(PanelActionKey.TOGGLE_DRAG_SELECT)
                ? 'Disable range selection'
                : 'Enable range selection',
            tooltip: 'Select data range for stats and FFT',
            icon: <PiSelectionPlusBold size={18} />,
            active: isActive(PanelActionKey.TOGGLE_DRAG_SELECT),
            buttonStyle: { minWidth: 24, maxWidth: 24, minHeight: 22, maxHeight: 22 },
            showInContextMenu: true,
        },
        {
            key: PanelActionKey.SET_GLOBAL_RANGE,
            label: 'Set global range',
            icon: <TbTimezone size={15} />,
            disabled: isDisabled(PanelActionKey.SET_GLOBAL_RANGE),
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
            key: PanelActionKey.REFRESH_RANGE,
            label: 'Refresh range',
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
            label: isActive(PanelActionKey.TOGGLE_EDIT)
                ? 'Close editor'
                : 'Open editor',
            contextLabel: isActive(PanelActionKey.TOGGLE_EDIT)
                ? 'Close editor'
                : 'Edit panel',
            icon: <GearFill size={14} />,
            active: isActive(PanelActionKey.TOGGLE_EDIT),
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

    if (includeExportCsv) {
        sActions.splice(sActions.length - 1, 0, {
            key: PanelActionKey.OPEN_EXPORT_CSV,
            label: 'Export CSV',
            icon: <Download size={16} />,
            showInExtraMenu: true,
        });
    }

    return sActions;
}

function getRollupHeaderSummary(state: PanelHeaderState) {
    if (state.seriesRollupStatusList.length === 0) {
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
    state: PanelHeaderState;
    onAction: (actionKey: PanelActionKey) => void;
    onToggleOverlap: () => void;
    onRenamePanelTitle: (title: string) => void;
    onOpenMainRangeModal: () => void;
};

export function PanelHeader(props: PanelHeaderProps) {
    const { getExperiment } = useExperiment();
    const {
        state,
        onAction,
        onToggleOverlap,
        onRenamePanelTitle,
        onOpenMainRangeModal,
    } = props;
    const [titleDraft, setTitleDraft] = useState<string | undefined>();
    const isRenamingTitle = titleDraft !== undefined;
    const titleInputRef = useRef<HTMLInputElement | null>(null);
    const titleRenameClosingRef = useRef(false);
    const sRollupTooltipId = `panel-rollup-tooltip-${useId().replace(/:/g, '')}`;
    const sTimeText = state.range?.label ?? '';
    const sRangeLabel = state.range?.actionLabel ??
        'Set current visible main chart range';
    const sIntervalText = state.resolution?.label ?? '';
    const sRollupSummary = getRollupHeaderSummary(state);
    const sTimeSummaryBaseText =
        sTimeText && sIntervalText
            ? `${sTimeText} (${state.resolution?.kind === 'numeric' ? 'numeric interval' : 'interval'}: ${sIntervalText})`
            : sTimeText;
    const sTimeSummaryText = sRollupSummary
        ? `${sTimeSummaryBaseText}, ${sRollupSummary.titleText}`
        : sTimeSummaryBaseText;
    const sActions = buildPanelActions(
        state.actionState,
        getExperiment() && state.canExportCsv,
    );
    const sExtraActions = sActions.filter((action) =>
        action.showInExtraMenu,
    );
    const sDirectActions = sActions.filter((action) =>
        !action.showInExtraMenu,
    );
    const sMoreActions = sDirectActions.filter((action) => action.showInMoreMenu);
    const sOverlapLabel = state.isOverlapSelected
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
        setTitleDraft(state.title);
    }

    function applyTitleRename(): void {
        if (titleRenameClosingRef.current || titleDraft === undefined) return;
        titleRenameClosingRef.current = true;
        const sNextTitle = titleDraft.trim();
        setTitleDraft(undefined);
        if (sNextTitle.length === 0 || sNextTitle === state.title) {
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
                        state.isOverlapSelected && 'panel-header__overlap-box--active',
                    )}
                    title={sOverlapLabel}
                    aria-label={sOverlapLabel}
                    aria-pressed={state.isOverlapSelected}
                    onClick={onToggleOverlap}
                >
                    {state.isOverlapSelected && <Check size={11} />}
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
                            title={state.title}
                        >
                            {state.title}
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
                        disabled={!state.range}
                        onClick={onOpenMainRangeModal}
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
                                    {state.seriesRollupStatusList.map(
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
    actionState: PanelActionState;
    position: ContextMenuPosition;
    onClose: () => void;
    onAction: (actionKey: PanelActionKey) => void;
};

export function PanelContextMenu({
    actionState,
    position,
    onClose,
    onAction,
}: PanelContextMenuProps) {
    const sActions = buildPanelActions(actionState);

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


const NAVIGATOR_BUTTON_ICON_STYLE = { width: '20px', height: '20px' };
const NAVIGATOR_RANGE_BOUNDARIES = ['start', 'end'] as const;

export function PanelFooter({
    pShowLegend,
    pNavigatorRange,
    pIsLoading,
    pOnRangeButtonPress,
    pIsNumericXAxis,
    pOnOpenNavigatorRangeModal,
}: {
    pShowLegend: boolean;
    pNavigatorRange: AxisRange | undefined;
    pIsLoading: boolean;
    pOnRangeButtonPress: (action: RangeButtonAction) => void;
    pIsNumericXAxis: boolean;
    pOnOpenNavigatorRangeModal: () => void;
}) {
    const sLayout = getChartLayoutMetrics(pShowLegend);
    const sNavigatorSide = `${PANEL_NAVIGATOR_GRID_SIDE}px`;
    const sRangeUnavailable = pIsLoading || !pNavigatorRange;
    const sFormattedNavigatorRange = pNavigatorRange
        ? formatAxisRange(pNavigatorRange, pIsNumericXAxis)
        : { start: '', end: '' };
    const navigatorControls = [
        { key: 'zoomIn4', tooltip: 'Zoom in', icon: <img alt="" src={ZoomInFour} style={NAVIGATOR_BUTTON_ICON_STYLE} />, action: () => pOnRangeButtonPress('zoom-in-large') },
        { key: 'zoomIn2', tooltip: 'Zoom in', icon: <img alt="" src={ZoomInTwo} style={NAVIGATOR_BUTTON_ICON_STYLE} />, action: () => pOnRangeButtonPress('zoom-in-small') },
        { key: 'focus', tooltip: 'Focus', icon: <MdCenterFocusStrong style={NAVIGATOR_BUTTON_ICON_STYLE} />, action: () => pOnRangeButtonPress('focus') },
        { key: 'zoomOut2', tooltip: 'Zoom out', icon: <img alt="" src={ZoomOutTwo} style={NAVIGATOR_BUTTON_ICON_STYLE} />, action: () => pOnRangeButtonPress('zoom-out-small') },
        { key: 'zoomOut4', tooltip: 'Zoom out', icon: <img alt="" src={ZoomOutFour} style={NAVIGATOR_BUTTON_ICON_STYLE} />, action: () => pOnRangeButtonPress('zoom-out-large') },
    ];

    return (
        <div className={`footer-form${pIsLoading ? ' is-loading' : ''}`}>
            {pIsLoading && (
                <span className="navigator-loading-indicator">
                    Loading navigator...
                </span>
            )}
            <div style={{ top: `${sLayout.toolbarTop}px` }} className="toolbar-controls">
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
                            disabled={sRangeUnavailable}
                            onClick={control.action}
                        />
                    ))}
                </Button.Group>
            </div>
            <div
                style={{
                    top: `${sLayout.sliderTop + 1}px`,
                    left: sNavigatorSide,
                    right: sNavigatorSide,
                }}
                className="navigator-shift-controls"
            >
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent="Move navigator backward"
                    icon={<VscChevronLeft size={16} />}
                    disabled={sRangeUnavailable}
                    onClick={() => pOnRangeButtonPress('shift-navigator-left')}
                />
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent="Move navigator forward"
                    icon={<VscChevronRight size={16} />}
                    disabled={sRangeUnavailable}
                    onClick={() => pOnRangeButtonPress('shift-navigator-right')}
                />
            </div>
            <div style={{ top: `${sLayout.sliderTop + sLayout.sliderHeight + 4}px` }} className="range-labels">
                {NAVIGATOR_RANGE_BOUNDARIES.map((boundary) => (
                    <button
                        key={boundary}
                        type="button"
                        className="range-label"
                        title="Set current navigator range"
                        disabled={sRangeUnavailable}
                        onClick={pOnOpenNavigatorRangeModal}
                    >
                        {sFormattedNavigatorRange[boundary]}
                    </button>
                ))}
            </div>
        </div>
    );
}
