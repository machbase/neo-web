import './PanelHeader.scss';
import {
    useEffect,
    useId,
    useRef,
    useState,
    type KeyboardEvent,
} from 'react';
import { Tooltip } from 'react-tooltip';
import {
    Check,
    CiCircleMore,
    VscThreeBars,
} from '@/assets/icons/Icon';
import { Button, Menu } from '@/design-system/components';
import { useExperiment } from '@/hooks/useExperiment';
import { formatAxisRange } from '../../format/axisFormat';
import { formatNumericInterval } from '../../format/numericFormat';
import { formatTimeInterval } from '../../format/timeFormat';
import type { AxisRange } from '../../range/rangeModel';
import {
    buildPanelActions,
    type PanelActionDescriptor,
    type PanelActionKey,
    type PanelActionState,
} from './panelActions';
import type { PanelQueryResolution } from './panelData';

type PanelSeriesRollupStatusList = Array<{
    seriesName: string;
    usesRollup: boolean;
}>;

export type PanelHeaderState = {
    title: string;
    mainRange: AxisRange | undefined;
    isNumericXAxis: boolean;
    isRaw: boolean;
    resolution: PanelQueryResolution | undefined;
    seriesRollupStatusList: PanelSeriesRollupStatusList;
    actionState: PanelActionState;
    canExportCsv: boolean;
    isOverlapSelected: boolean;
};

type PanelHeaderMenuVariant = 'extra' | 'more';

const HEADER_MENU_ACTIVE_ITEM_CLASS: Record<PanelHeaderMenuVariant, string> = {
    extra: 'panel-header__extra-item--active',
    more: 'selected',
};

function getHeaderResolution(
    state: PanelHeaderState,
): { label: string; kind: 'time' | 'numeric' } | undefined {
    const resolution = state.isRaw ? undefined : state.resolution;
    if (resolution?.kind === 'time') {
        return { label: formatTimeInterval(resolution.interval), kind: 'time' };
    }
    if (resolution?.kind !== 'numeric') return undefined;

    const label = formatNumericInterval(resolution.bucketWidth);
    return label ? { label, kind: 'numeric' } : undefined;
}

function joinClassNames(
    ...names: Array<string | false | undefined | null>
): string {
    return names.filter(Boolean).join(' ');
}

function getRollupHeaderSummary(statusList: PanelSeriesRollupStatusList) {
    const sTotalCount = statusList.length;
    if (sTotalCount === 0) return undefined;

    const sRollupCount = statusList.filter((status) => status.usesRollup).length;
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
    variant: PanelHeaderMenuVariant;
    actions: PanelActionDescriptor[];
    onAction: (actionKey: PanelActionKey) => void;
}) {
    const sIsExtra = variant === 'extra';
    const sIsActive = sIsExtra && actions.some((action) => action.active === true);
    return (
        <span
            data-testid={`${variant}-actions`}
            className={joinClassNames(
                `panel-header__${variant}`,
                sIsActive && 'panel-header__extra--active',
            )}
        >
            <Menu.Root>
                <Menu.Trigger>
                    <Button
                        data-testid={`${variant}-actions-trigger`}
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
                                ? HEADER_MENU_ACTIVE_ITEM_CLASS[variant]
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
    const sFormattedRange = state.mainRange &&
        formatAxisRange(state.mainRange, state.isNumericXAxis);
    const sResolution = getHeaderResolution(state);
    const sSeriesRollupStatusList = state.isRaw
        ? []
        : state.seriesRollupStatusList;
    const sTimeText = sFormattedRange
        ? `${sFormattedRange.start} ~ ${sFormattedRange.end}`
        : '';
    const sRangeLabel = sFormattedRange && state.isNumericXAxis
        ? 'Set current visible main chart value range'
        : 'Set current visible main chart range';
    const sIntervalText = sResolution?.label ?? '';
    const sRollupSummary = getRollupHeaderSummary(sSeriesRollupStatusList);
    const sTimeSummaryBaseText =
        sTimeText && sIntervalText
            ? `${sTimeText} (${sResolution?.kind === 'numeric' ? 'numeric interval' : 'interval'}: ${sIntervalText})`
            : sTimeText;
    const sTimeSummaryText = sRollupSummary
        ? `${sTimeSummaryBaseText}, ${sRollupSummary.titleText}`
        : sTimeSummaryBaseText;
    const sActions = buildPanelActions(
        state.actionState,
        getExperiment() && state.canExportCsv,
    );
    const sExtraActions = sActions.filter((action) => action.showInExtraMenu);
    const sDirectActions = sActions.filter((action) => !action.showInExtraMenu);
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

    /** Closes the rename input, applying `nextTitle` when it is a real change. */
    function closeTitleRename(nextTitle: string | undefined): void {
        if (titleRenameClosingRef.current) return;
        titleRenameClosingRef.current = true;
        setTitleDraft(undefined);
        const sNextTitle = nextTitle?.trim();
        if (sNextTitle && sNextTitle !== state.title) {
            onRenamePanelTitle(sNextTitle);
        }
    }

    function handleTitleRenameKeyDown(
        event: KeyboardEvent<HTMLInputElement>,
    ): void {
        if (event.key !== 'Enter' && event.key !== 'Escape') return;
        event.preventDefault();
        closeTitleRename(event.key === 'Enter' ? titleDraft : undefined);
    }

    return (
        <div
            className="panel-header"
            data-testid="header"
        >
            <div className="panel-header__title-group">
                <button
                    data-testid="overlap-toggle"
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
                        data-testid="title-input"
                        ref={titleInputRef}
                        className="panel-header__title-input"
                        value={titleDraft}
                        aria-label="Chart title"
                        onChange={(event) => setTitleDraft(event.target.value)}
                        onBlur={() => closeTitleRename(titleDraft)}
                        onKeyDown={handleTitleRenameKeyDown}
                    />
                ) : (
                    <button
                        data-testid="title-button"
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
                        data-testid="main-range-button"
                        type="button"
                        className="panel-header__time-button panel-header__time-range-button"
                        title={sRangeLabel}
                        aria-label={sRangeLabel}
                        disabled={!sFormattedRange}
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
                                    {sSeriesRollupStatusList.map((status, index) => (
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
                                                {status.usesRollup ? 'rollup' : 'no rollup'}
                                            </span>
                                        </div>
                                    ))}
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
                            data-testid={`action-${action.key.toLowerCase().replaceAll('_', '-')}`}
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
