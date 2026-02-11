import { useState, useRef, useEffect } from 'react';
import { Badge, Dropdown, Input, TextHighlight } from '@/design-system/components';
import styles from './eventsModal.module.scss';

export type DetectObjectPickerProps = {
    items: string[];
    options: string[];
    onAdd: (name: string) => void;
    onRemove: (name: string) => void;
    onItemClick?: (name: string) => void;
    placeholder?: string;
};

export const DetectObjectPicker = ({ items, options, onAdd, onRemove, onItemClick, placeholder = 'Select detect objects' }: DetectObjectPickerProps) => {
    const [search, setSearch] = useState('');
    const [focusedIdx, setFocusedIdx] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);

    const availableOptions = options.filter((d) => !items.includes(d));
    const filteredOptions = availableOptions.filter((d) => d.toLowerCase().includes(search.toLowerCase())).map((d) => ({ label: d, value: d }));

    // Reset focused index when search changes
    useEffect(() => {
        setFocusedIdx(0);
    }, [search]);

    // Apply keyboard focus styling to option elements
    useEffect(() => {
        const menuEl = menuRef.current;
        if (!menuEl) return;
        const optionEls = menuEl.querySelectorAll('[role="option"]');
        optionEls.forEach((el, i) => {
            el.classList.toggle(styles['detect-option--focused'], i === focusedIdx);
        });
        optionEls[focusedIdx]?.scrollIntoView({ block: 'nearest' });
    }, [focusedIdx, filteredOptions]);

    const handleAdd = (val: string) => {
        onAdd(val);
        setSearch('');
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setFocusedIdx((prev) => Math.min(prev + 1, filteredOptions.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setFocusedIdx((prev) => Math.max(prev - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (filteredOptions[focusedIdx]) {
                    // Programmatically click the focused option to go through Dropdown's handleSelect
                    const optionEls = menuRef.current?.querySelectorAll('[role="option"]');
                    (optionEls?.[focusedIdx] as HTMLElement)?.click();
                }
                break;
        }
        e.stopPropagation();
    };

    return (
        <Dropdown.Root fullWidth options={filteredOptions} placeholder={placeholder} value="" onChange={handleAdd}>
            <Dropdown.Trigger style={{ minHeight: '44px', height: 'auto', padding: '8px 12px' }}>
                {() => (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
                        {items.map((name) => (
                            <div
                                key={name}
                                onClick={(e) => {
                                    if (onItemClick) {
                                        e.stopPropagation();
                                        onItemClick(name);
                                    }
                                }}
                                style={onItemClick ? { cursor: 'pointer' } : undefined}
                            >
                                <Badge variant="primary">
                                    <TextHighlight variant="neutral" style={{ whiteSpace: 'pre-wrap' }}>
                                        {name}
                                    </TextHighlight>
                                    <span
                                        className={styles['detect-remove']}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemove(name);
                                        }}
                                    >
                                        <TextHighlight style={{ whiteSpace: 'pre-wrap', cursor: 'inherit' }}>✕</TextHighlight>
                                    </span>
                                </Badge>
                            </div>
                        ))}
                        <TextHighlight variant="muted" style={{ fontSize: '13px' }}>
                            {items.length > 0 ? '+ Add more...' : placeholder}
                        </TextHighlight>
                    </div>
                )}
            </Dropdown.Trigger>
            <Dropdown.Menu>
                <div ref={menuRef}>
                    <div className={styles['detect-search']} onClick={(e) => e.stopPropagation()}>
                        <Input size="md" fullWidth value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." autoFocus onKeyDown={handleSearchKeyDown} />
                    </div>
                    {filteredOptions.length === 0 ? <div className={styles['detect-empty']}>No results found</div> : <Dropdown.List />}
                </div>
            </Dropdown.Menu>
        </Dropdown.Root>
    );
};
