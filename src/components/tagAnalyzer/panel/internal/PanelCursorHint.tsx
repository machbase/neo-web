import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type MutableRefObject,
} from 'react';
import { MdBlock, MdCheckCircle } from 'react-icons/md';
import { PanelOverlayMode, type PanelChartHandle } from '../../chart/chartInteraction';

type PanelOverlayCursorHintState = {
    x: number;
    y: number;
    isValidTarget: boolean;
    hoveredMainSeriesName: string | undefined;
    overlayMode: Exclude<PanelOverlayMode, PanelOverlayMode.NO_OVERLAY>;
};

export function PanelCursorHint({
    panelRef,
    panelChartApiRef,
    overlayMode,
    hoveredMainSeriesNameRef,
}: PanelCursorHintProps) {
    const [hint, setHint] = useState<PanelOverlayCursorHintState>();

    useEffect(() => {
        const panel = panelRef.current;
        if (!panel || overlayMode === PanelOverlayMode.NO_OVERLAY) {
            setHint(undefined);
            return;
        }
        const activeOverlayMode = overlayMode;

        function updateHint(event: globalThis.MouseEvent): void {
            const panelRect = panel!.getBoundingClientRect();
            setHint({
                x: event.clientX - panelRect.left,
                y: event.clientY - panelRect.top,
                isValidTarget:
                    panelChartApiRef.current?.isPointInsideMainGrid(
                        event.clientX,
                        event.clientY,
                    ) === true,
                hoveredMainSeriesName: hoveredMainSeriesNameRef.current,
                overlayMode: activeOverlayMode,
            });
        }

        function clearHint(): void {
            setHint(undefined);
        }

        panel.addEventListener('mousemove', updateHint);
        panel.addEventListener('mouseleave', clearHint);
        return () => {
            panel.removeEventListener('mousemove', updateHint);
            panel.removeEventListener('mouseleave', clearHint);
        };
    }, [hoveredMainSeriesNameRef, overlayMode, panelChartApiRef, panelRef]);

    return <PanelOverlayCursorHint hint={hint} />;
}

function PanelOverlayCursorHint({
    hint,
}: {
    hint: PanelOverlayCursorHintState | undefined;
}) {
    const hintRef = useRef<HTMLSpanElement | null>(null);
    const [layout, setLayout] = useState<PanelOverlayCursorHintLayout>();

    useLayoutEffect(() => {
        if (!hint) return;

        const hintElement = hintRef.current;
        const parentElement = hintElement?.parentElement;
        if (!hintElement || !parentElement) return;

        const hintRect = hintElement.getBoundingClientRect();
        const nextLayout = {
            width: hintRect.width,
            height: hintRect.height,
            parentWidth: parentElement.clientWidth,
            parentHeight: parentElement.clientHeight,
        };

        setLayout((currentLayout) =>
            currentLayout?.width === nextLayout.width &&
            currentLayout.height === nextLayout.height &&
            currentLayout.parentWidth === nextLayout.parentWidth &&
            currentLayout.parentHeight === nextLayout.parentHeight
                ? currentLayout
                : nextLayout,
        );
    }, [hint]);

    if (!hint) return null;

    const left = getClampedCoordinate(
        hint.x + CURSOR_OFFSET_X,
        layout?.width,
        layout?.parentWidth,
        HINT_MARGIN,
    );
    const top = getClampedCoordinate(
        hint.y + CURSOR_OFFSET_Y,
        layout?.height,
        layout?.parentHeight,
        HINT_TOP_MARGIN,
    );

    return (
        <span
            ref={hintRef}
            className={`panel-chart-interaction-hint panel-chart-interaction-hint--${hint.isValidTarget ? 'valid' : 'invalid'}`}
            style={{ left, top }}
        >
            {hint.isValidTarget ? (
                <MdCheckCircle size={13} />
            ) : (
                <MdBlock size={13} />
            )}
            <span>{getHintMessage(hint)}</span>
        </span>
    );
}

function getClampedCoordinate(
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
        parentSize - hintSize - HINT_MARGIN,
    );
    return Math.min(Math.max(minCoordinate, requestedCoordinate), maxCoordinate);
}

function getHintMessage(hint: PanelOverlayCursorHintState): string {
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

type PanelCursorHintProps = {
    panelRef: MutableRefObject<HTMLDivElement | null>;
    panelChartApiRef: MutableRefObject<PanelChartHandle | null>;
    overlayMode: PanelOverlayMode;
    hoveredMainSeriesNameRef: MutableRefObject<string | undefined>;
};

type PanelOverlayCursorHintLayout = {
    width: number;
    height: number;
    parentWidth: number;
    parentHeight: number;
};

export const ANNOTATION_INVALID_TARGET_MESSAGE =
    'Annotation can only be created on the main chart.';
const HIGHLIGHT_INVALID_TARGET_MESSAGE =
    'Highlight can only be created on the main chart.';
const DRAG_SELECT_INVALID_TARGET_MESSAGE =
    'Selection can only be made on the main chart.';
const HINT_MARGIN = 6;
const HINT_TOP_MARGIN = 42;
const CURSOR_OFFSET_X = 14;
const CURSOR_OFFSET_Y = -34;
