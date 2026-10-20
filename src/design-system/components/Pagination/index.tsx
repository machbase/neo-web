import React, { useRef } from 'react';
import { Button } from '../Button';
import { Input } from '../Input';
import { MdKeyboardDoubleArrowLeft, MdOutlineKeyboardDoubleArrowRight } from 'react-icons/md';
import { ArrowLeft, ArrowRight } from '@/assets/icons/Icon';
import styles from './index.module.scss';

export interface PaginationProps {
    'data-testid'?: string;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onPageInputChange?: (value: string) => void;
    onPageInputApply?: (event: React.KeyboardEvent<HTMLInputElement> | string) => void;
    showTotalPage?: boolean;
    className?: string;
    style?: React.CSSProperties;
    inputValue?: string;
    showInputControl?: boolean;
}

const Pagination = React.forwardRef<HTMLDivElement, PaginationProps>(
    (
        {
            currentPage,
            showTotalPage = false,
            totalPages,
            onPageChange,
            onPageInputChange,
            onPageInputApply,
            className,
            style,
            inputValue = currentPage.toString(),
            showInputControl = true,
            'data-testid': testId,
        },
        ref
    ) => {
        const inputRef = useRef<HTMLInputElement>(null);

        const handleFirstPage = () => {
            onPageChange(1);
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
        };

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            // Allow empty string for clearing input, but validate numbers
            if (value === '' || /^\d+$/.test(value)) {
                onPageInputChange?.(value);
            }
        };

        const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            const input = e.currentTarget;
            const currentValue = parseInt(input.value, 10) || 0;

            // Handle arrow keys for incrementing/decrementing
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                const newValue = Math.min(currentValue + 1, totalPages);
                if (newValue >= 1) {
                    onPageInputChange?.(newValue.toString());
                }
                return;
            }

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const newValue = Math.max(currentValue - 1, 1);
                if (newValue >= 1) {
                    onPageInputChange?.(newValue.toString());
                }
                return;
            }

            // Handle Enter key
            if (e.key === 'Enter') {
                const pageNum = parseInt(input.value, 10);

                // Adjust page number if out of range
                let adjustedPageNum = pageNum;
                if (isNaN(pageNum) || pageNum < 1) {
                    adjustedPageNum = 1;
                } else if (pageNum > totalPages) {
                    adjustedPageNum = totalPages;
                }

                // Update input and trigger page change
                onPageChange(adjustedPageNum);

                // Call the optional apply callback if provided (for additional custom behavior)
                onPageInputApply?.(e);
            }
        };

        return (
            <div ref={ref} data-testid={testId} className={`${styles.pagination} ${className ?? ''}`} style={style}>
                <Button data-testid="first-page" variant="ghost" size="icon" disabled={currentPage === 1} onClick={handleFirstPage} aria-label="First page">
                    <MdKeyboardDoubleArrowLeft size={16} />
                </Button>

                <Button data-testid="previous-page" variant="ghost" size="icon" disabled={currentPage === 1} onClick={handlePreviousPage} aria-label="Previous page">
                    <ArrowLeft size={16} />
                </Button>

                {showInputControl && (
                    <Input
                        ref={inputRef}
                        data-testid="current-page"
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

                {showTotalPage && <span data-testid="total-pages" className={styles.totalPage}>/ {totalPages}</span>}

                <Button data-testid="next-page" variant="ghost" size="icon" disabled={currentPage >= totalPages} onClick={handleNextPage} aria-label="Next page">
                    <ArrowRight size={16} />
                </Button>

                <Button data-testid="last-page" variant="ghost" size="icon" disabled={currentPage >= totalPages} onClick={handleLastPage} aria-label="Last page">
                    <MdOutlineKeyboardDoubleArrowRight size={16} />
                </Button>
            </div>
        );
    }
);

Pagination.displayName = 'Pagination';

export default Pagination;
