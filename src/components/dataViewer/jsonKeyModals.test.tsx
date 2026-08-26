import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import JsonKeyPickerModal from './JsonKeyPickerModal';
import JsonKeyDetailModal from './JsonKeyDetailModal';
import RawRowDetailModal from './RawRowDetailModal';
import { queryTagJsonKeyData } from './dataViewerApi';

// The detail view builds a real ECharts instance against a canvas jsdom does not provide. What is
// under test here is the option it hands over and the grid beside it, so the instance is a stub.
// `TagEChart` drives a real ECharts instance; the stub carries the methods it calls. Same shape as
// the page's own test uses, so the two stay in step.
jest.mock('echarts', () => {
    const instance = {
        setOption: jest.fn(),
        resize: jest.fn(),
        dispose: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        getOption: jest.fn(() => ({})),
        containPixel: jest.fn(() => false),
        convertFromPixel: jest.fn(() => undefined),
        convertToPixel: jest.fn(() => undefined),
        dispatchAction: jest.fn(),
    };
    return { __esModule: true, init: jest.fn(() => instance) };
});

jest.mock('./dataViewerApi', () => ({
    __esModule: true,
    queryTagJsonKeyData: jest.fn(),
}));

const mockedQuery = queryTagJsonKeyData as jest.MockedFunction<typeof queryTagJsonKeyData>;

const doc = {
    device_id: 'EDGE-07',
    status: 'running',
    sensor: {
        temperature: { value: 23.4, unit: 'C' },
        humidity: { value: 41.2, unit: '%' },
    },
    readings: [1, 2, 3],
};

