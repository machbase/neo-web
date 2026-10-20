import { fireEvent, screen, within } from '@testing-library/react';
import { renderPanelEditor } from './editorTestUtils';

function densityField(field: string) {
    return screen.getByTestId(`density-${field}`);
}

function rawSettings() {
    return screen.getByRole('heading', { name: 'Raw Mode' }).closest('section')!;
}

function sampling(field: string) {
    return {
        getByRole: (role: 'checkbox' | 'spinbutton') => screen.getByTestId(`${field}-${role === 'checkbox' ? 'enabled' : 'count'}`),
    };
}

describe('PanelEditor Data Setting controls', () => {
    test.each([
        ['003', 'calculated', '', '', undefined, 'Automatic density'],
        ['004', 'calculated', '2', '8', 4, '0.25 points/pixel'],
        ['005', 'calculatedNavigator', '', '', undefined, 'Automatic density'],
        ['006', 'calculatedNavigator', '3', '12', 4, '0.25 points/pixel'],
    ] as const)('TAZ-EDITOR-DATA-SETTING-%s applies %s density %s/%s', (
        _id, field, points, pixels, expectedPixelsPerTick, expectedReadout,
    ) => {
        const { onApply } = renderPanelEditor('data-setting');
        const density = densityField(field);
        change(within(density).getAllByRole('spinbutton')[0], points);
        change(within(density).getAllByRole('spinbutton')[1], pixels);

        expect(density).toHaveTextContent(expectedReadout);
        const apply = screen.getByTestId('editor-apply');
        expect(apply).toBeEnabled();
        fireEvent.click(apply);
        expect(onApply).toHaveBeenCalledTimes(1);
        expect(onApply.mock.calls[0][0].display.pixelsPerTick[field])
            .toBe(expectedPixelsPerTick);
    });

    test.each([
        ['007', 'calculated', 'points', '0'],
        ['008', 'calculated', 'pixels', '-1'],
        ['009', 'calculated', 'points', ''],
        ['010', 'calculatedNavigator', 'pixels', '0'],
    ] as const)('TAZ-EDITOR-DATA-SETTING-%s rejects %s %s=%s', (
        _id, field, input, value,
    ) => {
        const { onApply } = renderPanelEditor('data-setting');
        const density = densityField(field);
        const control = within(density).getAllByRole('spinbutton')[input === 'points' ? 0 : 1];
        change(control, value);

        expect(within(density).getByText('Points and pixels must be greater than 0.'))
            .toBeVisible();
        expect(control).toHaveAttribute('aria-invalid', 'true');
        const apply = screen.getByTestId('editor-apply');
        expect(apply).toBeDisabled();
        fireEvent.click(apply);
        expect(onApply).not.toHaveBeenCalled();
    });

    test.each([
        ['012', 'mainChartSampling', '0'],
        ['017', 'rawNavigatorSampling', ''],
        ['019', 'mainChartSampling', '-2'],
    ] as const)('TAZ-EDITOR-DATA-SETTING-%s blocks Apply for enabled %s=%s', (
        _id, field, value,
    ) => {
        const { onApply } = renderPanelEditor('data-setting');
        const enabled = sampling(field).getByRole('checkbox');
        const count = sampling(field).getByRole('spinbutton');
        fireEvent.click(enabled);
        change(count, value);

        expect(enabled).toBeChecked();
        expect(count).toHaveAttribute('aria-invalid', 'true');
        const apply = screen.getByTestId('editor-apply');
        expect(apply).toBeDisabled();
        fireEvent.click(apply);
        expect(onApply).not.toHaveBeenCalled();
    });

    test('TAZ-EDITOR-DATA-SETTING-013 shows Average with navigator sampling disabled', () => {
        renderPanelEditor('data-setting');
        const raw = rawSettings();

        expect(sampling('rawNavigatorSampling').getByRole('checkbox')).not.toBeChecked();
        expect(raw).toHaveTextContent('Average');
    });

    test('TAZ-EDITOR-DATA-SETTING-014 shows Sampled with navigator sampling enabled', () => {
        const { onApply } = renderPanelEditor('data-setting');
        const raw = rawSettings();
        const enabled = sampling('rawNavigatorSampling').getByRole('checkbox');
        fireEvent.click(enabled);

        expect(enabled).toBeChecked();
        expect(raw).toHaveTextContent('Sampled');
        fireEvent.click(screen.getByTestId('editor-apply'));
        expect(onApply).toHaveBeenCalledTimes(1);
        expect(onApply.mock.calls[0][0].display.rawNavigatorSampling.enabled).toBe(true);
    });

    test('TAZ-EDITOR-DATA-SETTING-016 restores default navigator sample count on enable', () => {
        const { onApply } = renderPanelEditor('data-setting');
        const count = sampling('rawNavigatorSampling').getByRole('spinbutton');
        change(count, '');
        fireEvent.click(sampling('rawNavigatorSampling').getByRole('checkbox'));

        expect(count).toHaveValue(0.01);
        fireEvent.click(screen.getByTestId('editor-apply'));
        expect(onApply).toHaveBeenCalledTimes(1);
        expect(onApply.mock.calls[0][0].display.rawNavigatorSampling).toEqual({
            enabled: true,
            sampleCount: 0.01,
        });
    });

    test('TAZ-EDITOR-DATA-SETTING-018 marks tab invalid after entering zero density', () => {
        renderPanelEditor('data-setting');
        change(within(densityField('calculated')).getAllByRole('spinbutton')[0], '0');

        expect(screen.getByTestId('editor-tab-data-setting'))
            .toHaveAttribute('aria-invalid', 'true');
    });
});

function change(input: HTMLElement, value: string): void {
    fireEvent.change(input, { target: { value } });
}
