import type { CSSProperties } from 'react';
import InnerLine from '@/assets/image/img_chart_01.png';
import Scatter from '@/assets/image/img_chart_02.png';
import Line from '@/assets/image/img_chart_03.png';
import type { ChartTypeOption, EditTabPanelType } from './EditorTypes';

export const EDITOR_TABS: EditTabPanelType[] = ['General', 'Data', 'Axes', 'Display', 'Time'];

export const PANEL_TAG_LIMIT = 12;

export const AXES_SECTION_STYLE: CSSProperties = {
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'start',
    justifyContent: 'start',
};

export const EDITOR_X_AXIS_INPUT_STYLE: CSSProperties = {
    width: '150px',
    height: '30px',
};

export const EDITOR_AXIS_COMPACT_INPUT_STYLE: CSSProperties = {
    width: '48px',
};

export const EDITOR_AXIS_THRESHOLD_INPUT_STYLE: CSSProperties = {
    width: '80px',
};

export const EDITOR_RIGHT_AXIS_TRIGGER_STYLE: CSSProperties = {
    width: '200px',
};

export const CHART_TYPE_OPTIONS: ChartTypeOption[] = [
    { type: 'Zone', src: InnerLine, alt: 'Zone Chart' },
    { type: 'Dot', src: Scatter, alt: 'Dot Chart' },
    { type: 'Line', src: Line, alt: 'Line Chart' },
];
