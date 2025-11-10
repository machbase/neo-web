import './DBExplorerContextMenu.scss';
import { Delete } from '@/assets/icons/Icon';
import Menu from '@/components/contextMenu/Menu';
import useOutsideClick from '@/hooks/useOutsideClick';
import { useRef } from 'react';

export interface DB_EXPLORER_CONTEXT_MENU_TYPE {
    open: boolean;
    x: number;
    y: number;
    options: {
        table: (string | number)[];
        userNm: string;
        permissions: number;
    };
}
export const TABLE_CONTEXT_MENU_INITIAL_VALUE = {
    open: false,
    x: 0,
    y: 0,
    options: { table: [] as (string | number)[], userNm: '', permissions: 0 },
};
export enum E_DB_DDL {
    'SELECT',
    'DELETE',
    'UPDATE',
    'INSERT',
}

export const DBExplorerContextMenu = ({
    pContextInfo,
    pCallback,
}: {
    pContextInfo: DB_EXPLORER_CONTEXT_MENU_TYPE;
    pCallback: (key: E_DB_DDL | '', options: typeof TABLE_CONTEXT_MENU_INITIAL_VALUE.options) => void;
}) => {
    const MenuRef = useRef<HTMLDivElement>(null);

    const dropTable = () => {
        pCallback(E_DB_DDL.DELETE, pContextInfo.options);
    };
    const closeContextMenu = () => {
        pCallback('', pContextInfo.options);
    };

    useOutsideClick(MenuRef, () => closeContextMenu());

    return (
        <div ref={MenuRef} className="db-explorer-context-menu" style={{ top: pContextInfo.y, left: pContextInfo.x }}>
            <Menu isOpen={pContextInfo.open}>
                <Menu.Item onClick={dropTable}>
                    <Delete />
                    <span>Drop table</span>
                </Menu.Item>
            </Menu>
        </div>
    );
};
