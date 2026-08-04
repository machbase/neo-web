import './PanelHeader.scss';
import {
    useEffect,
    useRef,
    useState,
    type KeyboardEvent,
} from 'react';
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
import type { PanelIntervalInfo } from './panelData';

export type PanelHeaderState = {
    title: string;
    mainRange: AxisRange | undefined;
    isNumericXAxis: boolean;
    intervalInfo: PanelIntervalInfo | undefined;
    actionState: PanelActionState;
    canExportCsv: boolean;
    isOverlapSelected: boolean;
};

type PanelHeaderMenuVariant = 'extra' | 'more';

const HEADER_MENU_ACTIVE_ITEM_CLASS: Record<PanelHeaderMenuVariant, string> = {
    extra: 'panel-header__extra-item--active',
    more: 'selected',
};

function getHeaderInterval(
    state: PanelHeaderState,
): { label: string; kind: 'time' | 'numeric' } | undefined {
    if (state.intervalInfo?.kind === 'time') {
        return {
            label: formatTimeInterval(state.intervalInfo.interval),
            kind: 'time',
        };
    }
    if (state.intervalInfo?.kind !== 'numeric') return undefined;

    const label = formatNumericInterval(state.intervalInfo.bucketWidth);
    return label ? { label, kind: 'numeric' } : undefined;
}

function joinClassNames(
    ...names: Array<string | false | undefined | null>
): string {
    return names.filter(Boolean).join(' ');
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
    const sFormattedRange = state.mainRange &&
        formatAxisRange(state.mainRange, state.isNumericXAxis);
    const sInterval = getHeaderInterval(state);
    const sTimeText = sFormattedRange
        ? `${sFormattedRange.start} ~ ${sFormattedRange.end}`
        : '';
    const sRangeLabel = sFormattedRange && state.isNumericXAxis
        ? 'Set current visible main chart value range'
        : 'Set current visible main chart range';
    const sIntervalText = sInterval?.label ?? '';
    const sTimeSummaryText =
        sTimeText && sIntervalText
            ? `${sTimeText} (${sInterval?.kind === 'numeric' ? 'numeric interval' : 'interval'}: ${sIntervalText})`
            : sTimeText;
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
                    <span className="panel-header__interval">
                        {` (interval: ${sIntervalText})`}
                    </span>
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
