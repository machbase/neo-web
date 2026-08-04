import type { ContextMenuPosition } from '@/design-system/components';
import type { AxisRange } from '../range/rangeModel';

export const DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR = '#fdb532';
export const DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR = '#fdb532';
export const DEFAULT_PANEL_HIGHLIGHT_LABEL = 'unnamed';
export const DEFAULT_SERIES_ANNOTATION_FILL_COLOR = '#fff4b8';
export const DEFAULT_SERIES_ANNOTATION_TEXT_COLOR = '#161616';
export const DEFAULT_SERIES_ANNOTATION_LABEL = 'note';

export type PanelHighlight = {
    text: string;
    timeRange: AxisRange;
    fillColor: string;
    textColor: string;
};

export type PanelAnnotation = PanelHighlight & {
    seriesKey: string;
    clip: boolean;
};

export function createPanelHighlightDraft(
    timeRange: AxisRange,
): PanelHighlight {
    return {
        text: DEFAULT_PANEL_HIGHLIGHT_LABEL,
        timeRange: { ...timeRange },
        fillColor: DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
        textColor: DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
    };
}

export type AnnotationEditorSession =
    | {
          kind: 'create';
          position: ContextMenuPosition;
          timestamp: number;
          seriesKey?: string;
      }
    | {
          kind: 'edit';
          position: ContextMenuPosition;
          annotationIndex: number;
      };

export type HighlightEditorSession =
    | {
          kind: 'create';
          position: ContextMenuPosition;
          initialHighlight: PanelHighlight;
      }
    | {
          kind: 'edit';
          position: ContextMenuPosition;
          highlightIndex: number;
      };
