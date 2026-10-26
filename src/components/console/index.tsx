import './index.scss';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRecoilState } from 'recoil';
import { gShellList } from '@/recoil/recoil';
import { VscAdd, VscChevronDown, VscTrash, VscChevronUp } from '@/assets/icons/Icon';
import { getId, isEmpty } from '@/utils';
import Shell from '../shell/Shell';
import ConsoleTab from './ConsoleTab';
import icons from '@/utils/icons';
import { stringParseNewDate } from '@/utils/helpers/date';
import moment from 'moment';
import { Button } from '@/design-system/components/Button';
import { Menu } from '@/design-system/components/Menu';
import { gWsLog } from '@/recoil/websocket';
import { ErrorBoundary, Page } from '@/design-system/components';

const Console = ({ pSetTerminalSizes, pExtentionList, pTerminalSizes }: any) => {
    const [sConsoleTab, setConsoleTab] = useState<any>([]);
    const [sSelectedTab, setSelectedTab] = useState('Console');
    const [sConsoleList, setConsoleList] = useRecoilState<any>(gWsLog);
    const [sSelectTask, setSelectTask] = useState('none');
    const consoleRef = useRef<any>(null);
    const [sShellList] = useRecoilState<any>(gShellList);
    const [sNewLog, setNewLog] = useState(false);

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
        sConsoleList[sConsoleList.length - 1] && sConsoleList[sConsoleList.length - 1].level === 'ERROR' && setSelectedTab(sConsoleTab[0]?.id);
        if (consoleRef.current) {
            consoleRef.current.scrollTo({
                top: consoleRef.current.scrollHeight,
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

    const handleSelectedTab = (aValue: string) => {
        setSelectedTab(aValue);
    };

    const handleAddShell = (aItem: any) => {
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
    };

    const deleteConsoleTab = (aEvent: any, aValue: any) => {
        aEvent.stopPropagation();

        setConsoleTab(sConsoleTab.filter((aItem: any) => aItem.id !== aValue.id));

        // Closing a tab in the background keeps the one being viewed; only closing that one moves to Console (F-33).
        if (aValue.id === sSelectedTab) setSelectedTab(sConsoleTab[0].id);
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

    return (
        <Page>
            <div className="console-form" data-testid="console-panel">
                <div className="console-header">
                    <div className="console-form-tab">
                        {sConsoleTab.map((aItem: any, aIdx: number) => {
                            return (
                                // Each console tab, log line and terminal keeps its own failure (#1547), so one of
                                // them breaking leaves the rest of the console where it was.
                                <ErrorBoundary
                                    key={aIdx}
                                    name={`console-tab:${aItem.id}`}
                                    variant="inline"
                                    resetKeys={[aItem]}
                                    actions={aItem.type === 'console' ? [] : [{ label: 'Close', testId: 'close-tab', onClick: () => deleteConsoleTab({ stopPropagation: () => undefined }, aItem) }]}
                                >
                                <ConsoleTab
                                    pDeleteConsoleTab={deleteConsoleTab}
                                    pSelectedTab={sSelectedTab}
                                    pNewLog={sNewLog}
                                    pConsoleList={sConsoleList}
                                    pHandleSelectedTab={() => handleSelectedTab(aItem.id)}
                                    pTab={aItem}
                                />
                                </ErrorBoundary>
                            );
                        })}
                    </div>
                    <Button.Group>
                        <Menu.Root>
                            <Menu.Trigger>
                                <Button
                                    icon={
                                        <>
                                            <VscAdd size={14} />
                                            <VscChevronDown size={16} />
                                        </>
                                    }
                                    aria-label="Open shell"
                                    data-testid="open-shell"
                                    variant="ghost"
                                    size="fit"
                                    isToolTip
                                    toolTipContent="Open shell"
                                    toolTipPlace="bottom-end"
                                />
                            </Menu.Trigger>
                            <Menu.Content data-testid="console-shell-menu">
                                {getShellList.map((aItem: any) => {
                                    return (
                                        <Menu.Item key={aItem.id} onClick={() => handleAddShell(aItem)} icon={icons(aItem?.icon) ?? ''} data-testid={`shell-${encodeURIComponent(aItem.id)}`}>
                                            {aItem?.label ?? ''}
                                        </Menu.Item>
                                    );
                                })}
                            </Menu.Content>
                        </Menu.Root>
                        {sConsoleTab && sSelectedTab === sConsoleTab[0]?.id && (
                            <Button
                                icon={<VscTrash size={16} />}
                                aria-label="Clear"
                                variant="ghost"
                                size="icon"
                                isToolTip
                                toolTipContent="Clear"
                                toolTipPlace="bottom-end"
                                onClick={() => setConsoleList([])}
                            />
                        )}
                        <Button
                            icon={pTerminalSizes[1] === 40 ? <VscChevronUp size={16} /> : <VscChevronDown size={16} />}
                            variant="ghost"
                            size="icon"
                            // isToolTip
                            // toolTipContent={pTerminalSizes[1] === 40 ? 'Expand' : 'Collapse'}
                            // toolTipPlace="top"
                            onClick={pTerminalSizes[1] === 40 ? () => pSetTerminalSizes(['72%', '28%']) : () => pSetTerminalSizes(['', 40])}
                        />
                    </Button.Group>
                </div>
                <div className="console-body">
                    {sConsoleTab.map((aItem: any) => {
                        return (
                            <div key={aItem.id} className="active-console" style={aItem.id === sSelectedTab ? {} : { display: 'none' }}>
                                <div
                                    ref={(el) => {
                                        if (aItem.id === sSelectedTab && aItem.type === 'console') consoleRef.current = el;
                                    }}
                                    className={aItem.type === 'console' ? 'is-console' : 'display-none'}
                                    style={{ paddingTop: '4px' }}
                                >
                                    {!isEmpty(sConsoleList) &&
                                        sConsoleList.map((bItem: any, aIdx: number) => {
                                            return (
                                                <ErrorBoundary key={aIdx} name={`console-log:${aIdx}`} variant="inline" resetKeys={[bItem]}>
                                                <div
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
                                                </ErrorBoundary>
                                            );
                                        })}
                                </div>
                                {aItem.type === 'shell' && (
                                    <ErrorBoundary name={`console-shell:${aItem.id}`} variant="region">
                                        <Shell pSelectedTab={sSelectedTab} pType="bottom" pInfo={aItem} pId={aItem.id} />
                                    </ErrorBoundary>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </Page>
    );
};

export default Console;
