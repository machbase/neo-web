import { ArrowDown, Calendar, LuFlipVertical, VscWarning } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { useEffect, useRef, useState } from 'react';
import { DateCalendar, LocalizationProvider, MultiSectionDigitalClock } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import useOutsideClick from '@/hooks/useOutsideClick';
import moment from 'moment';
import './index.scss';
import { VscCheck, VscCircleFilled, VscPass } from 'react-icons/vsc';
import { generateUUID } from '@/utils';
import { MdKeyboardArrowRight, MdOutlineKeyboardArrowDown } from 'react-icons/md';
import { ClipboardCopy } from '@/utils/ClipboardCopy';

export const ExtensionTab = ({ children, pRef }: { children: React.ReactNode; pRef?: React.MutableRefObject<any> }) => {
    return (
        <div ref={pRef} className="extension-tab-wrapper">
            {children}
        </div>
    );
};

const Header = ({ children }: { children?: React.ReactNode }) => {
    return <div className="extension-tab-header-wrapper">{children}</div>;
};
const Body = ({ children, pSpyder, pSpyderChildren }: { children: React.ReactNode; pSpyder?: boolean; pSpyderChildren?: React.ReactNode }) => {
    return (
        <div className="extension-tab-body-wrapper">
            {pSpyder && <ScrollSpyder>{pSpyderChildren}</ScrollSpyder>}
            <div className="extension-tab-body-content">{children}</div>
        </div>
    );
};

const ScrollSpyder = ({ children }: { children: React.ReactNode }) => {
    return <div className="extension-tab-scroll-spyder-wrapper">{children}</div>;
};

const SubTitle = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="extension-tab-sub-title">
            <span>{children}</span>
        </div>
    );
};
const ContentBlock = ({ children, pActive = false }: { children: React.ReactNode; pActive?: boolean }) => {
    return (
        <div className="extension-tab-block-wrapper">
            <div className={pActive ? 'extension-tab-content-block active-content-block' : 'extension-tab-content-block'}>{children}</div>
        </div>
    );
};

const ContentTitle = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="extension-tab-content-block-title">
            <span>{children}</span>
        </div>
    );
};
const ContentDesc = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="extension-tab-content-block-desc">
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
}: {
    pText: string;
    pType: string;
    pCallback: (e: React.MouseEvent) => void;
    pWidth?: string;
    pIsDisable?: boolean;
    onMouseOut?: (e: React.MouseEvent) => void;
    mr?: string;
}) => {
    const getColor = () => {
        switch (pType) {
            case 'DELETE':
                return '#ff4747';
            case 'CREATE':
                return '#005fb8';
            case 'COPY':
                return '#6f7173';
        }
    };
    return (
        <button
            className="extension-tab-text-button"
            style={{ backgroundColor: pIsDisable ? '#6f7173' : getColor(), width: pWidth, marginRight: mr }}
            onClick={pCallback}
            onMouseOut={onMouseOut}
        >
            {pText}
        </button>
    );
};
const IconBtn = ({ children, pCallback, pActive }: { children: React.ReactNode; pCallback: (e: React.MouseEvent) => void; pActive?: boolean }) => {
    return (
        <div className={pActive ? 'extension-tab-icon-button-wrapper extension-tab-icon-button-active' : `extension-tab-icon-button-wrapper`} onClick={pCallback}>
            {children}
        </div>
    );
};
const Input = ({
    pAutoFocus,
    pCallback = () => {},
    pValue,
    pWidth,
}: {
    pAutoFocus?: boolean;
    pCallback?: (e: React.FormEvent<HTMLInputElement>) => void;
    pValue?: any;
    pWidth?: any;
}) => {
    return (
        <div className="extension-tab-input-wrapper" style={{ width: pWidth }}>
            <input autoFocus={pAutoFocus} onChange={pCallback} value={pValue} />
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
        <div className="extension-tab-text-area-wrapper">
            <textarea placeholder={pPlaceHolder} autoFocus={pAutoFocus} defaultValue={pContent} onChange={pCallback} style={{ height: pHeight + 'px' }} />
        </div>
    );
};
const DpRow = ({ children }: { children: React.ReactNode }) => {
    return <div className="extension-tab-dp-row">{children}</div>;
};
const DpRowTL = ({ children }: { children: React.ReactNode }) => {
    return <div className="extension-tab-dp-row-tl ">{children}</div>;
};
const ContentText = ({ pContent }: { pContent: string }) => {
    return (
        <div className="extension-tab-content-block-text">
            <span>{pContent}</span>
        </div>
    );
};
const Hr = () => {
    return <div className="extension-tab-block-hr" />;
};
const Group = ({ children }: { children: React.ReactNode }) => {
    return <div className="extension-tab-group">{children}</div>;
};

