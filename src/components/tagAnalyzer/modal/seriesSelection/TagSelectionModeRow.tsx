import { Dropdown } from '@/design-system/components';
import {
    DEFAULT_LABEL_STYLE,
    DEFAULT_TRIGGER_STYLE,
    MODE_TRIGGER_WRAPPER_STYLE,
} from './TagSelectionConstants';
import type { CSSProperties } from 'react';
import type {
    TagSelectionDraftItem,
    TagSelectionModeOption,
} from './TagSelectionTypes';

const TagSelectionModeRow = ({
    selectedSeriesDraft,
    options,
    onModeChange,
    triggerStyle,
}: {
    selectedSeriesDraft: TagSelectionDraftItem;
    options: TagSelectionModeOption[];
    onModeChange: (value: string) => void;
    triggerStyle?: CSSProperties;
}) => {
    const sSourceTagName = selectedSeriesDraft.sourceTagName;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
            <span style={DEFAULT_LABEL_STYLE} title={sSourceTagName}>
                {sSourceTagName}
            </span>
            <div
                style={MODE_TRIGGER_WRAPPER_STYLE}
                onClick={(event) => event.stopPropagation()}
            >
                <Dropdown.Root
                    options={options}
                    value={selectedSeriesDraft.calculationMode || 'avg'}
                    onChange={onModeChange}
                >
                    <Dropdown.Trigger
                        className="dropdown-trigger-sm"
                        style={{ ...DEFAULT_TRIGGER_STYLE, ...triggerStyle }}
                    />
                    <Dropdown.Menu>
                        <Dropdown.List />
                    </Dropdown.Menu>
                </Dropdown.Root>
            </div>
        </div>
    );
};

export default TagSelectionModeRow;
