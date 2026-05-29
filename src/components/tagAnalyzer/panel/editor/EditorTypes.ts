import type {
    PanelAxes,
    PanelDisplay,
    PanelInfo,
    PanelYAxis,
} from '../../domain/PanelDomain';

export enum EditTabPanelType {
    General = 'General',
    Data = 'Data',
    Axes = 'Axes',
    Display = 'Display',
    Time = 'Time',
}

export type PanelYAxisDraft = PanelYAxis;

export type PanelSamplingDraft = PanelAxes['sampling'];

export type PanelAxesDraft = PanelAxes;

export type PanelDisplayDraft = PanelDisplay;

export type PanelEditorConfig = PanelInfo;

