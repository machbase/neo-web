import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { PanelCursorHint } from './PanelCursorHint';
import { PanelOverlayMode } from '../../chart/chartModel';

it('shows the hovered series and clears the hint when annotation mode ends', () => {
    const panelRef = createRef<HTMLDivElement>();
    const hoveredMainSeriesNameRef = { current: 'temperature' };
    const panelChartApiRef = { current: {
        getVisibleSeries: () => [],
        isPointInsideMainGrid: () => true,
    } };
    const content = (overlayMode: PanelOverlayMode) => (
        <div ref={panelRef}>
            <PanelCursorHint panelRef={panelRef} panelChartApiRef={panelChartApiRef}
                overlayMode={overlayMode} hoveredMainSeriesNameRef={hoveredMainSeriesNameRef} />
        </div>
    );
    const view = render(content(PanelOverlayMode.ANNOTATION));
    fireEvent.mouseMove(panelRef.current!, { clientX: 20, clientY: 30 });
    expect(screen.getByText('Create annotation on temperature')).toBeInTheDocument();

    hoveredMainSeriesNameRef.current = 'pressure';
    fireEvent.mouseMove(panelRef.current!, { clientX: 25, clientY: 30 });
    expect(screen.getByText('Create annotation on pressure')).toBeInTheDocument();
    expect(screen.queryByText('Create annotation on temperature')).not.toBeInTheDocument();

    view.rerender(content(PanelOverlayMode.NO_OVERLAY));
    expect(screen.queryByText('Create annotation on pressure')).not.toBeInTheDocument();
});
