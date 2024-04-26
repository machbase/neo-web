import { ArrowDown, Calendar, LuFlipVertical, VscWarning } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { useRef, useState } from 'react';
import { DateCalendar, LocalizationProvider, MultiSectionDigitalClock } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import useOutsideClick from '@/hooks/useOutsideClick';
import moment from 'moment';
import './index.scss';
import { VscCheck, VscCircleFilled } from 'react-icons/vsc';
import { generateUUID } from '@/utils';

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
const TextButton = ({ pText, pType, pCallback, pWidth }: { pText: string; pType: string; pCallback: (e: React.MouseEvent) => void; pWidth?: string }) => {
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
        <button className="extension-tab-text-button" style={{ backgroundColor: getColor(), width: pWidth }} onClick={pCallback}>
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
const Input = ({ pCallback, pValue, pWidth }: { pCallback?: (e: React.FormEvent<HTMLInputElement>) => void; pValue?: any; pWidth?: any }) => {
    return (
        <div className="extension-tab-input-wrapper" style={{ width: pWidth }}>
            <input onChange={pCallback} value={pValue} />
        </div>
    );
};
const TextArea = ({ pContent, pRows, pCols }: { pContent: string; pRows: number; pCols: number }) => {
    return (
        <div className="extension-tab-text-area-wrapper">
            <textarea readOnly rows={pRows} cols={pCols} defaultValue={pContent} />
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
const Checkbox = ({ pCallback, pValue }: { pCallback?: (value: any) => void; pValue?: boolean }) => {
    const [sIsCheck, setIsCheck] = useState<boolean>(pValue || false);

    const handleCheck = () => {
        if (pCallback) {
            const sApplyValue = !sIsCheck;
            setIsCheck(sApplyValue);
            pCallback(sApplyValue);
        }
    };

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
                                                  <span>{aRowData}</span>
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
const Switch = ({ pState, pCallback }: { pState: boolean; pCallback: () => void }) => {
    return (
        <div className="extension-tab-switch-wrapper">
            <input type="checkbox" id="switch" className="extension-tab-switch-input" readOnly checked={pState} />
            <label htmlFor="switch" className="extension-tab-switch-label" onClick={pCallback}>
                <span className="extension-tab-switch-label-btn" />
            </label>
        </div>
    );
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
