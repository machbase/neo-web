import './index.scss';
import { useState, useEffect, useRef } from 'react';
import { useRecoilState } from 'recoil';
import { gConsoleSelector } from '@/recoil/recoil';
import { VscAdd, VscChevronDown, VscTrash, VscChevronUp } from '@/assets/icons/Icon';
import { getId } from '@/utils';
import Shell from '../shell/Shell';
import Menu from '../contextMenu/Menu';
import useOutsideClick from '@/hooks/useOutsideClick';
import ConsoleTab from './ConsoleTab';
import icons from '@/utils/icons';
import { stringParseNewDate } from '@/utils/helpers/date';
import moment from 'moment';

const Console = ({ pSetTerminalSizes, pExtentionList, pTerminalSizes }: any) => {
    const [sConsoleTab, setConsoleTab] = useState<any>([]);
    const [sSelectedTab, setSelectedTab] = useState('Console');
    const [sIsContextMenu, setIsContextMenu] = useState(false);
    const [sConsoleList, setConsoleList] = useRecoilState<any>(gConsoleSelector);
    const [sSelectTask, setSelectTask] = useState('none');
    const MenuRef = useRef<HTMLDivElement>(null);
    const sFiledRef = useRef<HTMLDivElement>(null);
    const consoleRef = useRef<any>(null);
    const [sNewLog, setNewLog] = useState(false);
    const onContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsContextMenu(true);
    };

    const setColor = (aItem: string) => {
        switch (aItem) {
            case 'TRACE':
                return '#C4C4C4';
            case 'DEBUG':
                return '#F8F8F8';
            case 'INFO':
                return '#339900';
            case 'ERROR':
                return '#CC3300';
            case 'WARN':
                return '#FFCC00';
        }
    };

    useEffect(() => {
        setNewLog(true);
        setTimeout(() => {
            setNewLog(false);
        }, 2000);
        sConsoleList[sConsoleList.length - 1] && sConsoleList[sConsoleList.length - 1].level === 'ERROR' && setSelectedTab(sConsoleTab[0].id);
        if (consoleRef.current) {
            consoleRef.current.scrollTo({
                top: consoleRef.current.scrollHeight + consoleRef.current.clientHeight,
                behavior: 'smooth',
            });
        }
    }, [sConsoleList]);

    useEffect(() => {
        const defaultTabId = getId();
        setConsoleTab([
            {
                id: defaultTabId,
                type: 'console',
                name: 'Console',
                shell: { icon: 'console', theme: '', id: 'SHELL' },
            },
        ]);
        setSelectedTab(defaultTabId);
    }, []);

    const addConsoleTab = (aEvent: any, aItem: any) => {
        aEvent.stopPropagation();
        const sId = getId();
        setConsoleTab([
            ...sConsoleTab,
            {
                id: sId,
                type: 'shell',
                name: aItem.label,
                shell: { icon: aItem.icon, theme: aItem.theme, id: aItem.id },
            },
        ]);
        setSelectedTab(sId);
        setIsContextMenu(false);
    };

    const handleSelectedTab = (aValue: string) => {
        setSelectedTab(aValue);
    };

    const deleteConsoleTab = (aEvent: any, aValue: any) => {
        aEvent.stopPropagation();

        setConsoleTab(sConsoleTab.filter((aItem: any) => aItem.id !== aValue.id));

        setSelectedTab(sConsoleTab[0].id);
    };

    const changeUtcToText = (aUtcDate: number): string => {
        const sNumberArr = stringParseNewDate(aUtcDate);
        if (
            typeof sNumberArr[0] === 'number' &&
            typeof sNumberArr[1] === 'number' &&
            typeof sNumberArr[2] === 'number' &&
            typeof sNumberArr[3] === 'number' &&
            typeof sNumberArr[4] === 'number' &&
            typeof sNumberArr[5] === 'number' &&
            typeof sNumberArr[6] === 'number'
        ) {
            const sMyDate = new Date(sNumberArr[0], sNumberArr[1] - 1, sNumberArr[2], sNumberArr[3], sNumberArr[4], sNumberArr[5], sNumberArr[6]);
            return moment(sMyDate).format('YYYY-MM-DD HH:mm:ss.SSS');
        } else return moment().format('YYYY-MM-DD HH:mm:ss SSS');
    };

    useOutsideClick(MenuRef, () => setIsContextMenu(false));
    useOutsideClick(sFiledRef, () => setSelectTask('none'));

    return (
        <div className="console-form">
            <div className="console-header">
                <div className="console-form-tab">
                    {sConsoleTab.map((aItem: any, aIdx: number) => {
                        return (
                            <ConsoleTab
                                pDeleteConsoleTab={deleteConsoleTab}
                                pSelectedTab={sSelectedTab}
                                key={aIdx}
                                pNewLog={sNewLog}
                                pConsoleList={sConsoleList}
                                pHandleSelectedTab={() => handleSelectedTab(aItem.id)}
                                pTab={aItem}
                            ></ConsoleTab>
                        );
                    })}
                </div>
                <div className="console-header-right">
                    <div ref={MenuRef} onClick={(aEvent: any) => onContextMenu(aEvent)} className="add-terminal">
                        <VscAdd></VscAdd>
                        <span>
                            <VscChevronDown></VscChevronDown>
                        </span>
                        <div style={{ position: 'absolute', top: 30, left: -80, zIndex: 99 }}>
                            <Menu isOpen={sIsContextMenu}>
                                {pExtentionList.map((aItem: any) => {
                                    return (
                                        <Menu.Item onClick={(aEvent: any) => addConsoleTab(aEvent, aItem)} key={aItem.id}>
                                            {icons(aItem.icon)}
                                            {aItem.label}
                                        </Menu.Item>
                                    );
                                })}
                            </Menu>
                        </div>
                    </div>
                    {sConsoleTab && sSelectedTab === sConsoleTab[0]?.id && <VscTrash onClick={() => setConsoleList([])}></VscTrash>}

                    {pTerminalSizes[1] === 40 && <VscChevronUp onClick={() => pSetTerminalSizes(['72%', '28%'])}></VscChevronUp>}
                    {pTerminalSizes[1] !== 40 && <VscChevronDown onClick={() => pSetTerminalSizes(['', 40])}></VscChevronDown>}
                </div>
            </div>
            <div ref={consoleRef} className="console-body">
                {sConsoleTab.map((aItem: any) => {
                    return (
                        <div style={aItem.id === sSelectedTab ? { height: '100%', width: '100%' } : { display: 'none' }} key={aItem.id}>
                            <div style={aItem.type === 'console' ? { overflow: 'auto' } : { display: 'none', overflow: 'auto' }}>
                                {sConsoleList.length > 0 &&
                                    sConsoleList.map((bItem: any, aIdx: number) => {
                                        return (
                                            <div
                                                onClick={() => setSelectTask(bItem.task)}
                                                style={
                                                    sSelectTask === bItem.task
                                                        ? {
                                                              lineHeight: '117%',
                                                              background: 'rgba(12,12,12, 0.6)',
                                                              paddingLeft: '24px',
                                                              fontSize: '14px',
                                                              fontFamily: 'D2coding',
                                                              display: 'flex',
                                                              alignItems: 'baseline',
                                                              gap: '16px',
                                                              color: '#f4f4f4',
                                                          }
                                                        : {
                                                              lineHeight: '117%',
                                                              paddingLeft: '24px',
                                                              fontSize: '14px',
                                                              fontFamily: 'D2coding',
                                                              display: 'flex',
                                                              alignItems: 'baseline',
                                                              gap: '16px',
                                                              color: '#d1d1d1',
                                                          }
                                                }
                                                key={aIdx}
                                            >
                                                <span style={{ whiteSpace: 'nowrap' }}>
                                                    {changeUtcToText(bItem.timestamp < 10000000000000 ? Math.floor(bItem.timestamp) : Math.floor(bItem.timestamp / 1000000))}
                                                </span>
                                                {bItem.level && <span style={{ color: setColor(bItem.level), whiteSpace: 'nowrap', minWidth: '35px' }}>{bItem.level}</span>}
                                                {bItem.task && <span style={{ whiteSpace: 'nowrap' }}>{bItem.task}</span>}
                                                <span>{bItem.message}</span>
                                            </div>
                                        );
                                    })}
                            </div>

                            <div
                                style={
                                    aItem.type !== 'console'
                                        ? aItem && aItem?.shell?.theme === 'indigo'
                                            ? { height: 'calc(100%)', paddingTop: '4px', overflow: 'auto' }
                                            : { height: '100%' }
                                        : { display: 'none', overflow: 'auto' }
                                }
                            >
                                {aItem.type === 'shell' && <Shell pSelectedTab={sSelectedTab} pType="bottom" pInfo={aItem} pId={aItem.id}></Shell>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Console;
