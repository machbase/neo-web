import './index.scss';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRecoilState } from 'recoil';
import { gConsoleSelector, gShellList } from '@/recoil/recoil';
import { VscAdd, VscChevronDown, VscTrash, VscChevronUp } from '@/assets/icons/Icon';
import { getId, isEmpty } from '@/utils';
import Shell from '../shell/Shell';
import Menu from '../contextMenu/Menu';
import useOutsideClick from '@/hooks/useOutsideClick';
import ConsoleTab from './ConsoleTab';
import icons from '@/utils/icons';
import { stringParseNewDate } from '@/utils/helpers/date';
import moment from 'moment';
import { IconButton } from '../buttons/IconButton';

const Console = ({ pSetTerminalSizes, pExtentionList, pTerminalSizes }: any) => {
    const [sConsoleTab, setConsoleTab] = useState<any>([]);
    const [sSelectedTab, setSelectedTab] = useState('Console');
    const [sIsContextMenu, setIsContextMenu] = useState(false);
    const [sConsoleList, setConsoleList] = useRecoilState<any>(gConsoleSelector);
    const [sSelectTask, setSelectTask] = useState('none');
    const MenuRef = useRef<HTMLDivElement>(null);
    const sFiledRef = useRef<HTMLDivElement>(null);
    const consoleRef = useRef<any>(null);
    const [sShellList] = useRecoilState<any>(gShellList);
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

    /** return shell list */
    const getShellList = useMemo((): any[] => {
        const sExtensionListWithoutTerm = pExtentionList && pExtentionList.filter((aExtension: any) => aExtension.type !== 'term');
        if (!sExtensionListWithoutTerm) return [];
        return sExtensionListWithoutTerm.concat(sShellList ?? []);
    }, [sShellList]);

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
                            />
                        );
                    })}
                </div>
                <div className="console-header-right">
                    <div ref={MenuRef} onClick={(aEvent: any) => onContextMenu(aEvent)} className="add-terminal">
                        <IconButton
                            pIsToopTip
                            pPlace="bottom-end"
                            pToolTipContent="Open shell"
                            pToolTipId="console-open-shell"
                            pIcon={
                                <>
                                    <VscAdd />
                                    <VscChevronDown />
                                </>
                            }
                            onClick={() => null}
                        />
                        <div className="extension-menu">
                            <Menu isOpen={sIsContextMenu}>
                                {getShellList.map((aItem: any) => {
                                    return (
                                        <Menu.Item onClick={(aEvent: any) => addConsoleTab(aEvent, aItem)} key={aItem.id}>
                                            {icons(aItem?.icon) ?? ''}
                                            {aItem?.label ?? ''}
                                        </Menu.Item>
                                    );
                                })}
                            </Menu>
                        </div>
                    </div>
                    {sConsoleTab && sSelectedTab === sConsoleTab[0]?.id && (
                        <IconButton pIsToopTip pPlace="bottom-end" pToolTipContent="Clear" pToolTipId="console-clear" pIcon={<VscTrash />} onClick={() => setConsoleList([])} />
                    )}

                    {pTerminalSizes[1] === 40 && (
                        <IconButton
                            pIsToopTip
                            pPlace="bottom-end"
                            pToolTipContent="Expand"
                            pToolTipId="console-expand"
                            pIcon={<VscChevronUp />}
                            onClick={() => pSetTerminalSizes(['72%', '28%'])}
                        />
                    )}
                    {pTerminalSizes[1] !== 40 && (
                        <IconButton
                            pIsToopTip
                            pPlace="bottom-end"
                            pToolTipContent="Collapse"
                            pToolTipId="console-collapse"
                            pIcon={<VscChevronDown />}
                            onClick={() => pSetTerminalSizes(['', 40])}
                        />
                    )}
                </div>
            </div>
            <div ref={consoleRef} className="console-body">
                {sConsoleTab.map((aItem: any) => {
                    return (
                        <div key={aItem.id} className={`${aItem.id === sSelectedTab ? 'active-console' : 'display-none'}`}>
                            <div className={aItem.type === 'console' ? 'is-console' : 'display-none'}>
                                {!isEmpty(sConsoleList) &&
                                    sConsoleList.map((bItem: any, aIdx: number) => {
                                        return (
                                            <div
                                                key={aIdx}
                                                onClick={() => setSelectTask(bItem.task)}
                                                className="task"
                                                style={{
                                                    color: sSelectTask === bItem.task ? '#f4f4f4' : '#d1d1d1',
                                                    background: sSelectTask === bItem.task ? 'rgba(12, 12, 12, 0.6)' : '',
                                                }}
                                            >
                                                <span className="nowrap">
                                                    {changeUtcToText(bItem.timestamp < 10000000000000 ? Math.floor(bItem.timestamp) : Math.floor(bItem.timestamp / 1000000))}
                                                </span>
                                                {bItem.level && <span style={{ color: setColor(bItem.level), whiteSpace: 'nowrap', minWidth: '35px' }}>{bItem.level}</span>}
                                                {bItem.task && <span className="nowrap">{bItem.task}</span>}
                                                {bItem.repeat && (
                                                    <div
                                                        className="repeat"
                                                        style={{
                                                            background: setColor(bItem.level),
                                                        }}
                                                    >
                                                        {bItem.repeat}
                                                    </div>
                                                )}
                                                <span>{bItem.message}</span>
                                            </div>
                                        );
                                    })}
                            </div>

                            <div
                                className="shell"
                                style={
                                    aItem.type !== 'console'
                                        ? aItem && aItem?.shell?.theme === 'indigo'
                                            ? { height: 'calc(100%)', paddingTop: '4px', overflow: 'auto' }
                                            : { height: '100%' }
                                        : { display: 'none', overflow: 'auto' }
                                }
                            >
                                {aItem.type === 'shell' && <Shell pSelectedTab={sSelectedTab} pType="bottom" pInfo={aItem} pId={aItem.id} />}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Console;
