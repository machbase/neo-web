import { Dropdown } from '@/design-system/components';
import type { CSSProperties } from 'react';
import type { TagSelectionDraftItem } from './useTagSearchModalState';
import { getSourceTagName } from '../utils/legacy/LegacyConversion';

// Used by TagSelectionModeRow to type tag selection mode option.
type TagSelectionModeOption = {
    label: string;
    value: string;
    disabled: boolean | undefined;
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
    selectedSeriesDraft,
    options,
    onModeChange,
    triggerStyle,
}: {
    selectedSeriesDraft: TagSelectionDraftItem;
    options: TagSelectionModeOption[];
    onModeChange: (aValue: string) => void;
    triggerStyle: CSSProperties | undefined;
}) => {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
            <span style={DEFAULT_LABEL_STYLE}>{getSourceTagName(selectedSeriesDraft)}</span>
            <div
                style={{ width: '80px', flexShrink: 0 }}
                onClick={(aEvent) => aEvent.stopPropagation()}
            >
                <Dropdown.Root
                    options={options}
                    value={selectedSeriesDraft.calculationMode || 'avg'}
                    onChange={onModeChange}
                    className={undefined}
                    label={undefined}
                    labelPosition={undefined}
                    fullWidth={undefined}
                    style={undefined}
                    defaultValue={undefined}
                    onOpenChange={undefined}
                    disabled={undefined}
                    placeholder={undefined}
                >
                    <Dropdown.Trigger
                        className="dropdown-trigger-sm"
                        style={{ ...DEFAULT_TRIGGER_STYLE, ...triggerStyle }}
                        children={undefined}
                    />
                    <Dropdown.Menu className={undefined}>
                        <Dropdown.List children={undefined} className={undefined} />
                    </Dropdown.Menu>
                </Dropdown.Root>
            </div>
        </div>
    );
};

export default TagSelectionModeRow;
