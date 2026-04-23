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

export const CHART_TYPE_OPTIONS: ChartTypeOption[] = [
    { type: 'Zone', src: InnerLine, alt: 'Zone Chart' },
    { type: 'Dot', src: Scatter, alt: 'Dot Chart' },
    { type: 'Line', src: Line, alt: 'Line Chart' },
];

export const OVERLAP_TIME_SHIFT_COLORS = [
    '#EB5757',
    '#6FCF97',
    '#9C8FFF',
    '#F5AA64',
    '#BB6BD9',
    '#B4B4B4',
    '#FFD95F',
    '#2D9CDB',
    '#C3A080',
    '#B4B4B4',
    '#6B6B6B',
];
