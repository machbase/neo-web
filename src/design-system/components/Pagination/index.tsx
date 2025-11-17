import React, { useRef } from 'react';
import { Button } from '../Button';
import { Input } from '../Input';
import { MdKeyboardDoubleArrowLeft, MdOutlineKeyboardDoubleArrowRight } from 'react-icons/md';
import { ArrowLeft, ArrowRight } from '@/assets/icons/Icon';
import styles from './index.module.scss';

export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onPageInputChange?: (value: string) => void;
    onPageInputApply?: (event: React.KeyboardEvent<HTMLInputElement> | string) => void;
    className?: string;
    style?: React.CSSProperties;
    inputValue?: string;
    showInputControl?: boolean;
}

const Pagination = React.forwardRef<HTMLDivElement, PaginationProps>(
    ({ currentPage, totalPages, onPageChange, onPageInputChange, onPageInputApply, className, style, inputValue = currentPage.toString(), showInputControl = true }, ref) => {
        const inputRef = useRef<HTMLInputElement>(null);

        const handleFirstPage = () => {
            onPageChange(1);
            onPageInputApply?.('outsideClick');
        };

        const handlePreviousPage = () => {
            if (currentPage > 1) {
                onPageChange(currentPage - 1);
            }
        };

        const handleNextPage = () => {
            if (currentPage < totalPages) {
                onPageChange(currentPage + 1);
            }
        };

        const handleLastPage = () => {
            onPageChange(totalPages);
            onPageInputApply?.('outsideClick');
        };

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            // Allow empty string for clearing input, but validate numbers
            if (value === '' || /^\d+$/.test(value)) {
                onPageInputChange?.(value);
            }
        };

        const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            // Validate page number before applying
            const input = e.currentTarget;
            const pageNum = parseInt(input.value, 10);

            // Only apply if valid page number
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                onPageInputApply?.(e);
            } else if (input.value === '') {
                // Allow empty string (user clearing input)
                onPageInputApply?.(e);
            }
        };

        return (
            <div ref={ref} className={`${styles.pagination} ${className ?? ''}`} style={style}>
                <Button variant="ghost" size="icon" disabled={currentPage === 1} onClick={handleFirstPage} aria-label="First page">
                    <MdKeyboardDoubleArrowLeft size={16} />
                </Button>

                <Button variant="ghost" size="icon" disabled={currentPage === 1} onClick={handlePreviousPage} aria-label="Previous page">
                    <ArrowLeft size={16} />
                </Button>

                {showInputControl && (
                    <Input
                        ref={inputRef}
                        type="text"
                        inputMode="numeric"
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleInputKeyDown}
                        size="sm"
                        placeholder="Page"
                        aria-label="Current page number"
                    />
                )}

                <Button variant="ghost" size="icon" disabled={currentPage >= totalPages} onClick={handleNextPage} aria-label="Next page">
                    <ArrowRight size={16} />
                </Button>

                <Button variant="ghost" size="icon" disabled={currentPage >= totalPages} onClick={handleLastPage} aria-label="Last page">
                    <MdOutlineKeyboardDoubleArrowRight size={16} />
                </Button>
            </div>
        );
    }
);

Pagination.displayName = 'Pagination';

export default Pagination;
