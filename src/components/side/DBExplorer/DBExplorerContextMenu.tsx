import { Delete } from '@/assets/icons/Icon';
import { ContextMenu } from '@/design-system/components';

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
    try {
        const dropTable = (e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            pCallback(E_DB_DDL.DELETE, pContextInfo.options);
        };
        const closeContextMenu = () => {
            pCallback('', pContextInfo.options);
        };

        return (
            <ContextMenu isOpen={pContextInfo.open} position={{ x: pContextInfo.x, y: pContextInfo.y }} onClose={closeContextMenu}>
                <ContextMenu.Item onClick={dropTable}>
                    <Delete />
                    <span>Drop table</span>
                </ContextMenu.Item>
            </ContextMenu>
        );
    } catch (error) {
        console.error('DBExplorerContextMenu render ERROR:', error);
        return null;
    }
};
