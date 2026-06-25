import type {
    PanelAnnotation,
    PanelHighlight,
    PanelInfo,
} from '../domain/panel/PanelConfig';

export function renamePanelTitle(
    panelInfo: PanelInfo,
    title: string,
): PanelInfo {
    const sNextTitle = title.trim();

    if (sNextTitle.length === 0 || sNextTitle === panelInfo.title) {
        return panelInfo;
    }

    return {
        ...panelInfo,
        title: sNextTitle,
    };
}

export function getPanelHighlight(
    panelInfo: PanelInfo,
    highlightIndex: number,
): PanelHighlight {
    const highlight = panelInfo.highlights[highlightIndex];

    if (!highlight) {
        throw new Error(`Expected highlight at index ${highlightIndex}.`);
    }

    return highlight;
}

export function addPanelHighlight(
    panelInfo: PanelInfo,
    highlight: PanelHighlight,
): PanelInfo {
    return {
        ...panelInfo,
        highlights: [...panelInfo.highlights, highlight],
    };
}

export function updatePanelHighlight(
    panelInfo: PanelInfo,
    highlightIndex: number,
    highlight: PanelHighlight,
): PanelInfo {
    getPanelHighlight(panelInfo, highlightIndex);

    return {
        ...panelInfo,
        highlights: panelInfo.highlights.map((currentHighlight, currentIndex) =>
            currentIndex === highlightIndex ? highlight : currentHighlight,
        ),
    };
}

export function deletePanelHighlight(
    panelInfo: PanelInfo,
    highlightIndex: number,
): PanelInfo {
    getPanelHighlight(panelInfo, highlightIndex);

    return {
        ...panelInfo,
        highlights: panelInfo.highlights.filter(
            (_highlight, currentIndex) => currentIndex !== highlightIndex,
        ),
    };
}

export function getPanelAnnotation(
    panelInfo: PanelInfo,
    annotationIndex: number,
): PanelAnnotation {
    const annotation = panelInfo.annotations[annotationIndex];

    if (!annotation) {
        throw new Error(`Expected annotation at index ${annotationIndex}.`);
    }

    return annotation;
}

export function addPanelAnnotation(
    panelInfo: PanelInfo,
    annotation: PanelAnnotation,
): PanelInfo {
    assertKnownAnnotationSeries(panelInfo, annotation);

    return {
        ...panelInfo,
        annotations: [...panelInfo.annotations, { ...annotation }],
    };
}

export function updatePanelAnnotation(
    panelInfo: PanelInfo,
    annotationIndex: number,
    annotation: PanelAnnotation,
): PanelInfo {
    getPanelAnnotation(panelInfo, annotationIndex);
    assertKnownAnnotationSeries(panelInfo, annotation);

    return {
        ...panelInfo,
        annotations: panelInfo.annotations.map((currentAnnotation, currentIndex) =>
            currentIndex === annotationIndex
                ? { ...annotation }
                : currentAnnotation,
        ),
    };
}

export function deletePanelAnnotation(
    panelInfo: PanelInfo,
    annotationIndex: number,
): PanelInfo {
    getPanelAnnotation(panelInfo, annotationIndex);

    return {
        ...panelInfo,
        annotations: panelInfo.annotations.filter(
            (_annotation, currentIndex) => currentIndex !== annotationIndex,
        ),
    };
}

function assertKnownAnnotationSeries(
    panelInfo: PanelInfo,
    annotation: PanelAnnotation,
): void {
    if (
        !panelInfo.query.tagSet.some(
            (seriesInfo) => seriesInfo.key === annotation.seriesKey,
        )
    ) {
        throw new Error(`Unknown annotation series: ${annotation.seriesKey}.`);
    }
}
