import type { ContextMenuPosition } from '@/design-system/components';
import type { PanelHighlight } from '../panel/panelModel';

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
