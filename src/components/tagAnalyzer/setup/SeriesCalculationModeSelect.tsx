import type { CSSProperties } from 'react';
import { Dropdown } from '@/design-system/components';
import {
    normalizePanelSeriesCalculationMode,
    type PanelSeriesCalculationMode,
    TAG_ANALYZER_AGGREGATION_MODE_OPTIONS,
} from '../seriesModel';

export function SeriesCalculationModeSelect({
    value,
    onChange,
    className,
    style,
}: {
    value: PanelSeriesCalculationMode;
    onChange: (mode: PanelSeriesCalculationMode) => void;
    className?: string;
    style?: CSSProperties;
}) {
    return (
        <Dropdown.Root
            options={TAG_ANALYZER_AGGREGATION_MODE_OPTIONS}
            value={value}
            onChange={(nextValue) => {
                const mode = normalizePanelSeriesCalculationMode(nextValue);
                if (mode) onChange(mode);
            }}
        >
            <Dropdown.Trigger className={className} style={style} />
            <Dropdown.Menu>
                <Dropdown.List />
            </Dropdown.Menu>
        </Dropdown.Root>
    );
}
