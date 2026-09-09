import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import DistanceRangeTab from '@/components/modal/DistanceRangeTab';
import type { PanelInfo } from '../panelModel';
import { RangeModal } from '../rangeControl/RangeModal';
import EditorRangeTab from './tabs/EditorRangeTab';

const DATA_RANGE = { start: 0, end: 999_990 };
const EXPANDED_RANGE = { start: -1_074_397, end: 2_498_231 };
const EXPANDED_INPUT = { start: '-1074397', end: '2498231' };

function renderEditor(mainRange = EXPANDED_RANGE, navigatorRange = EXPANDED_RANGE) {
    const onChange = jest.fn<void, [PanelInfo['time']]>();
    function Editor() {
        const [time, setTime] = useState<PanelInfo['time']>({
            rangeInput: { start: String(mainRange.start), end: String(mainRange.end) },
            navigatorRangeInput: { start: String(navigatorRange.start), end: String(navigatorRange.end) },
            useLastViewedRange: false,
            lastViewedRange: undefined,
        });
        return <EditorRangeTab
            pTimeConfig={time}
            pAxisKind="numeric"
            pDataRange={DATA_RANGE}
            pMainRange={mainRange}
            pNavigatorRange={navigatorRange}
            pOnChangeTimeConfig={(next) => { onChange(next); setTime(next); }}
            pIsActive
        />;
    }
    render(<Editor />);
    return { onChange };
}

function rangeSection(target: 'main' | 'nav') {
    return within(screen.getByTestId(`editor-${target}-range`));
}

function measureRail(rail: HTMLElement): void {
    jest.spyOn(rail, 'getBoundingClientRect').mockReturnValue({
        x: 0, y: 0, left: 0, top: 0, right: 400, bottom: 20,
        width: 400, height: 20, toJSON: () => ({}),
    });
}

function pointer(target: HTMLElement | Window, type: string, clientX: number): void {
    // jsdom has no PointerEvent constructor; the component only reads mouse coordinates.
    fireEvent(target, new MouseEvent(type, { bubbles: true, clientX, clientY: 10 }));
}

