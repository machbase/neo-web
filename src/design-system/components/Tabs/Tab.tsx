import icons from '@/utils/icons';
import { isBoardSaved } from '@/utils/boardSaveStatus';
import React, { useEffect, useState } from 'react';
import { SaveCricle } from '@/assets/icons/Icon';
import styles from './Tab.module.scss';

interface TabProps {
    pBoard: any;
    pSelectedTab: string;
    pIdx: number;
    pTabDragInfo: any;
    pSetSelectedTab: (boardId: string) => void;
    pSetTabDragInfo: (info: any) => void;
    pOnCloseTab: (boardId: string) => void;
    pOnContextMenu: (event: React.MouseEvent<HTMLButtonElement>, boardId: string) => void;
}

const Tab = ({ pBoard, pSelectedTab, pSetSelectedTab, pIdx, pTabDragInfo, pSetTabDragInfo, pOnCloseTab, pOnContextMenu }: TabProps) => {
    const [sHover, setHover] = useState(false);
    const [sIsSaved, setIsSaved] = useState<boolean>(false);

    useEffect(() => {
        compareValue(pBoard);
    }, [pBoard]);

    const closeTab = (aEvent: React.MouseEvent) => {
        aEvent.stopPropagation();
        pOnCloseTab(pBoard.id);
    };

    const handleHover = (aValue: boolean) => {
        setHover(aValue);
    };

    const compareValue = (aBoard: any) => {
        setIsSaved(isBoardSaved(aBoard));
    };
    const handleDragStart = () => {
        pSetSelectedTab(pBoard.id);
        pSetTabDragInfo((prev: any) => ({ ...prev, start: pIdx }));
    };
    const handleDragEnd = (e: any) => {
        e.stopPropagation();
        pSetTabDragInfo((prev: any) => ({ ...prev, end: true }));
    };
    const handleDragOver = (e: any) => {
        e.preventDefault();
    };
    const handleAuxClick = (e: React.MouseEvent) => {
        if (e && e.button === 1 && e.type === 'auxclick') {
            e.preventDefault();
            closeTab(e);
        }
    };

    const getDragStyle = (): React.CSSProperties => {
        const start = pTabDragInfo.start;
        const over = pTabDragInfo.over;
        if (start === undefined || over === undefined || start === over) return {};

        if (pIdx === start) {
            return { visibility: 'hidden' as const };
        }

        const TAB_WIDTH = 200;
        if (start < over && pIdx > start && pIdx <= over) {
            return { transform: `translateX(-${TAB_WIDTH}px)`, transition: 'transform 0.2s ease' };
        }
        if (start > over && pIdx >= over && pIdx < start) {
            return { transform: `translateX(${TAB_WIDTH}px)`, transition: 'transform 0.2s ease' };
        }

        return { transform: 'translateX(0)', transition: 'transform 0.2s ease' };
    };

    return (
        <button
            onClick={() => pSetSelectedTab(pBoard.id)}
            onContextMenu={(event) => pOnContextMenu(event, pBoard.id)}
            onMouseEnter={() => handleHover(true)}
            onMouseLeave={() => handleHover(false)}
            className={pSelectedTab === pBoard.id ? `${styles.tab_button} ${styles.tab_select}` : `${styles.tab_button} ${styles.tab_none_select}`}
            style={getDragStyle()}
        >
            <div
                // add event
                draggable
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onAuxClick={handleAuxClick}
                className={styles['tab-inner']}
            >
                <span className={styles['tab-name']}>
                    <div style={{ display: 'flex', alignItems: 'center', width: '19px' }}>{icons(pBoard.type === 'term' ? pBoard.shell.icon : pBoard.type)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '0 !important' }}>
                        <span className={styles['tab-text']}>{pBoard.name}</span>
                    </div>
                </span>
                <span style={{ width: '16px' }}>
                    {sHover ? (
                        <span className={styles['tab_close']} onClick={closeTab}>
                            {icons('close')}
                        </span>
                    ) : sIsSaved ? (
                        <span className={styles['default-form']} />
                    ) : (
                        <span className={styles['off-saved']}>
                            <SaveCricle size={10} style={{ paddingRight: '6px' }} />
                        </span>
                    )}
                </span>
            </div>
        </button>
    );
};
export default Tab;
