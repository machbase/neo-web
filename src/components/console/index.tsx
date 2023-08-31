import './index.scss';
import { useState, useEffect, useRef } from 'react';
import { useRecoilState } from 'recoil';
import { gConsoleList } from '@/recoil/recoil';
import { VscAdd, VscChevronDown, VscChevronRight, VscChevronUp } from '@/assets/icons/Icon';
import { getId } from '@/utils';
import Shell from '../shell/Shell';
import Menu from '../contextMenu/Menu';
import useOutsideClick from '@/hooks/useOutsideClick';
import icons from '@/utils/icons';
import ConsoleTab from './ConsoleTab';

const Console = ({ pSetTerminalSizes, pExtentionList, pTerminalSizes }: any) => {
    // setBoardList(
    //     sBoardList.map((bItem) => {
    //         return bItem.id === sSelectedTab
    //             ? {
    //                   ...bItem,
    //                   type: aValue.type,
    //                   name: aValue.label,
    //                   panels: [],
    //                   sheet: [],
    //                   savedCode: false,
    //                   shell: { icon: aValue.icon, theme: aValue.theme ? aValue.theme : '', id: aValue.id ? aValue.id : 'SHELL' },
    //               }
    //             : bItem;
    //     })
    // );

    const [sConsoleTab, setConsoleTab] = useState<any>([]);
    const [sSelectedTab, setSelectedTab] = useState('Console');
    const [sIsContextMenu, setIsContextMenu] = useState(false);
    const [sConsoleList] = useRecoilState<any>(gConsoleList);
    const MenuRef = useRef<HTMLDivElement>(null);
    const consoleRef = useRef<any>(null);

    const onContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsContextMenu(true);
    };
    useEffect(() => {
        if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight + consoleRef.current.clientHeight;
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

    useOutsideClick(MenuRef, () => setIsContextMenu(false));

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
                        <div style={{ position: 'absolute', top: 30, left: -80, zIndex: 10 }}>
                            <Menu isOpen={sIsContextMenu}>
                                {pExtentionList.map((aItem: any) => {
                                    return (
                                        <Menu.Item onClick={(aEvent: any) => addConsoleTab(aEvent, aItem)} key={aItem.id}>
                                            {aItem.label}
                                        </Menu.Item>
                                    );
                                })}
                            </Menu>
                        </div>
                    </div>
                    {pTerminalSizes[1] === 40 && <VscChevronUp onClick={() => pSetTerminalSizes(['72%', '28%'])}></VscChevronUp>}
                    {pTerminalSizes[1] !== 40 && <VscChevronDown onClick={() => pSetTerminalSizes(['', 40])}></VscChevronDown>}
                </div>
            </div>
            <div ref={consoleRef} className="console-body">
                {sConsoleTab.map((aItem: any) => {
                    return (
                        <div style={aItem.id === sSelectedTab ? { height: '100%', width: '100%' } : { display: 'none' }} key={aItem.id}>
                            {aItem.type === 'console' ? (
                                sConsoleList.length > 0 &&
                                sConsoleList.map((bItem: any, aIdx: number) => {
                                    return (
                                        <div
                                            style={{
                                                paddingLeft: '12px',
                                                fontSize: '14px',
                                                fontFamily: 'D2coding',
                                                display: 'flex',
                                                alignItems: 'center',
                                            }}
                                            key={aIdx}
                                        >
                                            <VscChevronRight></VscChevronRight>
                                            <span style={bItem.level === 'ERROR' ? { color: 'rgb(228, 18, 18)', marginRight: '8px' } : { color: '#20C997', marginRight: '8px' }}>
                                                {bItem.level}
                                            </span>
                                            <span>{bItem.message}</span>
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={{ height: 'calc(100%)' }}>
                                    <Shell pSelectedTab={sSelectedTab} pType="bottom" pInfo={aItem} pId={aItem.id}></Shell>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Console;
