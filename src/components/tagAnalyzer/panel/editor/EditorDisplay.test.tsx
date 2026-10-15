import { fireEvent, screen, within } from '@testing-library/react';
import { createTestPanel, renderPanelEditor } from './editorTestUtils';

const PRESET_CASES = [
    { id: '001', type: 'Line', showPoint: true, pointRadius: 0, fill: 0, stroke: 1 },
    { id: '002', type: 'Zone', showPoint: false, pointRadius: 0, fill: 0.15, stroke: 1 },
    { id: '003', type: 'Dot', showPoint: true, pointRadius: 2, fill: 0, stroke: 0 },
] as const;

const CUSTOM_NUMBER_CASES = [
    { id: '006', field: 'pointRadius', value: 7 },
    { id: '007', field: 'fill', value: 0.6 },
    { id: '008', field: 'stroke', value: 4 },
] as const;

function displayField(id: string) {
    const labels: Record<string, string> = {
        showPoint: 'Display data points in the line chart', showLegend: 'Display legend',
        connectNulls: 'Connect gaps between missing data points', pointRadius: 'Point Radius',
        fill: 'Opacity Of Fill Area', stroke: 'Line Thickness',
    };
    return within(screen.getByTestId('editor-display-chart-config')).getByRole(
        ['showPoint', 'showLegend', 'connectNulls'].includes(id) ? 'checkbox' : 'spinbutton',
        { name: labels[id] },
    );
}

function chartTypeControl(type: string) {
    return type === 'Custom'
        ? screen.getByRole('button', { name: 'Custom' })
        : screen.getByRole('img', { name: `${type} Chart` });
}

function expectChartTypeSelected(type: 'Line' | 'Zone' | 'Dot' | 'Custom') {
    for (const chartType of ['Line', 'Zone', 'Dot', 'Custom']) {
        if (chartType === type) expect(chartTypeControl(chartType)).toHaveClass('chartTypeOptionActive');
        else expect(chartTypeControl(chartType)).not.toHaveClass('chartTypeOptionActive');
    }
}

describe('PanelEditor Display controls', () => {
    for (const { id, type, ...style } of PRESET_CASES) {
        it(`TAZ-EDITOR-DISPLAY-${id}: applies the ${type} preset`, () => {
            const panel = createTestPanel();
            panel.display = {
                ...panel.display,
                chartType: 'Custom',
                showPoint: false, pointRadius: 9, fill: 0.8, stroke: 6,
            };
            const { onApply } = renderPanelEditor('display', panel);

            fireEvent.click(chartTypeControl(type));

            expectChartTypeSelected(type);
            expect(displayField('showPoint')).toHaveProperty('checked', style.showPoint);
            expect(displayField('pointRadius')).toHaveValue(style.pointRadius);
            expect(displayField('fill')).toHaveValue(style.fill);
            expect(displayField('stroke')).toHaveValue(style.stroke);
            fireEvent.click(screen.getByTestId('editor-apply'));
            expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
                display: {
                    ...panel.display, chartType: type,
                    ...style,
                },
            }));
        });
    }

    it('TAZ-EDITOR-DISPLAY-004: preserves preset style values when selecting Custom', () => {
        renderPanelEditor('display');
        fireEvent.click(chartTypeControl('Zone'));

        fireEvent.click(chartTypeControl('Custom'));

        expectChartTypeSelected('Custom');
        expect(displayField('showPoint')).not.toBeChecked();
        expect(displayField('pointRadius')).toHaveValue(0);
        expect(displayField('fill')).toHaveValue(0.15);
        expect(displayField('stroke')).toHaveValue(1);
    });

    it('TAZ-EDITOR-DISPLAY-005: selects Custom after changing point visibility', () => {
        const panel = createTestPanel();
        panel.display.showPoint = true;
        renderPanelEditor('display', panel);

        fireEvent.click(displayField('showPoint'));

        expect(displayField('showPoint')).not.toBeChecked();
        expectChartTypeSelected('Custom');
    });

    for (const { id, field, value } of CUSTOM_NUMBER_CASES) {
        it(`TAZ-EDITOR-DISPLAY-${id}: selects Custom after changing ${field}`, () => {
            renderPanelEditor('display');

            fireEvent.change(displayField(field), { target: { value: String(value) } });

            expect(displayField(field)).toHaveValue(value);
            expectChartTypeSelected('Custom');
        });
    }

    it('TAZ-EDITOR-DISPLAY-009: keeps the preset after changing legend visibility', () => {
        const panel = createTestPanel();
        panel.display.showLegend = true;
        renderPanelEditor('display', panel);

        fireEvent.click(displayField('showLegend'));

        expect(displayField('showLegend')).not.toBeChecked();
        expectChartTypeSelected('Line');
    });

    it('TAZ-EDITOR-DISPLAY-010: keeps the preset after changing gap connection', () => {
        const panel = createTestPanel();
        panel.display.connectNulls = false;
        renderPanelEditor('display', panel);

        fireEvent.click(displayField('connectNulls'));

        expect(displayField('connectNulls')).toBeChecked();
        expectChartTypeSelected('Line');
    });

    it('TAZ-EDITOR-DISPLAY-011: accepts a blank optional display number', () => {
        const { onApply } = renderPanelEditor('display');
        fireEvent.change(displayField('pointRadius'), { target: { value: '3' } });

        fireEvent.change(displayField('pointRadius'), { target: { value: '' } });

        expect(displayField('pointRadius')).toHaveValue(null);
        expect(screen.getByTestId('editor-apply')).toBeEnabled();
        fireEvent.click(screen.getByTestId('editor-apply'));
        expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
            display: expect.objectContaining({ pointRadius: undefined, chartType: 'Custom' }),
        }));
    });

    it('TAZ-EDITOR-DISPLAY-012: accepts a finite display number without marking the tab invalid', () => {
        const { onApply } = renderPanelEditor('display');

        fireEvent.change(displayField('stroke'), { target: { value: '2.5' } });

        expect(displayField('stroke')).toHaveValue(2.5);
        expect(screen.getByTestId('editor-apply')).toBeEnabled();
        expect(screen.getByTestId('editor-tab-display')).toHaveAttribute('aria-label', 'Display');
        fireEvent.click(screen.getByTestId('editor-apply'));
        expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
            display: expect.objectContaining({ stroke: 2.5, chartType: 'Custom' }),
        }));
    });
});
