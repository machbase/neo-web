import styles from './index.module.scss';
import { ArrowDown, Calendar, VscWarning } from '@/assets/icons/Icon';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DateCalendar, LocalizationProvider, MultiSectionDigitalClock } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import useOutsideClick from '@/hooks/useOutsideClick';
import moment from 'moment';
import { VscChevronDown, VscChevronUp, VscPass } from 'react-icons/vsc';
import { MdKeyboardArrowRight } from 'react-icons/md';
import { ClipboardCopy } from '@/utils/ClipboardCopy';
import { Loader } from '@/components/loader';
import { Button } from '../Button';
import { Checkbox as DSCheckbox } from '../Checkbox';
import { Textarea as DSTextarea } from '../Textarea';
import { Alert as DSAlert } from '../Alert';

export const Page = ({ children, pRef, style, className }: { children: React.ReactNode; pRef?: React.MutableRefObject<any>; style?: React.CSSProperties; className?: string }) => {
    return (
        <div ref={pRef} className={[styles['page-wrapper'], className].filter(Boolean).join(' ')} style={style}>
            {children}
        </div>
    );
};

const Header = ({ children }: { children?: React.ReactNode }) => {
    return <div className={styles['page-header-wrapper']}>{children}</div>;
};
const Body = React.forwardRef<
    HTMLDivElement,
    {
        children: React.ReactNode;
        pSpyder?: boolean;
        pSpyderChildren?: React.ReactNode;
        fixed?: boolean;
        fullHeight?: boolean;
        style?: React.CSSProperties;
        className?: string;
        scrollButtons?: boolean;
        footer?: boolean;
    }
>(({ children, pSpyder, pSpyderChildren, fixed = false, fullHeight = false, style, className, scrollButtons = false, footer = false }, ref) => {
    const internalRef = useRef<HTMLDivElement>(null);
    const contentRef = (ref as React.RefObject<HTMLDivElement>) || internalRef;
    const SCROLL_THRESHOLD = 100;
    const [showScrollButtons, setShowScrollButtons] = useState({
        top: false,
        bottom: false,
    });

    // Scroll event handler
    useEffect(() => {
        if (!scrollButtons) return;

        const element = contentRef.current;
        if (!element) return;

        const handleScroll = () => {
            const scrollTop = element.scrollTop;
            const scrollHeight = element.scrollHeight;
            const clientHeight = element.clientHeight;

            setShowScrollButtons({
                top: scrollTop > SCROLL_THRESHOLD,
                bottom: scrollTop + clientHeight < scrollHeight - SCROLL_THRESHOLD,
            });
        };

        element.addEventListener('scroll', handleScroll);
        handleScroll(); // Initial check

        return () => element.removeEventListener('scroll', handleScroll);
    }, [scrollButtons]);

    // Scroll handlers
    const handleScrollToTop = useCallback(() => {
        const element = contentRef.current;
        if (!element) return;
        element.scrollTop = 0;
    }, []);

    const handleScrollToBottom = useCallback(() => {
        const element = contentRef.current;
        if (!element) return;
        element.scrollTop = element.scrollHeight;
    }, []);

    // Separate Drawer components from regular children
    const drawerChildren: React.ReactNode[] = [];
    const regularChildren: React.ReactNode[] = [];

    React.Children.forEach(children, (child) => {
        if (React.isValidElement(child) && typeof child.type === 'object' && 'displayName' in child.type && (child.type as any)?.displayName === 'Drawer.Root') {
            drawerChildren.push(child);
        } else {
            regularChildren.push(child);
        }
    });

    return (
        <div className={[styles['page-body-wrapper'], fixed && styles['fixed'], fullHeight && styles['full-height'], footer && styles['exist-footer']].filter(Boolean).join(' ')}>
            {pSpyder && <ScrollSpyder>{pSpyderChildren}</ScrollSpyder>}
            <div ref={contentRef} className={[styles['page-body-content'], 'scrollbar-dark', className].filter(Boolean).join(' ')} style={style}>
                {regularChildren}
            </div>

            {/* Render Drawer components at wrapper level */}
            {drawerChildren}

            {/* Floating scroll buttons */}
            {scrollButtons && (showScrollButtons.top || showScrollButtons.bottom) && (
                <div className={styles['page-scroll-buttons']}>
                    {showScrollButtons.top && (
                        <Button
                            size="icon"
                            variant="secondary"
                            shadow
                            isToolTip
                            toolTipContent="Scroll to top"
                            toolTipPlace="left"
                            icon={<VscChevronUp size={16} />}
                            onClick={handleScrollToTop}
                            aria-label="Scroll to top"
                        />
                    )}
                    {showScrollButtons.bottom && (
                        <Button
                            size="icon"
                            variant="secondary"
                            shadow
                            isToolTip
                            toolTipContent="Scroll to bottom"
                            toolTipPlace="left"
                            icon={<VscChevronDown size={16} />}
                            onClick={handleScrollToBottom}
                            aria-label="Scroll to bottom"
                        />
                    )}
                </div>
            )}
        </div>
    );
});

