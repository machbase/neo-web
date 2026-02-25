import { VscChevronRight } from 'react-icons/vsc';
import styles from './index.module.scss';
import { SplitPane, Pane } from '../SplitPane';
import { Children, isValidElement, useState, useMemo, useEffect } from 'react';
import { Tooltip } from 'react-tooltip';
import { Button } from '../Button';

export interface SideWrapperProps {
    pServer?: any;
    children: React.ReactNode;
}

export interface SideVersionProps {
    pServer?: any;
}

export interface SideContainerProps {
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

const SideWrapper = ({ pServer, children }: SideWrapperProps) => {
    return (
        <div className={styles.sideWrapper}>
            <SideVersion pServer={pServer} />
            {children}
        </div>
    );
};

const SideVersion = ({ pServer }: SideVersionProps) => {
    return (
        <div className={styles.sideVersion}>
            <span>Machbase-neo {pServer && pServer.version}</span>
        </div>
    );
};

const SideContainer = ({ children, style, splitSizes, onSplitChange, defaultSplitSizes }: SideContainerProps) => {
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
            <div className={styles.sideContainer} style={{ ...style }}>
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
        <div className={styles.sideContainer} style={{ ...style }}>
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
    return <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>;
};

const SideItem = ({ children, onClick, onContextMenu, onMouseEnter, onMouseLeave, active, className, paddingLeft, style, tooltip, tooltipPlace = 'top-end' }: SideItemProps) => {
    const customStyle = paddingLeft !== undefined ? { ...style, paddingLeft: `${paddingLeft}px` } : style;

    // Only generate tooltipId once when component mounts
    const tooltipId = useMemo(() => {
        return tooltip ? `side-item-tooltip-${Math.random().toString(36).substring(2, 9)}` : undefined;
    }, [tooltip]);

    if (!tooltip) {
        return (
            <div
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

const SideItemText = ({ children, copyable, onCopy, showCopyAlways = false, tooltip, tooltipPlace = 'top' }: SideItemTextProps) => {
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
                <Button.Copy size="side" variant="ghost" onClick={onCopy} />
            </div>

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

export const Side = {
    Root: SideWrapper,
    Container: SideContainer,
    Title: SideTitle,
    Collapse: SideCollapse,
    Box: SideBox,
    List: SideList,
    Section: SideSection,
    Item: SideItem,
    ItemContent: SideItemContent,
    ItemIcon: SideItemIcon,
    ItemText: SideItemText,
    ItemAction: SideItemAction,
    ItemArrow: SideItemArrow,
    Btn: SideButton,
};
