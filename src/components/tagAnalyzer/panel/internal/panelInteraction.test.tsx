import { act, renderHook } from '@testing-library/react';
import { PanelOverlayMode } from '../../chart/chartRuntime';
import type { FFTSelectionPayload } from '../../tools/analysisModel';
import { usePanelInteraction } from './panelInteraction';

const SERIES_LIST = [{ key: 'temperature' }];

describe('usePanelInteraction', () => {
    it('toggles overlay tools while retaining the current cursor state', () => {
        const { result } = renderHook(() =>
            usePanelInteraction(SERIES_LIST),
        );

        act(() => {
            result.current.actions.toggleOverlay(
                PanelOverlayMode.HIGHLIGHT,
            );
            result.current.actions.setHoveredSeries('temperature');
            result.current.actions.showCursorHint({
                x: 10,
                y: 20,
                isValidTarget: true,
                hoveredMainSeriesName: 'temperature',
                overlayMode: PanelOverlayMode.HIGHLIGHT,
            });
        });

        expect(result.current.state.overlayMode).toBe(
            PanelOverlayMode.HIGHLIGHT,
        );
        expect(result.current.state.overlayCursorHint).toEqual({
            x: 10,
            y: 20,
            isValidTarget: true,
            hoveredMainSeriesName: 'temperature',
            overlayMode: PanelOverlayMode.HIGHLIGHT,
        });

        act(() => {
            result.current.actions.toggleOverlay(
                PanelOverlayMode.HIGHLIGHT,
            );
        });

        expect(result.current.state.overlayMode).toBe(
            PanelOverlayMode.NO_OVERLAY,
        );
        expect(result.current.state.overlayCursorHint).toEqual({
            x: 10,
            y: 20,
            isValidTarget: true,
            hoveredMainSeriesName: 'temperature',
            overlayMode: PanelOverlayMode.HIGHLIGHT,
        });
    });

    it('ignores stale dismissal for a newer surface of the same kind', () => {
        const { result } = renderHook(() =>
            usePanelInteraction(SERIES_LIST),
        );

        act(() => {
            result.current.actions.showContextMenu({ x: 4, y: 8 });
        });
        const firstSurface = result.current.state.activeSurface;

        expect(firstSurface).toMatchObject({
            kind: 'contextMenu',
            position: { x: 4, y: 8 },
        });

        act(() => {
            result.current.actions.showContextMenu({ x: 12, y: 16 });
        });
        const secondSurface = result.current.state.activeSurface;

        expect(secondSurface).toMatchObject({
            kind: 'contextMenu',
            position: { x: 12, y: 16 },
        });
        expect(secondSurface?.id).not.toBe(firstSurface?.id);

        act(() => {
            result.current.actions.dismissSurface(firstSurface!.id);
        });

        expect(result.current.state.activeSurface).toEqual(secondSurface);

        act(() => {
            result.current.actions.dismissSurface(secondSurface!.id);
        });

        expect(result.current.state.activeSurface).toBeUndefined();
    });

    it('dismisses the active surface when an overlay tool is toggled', () => {
        const { result } = renderHook(() =>
            usePanelInteraction(SERIES_LIST),
        );

        act(() => {
            result.current.actions.requestDelete();
        });

        expect(result.current.state.activeSurface?.kind).toBe('deleteConfirm');

        act(() => {
            result.current.actions.toggleOverlay(PanelOverlayMode.HIGHLIGHT);
        });

        expect(result.current.state.activeSurface).toBeUndefined();
        expect(result.current.state.overlayMode).toBe(
            PanelOverlayMode.HIGHLIGHT,
        );
    });

    it('opens annotation creation with the selected series key', () => {
        const { result } = renderHook(() =>
            usePanelInteraction(SERIES_LIST),
        );

        act(() => {
            result.current.actions.toggleOverlay(PanelOverlayMode.ANNOTATION);
            result.current.actions.beginAnnotationCreate(
                { x: 4, y: 8 },
                0,
                1_234,
            );
        });

        expect(result.current.state.activeSurface).toMatchObject({
            kind: 'annotationEditor',
            session: {
                kind: 'create',
                position: { x: 4, y: 8 },
                timestamp: 1_234,
                seriesKey: 'temperature',
            },
        });
        expect(result.current.state.overlayMode).toBe(
            PanelOverlayMode.NO_OVERLAY,
        );
    });

    it('retains a selection only while switching to annotation mode', () => {
        const { result } = renderHook(() =>
            usePanelInteraction(SERIES_LIST),
        );
        const selectionSummary = {
            selection: { start: 1, end: 2 } as FFTSelectionPayload,
            popoverPosition: { x: 3, y: 4 },
        };

        act(() => {
            result.current.actions.openSelection(
                selectionSummary,
            );
            result.current.actions.toggleOverlay(
                PanelOverlayMode.ANNOTATION,
            );
        });
        expect(result.current.state.selectionSummary).toEqual(
            selectionSummary,
        );

        act(() => {
            result.current.actions.toggleOverlay(
                PanelOverlayMode.HIGHLIGHT,
            );
        });
        expect(result.current.state.selectionSummary).toBeUndefined();
    });

    it('updates and clears the cursor hint with its hovered series', () => {
        const { result } = renderHook(() =>
            usePanelInteraction(SERIES_LIST),
        );

        act(() => {
            result.current.actions.showCursorHint({
                x: 10,
                y: 20,
                isValidTarget: true,
                hoveredMainSeriesName: undefined,
                overlayMode: PanelOverlayMode.ANNOTATION,
            });
            result.current.actions.setHoveredSeries('temperature');
        });
        expect(result.current.state.overlayCursorHint).toMatchObject({
            hoveredMainSeriesName: 'temperature',
        });

        act(() => result.current.actions.clearCursorHint());
        expect(result.current.state.overlayCursorHint).toBeUndefined();
        expect(result.current.state.hoveredMainSeriesName).toBeUndefined();
    });

    it('disarms highlight mode when an empty selection cannot create a draft', () => {
        const { result } = renderHook(() =>
            usePanelInteraction(SERIES_LIST),
        );

        act(() => {
            result.current.actions.toggleOverlay(
                PanelOverlayMode.HIGHLIGHT,
            );
            result.current.actions.beginHighlightCreate(
                { start: 5, end: 5 },
                { x: 10, y: 20 },
            );
        });

        expect(result.current.state.overlayMode).toBe(
            PanelOverlayMode.NO_OVERLAY,
        );
        expect(result.current.state.activeSurface).toBeUndefined();
        expect(result.current.state.draftHighlight).toBeUndefined();
    });
});