describe('JsonKeyPickerModal', () => {
    const open = (props: Partial<React.ComponentProps<typeof JsonKeyPickerModal>> = {}) =>
        render(<JsonKeyPickerModal tagName="EDGE-07" baseLabel="2026-08-25 10:00:00" document={doc} onClose={jest.fn()} onConfirm={jest.fn()} {...props} />);

    // The document the user clicked is the thing they came to look at, so it is open — folding it
    // would put a click in front of every key past the first level.
    it('opens expanded, all the way down', () => {
        open();
        expect(screen.getByRole('checkbox', { name: 'sensor' })).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: 'sensor.temperature.value' })).toBeInTheDocument();
    });

    // "Back" has to come back to what you left. The modal is unmounted while the detail view is up,
    // so the filter and the folds ride out and back on the page rather than living only in here.
    it('starts from the view it was left with, and reports the one it is in', () => {
        const onViewChange = jest.fn();
        open({ initialView: { filter: 'temperature', collapsed: [] }, onViewChange });

        expect(screen.getByLabelText('Filter keys')).toHaveValue('temperature');
        // Leaves only, and only the matching ones — the filtered tree, not the whole document.
        expect(screen.queryByRole('checkbox', { name: 'device_id' })).not.toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: 'sensor.temperature.value' })).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Filter keys'), { target: { value: 'status' } });
        expect(onViewChange).toHaveBeenLastCalledWith({ filter: 'status', collapsed: [] });
    });

    // The count under the tree is what the next screen will honour, so it has to be the capped one.
    it('counts what the chart will draw, not what was ticked', () => {
        const wide = Object.fromEntries(Array.from({ length: 6 }, (_, index) => [`k${index}`, index]));
        open({ document: wide });
        Array.from({ length: 6 }, (_, index) => index).forEach((index) => {
            fireEvent.click(screen.getByRole('checkbox', { name: `k${index}` }));
        });
        expect(screen.getByText('6 keys selected · 4 of 6 drawn')).toBeInTheDocument();
    });

    // A scrim covers the page but does nothing to the tab order, and an unnamed `<div>` is not a
    // dialog to anything that is not looking at it.
    it('is a named dialog, and takes focus when it opens', () => {
        open();
        // Portalled to `document.body`, so it is not under the render container.
        const dialog = document.querySelector('.modal') as HTMLElement;

        expect(dialog).toHaveAttribute('role', 'dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAttribute('aria-label', 'Choose keys from EDGE-07');
        expect(document.activeElement).toBe(dialog);
    });

    // A branch is opened far more often than it is ticked, so the body of the row opens it and the
    // box is left to do only its own job.
    it('folds a branch when its row is clicked, and does not select it', () => {
        open();

        // The branch row's body — the pointer-only target that shares the caret's action.
        const body = screen.getAllByTitle('sensor').find((element) => element.classList.contains('json-key-open'));
        fireEvent.click(body!);

        expect(screen.queryByRole('checkbox', { name: 'sensor.temperature.value' })).not.toBeInTheDocument();
        expect(screen.getByText('0 keys selected · 0 series')).toBeInTheDocument();
    });

    it('selects the whole branch when its box is clicked, and does not fold it', () => {
        open();

        fireEvent.click(screen.getByRole('checkbox', { name: 'sensor' }));

        expect(screen.getByRole('checkbox', { name: 'sensor.temperature.value' })).toBeChecked();
        expect(screen.getByText('4 keys selected · 2 series')).toBeInTheDocument();
    });

    // A branch says its size in the row, so nobody has to open it to find out whether it is worth
    // opening.
    it('summarises a branch instead of leaving it blank', () => {
        open();
        expect(screen.getAllByText('object · 2')).toHaveLength(3);
        expect(screen.getByText('array · 3')).toBeInTheDocument();
    });

    it('shows each leaf beside the value it holds', () => {
        open();
        expect(screen.getByText('23.4')).toBeInTheDocument();
        expect(screen.getByText('running')).toBeInTheDocument();
    });

    // A branch is not a series, but it is the fastest way to say "all of these".
    it('takes every leaf under a branch that is ticked', () => {
        open();
        fireEvent.click(screen.getByRole('checkbox', { name: 'sensor' }));
        expect(screen.getByText('4 keys selected · 2 series')).toBeInTheDocument();
    });

    // A half-filled box has exactly one open question, and filling up is the answer to it.
    it('reads as mixed while partly picked, and fills up rather than emptying', () => {
        open({ initialSelected: ['[sensor][temperature][value]'] });

        const branch = screen.getByRole('checkbox', { name: 'sensor' }) as HTMLInputElement;
        expect(branch.indeterminate).toBe(true);

        fireEvent.click(branch);
        expect(screen.getByText('4 keys selected · 2 series')).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: 'sensor' })).toBeChecked();
    });

    // The count that matters is not how many boxes are ticked but how many lines the chart will
    // draw — those are different numbers the moment a text key is picked.
    it('counts picked keys and drawable series separately', () => {
        open();

        fireEvent.click(screen.getByRole('checkbox', { name: 'status' }));
        expect(screen.getByText('1 key selected · 0 series')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('checkbox', { name: 'sensor.temperature.value' }));
        expect(screen.getByText('2 keys selected · 1 series')).toBeInTheDocument();
    });

    // A key holding text has no line to draw but every one of its readings is a row, so the detail
    // view opens on it — the count says how many of the picks the chart will take.
    it('opens the detail on anything picked, and says how many will be drawn', () => {
        open();

        const view = screen.getByRole('button', { name: 'View detail' });
        expect(view).toBeDisabled();

        fireEvent.click(screen.getByRole('checkbox', { name: 'status' }));
        expect(view).toBeEnabled();
        expect(screen.getByText('1 key selected · 0 series')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('checkbox', { name: 'sensor.humidity.value' }));
        expect(screen.getByText('2 keys selected · 1 series')).toBeInTheDocument();
    });

    it('hands over exactly what was ticked', () => {
        const onConfirm = jest.fn();
        open({ onConfirm });

        fireEvent.click(screen.getByRole('checkbox', { name: 'sensor.temperature.value' }));
        fireEvent.click(screen.getByRole('button', { name: 'View detail' }));

        expect(onConfirm).toHaveBeenCalledWith(['[sensor][temperature][value]']);
    });

    // Coming back from the detail view has to land on the tree as it was left, or "back" and "start
    // over" are the same button.
    it('reopens on the selection it was left with', () => {
        open({ initialSelected: ['[sensor][temperature][value]'] });

        expect(screen.getByRole('checkbox', { name: 'sensor.temperature.value' })).toBeChecked();
        expect(screen.getByText('1 key selected · 1 series')).toBeInTheDocument();
    });

    // Filtering flattens the tree, so a match three levels down has to carry its own path — the
    // parents that would have said where it came from are no longer above it.
    it('writes the full path ahead of a filtered match', () => {
        open();

        fireEvent.change(screen.getByLabelText('Filter keys'), { target: { value: 'humidity.value' } });

        // The row is the label around the box, which is what carries the path written out.
        const row = screen.getByTitle('sensor.humidity.value');
        expect(within(row).getByText('sensor.humidity.')).toBeInTheDocument();
        expect(screen.queryByRole('checkbox', { name: /temperature\.value/ })).not.toBeInTheDocument();
    });

    // The filter reaches past any folds the user has set, and past the tree shape entirely.
    it('narrows to the matches alone', () => {
        open();
        fireEvent.change(screen.getByLabelText('Filter keys'), { target: { value: 'unit' } });

        expect(screen.getAllByRole('checkbox')).toHaveLength(2);
        fireEvent.click(screen.getByRole('checkbox', { name: 'sensor.temperature.unit' }));
        expect(screen.getByText('1 key selected · 0 series')).toBeInTheDocument();
    });

    // The panel gathers what is picked, so it is also where the whole lot is dropped.
    it('lists every picked key, and drops one or all of them from the panel', () => {
        open({ initialSelected: ['[status]', '[sensor][temperature][value]'] });

        expect(screen.getByText('SELECTED · 2')).toBeInTheDocument();
        // Once in the tree, once in the panel — the panel is the second.
        expect(screen.getAllByTitle('sensor.temperature.value')).toHaveLength(2);

        fireEvent.click(screen.getByRole('button', { name: 'Remove status' }));
        expect(screen.getByText('1 key selected · 1 series')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
        expect(screen.getByText('0 keys selected · 0 series')).toBeInTheDocument();
    });
});

