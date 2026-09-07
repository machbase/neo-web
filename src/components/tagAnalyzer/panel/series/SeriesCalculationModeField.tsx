import { Dropdown } from '@/design-system/components';
import {
    normalizePanelSeriesCalculationMode,
    TAG_ANALYZER_AGGREGATION_MODE_OPTIONS,
    type PanelSeriesCalculationMode,
} from '../../seriesModel';

export function SeriesCalculationModeField({
    value,
    onChange,
    className = 'dropdown-trigger-sm',
}: {
    value: PanelSeriesCalculationMode;
    onChange: (mode: PanelSeriesCalculationMode) => void;
    className?: string;
}) {
    return (
        <Dropdown.Root
            options={CALCULATION_MODE_OPTIONS}
            value={value}
            onChange={(value) => {
                const mode = normalizePanelSeriesCalculationMode(value);
                if (mode) onChange(mode);
            }}
        >
            <Dropdown.Trigger data-testid="calculation-mode" className={className} style={{ width: '100%' }} />
            <Dropdown.Menu>
                <Dropdown.List />
            </Dropdown.Menu>
        </Dropdown.Root>
    );
}

// -------------------- Local --------------------

const CALCULATION_MODE_OPTIONS = TAG_ANALYZER_AGGREGATION_MODE_OPTIONS.map(
    (option) => ({
        ...option,
        testId: `calculation-mode-option-${encodeURIComponent(option.value)}`,
    }),
);
