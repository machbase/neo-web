import { Dropdown } from '@/design-system/components';
import type { CSSProperties } from 'react';
import { getSourceTagName } from '../../utils/legacy/LegacySeriesAdapter';
import type { TagSelectionDraftItem } from './tagSelectionTypes';

type TagSelectionModeOption = {
    label: string;
    value: string;
    disabled: boolean | undefined;
};

const DEFAULT_TRIGGER_STYLE: CSSProperties = {
    width: '100%',
};

const MODE_TRIGGER_WRAPPER_STYLE: CSSProperties = {
    width: '80px',
    flexShrink: 0,
};

const DEFAULT_LABEL_STYLE: CSSProperties = {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
};

/**
 * Renders a selected tag row with its aggregation-mode selector.
 * Intent: Keep the label and mode dropdown together while preventing click bubbling.
 * @param {{ selectedSeriesDraft: TagSelectionDraftItem; options: TagSelectionModeOption[]; onModeChange: (aValue: string) => void; triggerStyle: CSSProperties | undefined; }} props The selected draft row inputs.
 * @returns {JSX.Element} The rendered tag mode row.
 */
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
    const sSourceTagName = getSourceTagName(selectedSeriesDraft);

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
            <span style={DEFAULT_LABEL_STYLE} title={sSourceTagName}>
                {sSourceTagName}
            </span>
            <div
                style={MODE_TRIGGER_WRAPPER_STYLE}
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
