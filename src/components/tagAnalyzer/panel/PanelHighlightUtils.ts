import type { ResolvedTimeRangeMs } from '../time/TimeTypes';
import {
    DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
    DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
    type PanelHighlight,
} from '../PanelModelTypes';

const DEFAULT_HIGHLIGHT_LABEL = 'unnamed';

export function appendPanelHighlight(
    highlights: PanelHighlight[],
    timeRange: ResolvedTimeRangeMs,
    labelText: string = DEFAULT_HIGHLIGHT_LABEL,
    fillColor: string = DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
    textColor: string = DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
): PanelHighlight[] {
    return [
        ...highlights,
        {
            text: labelText.trim() || DEFAULT_HIGHLIGHT_LABEL,
            timeRange: timeRange,
            fillColor: fillColor,
            textColor: textColor,
        },
    ];
}

export function updatePanelHighlight(
    highlights: PanelHighlight[],
    highlightIndex: number,
    labelText: string,
    fillColor: string,
    textColor: string,
): PanelHighlight[] | undefined {
    if (!highlights[highlightIndex]) {
        return undefined;
    }

    const sNextLabelText = labelText.trim() || DEFAULT_HIGHLIGHT_LABEL;

    return highlights.map((highlight, index) =>
        index === highlightIndex
            ? {
                  ...highlight,
                  text: sNextLabelText,
                  fillColor: fillColor,
                  textColor: textColor,
              }
            : highlight,
    );
}

export { DEFAULT_HIGHLIGHT_LABEL };
