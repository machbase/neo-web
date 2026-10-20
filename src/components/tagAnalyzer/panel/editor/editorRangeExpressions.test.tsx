import { render, screen } from '@testing-library/react';
import { resolveRangeInput } from '../../rangeExpression/rangeInput';
import type { AxisKind, AxisRange, RangeExpressionInput } from '../../rangeExpression/rangeModel';
import EditorRangeTab from './tabs/EditorRangeTab';
import { createTestPanel } from './editorTestUtils';

function isEditorRangeValid(
    rangeInput: RangeExpressionInput,
    axisKind: AxisKind,
    dataRange: AxisRange,
    currentRange: AxisRange,
    referenceTime = Date.now(),
) {
    const clock = jest.spyOn(Date, 'now').mockReturnValue(referenceTime);
    const view = render(
        <EditorRangeTab
            pTimeConfig={{ ...createTestPanel().time, rangeInput }}
            pAxisKind={axisKind}
            pDataRange={dataRange}
            pMainRange={currentRange}
            pNavigatorRange={dataRange}
            pOnChangeTimeConfig={jest.fn()}
            pIsActive
        />,
    );
    const valid = screen.queryByRole('alert') === null;
    view.unmount();
    clock.mockRestore();
    return valid;
}

const TIME_DATA_RANGE = {
    start: new Date(2024, 2, 1, 0).getTime(),
    end: new Date(2024, 2, 3, 0).getTime(),
};
const CURRENT_TIME_RANGE = {
    start: new Date(2024, 2, 1, 12).getTime(),
    end: new Date(2024, 2, 1, 13).getTime(),
};
const REFERENCE_TIME = new Date(2024, 2, 10, 12).getTime();
const NUMERIC_DATA_RANGE = { start: 0, end: 999_990 };
const CURRENT_NUMERIC_RANGE = { start: 375_000, end: 625_000 };

describe('editor range expressions', () => {
    it.each([
        {
            name: 'absolute local date and time, including milliseconds',
            input: { start: '2024-03-01 12:00:00.250', end: '2024-03-01 13:00:00.750' },
            expected: {
                start: new Date(2024, 2, 1, 12, 0, 0, 250).getTime(),
                end: new Date(2024, 2, 1, 13, 0, 0, 750).getTime(),
            },
        },
        {
            name: 'now offsets against the supplied reference time',
            input: { start: 'now-1h', end: 'now' },
            expected: { start: new Date(2024, 2, 10, 11).getTime(), end: REFERENCE_TIME },
        },
        {
            name: 'first offsets against the data start',
            input: { start: 'first', end: 'first+1h' },
            expected: { start: TIME_DATA_RANGE.start, end: new Date(2024, 2, 1, 1).getTime() },
        },
        {
            name: 'last offsets against the data end',
            input: { start: 'last-1h', end: 'last' },
            expected: { start: new Date(2024, 2, 2, 23).getTime(), end: TIME_DATA_RANGE.end },
        },
        {
            name: 'a blank From using the current visible start',
            input: { start: '', end: 'last' },
            expected: { start: CURRENT_TIME_RANGE.start, end: TIME_DATA_RANGE.end },
        },
        {
            name: 'a blank To using the current visible end',
            input: { start: 'first', end: '' },
            expected: { start: TIME_DATA_RANGE.start, end: CURRENT_TIME_RANGE.end },
        },
    ])('resolves and accepts time $name', ({ input, expected }) => {
        expect(resolveRangeInput(input, 'time', TIME_DATA_RANGE, CURRENT_TIME_RANGE, REFERENCE_TIME)).toEqual(expected);
        expect(isEditorRangeValid(input, 'time', TIME_DATA_RANGE, CURRENT_TIME_RANGE, REFERENCE_TIME)).toBe(true);
    });

    it.each([
        { name: 'literal boundaries', input: { start: '100', end: '200' }, expected: { start: 100, end: 200 } },
        { name: 'first offsets', input: { start: 'first', end: 'first+100' }, expected: { start: 0, end: 100 } },
        { name: 'last offsets', input: { start: 'last-100', end: 'last' }, expected: { start: 999_890, end: 999_990 } },
    ])('resolves and accepts numeric $name', ({ input, expected }) => {
        expect(resolveRangeInput(input, 'numeric', NUMERIC_DATA_RANGE, CURRENT_NUMERIC_RANGE)).toEqual(expected);
        expect(isEditorRangeValid(input, 'numeric', NUMERIC_DATA_RANGE, CURRENT_NUMERIC_RANGE)).toBe(true);
    });

    it.each([
        { name: 'unrecognized From', input: { start: 'not-a-range', end: 'last' } },
        { name: 'unrecognized To', input: { start: 'first', end: 'not-a-range' } },
        { name: 'equal boundaries', input: { start: 'first', end: 'first' } },
        { name: 'reversed boundaries', input: { start: 'last', end: 'first' } },
    ])('rejects time $name', ({ input }) => {
        expect(resolveRangeInput(input, 'time', TIME_DATA_RANGE, CURRENT_TIME_RANGE, REFERENCE_TIME)).toBeUndefined();
        expect(isEditorRangeValid(input, 'time', TIME_DATA_RANGE, CURRENT_TIME_RANGE, REFERENCE_TIME)).toBe(false);
    });

    it('accepts an empty range as automatic rather than an invalid expression', () => {
        const input = { start: '', end: '' };
        expect(resolveRangeInput(input, 'time', TIME_DATA_RANGE, CURRENT_TIME_RANGE)).toBeUndefined();
        expect(isEditorRangeValid(input, 'time', TIME_DATA_RANGE, CURRENT_TIME_RANGE)).toBe(true);
        expect(resolveRangeInput(input, 'numeric', NUMERIC_DATA_RANGE, CURRENT_NUMERIC_RANGE)).toBeUndefined();
        expect(isEditorRangeValid(input, 'numeric', NUMERIC_DATA_RANGE, CURRENT_NUMERIC_RANGE)).toBe(true);
    });

    it.each([
        { start: '', end: 'last' },
        { start: 'first', end: '' },
    ])('requires both numeric editor endpoints while the resolver supports a blank bound: $start to $end', (input) => {
        expect(isEditorRangeValid(input, 'numeric', NUMERIC_DATA_RANGE, CURRENT_NUMERIC_RANGE)).toBe(false);
        expect(resolveRangeInput(input, 'numeric', NUMERIC_DATA_RANGE, CURRENT_NUMERIC_RANGE)).toEqual({
            start: input.start === '' ? CURRENT_NUMERIC_RANGE.start : NUMERIC_DATA_RANGE.start,
            end: input.end === '' ? CURRENT_NUMERIC_RANGE.end : NUMERIC_DATA_RANGE.end,
        });
    });
});
