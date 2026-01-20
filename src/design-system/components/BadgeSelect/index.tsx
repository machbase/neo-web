import { useRef, useState, ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown } from '@/assets/icons/Icon';
import { Tooltip } from 'react-tooltip';
import styles from './index.module.scss';

export type BadgeSelectItem = {
    name: string;
    color: string;
    idx: number;
    label?: string;
};

type BadgeSelectItemProps = {
    item: BadgeSelectItem;
};

const BadgeSelectItem = ({ item }: BadgeSelectItemProps) => {
    return (
        <div className={styles.badgeItem} style={{ boxShadow: `inset 4px 0 0 0 ${item.color}` }}>
            {item.label ? (
                <div className={styles.badgeLabel} style={{ backgroundColor: item.color }}>
                    {item.label}
                </div>
            ) : null}
            <span>{item.name}</span>
        </div>
    );
};

export type BadgeSelectProps = {
    selectedList: number[];
    list: BadgeSelectItem[];
    onChange: (item: BadgeSelectItem) => void;
    placeholder?: string;
    disabled?: boolean;
    label?: string | ReactNode;
    labelPosition?: 'top' | 'left';
    fullWidth?: boolean;
    style?: React.CSSProperties;
    className?: string;
};

export const BadgeSelect = ({
    selectedList,
    list,
    onChange,
    placeholder,
    disabled = false,
    label,
    labelPosition = 'top',
    fullWidth = false,
    style,
    className,
}: BadgeSelectProps) => {
    const selectorRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0, showAbove: false });

    const handleClick = (item: BadgeSelectItem) => {
        onChange(item);
        setIsOpen(false);
    };

    const handleToggle = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
        }
    };

    // Calculate dropdown position
    useEffect(() => {
        if (isOpen && selectorRef.current) {
            const rect = selectorRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const spaceBelow = viewportHeight - rect.bottom;
            const spaceAbove = rect.top;
            const gap = 4;

            // Render above if insufficient space below and more space available above
            const shouldShowAbove = spaceBelow < 150 && spaceAbove > spaceBelow;

            let top: number;
            if (shouldShowAbove) {
                // Show above: position dropdown bottom at trigger top
                top = rect.top - gap;
            } else {
                // Show below: position dropdown top at trigger bottom
                top = rect.bottom + gap;
            }

            setPosition({
                top,
                left: rect.left,
                width: rect.width,
                showAbove: shouldShowAbove,
            });
        }
    }, [isOpen]);

    // Update position on scroll and resize
    useEffect(() => {
        if (!isOpen) return;

        const updatePosition = () => {
            if (selectorRef.current) {
                const rect = selectorRef.current.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const spaceBelow = viewportHeight - rect.bottom;
                const spaceAbove = rect.top;
                const gap = 4;

                const shouldShowAbove = spaceBelow < 150 && spaceAbove > spaceBelow;

                let top: number;
                if (shouldShowAbove) {
                    top = rect.top - gap;
                } else {
                    top = rect.bottom + gap;
                }

                setPosition({
                    top,
                    left: rect.left,
                    width: rect.width,
                    showAbove: shouldShowAbove,
                });
            }
        };

        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen]);

    // Handle outside click for Portal-rendered dropdown
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const isClickInsideContainer = selectorRef.current?.contains(target);
            const isClickInsideDropdown = dropdownRef.current?.contains(target);

            if (!isClickInsideContainer && !isClickInsideDropdown) {
                setIsOpen(false);
            }
        };

        const handleEscKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscKey);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscKey);
        };
    }, [isOpen]);

    const selectedItems = list.filter((item) => selectedList?.includes(item.idx));

    const badgeSelectId = `badge-select-${Math.random().toString(36).substring(2, 11)}`;

    const containerClasses = [
        styles.badgeSelectContainer,
        styles[`badgeSelectContainer--label-${labelPosition}`],
        fullWidth && styles['badgeSelectContainer--full-width'],
        className,
    ]
        .filter(Boolean)
        .join(' ');

    const selectClasses = [styles.badgeSelect, isOpen && styles.open].filter(Boolean).join(' ');

    const selectedBoxClasses = [styles.selectedBox, isOpen && styles['selectedBox--open'], disabled && styles.disabled].filter(Boolean).join(' ');

    const labelElement = label && (
        <label htmlFor={badgeSelectId} className={styles.label}>
            {label}
        </label>
    );

    const dropdownElement = isOpen && !disabled && (
        <div
            ref={dropdownRef}
            className={styles.dropdown}
            style={{
                position: 'fixed',
                ...(position.showAbove
                    ? {
                          bottom: `${window.innerHeight - position.top}px`,
                          top: 'auto',
                      }
                    : {
                          top: `${position.top}px`,
                      }),
                left: `${position.left}px`,
                width: `${position.width}px`,
            }}
        >
            <div className={styles.dropdownBox}>
                {list?.map((item, idx) => (
                    <div key={idx}>
                        <button
                            className={`badge-select-tooltip-${idx} ${styles.dropdownItem} ${selectedList?.includes(item.idx) ? styles.activeItem : ''}`}
                            onClick={() => handleClick(item)}
                            style={{ boxShadow: `inset 4px 0 0 0 ${item.color}` }}
                        >
                            {item.label ? (
                                <div className={styles.badgeLabel} style={{ backgroundColor: item.color }}>
                                    {item.label}
                                </div>
                            ) : null}
                            <span className={styles.dropdownItemText}>{item.name}</span>
                        </button>
                        <Tooltip anchorSelect={`.badge-select-tooltip-${idx}`} content={item.name} />
                    </div>
                ))}
            </div>
        </div>
    );

    const selectElement = (
        <div ref={selectorRef} className={selectClasses} id={badgeSelectId}>
            <div className={selectedBoxClasses} onClick={handleToggle}>
                <div className={styles.selectedItems}>
                    {selectedItems.length > 0 ? (
                        selectedItems.map((item, idx) => <BadgeSelectItem key={`${item.name}-${item.idx}-${idx}`} item={item} />)
                    ) : placeholder ? (
                        <span className={styles.placeholder}>{placeholder}</span>
                    ) : null}
                </div>
                <div className={styles.arrowIcon}>
                    <ArrowDown />
                </div>
            </div>
            {dropdownElement && createPortal(dropdownElement, document.body)}
        </div>
    );

    return (
        <div className={containerClasses} style={style}>
            {labelPosition === 'top' && labelElement}
            <div className={styles.fieldWrapper}>
                {labelPosition === 'left' && labelElement}
                {selectElement}
            </div>
        </div>
    );
};