const Footer = ({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) => {
    return <div className={styles['page-footer-wrapper']} style={style}>{children}</div>;
};

Body.displayName = 'Page.Body';

const ScrollSpyder = ({ children }: { children: React.ReactNode }) => {
    return <div className={styles['page-scroll-spyder-wrapper']}>{children}</div>;
};

const SubTitle = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => {
    return (
        <div className={styles['page-sub-title']} style={style}>
            <span>{children}</span>
        </div>
    );
};
const ContentBlock = ({
    children,
    pActive = false,
    pHoverNone = false,
    pSticky = false,
    style,
}: {
    children?: React.ReactNode;
    pActive?: boolean;
    pHoverNone?: boolean;
    pSticky?: boolean;
    style?: React.CSSProperties;
}) => {
    const blockClass = pHoverNone ? 'page-content-block-none' : 'page-content-block';
    const wrapperClass = pSticky ? 'page-block-wrapper-sticky' : 'page-block-wrapper';
    return (
        <div className={styles[wrapperClass]}>
            <div className={[styles[blockClass], pActive && styles['active-content-block']].filter(Boolean).join(' ')} style={style}>
                {children}
            </div>
        </div>
    );
};

const ContentTitle = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className={styles['page-content-block-title']}>
            <span>{children}</span>
        </div>
    );
};
const ContentDesc = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => {
    return (
        <div className={styles['page-content-block-desc']} style={style}>
            <span>{children}</span>
        </div>
    );
};
const TextButton = ({
    pText,
    pType,
    pCallback,
    pWidth,
    pIsDisable = false,
    onMouseOut = () => {},
    mr = '16px',
    mb = '8px',
    mt = '0px',
    pLoad = false,
    pIcon = undefined,
}: {
    pText: string;
    pType: string;
    pCallback: (e: React.MouseEvent) => void;
    pWidth?: string;
    pIsDisable?: boolean;
    onMouseOut?: (e: React.MouseEvent) => void;
    mr?: string;
    mb?: string;
    mt?: string;
    pIcon?: any;
    pLoad?: boolean;
}) => {
    const handleCallback = (e: any) => {
        if (pIsDisable) return;
        pCallback(e);
    };

    const buttonClass = [styles['page-text-button'], pIsDisable && styles['page-text-button--disabled'], !pIsDisable && styles[`page-text-button--${pType.toLowerCase()}`]]
        .filter(Boolean)
        .join(' ');

    return (
        <button
            className={buttonClass}
            style={{
                width: pWidth,
                marginRight: mr,
                marginBottom: mb,
                marginTop: mt,
                cursor: pIsDisable ? 'no-drop' : 'pointer',
            }}
            onClick={handleCallback}
            onMouseOut={onMouseOut}
        >
            {pLoad ? <Loader width="12px" height="12px" /> : pIcon ? pIcon : null}
            <span>{pText}</span>
        </button>
    );
};
const IconBtn = ({ children, pCallback, pActive }: { children: React.ReactNode; pCallback: (e: React.MouseEvent) => void; pActive?: boolean }) => {
    return (
        <div className={[styles['page-icon-button-wrapper'], pActive && styles['page-icon-button-active']].filter(Boolean).join(' ')} onClick={pCallback}>
            {children}
        </div>
    );
};
const Input = ({
    pAutoFocus,
    pCallback = () => {},
    pValue,
    pWidth = '400px',
    pMaxLen,
    pPlaceholder = '',
    pEnter = () => {},
}: {
    pAutoFocus?: boolean;
    pCallback?: (e: React.FormEvent<HTMLInputElement>) => void;
    pValue?: any;
    pWidth?: any;
    pMaxLen?: number;
    pPlaceholder?: string;
    pEnter?: () => void;
}) => {
    const handleEnter = (e: React.KeyboardEvent) => {
        if (e.type === 'keydown') {
            if (e.keyCode !== 13) return;
            else {
                e.stopPropagation();
                pEnter && pEnter();
            }
        }
    };
    return (
        <div className={styles['page-input-wrapper']} style={{ width: '100%', maxWidth: pWidth }}>
            <input placeholder={pPlaceholder} autoFocus={pAutoFocus} onChange={pCallback} value={pValue} maxLength={pMaxLen} onKeyDown={handleEnter} />
        </div>
    );
};
const TextArea = ({
    pAutoFocus = false,
    pContent,
    pHeight,
    pPlaceHolder = '',
    pCallback,
}: {
    pAutoFocus?: boolean;
    pContent: string;
    pHeight: number;
    pPlaceHolder?: string;
    pCallback?: (e: React.FormEvent<HTMLTextAreaElement>) => void;
}) => {
    return (
        <DSTextarea
            autoFocus={pAutoFocus}
            defaultValue={pContent}
            placeholder={pPlaceHolder}
            onChange={pCallback}
            style={{ height: pHeight + 'px', minHeight: pHeight + 'px' }}
            fullWidth
            resize="vertical"
        />
    );
};
const DpRow = ({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) => {
    return (
        <div className={[styles['page-dp-row'], className].filter(Boolean).join(' ')} style={style}>
            {children}
        </div>
    );
};
const DpRowTL = ({ children }: { children: React.ReactNode }) => {
    return <div className={[styles['page-dp-row-tl']].filter(Boolean).join(' ')}>{children}</div>;
};
const DpRowBetween = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => {
    return (
        <div className={styles['page-dp-row-bt']} style={{ ...style }}>
            {children}
        </div>
    );
};
const ContentText = ({ pContent, pWrap = false, style }: { pContent: string; pWrap?: boolean; style?: React.CSSProperties }) => {
    return (
        <div className={styles[pWrap ? 'page-content-block-text-nowrap' : 'page-content-block-text']} style={style}>
            <span>{pContent}</span>
        </div>
    );
};
const Hr = () => {
    return <div className={styles['page-block-hr']} />;
};
const Group = ({ children }: { children: React.ReactNode }) => {
    return <div className={styles['page-group']}>{children}</div>;
};

const DateTimePicker = ({ pSetApply, pTime }: { pSetApply: (e: any) => void; pTime: any }) => {
    const [sOpenDate, setOpenDate] = useState<boolean>(false);
    const [sHours, setHours] = useState<any>(0);
    const [sMinute, setMinute] = useState<any>(0);
    const [sSecond, setSecond] = useState<any>(0);
    const [sDate, setDate] = useState<any>();
    const sOptionRef = useRef(null);

    const apply = () => {
        if (!sDate) {
            Error('Please select date.');
            return;
        }

        const sListDate = new Date(`${sDate} ${sHours}:${sMinute}:${sSecond}`).getTime();
        pSetApply(moment(sListDate).format('YYYY-MM-DD HH:mm:ss'));
        setOpenDate(false);
    };

    useOutsideClick(sOptionRef, () => setOpenDate(false));

    return (
        <div ref={sOptionRef} className={styles['page-date-time-picker-wrapper']}>
            <div className={styles['page-date-time-picker-input']}>
                <Page.Input
                    pValue={pTime}
                    pCallback={(event: React.FormEvent<HTMLInputElement>) => {
                        pSetApply((event.target as HTMLInputElement).value);
                    }}
                    pWidth={'250px'}
                />
                <Button
                    size="sm"
                    variant="ghost"
                    icon={<Calendar size={16} />}
                    onClick={() => {
                        setOpenDate(!sOpenDate);
                    }}
                />
            </div>
            {sOpenDate && (
                <div className={styles['page-date-time-picker']}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <div className={styles[`page-date-time-picker-content`]}>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}
                            >
                                <DateCalendar
                                    className="date-calendar"
                                    onChange={(aValue: any) => {
                                        setDate(`${aValue.$y}-${aValue.$M + 1}-${aValue.$D}`);
                                    }}
                                    sx={{
                                        '& .MuiTypography-root': {
                                            color: '#f1f1f1',
                                        },
                                        '& .MuiPickersCalendarHeader-switchViewButton, & .MuiPickersArrowSwitcher-button': {
                                            color: '#f1f1f1',
                                            '& svg': {
                                                fill: '#f1f1f1',
                                            },
                                            '&:hover': {
                                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                            },
                                        },
                                        '& .MuiPickersCalendarHeader-label': {
                                            color: '#f1f1f1',
                                        },
                                        '& .MuiDayCalendar-weekDayLabel': {
                                            color: '#c4c4c4',
                                        },
                                        '& .MuiButtonBase-root': {
                                            color: '#f1f1f1',
                                            '&:hover': {
                                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                            },
                                            '&.Mui-selected': {
                                                backgroundColor: '#005fb8',
                                                color: '#f3f3f3',
                                                '&:hover': {
                                                    backgroundColor: '#0075e2',
                                                },
                                            },
                                            '&.Mui-disabled': {
                                                color: '#818181',
                                            },
                                        },
                                        '& .MuiPickersYear-root button': {
                                            fontSize: '12px',
                                        },
                                    }}
                                />
                            </div>
                            <Page.Divi />
                            <Page.DpRow style={{ justifyContent: 'center', display: 'flex', flex: 1, width: '100%' }}>
                                <Page.DpRow>
                                    <MultiSectionDigitalClock
                                        className="time-clock"
                                        onChange={(aValue: any, state: any, view: any) => {
                                            state;
                                            if (view === 'hours') {
                                                setHours(aValue.$H);
                                            } else if (view === 'minutes') {
                                                setMinute(aValue.$m);
                                            } else {
                                                setSecond(aValue.$s);
                                            }
                                        }}
                                        views={['hours', 'minutes', 'seconds']}
                                        ampm={false}
                                        timeSteps={{ hours: 1, minutes: 1, seconds: 1 }}
                                        sx={{
                                            '& .MuiList-root': {
                                                color: '#c4c4c4',
                                            },
                                            '& .MuiButtonBase-root': {
                                                color: '#f1f1f1',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                                },
                                                '&.Mui-selected': {
                                                    borderRadius: '3px',
                                                    backgroundColor: '#005fb8',
                                                    color: '#f3f3f3',
                                                    '&:hover': {
                                                        backgroundColor: '#0075e2',
                                                    },
                                                },
                                            },
                                        }}
                                    />
                                </Page.DpRow>
                            </Page.DpRow>
                            <Page.Hr />
                            <Page.DpRow style={{ display: 'flex', justifyContent: 'end', paddingTop: '8px' }}>
                                <TextButton pText="Apply" pType="CREATE" pCallback={apply} />
                            </Page.DpRow>
                        </div>
                    </LocalizationProvider>
                </div>
            )}
        </div>
    );
};

