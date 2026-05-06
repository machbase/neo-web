import type { ResolvedTimeRangeMs } from '../time/TimeTypes';
import type { PanelHighlight } from '../utils/panelModelTypes';

const DEFAULT_HIGHLIGHT_LABEL = 'unnamed';

export function appendPanelHighlight(
    highlights: PanelHighlight[],
    timeRange: ResolvedTimeRangeMs,
    labelText: string = DEFAULT_HIGHLIGHT_LABEL,
): PanelHighlight[] {
    return [
        ...highlights,
        {
            text: labelText.trim() || DEFAULT_HIGHLIGHT_LABEL,
            timeRange: timeRange,
        },
    ];
}

export function renamePanelHighlight(
    highlights: PanelHighlight[],
    highlightIndex: number,
    labelText: string,
): PanelHighlight[] | undefined {
    if (!highlights[highlightIndex]) {
        return undefined;
    }

    const sNextLabelText = labelText.trim() || DEFAULT_HIGHLIGHT_LABEL;

    return highlights.map((highlight, index) =>
        index === highlightIndex ? { ...highlight, text: sNextLabelText } : highlight,
    );
}

export { DEFAULT_HIGHLIGHT_LABEL };
