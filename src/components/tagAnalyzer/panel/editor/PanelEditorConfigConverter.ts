import type { PanelInfo } from '../../domain/PanelDomain';
import type { PanelSeriesDefinition } from '../../domain/SeriesDomain';
import type { PanelEditorConfig } from './EditorTypes';

export type PanelEditorPanelState = PanelInfo;

export function convertPanelStateToEditorConfig(
    panelInfo: PanelInfo,
): PanelEditorConfig {
    return {
        ...panelInfo,
        data: {
            ...panelInfo.data,
            tag_set: normalizeTagSetForRightYAxis(
                panelInfo.data.tag_set,
                panelInfo.axes.right_y_axis_enabled,
            ),
        },
    };
}

export function mergeEditorConfigIntoPanelState(
    _basePanelState: PanelEditorPanelState,
    editorConfig: PanelEditorConfig,
): PanelEditorPanelState {
    return {
        ...editorConfig,
        data: {
            ...editorConfig.data,
            tag_set: normalizeTagSetForRightYAxis(
                editorConfig.data.tag_set,
                editorConfig.axes.right_y_axis_enabled,
            ),
        },
    };
}

function normalizeTagSetForRightYAxis(
    tagSet: PanelSeriesDefinition[],
    rightYAxisEnabled: boolean,
): PanelSeriesDefinition[] {
    return rightYAxisEnabled
        ? tagSet
        : tagSet.map((series) => ({
              ...series,
              useSecondaryAxis: false,
          }));
}
