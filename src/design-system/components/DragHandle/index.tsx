import { HTMLAttributes, useState, useEffect } from 'react';
import styles from './index.module.scss';

export interface DragHandleProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onMouseDown' | 'onMouseMove' | 'onMouseUp'> {
    /** Orientation of the drag handle */
    variant?: 'vertical' | 'horizontal';
    /** Additional className */
    className?: string;
    /** Mouse down handler */
    onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
    /** Mouse move handler */
    onMouseMove?: (e: MouseEvent) => void;
    /** Mouse up handler */
    onMouseUp?: (e: MouseEvent) => void;
}

export const DragHandle = ({ variant = 'vertical', className, onMouseDown, onMouseMove, onMouseUp, ...props }: DragHandleProps) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        setIsDragging(true);
        onMouseDown?.(e);
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMove = (e: MouseEvent) => {
            onMouseMove?.(e);
        };

        const handleUp = (e: MouseEvent) => {
            setIsDragging(false);
            onMouseUp?.(e);
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);

        return () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
        };
    }, [isDragging, onMouseMove, onMouseUp]);

    return (
        <div
            {...props}
            onMouseDown={handleMouseDown}
            className={[
                styles['drag-handle'],
                variant === 'horizontal' ? styles['drag-handle--horizontal'] : '',
                isDragging ? styles['drag-handle--dragging'] : '',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
        />
    );
};