const DatePicker = ({ pSetApply, pTime }: { pSetApply: (e: any) => void; pTime: any }) => {
    const [sOpenDate, setOpenDate] = useState<boolean>(false);
    const sOptionRef = useRef(null);

    const HandleDate = (aDate: any) => {
        const sNewDate = new Date(aDate._d);
        const sMomentDay = moment(sNewDate).format('YYYY-MM-DD');
        const sPTimeDay = pTime.split('-')[2];
        const sChangeDay = sMomentDay.split('-')[2];
        // Auto apply when click day.
        if (sPTimeDay !== sChangeDay) {
            pSetApply(sMomentDay);
            setOpenDate(false);
        }
    };

    useOutsideClick(sOptionRef, () => setOpenDate(false));

    return (
        <div ref={sOptionRef} className={styles['page-date-picker-wrapper']}>
            <div className={styles['page-date-picker-input']}>
                <Page.Input
                    pValue={pTime}
                    pCallback={(event: React.FormEvent<HTMLInputElement>) => {
                        pSetApply((event.target as HTMLInputElement).value);
                    }}
                />
                <Button
                    size="sm"
                    variant="ghost"
                    icon={<Calendar size={16} />}
                    onClick={() => {
                        setOpenDate(!sOpenDate);
                    }}
                />
            </div>
            {sOpenDate && (
                <div className={styles['page-date-picker']}>
                    <LocalizationProvider dateAdapter={AdapterMoment}>
                        <div className={styles['page-date-picker-content']}>
                            <DateCalendar
                                className="date-calendar"
                                defaultValue={moment(pTime)}
                                onChange={HandleDate}
                                sx={{
                                    '& .MuiTypography-root': {
                                        color: '#f1f1f1',
                                    },
                                    '& .MuiPickersCalendarHeader-switchViewButton, & .MuiPickersArrowSwitcher-button': {
                                        color: '#f1f1f1',
                                        '& svg': {
                                            fill: '#f1f1f1',
                                        },
                                        '&:hover': {
                                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                        },
                                    },
                                    '& .MuiPickersCalendarHeader-label': {
                                        color: '#f1f1f1',
                                    },
                                    '& .MuiDayCalendar-weekDayLabel': {
                                        color: '#c4c4c4',
                                    },
                                    '& .MuiButtonBase-root': {
                                        color: '#f1f1f1',
                                        '&:hover': {
                                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                        },
                                        '&.Mui-selected': {
                                            backgroundColor: '#005fb8',
                                            color: '#f3f3f3',
                                            '&:hover': {
                                                backgroundColor: '#0075e2',
                                            },
                                        },
                                        '&.Mui-disabled': {
                                            color: '#818181',
                                        },
                                    },
                                }}
                            />
                        </div>
                    </LocalizationProvider>
                </div>
            )}
        </div>
    );
};
const Checkbox = ({ pCallback, pValue, pDisable, label }: { pCallback?: (value: any) => void; pValue?: boolean; pDisable?: boolean; label?: string }): JSX.Element => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (pCallback) {
            pCallback(e.target.checked);
        }
    };

    return (
        <div className={styles['page-check-box-wrarpper']}>
            <DSCheckbox label={label ?? null} checked={pValue || false} onChange={handleChange} disabled={pDisable} size="sm" />
        </div>
    );
};
const Selector = <T,>({
    pList,
    pSelectedItem,
    pCallback,
    pWidth = '400px',
    disable = false,
    capitalize = true,
    label,
    labelPosition = 'top',
}: {
    pList: { name: string; data: T }[];
    pSelectedItem: any;
    pCallback: (eTarget: T) => void;
    pWidth?: string;
    disable?: boolean;
    capitalize?: boolean;
    label?: string;
    labelPosition?: 'top' | 'left';
}) => {
    const [sIsOpen, setIsOpen] = useState<boolean>(false);
    const selectorRef = useRef(null);

    const handleOpen = () => {
        if (disable) return;
        setIsOpen(!sIsOpen);
    };
    const handleCallback = (aItem: T) => {
        pCallback(aItem);
        setIsOpen(false);
    };

    useOutsideClick(selectorRef, () => setIsOpen(false));

    const selectorContent = (
        <div ref={selectorRef} className={styles['page-selector-wrapper']} style={{ width: 'auto', maxWidth: pWidth, textTransform: capitalize ? 'capitalize' : 'none' }}>
            <div className={[styles['page-selector-header'], sIsOpen && styles['page-selector-header--open']].filter(Boolean).join(' ')} onClick={handleOpen}>
                <span>{pSelectedItem}</span>
                <ArrowDown />
            </div>
            {sIsOpen && (
                <div className={styles['page-selector-body']}>
                    {pList.map((pItem, aIdx: number) => {
                        return (
                            <div
                                key={pItem.name + aIdx + ''}
                                className={[styles['page-selector-body-item'], pSelectedItem === pItem && styles['page-selector-body-item-selected']].filter(Boolean).join(' ')}
                                onClick={() => handleCallback(pItem.data)}
                            >
                                <span>{pItem.name}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    if (!label) {
        return selectorContent;
    }

    return (
        <div className={styles[`page-selector-container--${labelPosition}`]}>
            <label className={styles['page-selector-label']}>{label}</label>
            {selectorContent}
        </div>
    );
};
const TextResErr = ({ pText }: { pText: string }) => {
    return <DSAlert variant="error" message={pText} icon={<VscWarning />} />;
};
const TextResSuccess = ({ pText }: { pText: string }) => {
    return <DSAlert variant="success" message={pText} icon={<VscPass />} />;
};

const Switch = ({
    pState,
    pCallback,
    pBadge,
    pBadgeL = false,
    pReadOnly = false,
}: {
    pState: boolean;
    pCallback: (aItem: any) => void;
    pBadge?: string;
    pBadgeL?: boolean;
    pReadOnly?: boolean;
}) => {
    const switchId = `switch-${React.useId().replace(/:/g, '')}`;

    const handleSwitch = (e: React.MouseEvent<HTMLLabelElement, MouseEvent>) => {
        e.preventDefault();
        if (!pReadOnly) pCallback(e);
    };

    return (
        <div className={styles['page-switch-wrapper']}>
            {!!pBadge && pBadgeL && <span className={[styles['page-badge'], pBadge && styles['page-badge-active']].filter(Boolean).join(' ')}>{pBadge}</span>}
            <input type="checkbox" id={switchId} className={styles['page-switch-input']} readOnly checked={pState} />
            <label htmlFor={switchId} className={[styles['page-switch-label'], pReadOnly && styles['page-switch-readonly']].filter(Boolean).join(' ')} onClick={handleSwitch}>
                <span className={styles['page-switch-label-btn']} />
            </label>
            {!!pBadge && !pBadgeL && <span className={[styles['page-badge'], pBadge && styles['page-badge-active']].filter(Boolean).join(' ')}>{pBadge}</span>}
        </div>
    );
};
const TwoItemSwitch = ({ pItemA, pItemB, pSelectedItem, pCallback }: { pItemA: string; pItemB: string; pSelectedItem: string; pCallback: (aItem: any) => void }) => {
    const [sState, setState] = useState<boolean>(pItemA !== pSelectedItem);
    const switchId = `switch-${React.useId().replace(/:/g, '')}`;

    const handleItemCallback = () => {
        setState(!sState);
        pCallback(!sState ? pItemB : pItemA);
    };

    return (
        <div className={styles['page-two-item-switch-wrapper']}>
            <span
                className={[styles['page-two-item-switch-content'], !sState && styles['two-item-active']].filter(Boolean).join(' ')}
                style={{ marginRight: '8px' }}
                onClick={handleItemCallback}
            >
                {pItemA}
            </span>
            <input type="checkbox" id={switchId} className={styles['page-switch-input']} readOnly checked={sState} />
            <label htmlFor={switchId} className={styles['page-switch-label']} onClick={handleItemCallback}>
                <span className={styles['page-switch-label-btn']} />
            </label>
            <span
                className={[styles['page-two-item-switch-content'], sState && styles['two-item-active']].filter(Boolean).join(' ')}
                style={{ marginLeft: '8px' }}
                onClick={handleItemCallback}
            >
                {pItemB}
            </span>
        </div>
    );
};
const StatusCircle = ({ pState }: { pState?: 'true' | 'false' | 'none' }) => {
    const circleClass = [styles['page-status-circle'], pState && styles[`page-status-circle--${pState}`]].filter(Boolean).join(' ');

    return (
        <div className={styles['page-status-circle-wrapper']}>
            <div className={circleClass}></div>
        </div>
    );
};

const Collapse = ({
    pInitOpen = false,
    pTrigger,
    children,
    title,
    size = 'md',
}: {
    pInitOpen?: boolean;
    pTrigger?: React.ReactNode;
    children: React.ReactNode;
    title?: string;
    size?: 'sm' | 'md' | 'lg';
}) => {
    const [sIsOpen, setIsOpen] = useState<boolean>(pInitOpen);

    return (
        <div className={styles['page-collapse']}>
            <div className={styles['page-collapse-trigger-wrapper']}>
                <div className={`${styles['page-collapse-trigger']} ${styles[`page-collapse-trigger--${size}`]}`} onClick={() => setIsOpen(!sIsOpen)}>
                    <div className={`${styles['page-collapse-trigger-icon']} ${sIsOpen ? styles['page-collapse-trigger-icon--open'] : ''}`}>
                        <MdKeyboardArrowRight />
                    </div>
                    {title || pTrigger}
                </div>
            </div>
            {sIsOpen && children}
        </div>
    );
};

const CopyBlock = ({ pTitle, pContent, pHover = false }: { pTitle?: string; pContent: string; pHover?: boolean }) => {
    return (
        <div className={[styles['page-copy-block-wrapper'], pHover && styles['page-copy-block-wrapper--hover']].filter(Boolean).join(' ')}>
            <div className={styles['page-copy-block-title']}>
                <span>{pTitle ?? ''}</span>
            </div>
            <div className={styles['page-copy-block']}>
                <div className={styles['page-copy-block-text']}>
                    <ContentText pContent={pContent} />
                </div>
                <div className={styles['page-copy-block-btn']}>
                    <CopyButton pContent={pContent} />
                </div>
            </div>
        </div>
    );
};

const CopyButton = ({ pContent }: { pContent: string }) => {
    /** copy clipboard */
    const handleCopy = () => {
        ClipboardCopy(pContent);
    };

    return (
        <div className={styles['page-copy-warpper']}>
            <Button.Copy size="icon" variant="secondary" onClick={handleCopy} />
        </div>
    );
};
const Space = ({ pHeight = '8px' }: { pHeight?: string }) => {
    return <div style={{ width: '100%', height: pHeight }} />;
};
const HoverBg = ({ children }: { children: React.ReactNode }) => {
    return <div className={styles['page-hover-bg-wrapper']}>{children}</div>;
};

const Divi = ({ direction = 'horizontal', spacing = '8px', style }: { direction?: 'horizontal' | 'vertical'; spacing?: string; style?: React.CSSProperties }) => {
    const defaultStyle = direction === 'horizontal' ? { margin: `${spacing} 0` } : { margin: `0 ${spacing}` };
    return <div className={styles[`page-divi-${direction}`]} style={{ ...defaultStyle, ...style }} />;
};

const TabContainer = ({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) => {
    return (
        <div className={[styles['page-tab-container'], className].filter(Boolean).join(' ')} style={style}>
            {children}
        </div>
    );
};

const TabList = ({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) => {
    return (
        <div className={[styles['page-tab-list'], className].filter(Boolean).join(' ')} style={style}>
            {children}
        </div>
    );
};

const TabItem = ({
    children,
    active = false,
    onClick,
    badge,
    style,
    className,
}: {
    children: React.ReactNode;
    active?: boolean;
    onClick?: () => void;
    badge?: string | number;
    style?: React.CSSProperties;
    className?: string;
}) => {
    return (
        <div className={[styles['page-tab-item'], active ? styles['active-tab'] : styles['inactive-tab'], className].filter(Boolean).join(' ')} onClick={onClick} style={style}>
            {children}
            {badge !== undefined && <span className={styles['page-tab-badge']}>{badge}</span>}
        </div>
    );
};

const TabInfo = ({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) => {
    return (
        <div className={[styles['page-tab-info'], className].filter(Boolean).join(' ')} style={style}>
            {children}
        </div>
    );
};

Page.Checkbox = Checkbox;
Page.Group = Group;
Page.Header = Header;
Page.Body = Body;
Page.Footer = Footer;
Page.TextButton = TextButton;
Page.DpRow = DpRow;
Page.DpRowTL = DpRowTL;
Page.Input = Input;
Page.TextArea = TextArea;
Page.SubTitle = SubTitle;
Page.ContentBlock = ContentBlock;
Page.ContentTitle = ContentTitle;
Page.ContentDesc = ContentDesc;
Page.ContentText = ContentText;
Page.Hr = Hr;
Page.DatePicker = DatePicker;
Page.DateTimePicker = DateTimePicker;
Page.Switch = Switch;
Page.TwoItemSwitch = TwoItemSwitch;
Page.IconBtn = IconBtn;
Page.Selector = Selector;
Page.TextResErr = TextResErr;
Page.StatusCircle = StatusCircle;
Page.Collapse = Collapse;
Page.TextResSuccess = TextResSuccess;
Page.CopyButton = CopyButton;
Page.CopyBlock = CopyBlock;
Page.Space = Space;
Page.HoverBg = HoverBg;
Page.DpRowBetween = DpRowBetween;
Page.Divi = Divi;
Page.TabContainer = TabContainer;
Page.TabList = TabList;
Page.TabItem = TabItem;
Page.TabInfo = TabInfo;