describe('JsonKeyDetailModal', () => {
    const params = { dbName: 'MACHBASEDB', userName: 'SYS', tableName: 'TAG', tagName: 'EDGE-07' };

    const rows = Array.from({ length: 60 }, (_, index) => ({
        base: `2026-08-25 10:${String(index).padStart(2, '0')}:00.000`,
        values: [20 + index, 'running'],
    }));

    beforeEach(() => {
        mockedQuery.mockReset();
        mockedQuery.mockResolvedValue({ rows });
    });

    const open = (props: Partial<React.ComponentProps<typeof JsonKeyDetailModal>> = {}) =>
        render(
            <JsonKeyDetailModal
                {...params}
                paths={['[sensor][temperature][value]', '[status]']}
                from="2026-08-25 10:00:00.000"
                to="2026-08-25 11:00:00.000"
                onClose={jest.fn()}
                {...props}
            />
        );

    // The header has to name the keys without becoming a paragraph, so the first one is written out
    // and the rest are counted.
    it('names the first key and counts the rest', async () => {
        open();
        await waitFor(() => expect(mockedQuery).toHaveBeenCalled());
        expect(screen.getByText('sensor.temperature.value +1')).toBeInTheDocument();
    });

    // A record per value, as the page's own raw grid shows one — a column per key would fill the
    // table with blanks for every key a cycle did not carry, and grow sideways with each new key.
    it('gives the grid a row per value rather than a column per key', async () => {
        open();
        await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());

        expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['TIME', 'KEY', 'VALUE']);
        // Two keys across the first cycle, so the first two rows are that cycle's two values.
        const firstRow = screen.getAllByRole('row')[1];
        expect(within(firstRow).getByText('value')).toBeInTheDocument();
    });

    // A key holding text is real data and belongs in the grid; saying so is what keeps its absence
    // from the chart from reading as a bug.
    // The dot ties a grid row to its line above; a key the chart could not draw has no colour and
    // so no dot.
    it('marks each drawn key with the colour its line is drawn in', async () => {
        open();
        await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());

        const cells = screen.getAllByTitle('sensor.temperature.value');
        expect(cells[0].getAttribute('style')).toContain('--raw-dot');
        expect(screen.getAllByTitle('status')[0].getAttribute('style') ?? '').not.toContain('--raw-dot');
    });

    // The engine renders a projected double to 17 significant digits, so the same payload read
    // `0.907` in the picker and `0.90700000000000003` here — one number, three views, two spellings.
    it('prints a projected number the way the document spells it', async () => {
        mockedQuery.mockResolvedValue({
            rows: [
                { base: '2026-08-25 10:00:00.000', values: ['0.90700000000000003', 'x'] },
                { base: '2026-08-25 10:01:00.000', values: ['119.15000000000001', 'x'] },
                // Round-trips to itself, and an id is not a number — both must survive untouched.
                { base: '2026-08-25 10:02:00.000', values: ['3.141592653589793', '007'] },
            ],
        });
        open();
        await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());

        expect(screen.getByText('0.907')).toBeInTheDocument();
        expect(screen.getByText('119.15')).toBeInTheDocument();
        expect(screen.getByText('3.141592653589793')).toBeInTheDocument();
        expect(screen.getByText('007')).toBeInTheDocument();
        expect(screen.queryByText('0.90700000000000003')).not.toBeInTheDocument();
    });

    // The chart draws at most `MAX_JSON_KEY_SERIES`. Picking more and being shown four lines with no
    // arithmetic to explain it reads as data gone missing, so both screens say what the cap did.
    it('says how many of the picked keys the chart is actually drawing', async () => {
        const paths = ['[a]', '[b]', '[c]', '[d]', '[e]', '[f]'];
        mockedQuery.mockResolvedValue({
            rows: Array.from({ length: 6 }, (_, index) => ({
                base: `2026-08-25 10:0${index}:00.000`,
                values: paths.map((_p, key) => index + key),
            })),
        });
        open({ paths });
        await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());
        expect(screen.getByText(/4 of 6 series/)).toBeInTheDocument();
    });

    // The header centres this label, so every character it keeps is one taken off the key name to
    // its left. Printing the same date twice buys the reader nothing.
    it('prints the date once when the window does not cross a day', async () => {
        open();
        await waitFor(() => expect(mockedQuery).toHaveBeenCalled());
        expect(screen.getByText('2026-08-25 10:00:00.000 → 11:00:00.000')).toBeInTheDocument();
    });

    it('keeps both dates when the window does cross one', async () => {
        open({ to: '2026-08-26 11:00:00.000' });
        await waitFor(() => expect(mockedQuery).toHaveBeenCalled());
        expect(screen.getByText('2026-08-25 10:00:00.000 → 2026-08-26 11:00:00.000')).toBeInTheDocument();
    });

    it('is a named dialog, and takes focus when it opens', async () => {
        open();
        await waitFor(() => expect(mockedQuery).toHaveBeenCalled());
        const dialog = document.querySelector('.modal') as HTMLElement;

        expect(dialog).toHaveAttribute('role', 'dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAttribute('aria-label', 'Key detail for EDGE-07');
        expect(document.activeElement).toBe(dialog);
    });

    // Every option write is `notMerge`, so a legend switch has to be carried across by hand — and
    // carried only for the series it was flipped on. Both halves are load-bearing: without the
    // first, panning puts a hidden line back; without the second, a line hidden before its tag was
    // removed comes back invisible when the tag is added again.
    it('keeps a hidden series hidden across an option rewrite, and only while that series is there', async () => {
        const echartsMock = jest.requireMock('echarts') as { init: jest.Mock };
        // Two drawable keys, so there are two legend entries to tell apart.
        mockedQuery.mockResolvedValue({
            rows: Array.from({ length: 60 }, (_, index) => ({
                base: `2026-08-25 10:${String(index).padStart(2, '0')}:00.000`,
                values: [20 + index, 5 + index],
            })),
        });
        const { rerender } = open();
        await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());

        const instance = echartsMock.init.mock.results.at(-1)?.value;
        const lastOption = () => instance.setOption.mock.calls.at(-1)?.[0];
        const lastLegend = () => lastOption()?.legend?.selected;
        const mainNames = () =>
            (lastOption()?.series ?? []).filter((entry: { id?: string }) => String(entry.id).startsWith('main-series')).map((entry: { name: string }) => entry.name);

        const [kept, hidden] = mainNames();
        expect(hidden).toBeDefined();

        // The mocked instance is shared across this file, so its `on` calls accumulate — the handler
        // wanted is the one this render registered, which is the last of them.
        const onLegend = instance.on.mock.calls.filter((call: unknown[]) => call[0] === 'legendselectchanged').at(-1)?.[1] as (p: unknown) => void;
        expect(onLegend).toBeDefined();
        onLegend({ selected: { [kept]: true, [hidden]: false } });

        // Paging rewrites the whole option. The switch has to survive that, or a hidden line comes
        // back the moment the reader moves.
        fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
        await waitFor(() => expect(lastLegend()).toEqual({ [kept]: true, [hidden]: false }));

        // The hidden key leaves the view, so its switch leaves with it: picking it again is a fresh
        // request to see it, not a return to the state it was left in.
        rerender(
            <JsonKeyDetailModal
                {...params}
                paths={['[sensor][temperature][value]']}
                from="2026-08-25 10:00:00.000"
                to="2026-08-25 11:00:00.000"
                onClose={jest.fn()}
            />
        );
        await waitFor(() => expect(lastLegend()?.[hidden]).toBeUndefined());
    });

    // The page's own chart, not a second one — one way to operate a chart on this page, not two.
    it('draws with the page chart, controls included', async () => {
        open();
        await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());

        expect(screen.getByLabelText('Move range forward')).toBeInTheDocument();
        expect(screen.getByLabelText('Move range backward')).toBeInTheDocument();
    });

    // The two are on screen together so that one is the other's shape: the chart draws the rows the
    // grid is showing, so paging moves both — and the chart's own shift arrows are that same pager.
    it('moves the chart with the page, and pages with the chart arrows', async () => {
        const echartsMock = jest.requireMock('echarts') as { init: jest.Mock };
        mockedQuery.mockResolvedValue({
            rows: Array.from({ length: 40 }, (_, index) => ({
                base: `2026-08-25 10:${String(index).padStart(2, '0')}:00.000`,
                values: [index, 'x'],
            })),
        });
        open();
        await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());

        const axisMin = () => {
            const option = echartsMock.init.mock.results.at(-1)?.value.setOption.mock.calls.at(-1)?.[0];
            const axis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis;
            return axis.min;
        };
        const first = axisMin();

        const calls = mockedQuery.mock.calls.length;
        fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
        await waitFor(() => expect(axisMin()).not.toBe(first));
        // The rows were already here; a new span is not a new read.
        expect(mockedQuery).toHaveBeenCalledTimes(calls);

        // The arrows on the chart are the same control as the pager beneath it.
        fireEvent.click(screen.getByLabelText('Move range backward'));
        await waitFor(() => expect(axisMin()).toBe(first));
    });

    // The grid already says which keys are drawn — a coloured dot beside the ones that are — so a
    // note under the chart would only repeat it in words.
    it('says a key is not charted with the dot, not with a sentence', async () => {
        open();
        await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());

        expect(screen.queryByText(/Not charted/)).not.toBeInTheDocument();
        expect(screen.getAllByTitle('status')[0].getAttribute('style') ?? '').not.toContain('--raw-dot');
    });

    it('pages the grid without asking the server again', async () => {
        open();
        await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());

        // 60 cycles carrying two keys each — 120 values, not 60 rows.
        expect(screen.getByText('1–25 of 120 rows')).toBeInTheDocument();
        expect(screen.getByText('1 / 5')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
        expect(screen.getByText('26–50 of 120 rows')).toBeInTheDocument();
        expect(mockedQuery).toHaveBeenCalledTimes(1);
    });

    // The span on screen, not the span that was asked for. Paging and zooming both move this view
    // off the page's window, and handing over that window opens a board showing something else.
    it('hands Tag Analyzer the window it is showing, and every key that has numbers', async () => {
        const onOpenTagAnalyzer = jest.fn();
        open({ onOpenTagAnalyzer });
        await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());

        // Page 1 holds 25 of the 120 value rows, so the chart is showing the first few minutes of
        // the hour, not the hour.
        fireEvent.click(screen.getByRole('button', { name: /Open in Tag Analyzer/ }));
        expect(onOpenTagAnalyzer).toHaveBeenCalledWith(['[sensor][temperature][value]'], {
            from: '2026-08-25 10:00:00.000',
            to: '2026-08-25 10:12:00.000',
        });

        // …and it follows the page.
        fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
        fireEvent.click(screen.getByRole('button', { name: /Open in Tag Analyzer/ }));
        const [, second] = onOpenTagAnalyzer.mock.calls.at(-1) as [string[], { from: string; to: string }];
        expect(second.from).not.toBe('2026-08-25 10:00:00.000');
        expect(second.to).not.toBe('2026-08-25 11:00:00.000');
    });

    // The four-line cap is this modal's, for its own legend. Tag Analyzer is not bound by it, and
    // dropping keys on the way out would lose data the user picked.
    it('hands over the keys past its own four-line cap', async () => {
        const paths = ['[a]', '[b]', '[c]', '[d]', '[e]', '[f]'];
        mockedQuery.mockResolvedValue({
            rows: Array.from({ length: 6 }, (_, index) => ({
                base: `2026-08-25 10:0${index}:00.000`,
                values: paths.map((_p, key) => index + key),
            })),
        });
        const onOpenTagAnalyzer = jest.fn();
        open({ paths, onOpenTagAnalyzer });
        await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: /Open in Tag Analyzer/ }));
        expect(onOpenTagAnalyzer.mock.calls[0][0]).toEqual(paths);
    });

    // A page whose rows share one timestamp has no span of its own. Falling back to the whole
    // window draws an hour beside a grid showing one instant, with nothing saying they differ.
    it('reaches to the neighbouring cycle rather than showing the whole window', async () => {
        mockedQuery.mockResolvedValue({
            rows: [
                { base: '2026-08-25 10:00:00.000', values: [1, 'x'] },
                { base: '2026-08-25 10:05:00.000', values: [2, 'x'] },
                { base: '2026-08-25 10:05:00.000', values: [3, 'x'] },
            ],
        });
        const onOpenTagAnalyzer = jest.fn();
        open({ onOpenTagAnalyzer });
        await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());

        // Rows 2 and 3 share 10:05. Reached from row 1, the span is 10:00 → 10:05, never the hour.
        fireEvent.click(screen.getByRole('button', { name: /Open in Tag Analyzer/ }));
        const [, window] = onOpenTagAnalyzer.mock.calls[0];
        expect(window.to).not.toBe('2026-08-25 11:00:00.000');
    });

    // A cycle that did not carry a key produces no row for it — the absence is the absence of a
    // record, which is how the page's raw grid says the same thing.
    it('leaves out the cycles a key was not written in', async () => {
        mockedQuery.mockResolvedValue({
            rows: [
                { base: '2026-08-25 10:00:00.000', values: [23.4, 'running'] },
                { base: '2026-08-25 10:01:00.000', values: [null, null] },
            ],
        });
        open();
        await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());

        expect(screen.getByText('1–2 of 2 rows')).toBeInTheDocument();
        expect(screen.queryByText('NULL')).not.toBeInTheDocument();
    });

    // A tag can carry several keys written on different cycles, so each key is absent from the
    // cycles that belonged to another one. Those are not points on this key's line — passing them
    // through as nulls leaves every real point an isolated segment, and the chart draws nothing.
    it('gives the chart only the cycles a key was written in', async () => {
        const echartsMock = jest.requireMock('echarts') as { init: jest.Mock };
        echartsMock.init.mockClear();
        mockedQuery.mockResolvedValue({
            rows: [
                { base: '2026-08-25 15:39:00.000', values: [null, null] },
                { base: '2026-08-25 15:41:00.000', values: [52.4, 'running'] },
                { base: '2026-08-25 15:43:00.000', values: [null, null] },
                { base: '2026-08-25 15:45:00.000', values: [52.5, 'running'] },
            ],
        });
        open();
        await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());

        const option = echartsMock.init.mock.results.at(-1)?.value.setOption.mock.calls.at(-1)?.[0];
        const drawn = option.series.find((entry: { name: string }) => entry.name === 'value');
        expect(drawn.data).toHaveLength(2);
        expect(drawn.data.every(([, y]: [number, number]) => y !== null)).toBe(true);
    });

    // `click` lands on the nearest common ancestor of press and release, so a drag that starts on
    // the chart and ends past the edge arrives as a click on the overlay. The chart stops
    // `mousedown` propagating, which is what defeats the shared modal's own guard.
    it('does not close on a drag that began inside and ended outside', async () => {
        const onClose = jest.fn();
        open({ onClose });
        await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());

        const overlay = document.querySelector('.modal-overlay') as HTMLElement;
        const chart = document.querySelector('.json-key-detail-chart') as HTMLElement;

        // Pressed on the chart, which swallows the event before the modal's own listener sees it.
        const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
        chart.dispatchEvent(down);
        fireEvent.click(overlay);

        expect(onClose).not.toHaveBeenCalled();

        // A press on the scrim is a press outside the dialog, and still closes it — the scrim sits
        // inside the same portal wrapper, which is why the guard tests the dialog box instead.
        overlay.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        fireEvent.click(overlay);
        expect(onClose).toHaveBeenCalledTimes(1);

        // And so does a press anywhere else on the page.
        document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        fireEvent.click(overlay);
        expect(onClose).toHaveBeenCalledTimes(2);
    });

    // The shared modal routes Escape through the same prop as a click outside, so the latch that
    // protects a drag must not also eat the first Escape after any click inside.
    it('still closes on Escape after a click inside', async () => {
        const onClose = jest.fn();
        open({ onClose });
        await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());

        const chart = document.querySelector('.json-key-detail-chart') as HTMLElement;
        chart.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        fireEvent.keyDown(document, { key: 'Escape' });

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('reports a failed read instead of an empty chart', async () => {
        mockedQuery.mockRejectedValue(new Error('Error in json load.'));
        open();
        await waitFor(() => expect(screen.getByText('Error in json load.')).toBeInTheDocument());
    });
});

