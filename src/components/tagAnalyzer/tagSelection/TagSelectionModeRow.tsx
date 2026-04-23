import { Dropdown } from '@/design-system/components';
import { getSourceTagName } from '../utils/legacy/LegacySeriesAdapter';
import {
    DEFAULT_LABEL_STYLE,
    DEFAULT_TRIGGER_STYLE,
    MODE_TRIGGER_WRAPPER_STYLE,
} from './TagSelectionConstants';
import type { TagSelectionModeRowProps } from './TagSelectionTypes';

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
}: TagSelectionModeRowProps) => {
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
