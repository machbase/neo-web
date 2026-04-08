import { Dropdown } from '@/design-system/components';
import type { CSSProperties } from 'react';
import type { TagSearchSelectionItem } from './useTagSearchModalState';

type TagSelectionModeOption = {
    label: string;
    value: string;
};

const DEFAULT_TRIGGER_STYLE: CSSProperties = {
    width: '100%',
};

const DEFAULT_LABEL_STYLE: CSSProperties = {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
};

const TagSelectionModeRow = ({
    item,
    options,
    onModeChange,
    triggerStyle,
}: {
    item: TagSearchSelectionItem;
    options: TagSelectionModeOption[];
    onModeChange: (aValue: string) => void;
    triggerStyle?: CSSProperties;
}) => {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
            <span style={DEFAULT_LABEL_STYLE}>{item.tagName}</span>
            <div style={{ width: '80px', flexShrink: 0 }} onClick={(aEvent) => aEvent.stopPropagation()}>
                <Dropdown.Root options={options} value={item.calculationMode || 'avg'} onChange={onModeChange}>
                    <Dropdown.Trigger className="dropdown-trigger-sm" style={{ ...DEFAULT_TRIGGER_STYLE, ...triggerStyle }} />
                    <Dropdown.Menu>
                        <Dropdown.List />
                    </Dropdown.Menu>
                </Dropdown.Root>
            </div>
        </div>
    );
};

export default TagSelectionModeRow;
