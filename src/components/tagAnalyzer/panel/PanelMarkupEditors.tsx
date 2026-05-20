import type {
    AnnotationEditorMetaState,
    AnnotationFormState,
} from './modal/EditAnnotationModal';
import EditAnnotationModal from './modal/EditAnnotationModal';
import type {
    HighlightEditorState,
    HighlightFormState,
} from './modal/EditHighlightModal';
import EditHighlightModal from './modal/EditHighlightModal';
import type { PanelHighlight } from '../domain/PanelModel';
import type { PanelAnnotationAction } from './usePanelAnnotation';
import type { HighlightActions } from './usePanelHighlight';

function getAnnotationEditorKey(annotationEditorMeta: AnnotationEditorMetaState) {
    return [
        annotationEditorMeta.seriesIndex ?? 'new',
        annotationEditorMeta.annotationIndex ?? 'new',
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
        selectedSeriesIndex: number | undefined,
    ) => boolean;
    onDeleteAnnotation: (editorMeta: AnnotationEditorMetaState | undefined) => void;
    onCloseAnnotationEditor: () => void;
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
                />
            )}
        </>
    );
}

export default PanelMarkupEditors;
