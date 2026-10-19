import { fireEvent, screen, within } from '@testing-library/react';
import { createTestPanel, renderPanelEditor } from './editorTestUtils';

type YAxis = 'leftY' | 'rightY';
type Range = 'valueRange' | 'rawValueRange';
const AXIS_LABELS = { zeroBase: 'Start the Y-axis at zero', showTickline: 'Show Y-axis tick marks' };

function rangeInputs(key: YAxis, range: Range) {
    return within(axis(key).getByTestId(range));
}

function axis(key: YAxis) {
    return within(screen.getByRole('heading', { name: key === 'leftY' ? 'Left Y axis' : 'Right Y axis' }).closest('section')!);
}

function change(input: HTMLElement, value: string): void {
    fireEvent.change(input, { target: { value } });
}

function fillRange(key: YAxis, range: Range, minimum: string, maximum: string): void {
    const inputs = rangeInputs(key, range);
    change(inputs.getAllByRole('spinbutton')[0], minimum);
    change(inputs.getAllByRole('spinbutton')[1], maximum);
}

function threshold(key: YAxis, name: 'lowerControlLimit' | 'upperControlLimit') {
    return within(axis(key).getByTestId(name));
}

function assignSeriesToRight(): void {
    fireEvent.click(axis('rightY').getByRole('checkbox', { name: 'Enable right Y-axis' }));
    fireEvent.click(axis('rightY').getByRole('button', { expanded: false }));
    fireEvent.click(screen.getByRole('option', { name: 'Tag A' }));
}

