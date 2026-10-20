import { DEFAULT_PANEL_SERIES_SOURCE_COLUMNS } from '../../seriesModel';
import { fireEvent, render, screen } from '@testing-library/react';
import { createPanelSeriesDefinition, PanelSeriesCalculationMode } from '../../seriesModel';
import { createNewPanelInfo } from '../panelModel';
import { PanelSurfaceLayer } from './PanelSurfaceLayer';

describe('annotation series choices', () => {
    it('keeps display labels and distinct keys when the editor receives panel series', () => {
        const panelInfo = createNewPanelInfo([
            createPanelSeriesDefinition({
                key: 'aliased', table: 'TAG', tagName: 'temperature',
                calculationMode: PanelSeriesCalculationMode.Average,
                columns: DEFAULT_PANEL_SERIES_SOURCE_COLUMNS, alias: 'Room temperature',
            }),
            createPanelSeriesDefinition({
                key: 'second', table: 'TAG', tagName: 'temperature',
                calculationMode: PanelSeriesCalculationMode.Average,
                columns: DEFAULT_PANEL_SERIES_SOURCE_COLUMNS,
            }),
        ], 'Temperatures', 'Line');
        const onApplyPanelInfo = jest.fn();
        const onDismiss = jest.fn();
        render(
            <PanelSurfaceLayer
                surface={{ id: 4, kind: 'annotationEditor', session: {
                    kind: 'create', position: { x: 20, y: 20 }, timestamp: 12.5,
                } }}
                panelInfo={panelInfo}
                actionState={{ active: [], disabled: [] }}
                isNumericXAxis
                mainChartData={[]}
                renderMainRange={{ start: 0, end: 20 }}
                panelChartApiRef={{ current: null }}
                onPanelAction={jest.fn()}
                onApplyPanelInfo={onApplyPanelInfo}
                onDeletePanel={jest.fn()}
                onDismiss={onDismiss}
            />,
        );

        expect(screen.getByTestId('apply-button')).toBeDisabled();
        fireEvent.click(screen.getByTestId('series-trigger'));
        expect(screen.getByRole('option', { name: 'Room temperature' })).toHaveTextContent('Room temperature');
        expect(screen.getByRole('option', { name: 'temperature / VALUE (TAG)' })).toHaveTextContent('temperature / VALUE (TAG)');
        fireEvent.click(screen.getByRole('option', { name: 'temperature / VALUE (TAG)' }));
        fireEvent.change(screen.getByTestId('text-input'), { target: { value: 'Peak' } });
        fireEvent.click(screen.getByTestId('apply-button'));

        expect(onApplyPanelInfo).toHaveBeenCalledWith({
            ...panelInfo,
            annotations: [{
                seriesKey: 'second', text: 'Peak', timeRange: { start: 12.5, end: 12.5 },
                fillColor: '#fff4b8', textColor: '#161616', clip: true,
            }],
        });
        expect(onDismiss).toHaveBeenCalledWith(4);
        expect(panelInfo.annotations).toEqual([]);
    });
});
