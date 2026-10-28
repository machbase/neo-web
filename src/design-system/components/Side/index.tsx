import { VscChevronRight, VscWarning } from 'react-icons/vsc';
import moment from 'moment';
import styles from './index.module.scss';
import { SplitPane, Pane } from '../SplitPane';
import { Children, isValidElement, useState, useMemo, useEffect } from 'react';
import { Tooltip } from 'react-tooltip';
import { Button } from '../Button';
import { NEO_RELEASES_URL, type NeoUpdateStatus } from '@/api/repository/neoUpdate';

export interface SideWrapperProps {
    pServer?: any;
    pNeoUpdateStatus?: NeoUpdateStatus;
    children: React.ReactNode;
}

export interface SideVersionProps {
    pServer?: any;
    pNeoUpdateStatus?: NeoUpdateStatus;
}

export interface SideContainerProps {
    'data-testid'?: string;
    children: React.ReactNode;
    style?: React.CSSProperties;
    splitSizes?: number[];
    onSplitChange?: (sizes: number[]) => void;
    defaultSplitSizes?: number[];
}

export interface SideTitleProps {
    children: React.ReactNode;
    style?: React.CSSProperties;
    onClick?: (e: React.MouseEvent) => void;
}

export interface SideCollapseProps {
    children: React.ReactNode;
    pCollapseState: boolean;
    pCallback: (e: React.MouseEvent) => void;
}

export interface SideBoxProps {
    children: React.ReactNode;
    pCollapseState?: boolean;
}

export interface SideListProps {
    children: React.ReactNode;
}

export interface SideItemProps {
    'data-testid'?: string;
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
    onContextMenu?: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    active?: boolean;
    className?: string;
    paddingLeft?: number;
    style?: React.CSSProperties;
    tooltip?: string;
    tooltipPlace?: 'top' | 'top-start' | 'top-end' | 'right' | 'right-start' | 'right-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'left-start' | 'left-end';
}

export interface SideItemContentProps {
    children: React.ReactNode;
    style?: React.CSSProperties;
}

export interface SideItemIconProps {
    children: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
}

export interface SideItemTextProps {
    children: React.ReactNode;
    copyable?: boolean;
    onCopy?: () => void;
    showCopyAlways?: boolean;
    tooltip?: string;
    tooltipPlace?: 'top' | 'top-start' | 'top-end' | 'right' | 'right-start' | 'right-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'left-start' | 'left-end';
    actionSlot?: React.ReactNode;
    copyTooltip?: string;
}

export interface SideItemActionProps {
    children: React.ReactNode;
}

export interface SideItemArrowProps {
    isOpen: boolean;
    className?: string;
}

export interface SideButtonProps {
    icon: React.ReactElement;
}

export interface SideSectionProps {
    children: React.ReactNode;
}

const SideWrapper = ({ pServer, pNeoUpdateStatus, children }: SideWrapperProps) => {
    return (
        <div className={styles.sideWrapper}>
            <SideVersion pServer={pServer} pNeoUpdateStatus={pNeoUpdateStatus} />
            {children}
        </div>
    );
};

const DownloadGlyph = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3v12" />
        <path d="m7 11 5 5 5-5" />
        <path d="M5 21h14" />
    </svg>
);

const CheckGlyph = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
    </svg>
);

