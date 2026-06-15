import type { ContextMenuPosition } from '@/design-system/components';

export type HighlightEditorState =
    | {
          mode: 'create';
          position: ContextMenuPosition;
      }
    | {
          mode: 'edit';
          position: ContextMenuPosition;
          highlightIndex: number;
      };

export type HighlightFormState = {
    labelText: string;
    startTimeText: string;
    endTimeText: string;
    fillColor: string;
    textColor: string;
};

export type AnnotationEditorMetaState = {
    position: ContextMenuPosition;
    seriesKey?: string;
    annotationIndex?: number;
    timestamp?: number;
};

export type AnnotationFormState = {
    seriesValue: string;
    timeText: string;
    labelText: string;
    fillColor: string;
    textColor: string;
    clip: boolean;
};
