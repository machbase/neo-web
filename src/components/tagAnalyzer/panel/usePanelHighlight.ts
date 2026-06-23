import type { PanelHighlight } from '../domain/PanelDomain';

export type PanelHighlightCrud = {
    getHighlightByIndex: (index: number) => PanelHighlight;
    addHighlightEntry: (highlight: PanelHighlight) => void;
    updateHighlightEntry: (index: number, highlight: PanelHighlight) => void;
    deleteHighlightEntry: (index: number) => void;
};

export function usePanelHighlight(
    highlights: PanelHighlight[],
    onSaveHighlights: (highlights: PanelHighlight[]) => void,
): {
    highlightCrud: PanelHighlightCrud;
} {
    return {
        highlightCrud: createPanelHighlightCrud(highlights, onSaveHighlights),
    };
}

function createPanelHighlightCrud(
    highlights: PanelHighlight[],
    onSaveHighlights: (highlights: PanelHighlight[]) => void,
): PanelHighlightCrud {
    function getHighlightByIndex(index: number): PanelHighlight {
        const sHighlight = highlights[index];

        if (!sHighlight) {
            throw new Error(`Expected highlight at index ${index}.`);
        }

        return sHighlight;
    }

    function addHighlightEntry(highlight: PanelHighlight): void {
        onSaveHighlights([...highlights, highlight]);
    }

    function updateHighlightEntry(index: number, highlight: PanelHighlight): void {
        getHighlightByIndex(index);

        onSaveHighlights(
            highlights.map((currentHighlight, currentIndex) =>
                currentIndex === index ? highlight : currentHighlight,
            ),
        );
    }

    function deleteHighlightEntry(index: number): void {
        getHighlightByIndex(index);

        onSaveHighlights(highlights.filter((_highlight, currentIndex) => currentIndex !== index));
    }

    return {
        getHighlightByIndex,
        addHighlightEntry,
        updateHighlightEntry,
        deleteHighlightEntry,
    };
}