describe('RawRowDetailModal', () => {
    const open = (props: Partial<React.ComponentProps<typeof RawRowDetailModal>> = {}) =>
        render(
            <RawRowDetailModal
                subtitle="JSON_TEST"
                position="row 4 of 303"
                title="SEOUL.LINE_01"
                fields={[
                    { key: 'time', label: 'Time', typeLabel: 'DATETIME', value: '2026-08-24 13:58:33.177' },
                    { key: 'value', label: 'Value', typeLabel: 'DOUBLE', value: null },
                ]}
                hasPrevious
                hasNext
                onPrevious={jest.fn()}
                onNext={jest.fn()}
                onClose={jest.fn()}
                {...props}
            />
        );

    // An empty box cannot say whether the value was absent or blank.
    it('writes an absent value out rather than leaving the cell empty', () => {
        open();
        expect(screen.getByText('NULL')).toBeInTheDocument();
    });

    it('writes the column type under its name', () => {
        open();
        expect(screen.getByText('DATETIME')).toBeInTheDocument();
        expect(screen.getByText('DOUBLE')).toBeInTheDocument();
    });

    // The clipboard refuses when the document is not focused, and swallowing that rejection is what
    // makes the button look like it does nothing — which is what it did.
    it('says so when the clipboard refuses, instead of looking like nothing happened', async () => {
        const writeText = jest.fn().mockRejectedValue(new Error('Document is not focused'));
        Object.assign(navigator, { clipboard: { writeText } });
        (document as unknown as { execCommand: unknown }).execCommand = jest.fn(() => false);

        open();
        fireEvent.click(screen.getByRole('button', { name: 'Copy Time' }));

        expect(await screen.findByText(/Time copy failed/)).toBeInTheDocument();
    });

    it('confirms a copy that went through, on the button that was pressed', async () => {
        Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } });

        open();
        fireEvent.click(screen.getByRole('button', { name: 'Copy Time' }));

        expect(await screen.findByText('Time copied')).toBeInTheDocument();
    });
});
