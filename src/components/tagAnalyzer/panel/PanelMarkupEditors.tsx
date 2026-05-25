import EditAnnotationModal, {
    type AnnotationEditorMetaState,
    type AnnotationFormState,
} from './modal/EditAnnotationModal';
import EditHighlightModal, {
    type HighlightEditorState,
    type HighlightFormState,
} from './modal/EditHighlightModal';
import type { PanelHighlight } from '../domain/PanelDomain';
import type { PanelAnnotationAction } from './usePanelAnnotation';
import type { HighlightActions } from './usePanelHighlight';

function getAnnotationEditorKey(annotationEditorMeta: AnnotationEditorMetaState) {
    return [
        annotationEditorMeta.annotationIndex ?? 'new',
        annotationEditorMeta.seriesKey ?? 'unassigned',
        annotationEditorMeta.timestamp ?? 'existing',
        annotationEditorMeta.position.x,
        annotationEditorMeta.position.y,
    ].join(':');
}

function getHighlightEditorKey(activeEditor: HighlightEditorState) {
    return [
        activeEditor.highlightIndex,
        activeEditor.position.x,
        activeEditor.position.y,
    ].join(':');
}

function PanelMarkupEditors({
    activeHighlightEditor,
    temporaryHighlight,
    highlightActions,
    onApplyHighlightChange,
    onCloseHighlightEditor,
    annotationEditorMeta,
    annotationAction,
    onApplyAnnotationChange,
    onDeleteAnnotation,
    onCloseAnnotationEditor,
    isNumericXAxis,
}: {
    activeHighlightEditor: HighlightEditorState | undefined;
    temporaryHighlight: PanelHighlight | undefined;
    highlightActions: HighlightActions;
    onApplyHighlightChange: (
        formState: HighlightFormState,
        activeEditor: HighlightEditorState,
    ) => boolean;
    onCloseHighlightEditor: () => void;
    annotationEditorMeta: AnnotationEditorMetaState | undefined;
    annotationAction: PanelAnnotationAction;
    onApplyAnnotationChange: (
        formState: AnnotationFormState,
        editorMeta: AnnotationEditorMetaState,
        selectedSeriesKey: string | undefined,
    ) => boolean;
    onDeleteAnnotation: (editorMeta: AnnotationEditorMetaState | undefined) => void;
    onCloseAnnotationEditor: () => void;
    isNumericXAxis: boolean;
}) {
    return (
        <>
            {activeHighlightEditor && (
                <EditHighlightModal
                    key={getHighlightEditorKey(activeHighlightEditor)}
                    activeHighlightEditor={activeHighlightEditor}
                    temporaryHighlight={temporaryHighlight}
                    highlightActions={highlightActions}
                    onApplyHighlightChange={onApplyHighlightChange}
                    onCancel={onCloseHighlightEditor}
                    onApplied={onCloseHighlightEditor}
                    isNumericXAxis={isNumericXAxis}
                />
            )}
            {annotationEditorMeta && (
                <EditAnnotationModal
                    key={getAnnotationEditorKey(annotationEditorMeta)}
                    annotationEditorMeta={annotationEditorMeta}
                    annotationAction={annotationAction}
                    onApplyAnnotationChange={onApplyAnnotationChange}
                    onDeleteAnnotation={onDeleteAnnotation}
                    onCancel={onCloseAnnotationEditor}
                    onApplied={onCloseAnnotationEditor}
                    isNumericXAxis={isNumericXAxis}
                />
            )}
        </>
    );
}

export default PanelMarkupEditors;
