import { useEffect, useState } from 'react';
import useEsc from '@/hooks/useEsc';
import { ModInfo } from '../types';

export const useInlineEdit = (enabled: boolean, data: any, onSave?: (modInfo: ModInfo) => void) => {
    const [modInfo, setModInfo] = useState<ModInfo>({
        modBeforeInfo: { row: undefined, rowIdx: undefined },
        modAfterInfo: { row: undefined, rowIdx: undefined },
    });

    const resetModInfo = () => {
        setModInfo({
            modBeforeInfo: { row: undefined, rowIdx: undefined },
            modAfterInfo: { row: undefined, rowIdx: undefined },
        });
    };

    useEffect(() => {
        resetModInfo();
    }, [data]);

    useEsc(() => {
        if (enabled) resetModInfo();
    });

    const handleEdit = (row: string[], rowIdx: number) => {
        if (!enabled) return;
        setModInfo({ modBeforeInfo: { row, rowIdx }, modAfterInfo: { row, rowIdx } });
    };

    const handleMod = (e: React.MouseEvent | React.KeyboardEvent, row: string[], rowIdx: number) => {
        if (!enabled) return;
        if (e.type === 'keydown') {
            if ((e as React.KeyboardEvent).keyCode !== 13) return;
            e.stopPropagation();
            if (modInfo?.modBeforeInfo?.rowIdx !== undefined && modInfo?.modAfterInfo?.rowIdx !== undefined) return;
            handleEdit(row, rowIdx);
        }
        if (e.type === 'dblclick') {
            e.stopPropagation();
            handleEdit(row, rowIdx);
        }
    };

    const handleUpdateModInfo = (e: React.FormEvent<HTMLInputElement>, cellIdx: number) => {
        const updatedRow = JSON.parse(JSON.stringify(modInfo?.modAfterInfo?.row));
        updatedRow[cellIdx] = (e.target as HTMLInputElement).value;
        setModInfo((prev) => ({
            ...prev,
            modAfterInfo: { ...prev.modAfterInfo, row: updatedRow },
        }));
    };

    const handleSave = (e: React.MouseEvent | React.KeyboardEvent, _row: string[]) => {
        if (e.type === 'keydown' && (e as React.KeyboardEvent).keyCode !== 13) return;
        e.stopPropagation();
        onSave?.(modInfo);
    };

    const handleCancel = (e: React.MouseEvent | React.KeyboardEvent) => {
        if (e.type === 'keydown' && (e as React.KeyboardEvent).keyCode !== 13) return;
        e.stopPropagation();
        resetModInfo();
    };

    return { modInfo, handleMod, handleUpdateModInfo, handleSave, handleCancel, handleEdit };
};
