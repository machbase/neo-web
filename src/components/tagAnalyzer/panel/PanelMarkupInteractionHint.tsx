import { useLayoutEffect, useRef, useState } from 'react';
import { MdBlock, MdCheckCircle } from 'react-icons/md';
import { PanelOverlayMode } from '../domain/PanelDomain';

export const ANNOTATION_INVALID_TARGET_MESSAGE =
    'Annotation can only be created on the main chart.';
const HIGHLIGHT_INVALID_TARGET_MESSAGE =
    'Highlight can only be created on the main chart.';
const DRAG_SELECT_INVALID_TARGET_MESSAGE =
    'Selection can only be made on the main chart.';
const INTERACTION_HINT_MARGIN = 6;
const INTERACTION_HINT_TOP_MARGIN = 42;
const INTERACTION_HINT_CURSOR_OFFSET_X = 14;
const INTERACTION_HINT_CURSOR_OFFSET_Y = -34;

export type PanelMarkupInteractionHintState = {
    x: number;
    y: number;
    isValidTarget: boolean;
    hoveredMainSeriesName: string | undefined;
    overlayMode:
        | PanelOverlayMode.ANNOTATION
        | PanelOverlayMode.HIGHLIGHT
        | PanelOverlayMode.DRAG_SELECT;
};

type PanelMarkupInteractionHintLayout = {
    width: number;
    height: number;
    parentWidth: number;
    parentHeight: number;
};

export function PanelMarkupInteractionHint({
    hint,
}: {
    hint: PanelMarkupInteractionHintState | undefined;
}) {
    const hintRef = useRef<HTMLSpanElement | null>(null);
    const [layout, setLayout] = useState<
        PanelMarkupInteractionHintLayout | undefined
    >(undefined);

    useLayoutEffect(() => {
        const hintElement = hintRef.current;
        if (!hint || !hintElement) {
            return;
        }

        const hintRect = hintElement.getBoundingClientRect();
        const parentElement = hintElement.offsetParent;
        const nextLayout = {
            width: hintRect.width,
            height: hintRect.height,
            parentWidth:
                parentElement instanceof HTMLElement
                    ? parentElement.clientWidth
                    : window.innerWidth,
            parentHeight:
                parentElement instanceof HTMLElement
                    ? parentElement.clientHeight
                    : window.innerHeight,
        };

        setLayout((currentLayout) =>
            isSameInteractionHintLayout(currentLayout, nextLayout)
                ? currentLayout
                : nextLayout,
        );
    }, [hint]);

    if (!hint) {
        return null;
    }

    const left = getClampedInteractionHintCoordinate(
        hint.x + INTERACTION_HINT_CURSOR_OFFSET_X,
        layout?.width,
        layout?.parentWidth,
        INTERACTION_HINT_MARGIN,
    );
    const top = getClampedInteractionHintCoordinate(
        hint.y + INTERACTION_HINT_CURSOR_OFFSET_Y,
        layout?.height,
        layout?.parentHeight,
        INTERACTION_HINT_TOP_MARGIN,
    );

    return (
        <span
            ref={hintRef}
            className={`panel-chart-interaction-hint panel-chart-interaction-hint--${hint.isValidTarget ? 'valid' : 'invalid'}`}
            style={{
                left,
                top,
            }}
        >
            {hint.isValidTarget ? (
                <MdCheckCircle size={13} />
            ) : (
                <MdBlock size={13} />
            )}
            <span>
                {getPanelMarkupInteractionHintMessage(hint)}
            </span>
        </span>
    );
}

function isSameInteractionHintLayout(
    currentLayout: PanelMarkupInteractionHintLayout | undefined,
    nextLayout: PanelMarkupInteractionHintLayout,
): boolean {
    return (
        currentLayout?.width === nextLayout.width &&
        currentLayout.height === nextLayout.height &&
        currentLayout.parentWidth === nextLayout.parentWidth &&
        currentLayout.parentHeight === nextLayout.parentHeight
    );
}

function getClampedInteractionHintCoordinate(
    requestedCoordinate: number,
    hintSize: number | undefined,
    parentSize: number | undefined,
    minCoordinate: number,
): number {
    if (hintSize === undefined || parentSize === undefined) {
        return Math.max(minCoordinate, requestedCoordinate);
    }

    const maxCoordinate = Math.max(
        minCoordinate,
        parentSize - hintSize - INTERACTION_HINT_MARGIN,
    );

    return Math.min(
        Math.max(minCoordinate, requestedCoordinate),
        maxCoordinate,
    );
}

function getPanelMarkupInteractionHintMessage(
    hint: PanelMarkupInteractionHintState,
): string {
    if (hint.overlayMode === PanelOverlayMode.ANNOTATION) {
        if (hint.isValidTarget && hint.hoveredMainSeriesName) {
            return `Create annotation on ${hint.hoveredMainSeriesName}`;
        }

        return hint.isValidTarget
            ? 'Create annotation here'
            : ANNOTATION_INVALID_TARGET_MESSAGE;
    }

    if (hint.overlayMode === PanelOverlayMode.DRAG_SELECT) {
        return hint.isValidTarget
            ? 'Drag to select area'
            : DRAG_SELECT_INVALID_TARGET_MESSAGE;
    }

    return hint.isValidTarget
        ? 'Drag to create highlight'
        : HIGHLIGHT_INVALID_TARGET_MESSAGE;
}