describe('numeric range editing outside the data extent', () => {
    afterEach(() => jest.restoreAllMocks());

    it('uses Nav as the Main slider scale without changing the selected Main window', () => {
        const { onChange } = renderEditor(DATA_RANGE, { start: -6_000_000, end: 7_000_000 });
        const main = rangeSection('main');

        expect(main.getByTestId('from-slider')).toHaveAttribute('min', '-6000000');
        expect(main.getByTestId('to-slider')).toHaveAttribute('max', '7000000');
        expect(main.getByTestId('from-slider')).toHaveValue('0');
        expect(main.getByTestId('to-slider')).toHaveValue('999990');
        expect(onChange).not.toHaveBeenCalled();

        fireEvent.click(main.getByRole('button', { name: 'Full' }));
        expect(main.getByTestId('from-input')).toHaveValue('-6000000');
        expect(main.getByTestId('to-input')).toHaveValue('7000000');
        expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
            rangeInput: { start: '-6000000', end: '7000000' },
            navigatorRangeInput: { start: '-6000000', end: '7000000' },
        }));
    });

    it('updates the Main scale and presets from a pending Nav edit', () => {
        renderEditor({ start: 200_000, end: 400_000 }, { start: 100_000, end: 900_000 });
        const main = rangeSection('main');
        expect(main.getByTestId('from-slider')).toHaveAttribute('min', '100000');
        expect(main.getByTestId('to-slider')).toHaveAttribute('max', '900000');

        fireEvent.change(rangeSection('nav').getByTestId('from-input'), { target: { value: '-1000000' } });
        expect(main.getByTestId('from-slider')).toHaveAttribute('min', '-1000000');
        expect(main.getByTestId('from-input')).toHaveValue('200000');
        expect(main.getByTestId('to-input')).toHaveValue('400000');

        fireEvent.click(main.getByRole('button', { name: 'First 50%' }));
        expect(main.getByTestId('from-input')).toHaveValue('-1000000');
        expect(main.getByTestId('to-input')).toHaveValue('-50000');
        expect(rangeSection('nav').getByTestId('to-input')).toHaveValue('900000');
    });

    it('continues resolving typed first/last against the data, independently of the Main slider scale', () => {
        renderEditor(DATA_RANGE, { start: -6_000_000, end: 7_000_000 });
        const main = rangeSection('main');
        fireEvent.change(main.getByTestId('from-input'), { target: { value: 'first' } });
        fireEvent.change(main.getByTestId('to-input'), { target: { value: 'last' } });

        expect(main.getByTestId('from-slider')).toHaveValue('0');
        expect(main.getByTestId('to-slider')).toHaveValue('999990');
        expect(main.getByTestId('from-slider')).toHaveAttribute('min', '-6000000');
        expect(main.getByTestId('to-slider')).toHaveAttribute('max', '7000000');
    });

    it.each(['main', 'nav'] as const)('preserves both exact ranges when clicking the expanded %s rail', (target) => {
        const { onChange } = renderEditor();
        const rail = rangeSection(target).getByTestId('distance-range-slider');
        measureRail(rail);

        pointer(rail, 'pointerdown', 200);

        expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
            rangeInput: EXPANDED_INPUT,
            navigatorRangeInput: EXPANDED_INPUT,
        }));
        for (const section of [rangeSection('main'), rangeSection('nav')]) {
            expect(section.getByTestId('from-input')).toHaveValue(EXPANDED_INPUT.start);
            expect(section.getByTestId('to-input')).toHaveValue(EXPANDED_INPUT.end);
        }
    });

    it.each(['pointerup', 'pointercancel'])('keeps the opposite edge and rail extent stable through repeated drag moves until %s', (finish) => {
        renderEditor();
        const nav = rangeSection('nav');
        fireEvent.change(nav.getByTestId('from-input'), { target: { value: '-2000000' } });
        const rail = nav.getByTestId('distance-range-slider');
        const toThumb = nav.getByTestId('to-slider');
        measureRail(rail);
        expect(toThumb).toHaveAttribute('min', '-2000000');
        expect(toThumb).toHaveAttribute('max', EXPANDED_INPUT.end);

        pointer(toThumb, 'pointerdown', 396);
        pointer(window, 'pointermove', 290);
        const firstTo = Number((nav.getByTestId('to-input') as HTMLInputElement).value);
        expect(firstTo).toBeGreaterThan(DATA_RANGE.end);
        expect(firstTo).toBeLessThan(EXPANDED_RANGE.end);
        expect(nav.getByTestId('from-input')).toHaveValue('-2000000');
        expect(toThumb).toHaveAttribute('min', '-2000000');
        expect(toThumb).toHaveAttribute('max', EXPANDED_INPUT.end);

        pointer(window, 'pointermove', 190);
        const secondTo = Number((nav.getByTestId('to-input') as HTMLInputElement).value);
        expect(secondTo).toBeLessThan(firstTo);
        expect(nav.getByTestId('from-input')).toHaveValue('-2000000');
        expect(toThumb).toHaveAttribute('min', '-2000000');
        expect(toThumb).toHaveAttribute('max', EXPANDED_INPUT.end);

        pointer(window, finish, 190);
        expect(toThumb).toHaveAttribute('max', String(Math.max(DATA_RANGE.end, secondTo)));
        pointer(window, 'pointermove', 100);
        expect(nav.getByTestId('to-input')).toHaveValue(String(secondTo));
    });

    it.each([
        ['First 25%', { start: 'first', end: 'first+250000' }],
        ['Last 25%', { start: 'last-250000', end: 'last' }],
    ] as const)('keeps %s anchored to the data extent after expanding the editor range', (label, expected) => {
        const { onChange } = renderEditor();

        fireEvent.click(rangeSection('nav').getByRole('button', { name: label }));

        expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
            navigatorRangeInput: expected,
        }));
    });

    it.each([
        { input: EXPANDED_INPUT, expected: EXPANDED_RANGE },
        { input: { start: '-1074397', end: 'last+1498241' }, expected: { start: EXPANDED_RANGE.start, end: DATA_RANGE.end } },
    ])('applies expanded numeric inputs while keeping data-anchor semantics: %j', ({ input, expected }) => {
        const onApply = jest.fn();
        const onClose = jest.fn();
        render(<RangeModal
            kind="numeric"
            initialRangeInput={input}
            currentRange={EXPANDED_RANGE}
            fullRange={DATA_RANGE}
            onApply={onApply}
            onClose={onClose}
        />);
        expect(screen.getByTestId('from-slider')).toHaveValue(String(expected.start));
        expect(screen.getByTestId('to-slider')).toHaveValue(String(expected.end));

        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

        expect(onApply).toHaveBeenCalledWith(input, expected);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('leaves the shared picker bounded when the TagAnalyzer opt-in is absent', () => {
        const onChange = jest.fn();
        render(<DistanceRangeTab
            pBounds={{ min: DATA_RANGE.start, max: DATA_RANGE.end }}
            pFrom={EXPANDED_RANGE.start}
            pTo={EXPANDED_RANGE.end}
            pOnChange={onChange}
        />);
        const rail = screen.getByTestId('distance-range-slider');
        measureRail(rail);

        pointer(rail, 'pointerdown', 200);

        expect(onChange).toHaveBeenCalledWith(DATA_RANGE.start, DATA_RANGE.end);
    });
});
