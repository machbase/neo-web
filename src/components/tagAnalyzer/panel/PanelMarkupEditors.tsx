import type { ActiveAnnotationEditor } from './modal/EditAnnotationModal';
import EditAnnotationModal from './modal/EditAnnotationModal';
import EditHighlightModal from './modal/EditHighlightModal';
import type { PanelAnnotationEditor } from './usePanelAnnotation';
import type { PanelHighlightEditor } from './usePanelHighlight';

function getAnnotationEditorKey(activeEditor: ActiveAnnotationEditor) {
    return [
        activeEditor.seriesIndex ?? 'new',
        activeEditor.annotationIndex ?? 'new',
        activeEditor.timestamp ?? 'existing',
        activeEditor.position.x,
        activeEditor.position.y,
    ].join(':');
}

function getHighlightEditorKey(
    activeEditor: NonNullable<PanelHighlightEditor['activeEditor']>,
) {
    return [
        activeEditor.highlightIndex,
        activeEditor.position.x,
        activeEditor.position.y,
    ].join(':');
}

function PanelMarkupEditors({
    highlightEditor,
    annotationEditor,
}: {
    highlightEditor: PanelHighlightEditor;
    annotationEditor: PanelAnnotationEditor;
}) {
    return (
        <>
            {highlightEditor.activeEditor && (
                <EditHighlightModal
                    key={getHighlightEditorKey(highlightEditor.activeEditor)}
                    activeHighlightEditor={highlightEditor.activeEditor}
                    temporaryHighlight={highlightEditor.temporaryHighlight}
                    highlightAction={highlightEditor.highlightAction}
                    onApplyHighlightChange={highlightEditor.onApplyHighlightChange}
                    onCancel={highlightEditor.onCancel}
                    onApplied={highlightEditor.onApplied}
                />
            )}
            {annotationEditor.activeEditor && (
                <EditAnnotationModal
                    key={getAnnotationEditorKey(annotationEditor.activeEditor)}
                    activeAnnotationEditor={annotationEditor.activeEditor}
                    annotationAction={annotationEditor.annotationAction}
                    onApplyAnnotationChange={annotationEditor.onApplyAnnotationChange}
                    onDeleteAnnotation={annotationEditor.onDeleteAnnotation}
                    onCancel={annotationEditor.onCancel}
                    onApplied={annotationEditor.onApplied}
                />
            )}
        </>
    );
}

export default PanelMarkupEditors;