describe('Panel editor axes controls', () => {
    test.each([
        { id: '002', key: 'leftY', field: 'zeroBase', checked: true, other: 'showTickline', otherChecked: true },
        { id: '003', key: 'leftY', field: 'showTickline', checked: false, other: 'zeroBase', otherChecked: false },
        { id: '018', key: 'rightY', field: 'zeroBase', checked: false, other: 'showTickline', otherChecked: true },
        { id: '019', key: 'rightY', field: 'showTickline', checked: false, other: 'zeroBase', otherChecked: true },
    ] as const)('TAZ-EDITOR-AXES-$id changes $key $field independently', ({ key, field, checked, other, otherChecked }) => {
        renderPanelEditor('axes');
        if (key === 'rightY') fireEvent.click(axis(key).getByRole('checkbox', { name: 'Enable right Y-axis' }));

        fireEvent.click(axis(key).getByRole('checkbox', { name: AXIS_LABELS[field] }));

        expect(axis(key).getByRole('checkbox', { name: AXIS_LABELS[field] })).toHaveProperty('checked', checked);
        expect(axis(key).getByRole('checkbox', { name: AXIS_LABELS[other] })).toHaveProperty('checked', otherChecked);
    });

    test('TAZ-EDITOR-AXES-004 leaves automatic scale bounds blank', () => {
        renderPanelEditor('axes');
        const inputs = rangeInputs('leftY', 'valueRange');

        for (const edge of ['min', 'max']) {
            expect(inputs.getAllByRole('spinbutton')[edge === 'min' ? 0 : 1]).toHaveValue(null);
            expect(inputs.getAllByRole('spinbutton')[edge === 'min' ? 0 : 1]).toHaveAttribute('placeholder', 'Auto');
        }
        expect(screen.queryByText('Minimum must be less than maximum.')).not.toBeInTheDocument();
    });

    test('TAZ-EDITOR-AXES-005 applies increasing calculated scale bounds', () => {
        const { onApply } = renderPanelEditor('axes');

        fillRange('leftY', 'valueRange', '10', '20');
        fireEvent.click(screen.getByTestId('editor-apply'));

        expect(onApply).toHaveBeenCalledTimes(1);
        expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
            axes: expect.objectContaining({
                leftY: expect.objectContaining({ valueRange: { min: 10, max: 20 } }),
            }),
        }));
    });

    test.each([
        { id: '006', range: 'valueRange', minimum: '10', maximum: '', description: 'partially blank calculated bounds' },
        { id: '007', range: 'valueRange', minimum: '10', maximum: '10', description: 'equal calculated bounds' },
        { id: '008', range: 'valueRange', minimum: '20', maximum: '10', description: 'reversed calculated bounds' },
        { id: '010', range: 'rawValueRange', minimum: '', maximum: '25', description: 'partially blank raw bounds' },
    ] as const)('TAZ-EDITOR-AXES-$id rejects $description', ({ range, minimum, maximum }) => {
        const { onApply } = renderPanelEditor('axes');

        fillRange('leftY', range, minimum, maximum);

        expect(screen.getByText('Minimum must be less than maximum.')).toBeInTheDocument();
        expect(screen.getByTestId('editor-apply')).toBeDisabled();
        fireEvent.click(screen.getByTestId('editor-apply'));
        expect(onApply).not.toHaveBeenCalled();
    });

    test.each([
        { id: '011', key: 'leftY', name: 'lowerControlLimit', value: 5 },
        { id: '012', key: 'leftY', name: 'upperControlLimit', value: 50 },
        { id: '023', key: 'rightY', name: 'upperControlLimit', value: 50 },
    ] as const)('TAZ-EDITOR-AXES-$id accepts a finite $key $name', ({ key, name, value }) => {
        const { onApply } = renderPanelEditor('axes');
        if (key === 'rightY') fireEvent.click(axis(key).getByRole('checkbox', { name: 'Enable right Y-axis' }));

        fireEvent.click(threshold(key, name).getByRole('checkbox'));
        change(threshold(key, name).getByRole('spinbutton'), String(value));

        expect(screen.getByTestId('editor-apply')).toBeEnabled();
        fireEvent.click(screen.getByTestId('editor-apply'));
        expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
            axes: expect.objectContaining({
                [key]: expect.objectContaining({ [name]: { enabled: true, value } }),
            }),
        }));
    });

    test('TAZ-EDITOR-AXES-014 rejects a blank enabled control limit', () => {
        renderPanelEditor('axes');
        fireEvent.click(threshold('leftY', 'lowerControlLimit').getByRole('checkbox'));

        change(threshold('leftY', 'lowerControlLimit').getByRole('spinbutton'), '');

        expect(screen.getByTestId('editor-apply')).toBeDisabled();
    });

    test('TAZ-EDITOR-AXES-015 ignores a blank disabled control limit', () => {
        renderPanelEditor('axes');
        fireEvent.click(threshold('leftY', 'lowerControlLimit').getByRole('checkbox'));
        change(threshold('leftY', 'lowerControlLimit').getByRole('spinbutton'), '');

        fireEvent.click(threshold('leftY', 'lowerControlLimit').getByRole('checkbox'));

        expect(threshold('leftY', 'lowerControlLimit').getByRole('spinbutton')).toBeDisabled();
        expect(screen.getByTestId('editor-apply')).toBeEnabled();
    });

    test('TAZ-EDITOR-AXES-016 hides disabled right-axis settings', () => {
        renderPanelEditor('axes');

        expect(axis('rightY').getByText('Enable the right Y axis to configure it.')).toBeInTheDocument();
        expect(axis('rightY').queryByRole('checkbox', { name: 'Start the Y-axis at zero' })).not.toBeInTheDocument();
    });

    test('TAZ-EDITOR-AXES-017 reveals enabled right-axis settings', () => {
        renderPanelEditor('axes');

        fireEvent.click(axis('rightY').getByRole('checkbox', { name: 'Enable right Y-axis' }));

        expect(axis('rightY').getByRole('checkbox', { name: 'Start the Y-axis at zero' })).toBeVisible();
        expect(axis('rightY').getByRole('checkbox', { name: 'Show Y-axis tick marks' })).toBeVisible();
    });

    test('TAZ-EDITOR-AXES-022 ignores invalid values on a disabled right axis', () => {
        renderPanelEditor('axes');
        fireEvent.click(axis('rightY').getByRole('checkbox', { name: 'Enable right Y-axis' }));
        fireEvent.click(threshold('rightY', 'upperControlLimit').getByRole('checkbox'));
        change(threshold('rightY', 'upperControlLimit').getByRole('spinbutton'), '');
        expect(screen.getByTestId('editor-apply')).toBeDisabled();

        fireEvent.click(axis('rightY').getByRole('checkbox', { name: 'Enable right Y-axis' }));

        expect(screen.getByTestId('editor-apply')).toBeEnabled();
    });

    test('TAZ-EDITOR-AXES-024 marks the tab for invalid axis values', () => {
        renderPanelEditor('axes');

        fillRange('leftY', 'valueRange', '10', '');

        expect(screen.getByTestId('editor-tab-axes')).toHaveAttribute('aria-invalid', 'true');
    });

    test('TAZ-EDITOR-AXES-025 copies all left-axis settings to the right axis', () => {
        const panel = createTestPanel();
        panel.axes.leftY = {
            zeroBase: true,
            showTickline: false,
            valueRange: { min: 10, max: 20 },
            rawValueRange: { min: -10, max: 30 },
            lowerControlLimit: { enabled: true, value: -5 },
            upperControlLimit: { enabled: true, value: 25 },
        };
        const { onApply } = renderPanelEditor('axes', panel);
        fireEvent.click(axis('rightY').getByRole('checkbox', { name: 'Enable right Y-axis' }));

        fireEvent.click(axis('rightY').getByRole('button', { name: 'Copy left Y-axis settings' }));

        expect(axis('rightY').getByRole('checkbox', { name: 'Start the Y-axis at zero' })).toBeChecked();
        expect(axis('rightY').getByRole('checkbox', { name: 'Show Y-axis tick marks' })).not.toBeChecked();
        const calculated = rangeInputs('rightY', 'valueRange');
        const raw = rangeInputs('rightY', 'rawValueRange');
        expect(calculated.getAllByRole('spinbutton')[0]).toHaveValue(10);
        expect(calculated.getAllByRole('spinbutton')[1]).toHaveValue(20);
        expect(raw.getAllByRole('spinbutton')[0]).toHaveValue(-10);
        expect(raw.getAllByRole('spinbutton')[1]).toHaveValue(30);
        expect(threshold('rightY', 'lowerControlLimit').getByRole('checkbox')).toBeChecked();
        expect(threshold('rightY', 'lowerControlLimit').getByRole('spinbutton')).toHaveValue(-5);
        expect(threshold('rightY', 'upperControlLimit').getByRole('checkbox')).toBeChecked();
        expect(threshold('rightY', 'upperControlLimit').getByRole('spinbutton')).toHaveValue(25);
        fireEvent.click(screen.getByTestId('editor-apply'));
        expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
            axes: expect.objectContaining({
                rightY: { ...panel.axes.leftY, enabled: true },
            }),
        }));
    });

    test('TAZ-EDITOR-AXES-027 returns a clicked series to the left axis', () => {
        renderPanelEditor('axes');
        assignSeriesToRight();

        const assignedSeries = axis('rightY').getByText('Tag A').closest('.rightAxisSeriesItem');
        fireEvent.click(axis('rightY').getByText('Tag A'));

        expect(assignedSeries).not.toBeInTheDocument();
        fireEvent.click(axis('rightY').getByRole('button', { expanded: false }));
        expect(screen.getByRole('option', { name: 'Tag A' })).toBeVisible();
    });

    test('TAZ-EDITOR-AXES-028 returns assigned series when the right axis is disabled', () => {
        renderPanelEditor('axes');
        assignSeriesToRight();

        fireEvent.click(axis('rightY').getByRole('checkbox', { name: 'Enable right Y-axis' }));
        fireEvent.click(axis('rightY').getByRole('checkbox', { name: 'Enable right Y-axis' }));
        fireEvent.click(axis('rightY').getByRole('button', { expanded: false }));

        expect(screen.getByRole('option', { name: 'Tag A' })).toBeVisible();
    });
});
