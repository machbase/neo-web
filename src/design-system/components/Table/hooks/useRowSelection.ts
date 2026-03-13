import { useRef, useState } from 'react';
import useOutsideClick from '@/hooks/useOutsideClick';

export const useRowSelection = (enabled: boolean, onRowSelect?: (row: string[]) => void) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeItem, setActiveItem] = useState<string[]>();

    useOutsideClick(containerRef, () => {
        if (enabled) setActiveItem([]);
    });

    const handleRowClick = (e: React.MouseEvent, row: string[]) => {
        if (!enabled) return;
        e.stopPropagation();
        setActiveItem(row);
        onRowSelect?.(row);
    };

    const checkActiveRow = (row: string[], idx: number): string => {
        const classes: string[] = ['result-body-tr'];
        if (enabled && activeItem && row?.join() === activeItem.join()) classes.push('active-row');
        if (Number(idx) % 2 !== 0) classes.push('dark-odd');
        return classes.join(' ');
    };

    return { containerRef, activeItem, handleRowClick, checkActiveRow };
};
