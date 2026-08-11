import { act, renderHook } from '@testing-library/react';
import { PanelOverlayMode } from '../../chart/chartRuntime';
import { PanelPopupMode, usePanelInteraction } from './panelInteraction';

describe('usePanelInteraction', () => {
    it('toggles overlay tools while retaining the current cursor state', () => {
        const { result } = renderHook(() => usePanelInteraction());

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

    it('guards popup closure against stale callbacks', () => {
        const { result } = renderHook(() => usePanelInteraction());

        act(() => {
            result.current.actions.openPopup({
                mode: PanelPopupMode.CONTEXT_MENU,
                position: { x: 4, y: 8 },
            });
            result.current.actions.closePopup(PanelPopupMode.DELETE_CONFIRM);
        });

        expect(result.current.state.popupState.mode).toBe(
            PanelPopupMode.CONTEXT_MENU,
        );

        act(() => {
            result.current.actions.closePopup(PanelPopupMode.CONTEXT_MENU);
        });

        expect(result.current.state.popupState.mode).toBe(PanelPopupMode.NONE);
    });

    it('closes an open popup when an overlay tool is toggled', () => {
        const { result } = renderHook(() => usePanelInteraction());

        act(() => {
            result.current.actions.openPopup({
                mode: PanelPopupMode.CONTEXT_MENU,
                position: { x: 4, y: 8 },
            });
            result.current.actions.toggleOverlay(PanelOverlayMode.HIGHLIGHT);
        });

        expect(result.current.state.popupState.mode).toBe(PanelPopupMode.NONE);
        expect(result.current.state.overlayMode).toBe(
            PanelOverlayMode.HIGHLIGHT,
        );
    });

    it('disarms annotation mode when its editor closes', () => {
        const { result } = renderHook(() => usePanelInteraction());

        act(() => {
            result.current.actions.setOverlayMode(
                PanelOverlayMode.ANNOTATION,
            );
            result.current.actions.openPopup({
                mode: PanelPopupMode.ANNOTATION_EDITOR,
                editorMeta: { position: { x: 4, y: 8 } },
            });
            result.current.actions.closePopup(
                PanelPopupMode.ANNOTATION_EDITOR,
            );
        });

        expect(result.current.state.overlayMode).toBe(
            PanelOverlayMode.NO_OVERLAY,
        );
    });

    it('keeps the editor mounted until its closing animation finishes', () => {
        const { result } = renderHook(() => usePanelInteraction());

        act(() => result.current.actions.toggleEditor());
        expect(result.current.state.editorStatus).toBe('open');

        act(() => result.current.actions.closeEditor());
        expect(result.current.state.editorStatus).toBe('closing');

        act(() => result.current.actions.finishEditorClose());
        expect(result.current.state.editorStatus).toBe('closed');
    });
});