const SideVersion = ({ pServer, pNeoUpdateStatus }: SideVersionProps) => {
    const latestVersion = pNeoUpdateStatus?.latestVersion;
    const showLatest = pNeoUpdateStatus?.state === 'latest';
    const showUpdate = pNeoUpdateStatus?.state === 'update-available' && latestVersion;

    const handleClick = () => {
        window.open(NEO_RELEASES_URL, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className={styles.sideVersion}>
            <button type="button" className={styles.sideVersionButton} onClick={handleClick}>
                <span className={styles.sideVersionText}>
                    Machbase-neo{pServer && pServer.version ? <span className={styles.sideVersionNum}> {pServer.version}</span> : null}
                </span>
                {showLatest && (
                    <span className={styles.sideVersionLatest}>
                        <CheckGlyph />
                        latest
                    </span>
                )}
                {showUpdate && (
                    <span className={styles.sideVersionUpdate}>
                        <DownloadGlyph />
                        <span className={styles.sideVersionNum}>{latestVersion}</span>
                    </span>
                )}
            </button>
        </div>
    );
};

const SideContainer = ({ 'data-testid': testId, children, style, splitSizes, onSplitChange, defaultSplitSizes }: SideContainerProps) => {
    // Only count direct Side.Section children
    const sections = Children.toArray(children).filter((child) => {
        return isValidElement(child) && (child.type as any) === SideSection;
    });

    const sectionsCount = sections.length;
    const hasSplitPane = sectionsCount >= 2;

    // Memoize initial sizes calculation
    const initialSizes = useMemo(() => {
        if (defaultSplitSizes && defaultSplitSizes.length === sectionsCount) {
            return defaultSplitSizes;
        }
        return Array(sectionsCount).fill(100 / sectionsCount);
    }, [sectionsCount, defaultSplitSizes]);

    const [sizes, setSizes] = useState(initialSizes);

    // Update sizes when sections count or defaultSplitSizes changes
    useEffect(() => {
        if (!splitSizes) {
            setSizes(initialSizes);
        }
    }, [initialSizes, splitSizes]);

    const handleSizeChange = (newSizes: number[]) => {
        setSizes(newSizes);
        onSplitChange?.(newSizes);
    };

    if (hasSplitPane) {
        return (
            <div data-testid={testId} className={styles.sideContainer} style={{ ...style }}>
                <SplitPane className="split-body" sashRender={() => <></>} split="horizontal" sizes={splitSizes || sizes} onChange={handleSizeChange}>
                    {sections.map((section, idx) => (
                        <Pane key={idx} minSize={22}>
                            {section}
                        </Pane>
                    ))}
                </SplitPane>
            </div>
        );
    }

    return (
        <div data-testid={testId} className={styles.sideContainer} style={{ ...style }}>
            {children}
        </div>
    );
};

const SideTitle = ({ children, style, onClick }: SideTitleProps) => {
    return (
        <div className={styles.sideSubTitle} style={style} onClick={onClick}>
            <div className={styles.filesOpenOption}>{children}</div>
        </div>
    );
};

const SideCollapse = ({ children, pCollapseState, pCallback }: SideCollapseProps) => {
    return (
        <div className={styles.editorsTitle} onClick={pCallback}>
            <div className={`${styles.collapseIcon} ${pCollapseState ? styles.open : ''}`}>{<VscChevronRight size={16} />}</div>
            <div className={styles.filesOpenOption}>{children}</div>
        </div>
    );
};

const SideBox = ({ children, pCollapseState = true }: SideBoxProps) => {
    return <div className={styles.sideBox}>{pCollapseState && children}</div>;
};

const SideList = ({ children }: SideListProps) => {
    // Vertical only, for the same reason as `.sideContainer`: rows ellipsise rather than
    // extend, so a horizontal scrollbar here only ever exposes an overflowing header.
    return <div style={{ flex: 1, overflowX: 'hidden', overflowY: 'auto' }}>{children}</div>;
};

const SideItem = ({ 'data-testid': testId, children, onClick, onContextMenu, onMouseEnter, onMouseLeave, active, className, paddingLeft, style, tooltip, tooltipPlace = 'top-end' }: SideItemProps) => {
    const customStyle = paddingLeft !== undefined ? { ...style, paddingLeft: `${paddingLeft}px` } : style;

    // Only generate tooltipId once when component mounts
    const tooltipId = useMemo(() => {
        return tooltip ? `side-item-tooltip-${Math.random().toString(36).substring(2, 9)}` : undefined;
    }, [tooltip]);

    if (!tooltip) {
        return (
            <div
                data-testid={testId}
                className={`${styles.sideItem} ${active ? styles.active : ''} ${className || ''}`}
                onClick={onClick}
                onContextMenu={onContextMenu}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                style={customStyle}
            >
                {children}
            </div>
        );
    }

    return (
        <>
            <div
                data-testid={testId}
                className={`${styles.sideItem} ${active ? styles.active : ''} ${className || ''} tooltip-${tooltipId}`}
                onClick={onClick}
                onContextMenu={onContextMenu}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                style={customStyle}
            >
                {children}
            </div>
            <Tooltip className="tooltip-div" place={tooltipPlace} positionStrategy="absolute" anchorSelect={`.tooltip-${tooltipId}`} content={tooltip} delayShow={700} />
        </>
    );
};

const SideItemContent = ({ children, style }: SideItemContentProps) => {
    return <div className={styles.itemContent} style={style}>{children}</div>;
};

const SideItemIcon = ({ children, style, className }: SideItemIconProps) => {
    return <span className={`${styles.itemIcon} ${className || ''}`} style={style}>{children}</span>;
};

const SideItemText = ({ children, copyable, onCopy, showCopyAlways = false, tooltip, tooltipPlace = 'top', actionSlot, copyTooltip }: SideItemTextProps) => {
    const tooltipId = useMemo(() => {
        return tooltip ? `side-item-text-tooltip-${Math.random().toString(36).substring(2, 9)}` : undefined;
    }, [tooltip]);

    if (!copyable || !onCopy) {
        if (!tooltip) {
            return <span className={styles.itemText}>{children}</span>;
        }
        return (
            <>
                <span className={`${styles.itemText} tooltip-${tooltipId}`}>{children}</span>
                <Tooltip
                    className="tooltip-div"
                    place={tooltipPlace}
                    positionStrategy="fixed"
                    anchorSelect={`.tooltip-${tooltipId}`}
                    content={tooltip}
                    delayShow={700}
                    style={{ zIndex: 9999 }}
                />
            </>
        );
    }

    return (
        <div className={`${styles.itemTextWrapper} ${showCopyAlways ? styles.showAlways : ''}`}>
            <span className={`${styles.itemText} ${tooltip ? `tooltip-${tooltipId}` : ''}`}>{children}</span>
            <div className={styles.itemTextCopy}>
                <Button.Copy size="side" variant="ghost" onClick={onCopy} isToolTip={!!copyTooltip} toolTipContent={copyTooltip} />
            </div>
            {actionSlot && <div className={styles.itemTextExtraAction}>{actionSlot}</div>}

            {tooltip && (
                <Tooltip
                    className="tooltip-div"
                    place={tooltipPlace}
                    positionStrategy="fixed"
                    anchorSelect={`.tooltip-${tooltipId}`}
                    content={tooltip}
                    delayShow={700}
                    style={{ zIndex: 9999 }}
                />
            )}
        </div>
    );
};

const SideItemAction = ({ children }: SideItemActionProps) => {
    return <div className={styles.itemAction}>{children}</div>;
};

const SideItemArrow = ({ isOpen, className }: SideItemArrowProps) => {
    return (
        <div className={`${styles.itemArrow} ${isOpen ? styles.open : ''} ${className || ''}`}>
            <VscChevronRight size={16} />
        </div>
    );
};

const SideButton = ({ icon }: SideButtonProps) => {
    return <div>{icon}</div>;
};

const SideSection = ({ children }: SideSectionProps) => {
    return <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>{children}</div>;
};

export interface SideLoadErrorProps {
    'data-testid'?: string;
    /** Why the read failed — shown on the line, ellipsised, and in full on hover. */
    pReason: string;
    /** When the data still on screen was read. Set: "Not refreshed … as of HH:mm:ss"; unset: "Couldn't load". */
    pLastLoadedAt?: number;
    /** A read is in flight; Retry stays disabled until it settles. */
    pRetrying?: boolean;
    /** The panel's own refresh — the same handler as its Refresh button. */
    pOnRetry: () => void;
}

/**
 * The side panels' one way of saying "this list could not be read" (issue #1570 F-180, F-103).
 *
 * - Place it right under the header of the section whose data failed; a panel with no header
 *   puts it first.
 * - Keep whatever the panel showed before. Pass `pLastLoadedAt` when there is such data, so the
 *   line says how old it is; leave it out when nothing was ever read.
 * - Remove it when the next read succeeds, and do not raise a toast for the same failure: a
 *   toast fades and leaves a stale list that reads as current.
 *
 * One 22px line, the height of a section header, so it costs the list as little as possible.
 */
const SideLoadError = ({ 'data-testid': testId = 'side-load-error', pReason, pLastLoadedAt, pRetrying, pOnRetry }: SideLoadErrorProps) => {
    const sAsOf = pLastLoadedAt !== undefined ? moment(pLastLoadedAt).format('HH:mm:ss') : undefined;
    return (
        <div className={styles.sideLoadError} role="alert" data-testid={testId} title={sAsOf ? `${pReason}\nShowing the list read at ${sAsOf}` : pReason}>
            <VscWarning size={12} className={styles.sideLoadErrorIcon} aria-hidden />
            <span className={styles.sideLoadErrorText}>
                {sAsOf ? 'Not refreshed' : "Couldn't load"}
                <span className={styles.sideLoadErrorReason}>{` · ${pReason}`}</span>
                {sAsOf && <span className={styles.sideLoadErrorTime}>{` · as of ${sAsOf}`}</span>}
            </span>
            <button type="button" className={styles.sideLoadErrorRetry} disabled={pRetrying} onClick={pOnRetry} data-testid={`${testId}-retry`}>
                Retry
            </button>
        </div>
    );
};

export const Side = {
    Root: SideWrapper,
    Container: SideContainer,
    Title: SideTitle,
    Collapse: SideCollapse,
    Box: SideBox,
    List: SideList,
    Section: SideSection,
    LoadError: SideLoadError,
    Item: SideItem,
    ItemContent: SideItemContent,
    ItemIcon: SideItemIcon,
    ItemText: SideItemText,
    ItemAction: SideItemAction,
    ItemArrow: SideItemArrow,
    Btn: SideButton,
};
