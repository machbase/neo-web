import type { CSSProperties } from 'react';
import InnerLine from '@/assets/image/img_chart_01.png';
import Scatter from '@/assets/image/img_chart_02.png';
import Line from '@/assets/image/img_chart_03.png';
import type { PanelEChartType } from '../../domain/PanelDomain';
import { EditTabPanelType } from './EditorTypes';

type ChartTypeOption = {
    type: PanelEChartType;
    src?: string;
    alt: string;
};

export const EDITOR_TABS: EditTabPanelType[] = [
    EditTabPanelType.General,
    EditTabPanelType.Data,
    EditTabPanelType.Axes,
    EditTabPanelType.Display,
    EditTabPanelType.Time,
];

export const EDITOR_X_AXIS_INPUT_STYLE: CSSProperties = {
    width: '96px',
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
    { type: 'Custom', alt: 'Custom Chart' },
];