const DateTimePicker = ({ pSetApply, pTime }: { pSetApply: (e: any) => void; pTime: any }) => {
    const [sOpenDate, setOpenDate] = useState<boolean>(false);
    const [isVertical, setIsVertical] = useState<boolean>(true);
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
        <div ref={sOptionRef} className="extention-tab-date-time-picker-wrapper">
            <div className="extention-tab-date-time-picker-input">
                <ExtensionTab.Input
                    pValue={pTime}
                    pCallback={(event: React.FormEvent<HTMLInputElement>) => {
                        pSetApply((event.target as HTMLInputElement).value);
                    }}
                />
                <IconButton
                    pWidth={20}
                    pHeight={20}
                    pIcon={<Calendar />}
                    onClick={() => {
                        setOpenDate(!sOpenDate);
                    }}
                />
            </div>
            {sOpenDate && (
                <div className="extention-tab-date-time-picker">
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <div className={`extention-tab-date-time-picker-content${isVertical ? '-verti' : ''}`}>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    minWidth: '323px',
                                    maxWidth: '323px',
                                    border: 'solid 1px rgba(255, 255, 255, 0.13)',
                                    backgroundColor: '#1c1c21',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'end', height: '45px', alignItems: 'center', marginRight: '8px' }}>
                                    <IconButton pIcon={<LuFlipVertical style={{ transform: 'rotate(90deg)' }} />} pIsActive={isVertical} onClick={() => setIsVertical(true)} />
                                    <IconButton pIcon={<LuFlipVertical />} pIsActive={!isVertical} onClick={() => setIsVertical(false)} />
                                </div>
                                <ExtensionTab.Hr />
                                <DateCalendar
                                    className="date-calendar"
                                    onChange={(aValue: any) => {
                                        setDate(`${aValue.$y}-${aValue.$M + 1}-${aValue.$D}`);
                                    }}
                                />
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: `column${isVertical ? '-reverse' : ''}`,
                                    justifyContent: 'start',
                                    border: 'solid 1px rgba(255, 255, 255, 0.13)',
                                    backgroundColor: '#1c1c21',
                                }}
                            >
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
                                />
                                <ExtensionTab.Hr />
                                <div className="action">
                                    <TextButton pText="Apply" pType="CREATE" pCallback={apply} />
                                </div>
                            </div>
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
        <div ref={sOptionRef} className="extention-tab-date-picker-wrapper">
            <div className="extention-tab-date-picker-input">
                <ExtensionTab.Input
                    pValue={pTime}
                    pCallback={(event: React.FormEvent<HTMLInputElement>) => {
                        pSetApply((event.target as HTMLInputElement).value);
                    }}
                />
                <IconButton
                    pWidth={20}
                    pHeight={20}
                    pIcon={<Calendar />}
                    onClick={() => {
                        setOpenDate(!sOpenDate);
                    }}
                />
            </div>
            {sOpenDate && (
                <div className="extention-tab-date-picker">
                    <LocalizationProvider dateAdapter={AdapterMoment}>
                        <div className={`extention-tab-date-picker-content`}>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    minWidth: '323px',
                                    maxWidth: '323px',
                                    border: 'solid 1px rgba(255, 255, 255, 0.13)',
                                    backgroundColor: '#1c1c21',
                                }}
                            >
                                <DateCalendar className="date-calendar" defaultValue={moment(pTime)} onChange={HandleDate} />
                            </div>
                        </div>
                    </LocalizationProvider>
                </div>
            )}
        </div>
    );
};
const Checkbox = ({ pCallback, pValue, pDisable }: { pCallback?: (value: any) => void; pValue?: boolean; pDisable?: boolean }) => {
    const [sIsCheck, setIsCheck] = useState<boolean>(pValue || false);

    const handleCheck = () => {
        if (pDisable) return;
        if (pCallback) {
            const sApplyValue = !sIsCheck;
            setIsCheck(sApplyValue);
            pCallback(sApplyValue);
        }
    };

    useEffect(() => {
        setIsCheck(pValue || false);
    }, [pValue]);

    return (
        <div className="extension-tab-check-box-wrarpper">
            <div className="extension-tab-check-box" onClick={handleCheck}>
                {sIsCheck && <VscCheck />}
            </div>
        </div>
    );
};
const Selector = ({ pList, pSelectedItem, pCallback }: { pList: any; pSelectedItem: any; pCallback: (eTarget: string) => void }) => {
    const [sIsOpen, setIsOpen] = useState<boolean>(false);

    const handleCallback = (aItem: string) => {
        pCallback(aItem);
        setIsOpen(false);
    };

    return (
        <div className="extension-tab-selector-wrapper">
            <div className="extension-tab-selector-header" onClick={() => setIsOpen(!sIsOpen)}>
                <span>{pSelectedItem}</span>
                <ArrowDown />
            </div>
            {sIsOpen && (
                <div className="extension-tab-selector-body">
                    {pList.map((pItem: string, aIdx: number) => {
                        return (
                            <div
                                key={pItem + aIdx + ''}
                                className={
                                    pSelectedItem === pItem ? 'extension-tab-selector-body-item extension-tab-selector-body-item-selected' : 'extension-tab-selector-body-item'
                                }
                                onClick={() => handleCallback(pItem)}
                            >
                                <span>{pItem}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
const TextResErr = ({ pText }: { pText: string }) => {
    return (
        <div className="extension-tab-res-err">
            <VscWarning />
            <span>{pText}</span>
        </div>
    );
};
const TextResSuccess = ({ pText }: { pText: string }) => {
    return (
        <div className="extension-tab-res-success">
            <VscPass />
            <span>{pText}</span>
        </div>
    );
};
const Table = ({ pList, dotted }: { pList: any; dotted?: boolean }) => {
    return (
        <div className="extension-tab-table-wrapper">
            <table className="extension-tab-table">
                <thead className="extension-tab-table-header">
                    {pList && pList.columns ? (
                        <tr>
                            {dotted && <th style={{ cursor: 'default' }}></th>}
                            {pList.columns.map((aColumn: string, aIdx: number) => {
                                return (
                                    <th key={aColumn + '-' + aIdx} style={{ cursor: 'default' }}>
                                        <span>{aColumn}</span>
                                    </th>
                                );
                            })}
                        </tr>
                    ) : (
                        <></>
                    )}
                </thead>
                <tbody className="extension-tab-table-body">
                    {pList && pList.rows
                        ? pList.rows.map((aRowList: any, aIdx: number) => {
                              return (
                                  <tr key={'tbody-row' + aIdx} className={Number(aIdx) % 2 === 0 ? 'result-body-tr' : 'result-body-tr dark-odd'}>
                                      {dotted && (
                                          <td className="result-table-item" style={{ cursor: 'default' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                  <VscCircleFilled />
                                              </div>
                                          </td>
                                      )}
                                      {aRowList.map((aRowData: any) => {
                                          return (
                                              <td className="result-table-item" key={generateUUID()}>
                                                  <span>{aRowData + ''}</span>
                                              </td>
                                          );
                                      })}
                                  </tr>
                              );
                          })
                        : null}
                </tbody>
            </table>
        </div>
    );
};
const Switch = ({ pState, pCallback, pBadge }: { pState: boolean; pCallback: () => void; pBadge?: string }) => {
    return (
        <div className="extension-tab-switch-wrapper">
            <input type="checkbox" id="switch" className="extension-tab-switch-input" readOnly checked={pState} />
            <label htmlFor="switch" className="extension-tab-switch-label" onClick={pCallback}>
                <span className="extension-tab-switch-label-btn" />
            </label>
            {!!pBadge && <span className={`extension-tab-badge ${!pBadge ? '' : 'extension-tab-badge-active'}`}>{pBadge}</span>}
        </div>
    );
};

const StatusCircle = ({ pState }: { pState?: 'true' | 'false' | 'none' }) => {
    const getColor = (): string => {
        switch (pState) {
            case 'true':
                return '#9df486';
            case 'false':
                return '#fa6464';
            default:
                return '#717171';
        }
    };

    return (
        <div className="extension-tab-status-circle-wrapper">
            <div className="extension-tab-status-circle" style={{ backgroundColor: getColor() }}></div>
        </div>
    );
};

const Collapse = ({ pInitOpen = false, pTrigger, pChildren }: { pInitOpen?: boolean; pTrigger: React.ReactNode; pChildren: React.ReactNode }) => {
    const [sIsOpen, setIsOpen] = useState<boolean>(pInitOpen);

    return (
        <div className="extension-tab-collapse">
            <div className="extension-tab-collapse-trigger-wrapper">
                <div className="extension-tab-collapse-trigger" onClick={() => setIsOpen(!sIsOpen)}>
                    <div className="extension-tab-collapse-trigger-icon">
                        {!sIsOpen && <MdKeyboardArrowRight />}
                        {sIsOpen && <MdOutlineKeyboardArrowDown />}
                    </div>
                    {pTrigger}
                </div>
            </div>
            {sIsOpen && pChildren}
        </div>
    );
};

const CopyBlock = ({ pContent }: { pContent: string }) => {
    return (
        <div className="extension-tab-copy-block-wrapper">
            <div className="extension-tab-copy-block">
                <div className="extension-tab-copy-block-text">
                    <ContentText pContent={pContent} />
                </div>
                <div className="extension-tab-copy-block-btn">
                    <CopyButton pContent={pContent} />
                </div>
            </div>
        </div>
    );
};

const CopyButton = ({ pContent }: { pContent: string }) => {
    const [sTooltipTxt, setTooltipTxt] = useState<string>('Copy');

    /** copy clipboard */
    const handleCopy = () => {
        setTooltipTxt('Copied!');
        ClipboardCopy(pContent);
    };
    const handleMouseout = () => {
        sTooltipTxt === 'Copied!' && setTooltipTxt('Copy');
    };

    return (
        <div className="extension-tab-copy-warpper">
            <TextButton pText={sTooltipTxt} pType="COPY" pWidth="60px" pCallback={handleCopy} onMouseOut={handleMouseout} mr="0px" />
        </div>
    );
};
const Space = ({ pHeight = '8px' }: { pHeight?: string }) => {
    return <div style={{ width: '100%', height: pHeight }} />;
};
const HoverBg = ({ children }: { children: React.ReactNode }) => {
    return <div className="extension-tab-hover-bg-wrapper">{children}</div>;
};

ExtensionTab.Checkbox = Checkbox;
ExtensionTab.Group = Group;
ExtensionTab.Header = Header;
ExtensionTab.Body = Body;
ExtensionTab.TextButton = TextButton;
ExtensionTab.DpRow = DpRow;
ExtensionTab.DpRowTL = DpRowTL;
ExtensionTab.Input = Input;
ExtensionTab.TextArea = TextArea;
ExtensionTab.SubTitle = SubTitle;
ExtensionTab.ContentBlock = ContentBlock;
ExtensionTab.ContentTitle = ContentTitle;
ExtensionTab.ContentDesc = ContentDesc;
ExtensionTab.ContentText = ContentText;
ExtensionTab.Hr = Hr;
ExtensionTab.DatePicker = DatePicker;
ExtensionTab.DateTimePicker = DateTimePicker;
ExtensionTab.Table = Table;
ExtensionTab.Switch = Switch;
ExtensionTab.IconBtn = IconBtn;
ExtensionTab.Selector = Selector;
ExtensionTab.TextResErr = TextResErr;
ExtensionTab.StatusCircle = StatusCircle;
ExtensionTab.Collapse = Collapse;
ExtensionTab.TextResSuccess = TextResSuccess;
ExtensionTab.CopyButton = CopyButton;
ExtensionTab.CopyBlock = CopyBlock;
ExtensionTab.Space = Space;
ExtensionTab.HoverBg = HoverBg;
