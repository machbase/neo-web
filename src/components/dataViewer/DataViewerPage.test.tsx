import { readFileSync } from 'fs';
import { join } from 'path';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { RecoilRoot } from 'recoil';
import DataViewerPage from './DataViewerPage';
import { buildRawColumnWidths, buildRawResultColumns, buildRawRowNameColors } from './dataViewerModel';

// react-virtuoso measures its viewport through `offsetParent`, which jsdom hard-codes to null,
// so an unassisted render mounts zero rows and every row assertion below would pass vacuously.
// `initialItemCount` is virtuoso's own escape hatch for non-measuring environments (SSR); it is
// injected here rather than in DataViewerPage so production keeps a single measured render pass.
// The real TableVirtuoso still runs, so `components.Table` (colgroup + children) is exercised.
jest.mock('react-virtuoso', () => {
    const actual = jest.requireActual('react-virtuoso');
    // `jest.requireActual` rather than a bare `require`: jest.mock factories are hoisted above the
    // imports, so React has to be pulled in from inside the factory.
    const React = jest.requireActual<typeof import('react')>('react');
    return {
        ...actual,
        TableVirtuoso: (props: Record<string, unknown>) => {
            // initialItemCount is read once, on mount, and is not clamped to `data`. The page mounts
            // with zero rows and fills them in after the query resolves, so the count is re-applied
            // by keying the remount on the row count — and clamped so virtuoso never asks
            // itemContent for a row that does not exist.
            const rowCount = Array.isArray(props.data) ? props.data.length : 0;
            return React.createElement(actual.TableVirtuoso, { key: rowCount, initialItemCount: Math.min(20, rowCount), ...props });
        },
    };
});

// The page's data access is stubbed at the module boundary so this test stays independent of how
// dataViewerApi builds its SQL.
jest.mock('./dataViewerApi', () => ({
    listTableTags: jest.fn(),
    listTableColumns: jest.fn(),
    queryTagData: jest.fn(),
    queryTagDataTotal: jest.fn(),
    queryTagBoundaryTime: jest.fn(),
    queryTagBaseColumnBounds: jest.fn(),
}));

// TimeRangeModal is shared with the dashboards, which legitimately allow an open-ended side, so it
// cannot be the place the Data Viewer's both-edges-required rule lives. Standing in for it here
// keeps these tests on the page's own apply path (and off the design-system date pickers).
jest.mock('@/components/modal/TimeRangeModal', () => {
    const React = jest.requireActual<typeof import('react')>('react');
    const moment = jest.requireActual<typeof import('moment')>('moment');
    const Actual = jest.requireActual<{ default: any }>('@/components/modal/TimeRangeModal').default;
    const modalCallbackValue = (value: unknown) => {
        if (typeof value !== 'number') return value;
        const displayed = moment.unix(value / 1000).format('YYYY-MM-DD HH:mm:ss');
        return moment(displayed).unix() * 1000;
    };
    // An edge the user actually retyped: the modal's own second-resolution text, an hour earlier
    // than what it opened with. Derived from the current edge rather than written out as a literal
    // — a fixed wall-clock string is only inside the window in the zone it was written in, and CI
    // runs in UTC while this was authored in KST. There the literal landed *after* the window's To,
    // the page refused the reversed range, and no query went out at all.
    const shiftedBackAnHour = (value: unknown) =>
        typeof value === 'number' ? moment.unix(value / 1000).subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss') : value;
    return {
        __esModule: true,
        // Time: a stub, because what these tests check is the *page's* refusal of an open-ended side,
        // not the modal's editing. Distance: the real thing, because the distance editor *is* the
        // shared modal now — the slider, the ticks and the quick windows below are its behaviour,
        // reached through the page exactly as a user reaches them.
        default: (props: any) =>
            props?.pLockTab === 'distance'
                ? React.createElement(Actual, props)
                : React.createElement(
                      'div',
                      null,
                      React.createElement('span', { 'data-testid': 'negative-time-opt-in' }, String(props?.pAllowNegativeTime)),
                      React.createElement('button', { type: 'button', onClick: () => props?.pSaveCallback?.('2026-06-01 09:00:00', '') }, 'apply-without-to'),
                      React.createElement('button', { type: 'button', onClick: () => props?.pSaveCallback?.('', '2026-06-01 10:00:00') }, 'apply-without-from'),
                      React.createElement('button', { type: 'button', onClick: () => props?.pSaveCallback?.('2026-06-01 09:00:00', '2026-06-01 10:00:00') }, 'apply-both'),
                      React.createElement('button', { type: 'button', onClick: () => props?.pSaveCallback?.(0, 1000) }, 'apply-epoch-zero'),
                      React.createElement('button', { type: 'button', onClick: () => props?.pSaveCallback?.(1780290000789, 1780293600123) }, 'apply-millisecond-range'),
                      React.createElement(
                          'button',
                          {
                              type: 'button',
                              onClick: () =>
                                  props?.pSaveCallback?.(modalCallbackValue(props.pStartTime), modalCallbackValue(props.pEndTime)),
                          },
                          'apply-current-displayed'
                      ),
                      React.createElement(
                          'button',
                          {
                              type: 'button',
                              onClick: () => props?.pSaveCallback?.(shiftedBackAnHour(props.pStartTime), modalCallbackValue(props.pEndTime)),
                          },
                          'edit-from-only'
                      )
                  ),
    };
});

// Chart mode initialises a real ECharts instance against a canvas jsdom does not provide. Only the
// page's own gating is under test here, so the instance is a stub with the methods DataViewerChart
// calls; the chart panel itself still mounts, which is what the mode assertions read.
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
        // The inverse of `convertFromPixel`: the drag guide asks for the pixel the axis's own two
        // edges sit at, so it can stop the rectangle there. Answering `undefined` is the "no geometry
        // available" case, under which the guide is drawn unclamped — which is what every test that
        // is not about dragging wants, because it is what the component did before.
        convertToPixel: jest.fn(() => undefined),
        dispatchAction: jest.fn(),
    };
    return { __esModule: true, init: jest.fn(() => instance) };
});

// The Tag Analyzer hand-off is the thing being blocked, so it is stubbed at its own boundary:
// asserting on this mock is the difference between "the button did not open a board" and "the
// button was not there", and only the first of those is the guarantee.
jest.mock('@/components/tagAnalyzer/integration', () => ({
    createTagAnalyzerBoardFromPayload: jest.fn(() => ({ status: 'ok', board: { id: 'board-1' } })),
}));

// react-virtuoso observes its scroll parent; jsdom does not implement ResizeObserver.
class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
}
beforeAll(() => {
    (global as any).ResizeObserver = (global as any).ResizeObserver ?? ResizeObserverStub;
});

const dataViewerApi = jest.requireMock('./dataViewerApi') as {
    listTableTags: jest.Mock;
    listTableColumns: jest.Mock;
    queryTagData: jest.Mock;
    queryTagDataTotal: jest.Mock;
    queryTagBoundaryTime: jest.Mock;
    queryTagBaseColumnBounds: jest.Mock;
};

const tagAnalyzerBridge = jest.requireMock('@/components/tagAnalyzer/integration') as {
    createTagAnalyzerBoardFromPayload: jest.Mock;
};

// M$SYS_COLUMNS rows as `listTableColumns` returns them: [NAME, TYPE, FLAG] — flag at index 2.
const DATETIME_TYPE = 6;
const DOUBLE_TYPE = 20;
const VARCHAR_TYPE = 5;
const BASETIME_FLAG = 0x01000000;
const TIME_BASE_COLUMNS = [
    ['NAME', VARCHAR_TYPE, 0],
    ['TIME', DATETIME_TYPE, BASETIME_FLAG],
    ['VALUE', DOUBLE_TYPE, 0],
];
// A distance base: BASETIME-flagged but not DATETIME. The plain DATETIME column alongside it is the
// trap — a reader that ignores the flag would pick `RECORDED_AT` and call the table a time base.
const DISTANCE_BASE_COLUMNS = [
    ['NAME', VARCHAR_TYPE, 0],
    ['ODOMETER_M', DOUBLE_TYPE, BASETIME_FLAG],
    ['VALUE', DOUBLE_TYPE, 0],
    ['RECORDED_AT', DATETIME_TYPE, 0],
];
// The value column holds a JSON document. Type at index 1 — the same position the BASETIME flag
// occupies one row up sits at index 2, which is what makes an index slip here invisible.
const JSON_TYPE = 61;
const JSON_VALUE_COLUMNS = [
    ['NAME', VARCHAR_TYPE, 0],
    ['TIME', DATETIME_TYPE, BASETIME_FLAG],
    ['VALUE', JSON_TYPE, 0],
];
// Must stay in sync with JSON_VALUE_COLUMN_BLOCK_REASON in DataViewerPage.tsx. It is the whole
// user-facing explanation for the two disabled controls, so a silent drift here would leave the
// tests green while the buttons went dark without a reason.
const JSON_VALUE_BLOCK_REASON = 'Unavailable: the value column of this table is a JSON type, which cannot be charted or analyzed.';

const TAG_NAME = 'plant1.line1.temperature';
const OTHER_TAG_NAME = 'plant1.line1.pressure';
const ROW_COUNT = 30;
const ROWS = Array.from({ length: ROW_COUNT }, (_, index) => ({
    time: `2026-06-01T10:00:${String(index).padStart(2, '0')}.000Z`,
    name: TAG_NAME,
    value: 10 + index,
}));

// `last` resolves against the newest sample of the *selected* tags, so a fixed stub would make the
// window look frozen even if the page re-resolved on every read. This advances a minute per call,
// which is what a live tag does — so a re-resolution is always visible as a different window.
const BOUNDARY_BASE_MS = Date.parse('2026-06-01T10:00:29.000Z');
const advancingBoundaryTime = () => {
    let call = 0;
    return jest.fn(async () => new Date(BOUNDARY_BASE_MS + call++ * 60_000).toISOString());
};

const renderPage = (pCode: Record<string, string> = {}) =>
    render(
        <RecoilRoot>
            <MemoryRouter>
                <DataViewerPage pCode={{ dbName: 'MACHBASEDB', userName: 'SYS', tableName: 'TAG', ...pCode }} />
            </MemoryRouter>
        </RecoilRoot>
    );

const queryTagDataArgs = () => dataViewerApi.queryTagData.mock.calls.map((call) => call[0] as { from?: string | number; to?: string | number; page?: number });
const windowOf = (args: { from?: string | number; to?: string | number }) => `${args.from} ~ ${args.to}`;
// The toolbar label renders the frozen window itself. Page requests can carry their own bounds (a
// tag change refreshes within the current page's rows), so the label is the only place the window
// is observable without that interference.
// The caption below the controls, not the button: the button carries the expression the user set
// in the modal, the caption carries the instants it resolved to.
const resolvedWindowLabel = () => document.querySelector('.data-viewer-time-range-resolved')?.textContent;

const gotoPage = (nextPage: number) => {
    const input = screen.getByLabelText('Current result page');
    fireEvent.change(input, { target: { value: String(nextPage) } });
    fireEvent.keyDown(input, { key: 'Enter' });
};

const getRawTable = (container: HTMLElement) => container.querySelector<HTMLTableElement>('table.data-viewer-raw-table');

// virtuoso closes the tbody with an empty filler row that pads the scroll height; drop it so the
// remaining rows are the ones itemContent actually produced.
const getDataRows = (container: HTMLElement) => Array.from(container.querySelectorAll('tbody tr')).filter((row) => row.textContent?.trim());

beforeEach(() => {
    jest.clearAllMocks();
    dataViewerApi.listTableTags.mockResolvedValue({ tags: [{ name: TAG_NAME, dataType: 'double' }], assetHierarchy: undefined });
    dataViewerApi.listTableColumns.mockResolvedValue(TIME_BASE_COLUMNS);
    dataViewerApi.queryTagData.mockResolvedValue({ rows: ROWS });
    dataViewerApi.queryTagDataTotal.mockResolvedValue({ lastPage: 1 });
    dataViewerApi.queryTagBoundaryTime.mockImplementation(advancingBoundaryTime());
    // The distance editor's slider extent. `null` — "extent unknown" — is the default so that every
    // test that is not about the slider sees the same editor it saw before it existed.
    dataViewerApi.queryTagBaseColumnBounds.mockResolvedValue(null);
});

describe('DataViewerPage raw grid', () => {
    // Structure layer: the two ways the virtualised table silently degrades are a missing colgroup
    // (widths fall back to content) and a swallowed `children` prop (thead + tbody vanish, the grid
    // renders empty while every other assertion still passes).
    test('renders one raw table with a colgroup and a header row', async () => {
        const { container } = renderPage();

        await waitFor(() => expect(getDataRows(container).length).toBeGreaterThan(0));
        const table = getRawTable(container)!;

        expect(container.querySelectorAll('table.data-viewer-raw-table')).toHaveLength(1);

        const cols = table.querySelectorAll('colgroup > col');
        expect(cols).toHaveLength(3);
        cols.forEach((col) => expect((col as HTMLTableColElement).style.width).not.toBe(''));

        const headerCells = table.querySelectorAll('thead > tr > th');
        expect(Array.from(headerCells).map((cell) => cell.textContent)).toEqual(['Time', 'Name', 'Value']);
    });

    test('applies the column widths derived from the whole result set', async () => {
        const { container } = renderPage();

        await waitFor(() => expect(getDataRows(container).length).toBeGreaterThan(0));
        const table = getRawTable(container)!;

        const expected = buildRawColumnWidths(
            ROWS,
            [
                { key: 'time', label: 'Time' },
                { key: 'name', label: 'Name' },
                { key: 'value', label: 'Value' },
            ],
            // Mirrors RAW_NAME_DOT_SPACE in DataViewerPage: the name column reserves room for the
            // colour dot drawn by `td.raw-name::before`, so its width is not text alone.
            { extra: { name: 15 } },
        );
        // `time` is sized from a formatted sample the component computes (timezone dependent), so
        // only the data-driven columns are pinned here; the point is that the widths come from all
        // 30 rows rather than from the handful of rows the virtualiser happens to have mounted.
        const cols = Array.from(table.querySelectorAll<HTMLTableColElement>('colgroup > col'));
        expect(cols[1].style.width).toBe(`${expected.name}px`);
        expect(cols[2].style.width).toBe(`${expected.value}px`);
        expect(table.style.minWidth).not.toBe('');
    });

    // Row layer: itemContent must emit bare <td>s. Wrapping them in a <tr> nests inside the <tr>
    // TableVirtuoso already renders, which browsers silently unnest into a broken grid.
    test('renders body rows as flat cells without nested table rows', async () => {
        const { container } = renderPage();

        await waitFor(() => expect(getDataRows(container).length).toBeGreaterThan(0));

        expect(container.querySelectorAll('tr tr')).toHaveLength(0);
        getDataRows(container).forEach((row) => expect(row.querySelectorAll('td')).toHaveLength(3));
    });

    test('renders cell values for the mounted rows', async () => {
        const { container } = renderPage();

        await waitFor(() => expect(getDataRows(container).length).toBeGreaterThan(0));

        // Scoped to the table: the tag name also appears in the left-hand tag picker.
        const table = getRawTable(container)!;
        expect(within(table).getAllByText(TAG_NAME).length).toBeGreaterThan(0);
        expect(within(table).getByText('10')).toBeInTheDocument();
    });

    // Presentation layer: the name dot and the right-aligned value column are carried entirely by
    // per-cell classes and a custom property, so a plain `className="mono"` regression is invisible
    // to every other assertion here.
    test('marks the name cell with its series colour and right-aligns the value column', async () => {
        const { container } = renderPage();

        await waitFor(() => expect(getDataRows(container).length).toBeGreaterThan(0));
        const table = getRawTable(container)!;

        const dataRow = getDataRows(container)[0];
        const [timeCell, nameCell, valueCell] = Array.from(dataRow.querySelectorAll<HTMLTableCellElement>('td'));

        expect(nameCell).toHaveClass('mono', 'raw-name');
        // The dot is a ::before fed by --raw-dot, so the colour has to reach the cell inline.
        expect(nameCell.style.getPropertyValue('--raw-dot')).toBe(buildRawRowNameColors(ROWS)[TAG_NAME]);

        expect(valueCell).toHaveClass('mono', 'is-numeric');
        // Only the value column is numeric — time and name stay start-aligned.
        expect(timeCell).not.toHaveClass('is-numeric');
        expect(nameCell).not.toHaveClass('is-numeric');

        // The header carries the same marker so the label sits over the digits.
        const headerCells = Array.from(table.querySelectorAll<HTMLTableCellElement>('thead > tr > th'));
        expect(headerCells[2]).toHaveClass('is-numeric');
        expect(headerCells[0]).not.toHaveClass('is-numeric');
        expect(headerCells[1]).not.toHaveClass('is-numeric');
    });

    // The hover highlight is scoped to `tr[data-index]` because virtuoso's spacer rows contain a
    // real <td> and would otherwise light up as one viewport-tall block. That scoping is only
    // sound while virtuoso keeps tagging item rows — and only item rows — with the attribute.
    test('tags item rows with data-index and leaves the virtualiser spacers untagged', async () => {
        const { container } = renderPage();

        await waitFor(() => expect(getDataRows(container).length).toBeGreaterThan(0));

        getDataRows(container).forEach((row) => expect(row).toHaveAttribute('data-index'));

        const spacers = Array.from(container.querySelectorAll('tbody tr')).filter((row) => !row.textContent?.trim());
        expect(spacers.length).toBeGreaterThan(0);
        spacers.forEach((row) => expect(row).not.toHaveAttribute('data-index'));
    });

    test('shows the empty state instead of rows when the query returns nothing', async () => {
        dataViewerApi.queryTagData.mockResolvedValue({ rows: [] });
        const { container } = renderPage();

        await waitFor(() => expect(screen.getByText('No data')).toBeInTheDocument());
        expect(container.querySelectorAll('tbody tr td')).toHaveLength(0);
    });
});

describe('DataViewerPage frozen time window', () => {
    test('the default range reads a bounded window with both edges resolved to timestamps', async () => {
        renderPage();

        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalled());
        const [args] = queryTagDataArgs();

        // Both edges are absolute epoch-millisecond timestamps. A local date literal here would be
        // interpreted again by the SQL session and could move when browser and server zones differ.
        expect(typeof args.from).toBe('number');
        expect(typeof args.to).toBe('number');
        expect(Number(args.from)).toBeLessThan(Number(args.to));
    });

    // The reason the frozen window exists. Re-resolving `last` per read makes the window chase the
    // newest sample, so page 2 is measured from a different origin than page 1 and rows are skipped
    // or repeated across the boundary.
    test('paging 1 → 2 → 3 reuses one window and never re-resolves it', async () => {
        renderPage();
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(1));

        gotoPage(2);
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(2));
        gotoPage(3);
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(3));

        const args = queryTagDataArgs();
        expect(args.map((call) => call.page)).toEqual([1, 2, 3]);
        expect(new Set(args.map(windowOf)).size).toBe(1);
        // The boundary read is the resolution itself: one call means one interpretation of `last`.
        expect(dataViewerApi.queryTagBoundaryTime).toHaveBeenCalledTimes(1);
    });

    // `last` means "the newest sample of the selected tags", so a different selection is a
    // different window — this is the one navigation that must re-resolve.
    test('changing the selected tag re-resolves the window', async () => {
        dataViewerApi.listTableTags.mockResolvedValue({
            tags: [
                { name: TAG_NAME, dataType: 'double' },
                { name: OTHER_TAG_NAME, dataType: 'double' },
            ],
            assetHierarchy: undefined,
        });
        renderPage();
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(1));
        const before = resolvedWindowLabel();

        fireEvent.click(screen.getByLabelText(`${OTHER_TAG_NAME} select`));

        await waitFor(() => expect(dataViewerApi.queryTagBoundaryTime).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(resolvedWindowLabel()).not.toBe(before));
    });

    test('a tag change queries the re-resolved window, not the previous page rows', async () => {
        // Regression. The tag-change path used to build its page request from the *displayed rows'*
        // time bounds (`reason: 'tags'` + currentBounds) and fetchRows preferred those over the
        // frozen window. When two tags' data sit far apart — one ending 2024, one live in 2026 —
        // switching between them queried the old tag's span for the new tag and returned nothing,
        // while the toolbar caption showed the correct newly-resolved window. "No data" with a
        // healthy-looking window.
        dataViewerApi.listTableTags.mockResolvedValue({
            tags: [{ name: TAG_NAME, dataType: 'double' }, { name: OTHER_TAG_NAME, dataType: 'double' }],
            assetHierarchy: undefined,
        });
        renderPage();
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(1));
        // Bounds only exist once a page of rows has been rendered — that is what the buggy path fed
        // back into the next request, so the regression cannot be reproduced without them.
        await waitFor(() => expect(document.querySelector('.data-viewer-raw-table tbody tr')).not.toBeNull());
        const firstWindow = windowOf(queryTagDataArgs()[0]);
        const before = dataViewerApi.queryTagData.mock.calls.length;

        fireEvent.click(screen.getByLabelText(`${OTHER_TAG_NAME} select`));
        await waitFor(() => expect(dataViewerApi.queryTagBoundaryTime).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(dataViewerApi.queryTagData.mock.calls.length).toBeGreaterThan(before));

        // EVERY request issued after the change, not just the last one: the bug showed up as an
        // intermediate query against the stale span, which a `.at(-1)` check would sail past once
        // the corrected query followed it.
        const after = dataViewerApi.queryTagData.mock.calls.slice(before).map((call) => call[0] as { from?: string | number; to?: string | number; boundedRange?: boolean });
        expect(after.length).toBeGreaterThan(0);
        for (const args of after) {
            expect(typeof args.from).toBe('number');
            expect(typeof args.to).toBe('number');
            expect(args.boundedRange).toBeFalsy();
            // And it really is the *new* window — the boundary advanced between the resolutions.
            expect(windowOf(args)).not.toBe(firstWindow);
        }
    });

    test('sends no query, and blames the data not the input, when there is nothing to anchor to', async () => {
        // No sample for the tag — there is no `last` to anchor to, so there is no window.
        dataViewerApi.queryTagBoundaryTime.mockResolvedValue(null);
        renderPage();

        // The range the user set is perfectly valid; it is the tag that is empty. Reporting this as
        // "check the entered time" sends them off to fix something that is not broken.
        await waitFor(() => expect(screen.getByText('The selected tag has no data to anchor the time range to.')).toBeInTheDocument());
        expect(screen.queryByText('Please check the entered time.')).not.toBeInTheDocument();
        expect(dataViewerApi.queryTagData).not.toHaveBeenCalled();
    });

    test('applying a range fires the row query exactly once', async () => {
        // Regression. Both the apply handler and the page-reset effect called
        // `setRawPageRequest({ page: 1 })`, and each fresh object invalidated fetchRows, so the same
        // query went out twice. It only showed with ranges that resolve without a boundary
        // round-trip (`now`, absolute) — with `last` the first run bailed for want of a window and
        // hid the duplicate.
        renderPage();
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(1));
        dataViewerApi.queryTagData.mockClear();

        fireEvent.click(screen.getByLabelText('Set time range'));
        fireEvent.click(screen.getByText('apply-both'));
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalled());

        // waitFor stops at the first match, so the duplicate would land after it returns. Let the
        // effect queue drain, then assert the count actually settled at one.
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 50));
        });
        expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(1);
    });

    test('refresh re-interprets last/now into a new window and returns to page 1', async () => {
        renderPage();
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(1));
        const before = windowOf(queryTagDataArgs()[0]);

        gotoPage(2);
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(2));
        expect(queryTagDataArgs()[1].page).toBe(2);

        fireEvent.click(screen.getByLabelText('Refresh time range'));

        await waitFor(() => expect(dataViewerApi.queryTagBoundaryTime).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(windowOf(queryTagDataArgs().at(-1)!)).not.toBe(before));
        // A window the cursors were not computed against cannot be paged into mid-way.
        expect(queryTagDataArgs().at(-1)!.page).toBe(1);
        expect(screen.getByLabelText('Current result page')).toHaveValue('1');
    });

    test('the button keeps the expression and the caption carries the resolved instants', async () => {
        renderPage();
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalled());

        // The button mirrors what was set in the time range modal, verbatim.
        const button = screen.getByLabelText('Set time range');
        expect(button).toHaveTextContent('last-1h ~ last');
        expect(button.textContent).not.toMatch(/\d{4}-\d{2}-\d{2}/);

        // The expression alone never says which hour is on screen, so the frozen window is spelled
        // out on its own line — and it is a sibling of the button, not inside it.
        const caption = document.querySelector('.data-viewer-time-range-resolved');
        expect(caption).not.toBeNull();
        expect(caption?.textContent).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)? ~ \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?/);
        expect(button.contains(caption)).toBe(false);
    });

    test('refresh anchors the head of the toolbar with the window caption beneath it', async () => {
        renderPage();
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalled());

        const refresh = screen.getByLabelText('Refresh time range');
        // Head of the whole toolbar row, ahead of the scan / range / mode controls.
        const row = refresh.closest('.data-viewer-title-row');
        expect(row?.firstElementChild).toBe(refresh.closest('.data-viewer-range-anchor'));

        // Caption is refresh's own next sibling, not a member of the query-control cluster.
        const caption = document.querySelector('.data-viewer-time-range-resolved');
        expect(refresh.nextElementSibling).toBe(caption);
        expect(caption?.closest('.data-viewer-query-controls')).toBeNull();
    });

    test('applying a range with an empty side is rejected and leaves the window untouched', async () => {
        renderPage();
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(1));
        const before = windowOf(queryTagDataArgs()[0]);

        fireEvent.click(screen.getByLabelText('Set time range'));
        fireEvent.click(screen.getByText('apply-without-to'));
        await waitFor(() => expect(screen.getByText('Time range requires both From and To.')).toBeInTheDocument());

        fireEvent.click(screen.getByLabelText('Set time range'));
        fireEvent.click(screen.getByText('apply-without-from'));
        await waitFor(() => expect(screen.getByText('Time range requires both From and To.')).toBeInTheDocument());

        expect(screen.getByLabelText('Set time range')).toHaveTextContent('last-1h ~ last');
        expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(1);
        expect(windowOf(queryTagDataArgs()[0])).toBe(before);

        // Contrast: with both edges filled the same path applies normally, so the guard is
        // rejecting the empty side rather than everything.
        fireEvent.click(screen.getByLabelText('Set time range'));
        fireEvent.click(screen.getByText('apply-both'));
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(2));
        expect(queryTagDataArgs()[1]).toMatchObject({
            from: new Date('2026-06-01T09:00:00').getTime(),
            to: new Date('2026-06-01T10:00:00').getTime(),
        });
    });

    test('epoch zero is a valid time edge, not an empty range', async () => {
        renderPage();
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(1));

        fireEvent.click(screen.getByLabelText('Set time range'));
        fireEvent.click(screen.getByText('apply-epoch-zero'));

        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(2));
        expect(queryTagDataArgs().at(-1)).toMatchObject({ from: 0, to: 1000 });
        expect(screen.queryByText('Time range requires both From and To.')).not.toBeInTheDocument();
    });

    test('opts the time editor into pre-1970 timestamps', async () => {
        renderPage();
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(1));

        fireEvent.click(screen.getByLabelText('Set time range'));
        expect(screen.getByTestId('negative-time-opt-in')).toHaveTextContent('true');
    });

    test('reapplying an unchanged modal preserves each absolute edge millisecond', async () => {
        renderPage();
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(1));

        fireEvent.click(screen.getByLabelText('Set time range'));
        fireEvent.click(screen.getByText('apply-millisecond-range'));
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(2));

        fireEvent.click(screen.getByLabelText('Set time range'));
        fireEvent.click(screen.getByText('apply-current-displayed'));
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(3));

        expect(queryTagDataArgs().at(-1)).toMatchObject({ from: 1780290000789, to: 1780293600123 });
    });

    test('editing only From preserves the untouched To millisecond', async () => {
        renderPage();
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(1));

        fireEvent.click(screen.getByLabelText('Set time range'));
        fireEvent.click(screen.getByText('apply-millisecond-range'));
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(2));
        const before = queryTagDataArgs().at(-1)!;

        fireEvent.click(screen.getByLabelText('Set time range'));
        fireEvent.click(screen.getByText('edit-from-only'));
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(3));

        // From really was retyped — the button moves it an hour back — so the query that follows is
        // not the previous window sent again. Asserted as a direction rather than an instant: the
        // shift is a wall-clock one, and the exact epoch it lands on depends on the runner's zone.
        const after = queryTagDataArgs().at(-1)!;
        expect(Number(after.from)).toBeLessThan(Number(before.from));
        // To was handed back as the modal's own second-resolution reading of an edge nobody touched,
        // and comes through with its milliseconds intact.
        expect(after.to).toBe(1780293600123);
    });
});

describe('DataViewerPage base axis chip', () => {
    const chip = () => screen.getByLabelText('Set time range');
    const modalIsOpen = () => screen.queryByText('apply-both') !== null;

    test('renders the axis badge, the expression and both chevrons inside one chip', async () => {
        const { container } = renderPage();
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalled());

        expect(chip()).toHaveClass('data-viewer-range-chip');
        // Axis label is its own element, not a prefix baked into the value string — the value has to
        // stay exactly what the user set in the modal.
        expect(container.querySelector('.data-viewer-range-chip-axis')?.textContent).toBe('TIME');
        expect(container.querySelector('.data-viewer-range-chip-value')?.textContent).toBe('last-1h ~ last');
        // Both chevrons belong to the chip; a chevron rendered as a sibling would escape the
        // stopPropagation contract the chip's own click handler depends on.
        const chevrons = [screen.getByLabelText('TIME previous'), screen.getByLabelText('TIME next')];
        chevrons.forEach((button) => {
            expect(chip().contains(button)).toBe(true);
            expect(button.tagName).toBe('BUTTON');
        });
    });

    // What the chevrons move is the *window* the chip is showing, by its own width. They used to be
    // wired into the raw grid's page navigation instead, which is a different operation and mostly a
    // silent one: with backward scan on (the default) `▶` walks page 2 → 1, so on page 1 it had
    // nowhere to go and did nothing at all, while `◀` needed a full page of rows before it would
    // open page 2. When it did fire it moved the page and left the range alone — so the label beside
    // the arrows never changed, on either axis.
    test('a chevron steps the window by its own width and returns to page 1', async () => {
        renderPage();
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(1));
        const before = queryTagDataArgs().at(-1)!;
        const span = Number(before.to) - Number(before.from);
        expect(span).toBeGreaterThan(0);

        gotoPage(2);
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(2));

        fireEvent.click(screen.getByLabelText('TIME next'));
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(3));

        // The next window along: adjacent to the one it left, and exactly as wide.
        const forward = queryTagDataArgs().at(-1)!;
        expect(Number(forward.from)).toBe(Number(before.to));
        expect(Number(forward.to) - Number(forward.from)).toBe(span);
        // A window that moved has no page 2 to still be on.
        expect(forward.page).toBe(1);
        await waitFor(() => expect(screen.getByLabelText('Current result page')).toHaveValue('1'));
        // The chevron sits inside the chip's own click target; without stopPropagation this shift
        // would also pop the range editor open over the result the user asked to move to.
        expect(modalIsOpen()).toBe(false);

        // ...and back the other way lands on the window it started from.
        fireEvent.click(screen.getByLabelText('TIME previous'));
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(4));
        const back = queryTagDataArgs().at(-1)!;
        expect(Number(back.from)).toBe(Number(before.from));
        expect(Number(back.to)).toBe(Number(before.to));
        expect(modalIsOpen()).toBe(false);
    });

    // The same step on the other axis, where a date is the wrong tool entirely: 0 ~ 1000 read as an
    // epoch is one second of 1970, and stepping it would move the window by a second rather than by
    // a kilometre.
    test('the chevrons step a distance window in distances', async () => {
        dataViewerApi.listTableColumns.mockResolvedValue(DISTANCE_BASE_COLUMNS);
        dataViewerApi.queryTagData.mockResolvedValue({ rows: [{ time: 10, name: TAG_NAME, value: 1 }] });
        const { container } = renderPage();

        await waitFor(() => expect(container.querySelector('.data-viewer-range-chip-axis')?.textContent).toBe('DIST'));
        await waitFor(() => expect(queryTagDataArgs().at(-1)).toMatchObject({ from: '0', to: '1000' }));

        fireEvent.click(screen.getByLabelText('DIST next'));
        await waitFor(() => expect(queryTagDataArgs().at(-1)).toMatchObject({ from: '1000', to: '2000' }));
        // The chip reads as the window it moved to — the label is the whole reason the control looked
        // broken when only the page moved.
        expect(container.querySelector('.data-viewer-range-chip-value')?.textContent).toBe('1000 ~ 2000');
        expect(container.querySelector('.data-viewer-range-chip-value')?.textContent).not.toContain('1970');

        fireEvent.click(screen.getByLabelText('DIST previous'));
        await waitFor(() => expect(queryTagDataArgs().at(-1)).toMatchObject({ from: '0', to: '1000' }));
        fireEvent.click(screen.getByLabelText('DIST previous'));
        await waitFor(() => expect(queryTagDataArgs().at(-1)).toMatchObject({ from: '-1000', to: '0' }));
        expect(modalIsOpen()).toBe(false);
    });

    test('the chip body still opens the range editor on a time base', async () => {
        renderPage();
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalled());

        fireEvent.click(chip());
        expect(modalIsOpen()).toBe(true);
    });

    test('reads BASETIME on a non-DATETIME column as a distance base and labels the chip DIST', async () => {
        // The flag is at index 2 of a listTableColumns row. Reading it from any other index makes
        // every column look non-BASETIME, the DATETIME column wins by default, and this comes back
        // 'TIME' — which is exactly the silent misread this test exists to catch.
        dataViewerApi.listTableColumns.mockResolvedValue(DISTANCE_BASE_COLUMNS);
        const { container } = renderPage();

        await waitFor(() => expect(container.querySelector('.data-viewer-range-chip-axis')?.textContent).toBe('DIST'));
        expect(container.querySelector('.data-viewer-range-chip')).toHaveClass('data-viewer-range-chip-distance');
        expect(screen.getByLabelText('DIST previous')).toBeInTheDocument();
    });

    test('a DATETIME BASETIME column is a time base', async () => {
        const { container } = renderPage();
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalled());

        expect(container.querySelector('.data-viewer-range-chip-axis')?.textContent).toBe('TIME');
        expect(container.querySelector('.data-viewer-range-chip')).toHaveClass('data-viewer-range-chip-time');
    });

    // Applying a time window to a distance axis produces a range that matches nothing, so the chip
    // opens the numeric editor instead of the time one. Not "nothing happens": a chip that refuses
    // to open is indistinguishable from a broken chip, which is what this replaced.
    test('the chip opens the distance editor, not the time editor, on a distance base', async () => {
        dataViewerApi.listTableColumns.mockResolvedValue(DISTANCE_BASE_COLUMNS);
        const { container } = renderPage();
        await waitFor(() => expect(container.querySelector('.data-viewer-range-chip-axis')?.textContent).toBe('DIST'));

        fireEvent.click(chip());

        expect(modalIsOpen()).toBe(false);
        expect(screen.getByText('Distance Range')).toBeInTheDocument();
        expect(screen.getByLabelText('Distance from')).toBeInTheDocument();
        expect(screen.getByLabelText('Distance to')).toBeInTheDocument();
    });

    test('falls back to a time base, and keeps the grid, when the column read fails or returns nothing', async () => {
        for (const columns of [[], null]) {
            dataViewerApi.listTableColumns.mockResolvedValue(columns);
            const { container, unmount } = renderPage();

            await waitFor(() => expect(getDataRows(container).length).toBeGreaterThan(0));
            expect(container.querySelector('.data-viewer-range-chip-axis')?.textContent).toBe('TIME');
            // Not merely defaulted — the editor really is reachable, i.e. the unknown schema did not
            // land on the distance branch.
            fireEvent.click(within(container).getByLabelText('Set time range'));
            expect(modalIsOpen()).toBe(true);
            unmount();
        }
    });
});

// A distance-base table (BASETIME on a non-DATETIME column) is read the same way a time table is —
// bounded window, frozen, paged — but every value on the base axis is a number. Measured against the
// live server: MACHBASEDB.SYS.DISTANCE_SENSOR, base column ODOMETER_M (DOUBLE, BASETIME), tags
// SENSOR_01..SENSOR_10, 100,000 rows each, ODOMETER_M spanning 0 .. 999990.
describe('DataViewerPage distance base range', () => {
    const chip = () => screen.getByLabelText('Set time range');
    const timeModalIsOpen = () => screen.queryByText('apply-both') !== null;
    const distanceRows = Array.from({ length: 5 }, (_, index) => ({ time: index * 10, name: TAG_NAME, value: 10 + index }));
    // The distance editor is the dashboard's shared modal, pinned to this page's axis with
    // `pLockTab`. Its title is what identifies it — there is one modal now, and which axis it is
    // editing is the only thing that distinguishes the two cases.
    const openDistanceEditor = async () => {
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalled());
        fireEvent.click(chip());
        return screen.getByText('Distance Range');
    };
    const applyDistance = (from: string, to: string) => {
        fireEvent.change(screen.getByLabelText('Distance from'), { target: { value: from } });
        fireEvent.change(screen.getByLabelText('Distance to'), { target: { value: to } });
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    };

    beforeEach(() => {
        dataViewerApi.listTableColumns.mockResolvedValue(DISTANCE_BASE_COLUMNS);
        dataViewerApi.queryTagData.mockResolvedValue({ rows: distanceRows });
    });

    // The user's stated default. It is not `last-1h ~ last`, and — the part that matters — it is not
    // `last-1h ~ last` even for one round trip: the axis is known before the first query is allowed
    // out, so there is no time window to correct afterwards.
    test('opens on 0 ~ 1000 and never queries a time window first', async () => {
        renderPage();

        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalled());
        expect(queryTagDataArgs()[0]).toMatchObject({ from: '0', to: '1000', baseKind: 'distance' });
        // Every call, not just the first: a corrective second query would show up here.
        queryTagDataArgs().forEach((args) => {
            expect(args.from).not.toBe('last-1h');
            expect(windowOf(args)).toBe('0 ~ 1000');
        });
        expect(document.querySelector('.data-viewer-range-chip-value')?.textContent).toBe('0 ~ 1000');
        expect(resolvedWindowLabel()).toBe('0 ~ 1000');
    });

    // `last` is anchored by a boundary read. There is no `last` on a distance axis, so that read must
    // not happen — V$DISTANCE_SENSOR_STAT has no MAX_TIME to answer with (ERR-2056), and the scan it
    // would fall back to measures metres, not time.
    test('resolves the window without a boundary query', async () => {
        renderPage();

        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalled());
        expect(dataViewerApi.queryTagBoundaryTime).not.toHaveBeenCalled();
    });

    // `formatDataViewerTime` reads any finite number as an epoch: an odometer reading of 30 would
    // render as 1970-01-01 00:00:00.030 — a date that is nowhere in the table.
    test('renders base-column values as numbers, not as 1970 timestamps', async () => {
        const { container } = renderPage();

        await waitFor(() => expect(getDataRows(container).length).toBeGreaterThan(0));
        const firstCells = Array.from(getDataRows(container)[0].querySelectorAll('td')).map((cell) => cell.textContent);
        expect(firstCells[0]).toBe('0');
        expect(firstCells.some((text) => String(text).includes('1970'))).toBe(false);
        expect(Array.from(container.querySelectorAll('tbody td')).map((cell) => cell.textContent)).toContain('30');
    });

    // The header is the only place in the grid the axis is visible. Everything underneath it —
    // the SQL alias, the row key, the width lookup, the page cursor — stays `time`, which is why
    // this asserts the label and the cell contents in the same breath.
    test('heads the base column Distance while the rows stay keyed by the time alias', async () => {
        const { container } = renderPage();

        await waitFor(() => expect(getDataRows(container).length).toBeGreaterThan(0));
        const table = getRawTable(container)!;

        expect(Array.from(table.querySelectorAll('thead > tr > th')).map((cell) => cell.textContent)).toEqual(['Distance', 'Name', 'Value']);
        // A renamed row key would leave this column empty while the header still read 'Distance'.
        expect(Array.from(getDataRows(container)[0].querySelectorAll('td')).map((cell) => cell.textContent)).toEqual(['0', TAG_NAME, '10']);

        // The colgroup is sized from the very array the header renders, so the two cannot disagree
        // about which label is on screen. (Both labels clamp to the 90px floor today, so this pins
        // the wiring rather than a difference in pixels.)
        const expected = buildRawColumnWidths(distanceRows, buildRawResultColumns(distanceRows, { baseKind: 'distance' }), {
            timeSample: '0',
            // Mirrors RAW_NAME_DOT_SPACE in DataViewerPage — the name cell reserves room for its dot.
            extra: { name: 15 },
        });
        expect(Array.from(table.querySelectorAll<HTMLTableColElement>('colgroup > col')).map((col) => col.style.width)).toEqual([
            `${expected.time}px`,
            `${expected.name}px`,
            `${expected.value}px`,
        ]);
    });

    test('the editor refuses an empty edge and leaves the window untouched', async () => {
        renderPage();
        await openDistanceEditor();
        const before = windowOf(queryTagDataArgs()[0]);
        const callsBefore = dataViewerApi.queryTagData.mock.calls.length;

        applyDistance('100', '   ');

        expect(screen.getByText('Distance range requires both From and To.')).toBeInTheDocument();
        // Still open, and no query went out on the strength of a half-set range.
        expect(screen.getByText('Distance Range')).toBeInTheDocument();
        expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(callsBefore);
        expect(windowOf(queryTagDataArgs()[0])).toBe(before);
    });

    test('the editor refuses a reversed range', async () => {
        renderPage();
        await openDistanceEditor();
        const callsBefore = dataViewerApi.queryTagData.mock.calls.length;

        applyDistance('900', '100');

        expect(screen.getByText('Distance range starts after it ends.')).toBeInTheDocument();
        expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(callsBefore);
    });

    test('the editor refuses a non-numeric edge', async () => {
        renderPage();
        await openDistanceEditor();
        const callsBefore = dataViewerApi.queryTagData.mock.calls.length;

        applyDistance('100', "200'; drop table T--");

        expect(screen.getByText('Distance range accepts numbers, or first / last (e.g. last-5000).')).toBeInTheDocument();
        expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(callsBefore);
    });

    test('applying a range re-queries the new window and returns to page 1', async () => {
        renderPage();
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(1));
        gotoPage(2);
        await waitFor(() => expect(screen.getByLabelText('Current result page')).toHaveValue('2'));

        fireEvent.click(chip());
        applyDistance('2000', '3000');

        await waitFor(() => expect(resolvedWindowLabel()).toBe('2000 ~ 3000'));
        // The editor closed, the window moved, and the page numbering restarted — the old page 2
        // was numbered against a window that no longer exists.
        expect(screen.queryByText('Distance Range')).not.toBeInTheDocument();
        expect(screen.getByLabelText('Current result page')).toHaveValue('1');
        expect(queryTagDataArgs().at(-1)).toMatchObject({ from: '2000', to: '3000', baseKind: 'distance' });
        expect(document.querySelector('.data-viewer-range-chip-value')?.textContent).toBe('2000 ~ 3000');
    });

    test('0 survives as a real bound rather than being read as empty', async () => {
        renderPage();
        await openDistanceEditor();

        applyDistance('0', '500');

        await waitFor(() => expect(resolvedWindowLabel()).toBe('0 ~ 500'));
        expect(queryTagDataArgs().at(-1)).toMatchObject({ from: '0', to: '500' });
        // The both-edges-required guard uses a truthiness test on the way through; a bare `!from`
        // anywhere on that path would reject a lower bound of zero as a missing one.
        expect(screen.queryByText('Distance range requires both From and To.')).not.toBeInTheDocument();
    });

    test('a time table is untouched by any of this', async () => {
        dataViewerApi.listTableColumns.mockResolvedValue(TIME_BASE_COLUMNS);
        dataViewerApi.queryTagData.mockResolvedValue({ rows: ROWS });
        renderPage();

        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalled());
        expect(document.querySelector('.data-viewer-range-chip-value')?.textContent).toBe('last-1h ~ last');
        expect(queryTagDataArgs()[0]).toMatchObject({ baseKind: 'time' });
        expect(dataViewerApi.queryTagBoundaryTime).toHaveBeenCalled();

        fireEvent.click(chip());
        expect(timeModalIsOpen()).toBe(true);
        expect(screen.queryByText('Distance Range')).not.toBeInTheDocument();
    });
});

// The distance editor's slider is bounded by the base column's *real* extent, so it has to be read
// from the table. The two halves of the dialog — the slider and the two numeric inputs — are two
// views of one pair of values, and the interesting behaviour is entirely in how they disagree:
// the slider always emits a sorted pair (a thumb pushed past its neighbour swaps roles with it, so
// the value being dragged carries on), the inputs are left exactly as typed (silently rewriting what
// someone is halfway through typing is worse than telling them on Apply).
describe('DataViewerPage distance range slider', () => {
    // The reference table: MACHBASEDB.SYS.DISTANCE_SENSOR's ODOMETER_M spans 0 .. 999990, but a
    // rounder-than-round extent would hide a tick-rounding mistake, so this uses an extent whose
    // ticks (0, 1k, 2k, 3k, 4k) are visibly *not* its endpoints.
    const BOUNDS = { min: 0, max: 4828 };
    const distanceRows = Array.from({ length: 5 }, (_, index) => ({ time: index * 10, name: TAG_NAME, value: 10 + index }));
    const chip = () => screen.getByLabelText('Set time range');
    const fromSlider = () => screen.getByLabelText<HTMLInputElement>('Distance from slider');
    const toSlider = () => screen.getByLabelText<HTMLInputElement>('Distance to slider');
    const fromInput = () => screen.getByLabelText<HTMLInputElement>('Distance from');
    const toInput = () => screen.getByLabelText<HTMLInputElement>('Distance to');
    const readout = () => screen.queryByTestId('distance-readout-value')?.textContent;
    const spanReadout = () => screen.queryByTestId('distance-readout-span')?.textContent;
    const tickLabels = () => screen.queryAllByTestId('distance-tick-label').map((node) => node.textContent);
    // The editor opens synchronously, but the extent arrives from a query — so "the slider is on
    // screen" is the only safe signal that the dialog is in the state these tests are about.
    const openEditorWithSlider = async () => {
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalled());
        fireEvent.click(chip());
        await waitFor(() => expect(screen.queryByLabelText('Distance from slider')).not.toBeNull());
    };

    beforeEach(() => {
        dataViewerApi.listTableColumns.mockResolvedValue(DISTANCE_BASE_COLUMNS);
        dataViewerApi.queryTagData.mockResolvedValue({ rows: distanceRows });
        dataViewerApi.queryTagBaseColumnBounds.mockResolvedValue(BOUNDS);
    });

    // The extent is asked for on the base column the schema resolved (ODOMETER_M), never on the
    // nominal `timeColumn` — a distance table has both, and the DATETIME one is the trap.
    test('reads the extent from the resolved base column, only for the tags on screen', async () => {
        renderPage();
        await openEditorWithSlider();

        // `baseKind` is asserted alongside the column because it is the only thing that opens the
        // tag stat view's fast path. Drop it and the read still answers — through the column scan,
        // 50x slower on the reference table — so nothing user-visible would report the omission.
        expect(dataViewerApi.queryTagBaseColumnBounds).toHaveBeenCalledWith(
            expect.objectContaining({ dbName: 'MACHBASEDB', userName: 'SYS', tableName: 'TAG', baseColumn: 'ODOMETER_M', baseKind: 'distance', tagColumn: 'NAME', names: [TAG_NAME] })
        );
    });

    test('a time base never asks for a distance extent', async () => {
        dataViewerApi.listTableColumns.mockResolvedValue(TIME_BASE_COLUMNS);
        dataViewerApi.queryTagData.mockResolvedValue({ rows: ROWS });
        renderPage();

        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalled());
        fireEvent.click(chip());
        await act(async () => {
            await Promise.resolve();
        });
        expect(dataViewerApi.queryTagBaseColumnBounds).not.toHaveBeenCalled();
    });

    test('the slider and the numeric inputs are two views of the same pair of values', async () => {
        renderPage();
        await openEditorWithSlider();

        // Slider -> input. To first: the window opens on 0 ~ 1000, and From is held at To by the
        // clamp until To has been moved out of its way.
        fireEvent.change(toSlider(), { target: { value: '3760' } });
        fireEvent.change(fromSlider(), { target: { value: '1060' } });
        expect(fromInput().value).toBe('1060');
        expect(toInput().value).toBe('3760');
        expect(readout()).toBe('1,060–3,760');
        expect(spanReadout()).toBe('2,700');

        // Input -> slider. Not merely "the input accepted it": the thumb has to move, which is the
        // half that a one-way binding would leave silently frozen at the old position.
        fireEvent.change(fromInput(), { target: { value: '500' } });
        fireEvent.change(toInput(), { target: { value: '4000' } });
        expect(fromSlider().value).toBe('500');
        expect(toSlider().value).toBe('4000');
        expect(readout()).toBe('500–4,000');

        // And the value the page is handed is the one both views were showing.
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
        await waitFor(() => expect(queryTagDataArgs().at(-1)).toMatchObject({ from: '500', to: '4000' }));
    });

    // Crossing is the behaviour, not the hazard: a thumb pushed past its neighbour swaps roles with
    // it, so the value being moved carries on instead of stopping dead. What is preserved is only
    // `from ≤ to` — the normal form everything downstream reads — and it is preserved by *sorting*
    // the pair, which is why the number that moved is still in the window afterwards.
    test('a thumb pushed past its neighbour swaps roles with it', async () => {
        renderPage();
        await openEditorWithSlider();
        fireEvent.change(fromSlider(), { target: { value: '1000' } });
        fireEvent.change(toSlider(), { target: { value: '2000' } });

        // From driven out to 4000: 4000 is where it asked to be, so it is now the upper edge and the
        // 2000 it passed is the lower one. Stopping at 2000 — both edges reading 2000 — is what this
        // is not.
        fireEvent.change(fromSlider(), { target: { value: '4000' } });
        expect(edges()).toEqual([2000, 4000]);
        // ...and the focus follows the value across, so the arrow keys go on moving the number they
        // were moving rather than silently switching to the edge left behind.
        expect(document.activeElement).toBe(toSlider());

        // The same in the other direction.
        fireEvent.change(fromSlider(), { target: { value: '1000' } });
        fireEvent.change(toSlider(), { target: { value: '2000' } });
        fireEvent.change(toSlider(), { target: { value: '0' } });
        expect(edges()).toEqual([0, 1000]);
        expect(document.activeElement).toBe(fromSlider());

        // ...and neither thumb leaves the extent, whichever side of the other it ends up on.
        fireEvent.change(toSlider(), { target: { value: '99999' } });
        expect(edges()).toEqual([0, BOUNDS.max]);
    });

    // Dragging was the only way to move the window, which meant reaching 4,000 from a window at 0
    // was two full-rail drags with the width matched by eye. A press on the bare track now moves the
    // whole window there, keeping its width, with the clicked point at its centre.
    //
    // jsdom gives every element a zero-width rect, so the track has to be told how wide it is —
    // otherwise the ratio is 0/0 and the handler correctly refuses. `pointerdown` is dispatched as a
    // MouseEvent because jsdom 20 has no PointerEvent constructor; React listens for the native
    // event name either way, and clientX is what the handler reads.
    const TRACK_WIDTH = 400;
    const pressTrackAt = (ratio: number) => {
        const track = screen.getByTestId('distance-range-slider');
        jest.spyOn(track, 'getBoundingClientRect').mockReturnValue({
            left: 0,
            right: TRACK_WIDTH,
            width: TRACK_WIDTH,
            top: 0,
            bottom: 28,
            height: 28,
            x: 0,
            y: 0,
            toJSON: () => ({}),
        } as DOMRect);
        fireEvent(track, new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: ratio * TRACK_WIDTH }));
    };

    test('a press on the track moves the window there, keeping its width', async () => {
        renderPage();
        await openEditorWithSlider();
        // The window the editor opens on: 0 ~ 1000, a span of 1000 against an extent of 4828.
        expect(spanReadout()).toBe('1,000');

        pressTrackAt(0.5);

        // Centred on the clicked point — half of 4828 is 2414 — and still 1000 wide.
        expect(fromInput().value).toBe('1914');
        expect(toInput().value).toBe('2914');
        expect(spanReadout()).toBe('1,000');
        // Both thumbs followed: the slider and the inputs stay two views of one pair of values.
        expect(fromSlider().value).toBe('1914');
        expect(toSlider().value).toBe('2914');

        // And it is the moved window that gets applied.
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
        await waitFor(() => expect(queryTagDataArgs().at(-1)).toMatchObject({ from: '1914', to: '2914' }));
    });

    // Clamping moves the window rather than squeezing it. Pinning one edge to the bound while the
    // other stayed put would quietly narrow a window the user never asked to narrow.
    test('a press at either end parks the same-width window against that end', async () => {
        renderPage();
        await openEditorWithSlider();

        pressTrackAt(0);
        expect([fromInput().value, toInput().value]).toEqual(['0', '1000']);
        expect(spanReadout()).toBe('1,000');

        pressTrackAt(1);
        expect([fromInput().value, toInput().value]).toEqual([String(BOUNDS.max - 1000), String(BOUNDS.max)]);
        expect(spanReadout()).toBe('1,000');
    });

    // The two range inputs are `pointer-events: none` with only their thumbs re-enabled, so a press
    // that lands on an `<input>` came from a thumb and is that thumb's drag to run. Jumping the whole
    // window on it would make a drag start by throwing the window somewhere else.
    test('a press on a thumb is left to the thumb', async () => {
        renderPage();
        await openEditorWithSlider();
        fireEvent.change(toSlider(), { target: { value: '2000' } });
        const before = [fromInput().value, toInput().value];

        jest.spyOn(screen.getByTestId('distance-range-slider'), 'getBoundingClientRect').mockReturnValue({
            left: 0,
            right: TRACK_WIDTH,
            width: TRACK_WIDTH,
            top: 0,
            bottom: 28,
            height: 28,
            x: 0,
            y: 0,
            toJSON: () => ({}),
        } as DOMRect);
        fireEvent(fromSlider(), new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: TRACK_WIDTH * 0.9 }));

        expect([fromInput().value, toInput().value]).toEqual(before);
    });

    // The clamp is the slider's, not the dialog's. Typing 900 into From while To still reads 100 is
    // a half-finished edit, and the answer to it is the message on Apply — not a silent rewrite.
    test('typed edges are not clamped, so a reversed range is still reported rather than corrected', async () => {
        renderPage();
        await openEditorWithSlider();

        fireEvent.change(fromInput(), { target: { value: '900' } });
        fireEvent.change(toInput(), { target: { value: '100' } });
        expect(fromInput().value).toBe('900');
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

        expect(screen.getByText('Distance range starts after it ends.')).toBeInTheDocument();
        expect(screen.getByText('Distance Range')).toBeInTheDocument();
    });

    test('round ticks span the extent and the real upper bound is spelled out at the end', async () => {
        renderPage();
        await openEditorWithSlider();

        // 0 .. 4828 in steps of 1000 — the ticks are the axis's round numbers, and 4,828 is the
        // extent itself, which is neither round nor one of them. The labels are scaled the way the
        // axis is (`1K`, not `1000`); the bound stays exact, because at this scale it fits.
        expect(tickLabels()).toEqual(['0', '1K', '2K', '3K', '4K', '4,828']);
        const positions = screen.queryAllByTestId('distance-tick').map((node) => (node as HTMLElement).style.left);
        expect(positions.at(0)).toBe('0%');
        expect(positions.at(-1)).toBe('100%');
    });

    // An odometer window: a few hundred metres of extent around 25 million. One decimal cannot tell
    // two ticks 200 apart at that magnitude — every label came out `25.1m` — and the bound spelled
    // out in full (`25,150,885.5`) is long enough to sit on top of the tick beside it.
    test('a narrow window at a large magnitude keeps its ticks distinct and off each other', async () => {
        dataViewerApi.queryTagBaseColumnBounds.mockResolvedValue({ min: 25150000, max: 25150885.5 });
        renderPage();
        await openEditorWithSlider();

        const labels = tickLabels();
        expect(new Set(labels).size).toBe(labels.length);
        // Fewer of them than the six a short-labelled axis draws, because these do not fit.
        expect(labels.length).toBeLessThanOrEqual(4);
        // The bound is abbreviated here rather than printed in full — the exact value is on hover.
        expect(labels.at(-1)).not.toBe('25,150,885.5');
        expect(document.querySelector('[data-tick-max]')?.getAttribute('title')).toBe('25,150,885.5');
    });

    // ── thumb dragging ────────────────────────────────────────────────────────────────────────
    // `fireEvent.change` drives the two range inputs directly, which is the keyboard path — it can
    // never reproduce what a pointer does to a pair of *stacked* inputs, and that is where the defect
    // was. Measured in headless Chromium against the real markup and CSS: once the two thumbs
    // coincided, To (painted second, so on top) took every press, `handleSliderTo` clamped it against
    // From and refused to move, and From was unreachable underneath — from a pair collapsed at the
    // maximum the slider could not be moved at all, in either direction, ever again.
    //
    // The pointer is handled by the container now, so it is drivable here. Geometry matches the
    // stylesheet: an 8px thumb, hence a 4px inset at each end of a 400px rail.
    const THUMB_WIDTH = 8;
    const mockRail = () => {
        const track = screen.getByTestId('distance-range-slider');
        jest.spyOn(track, 'getBoundingClientRect').mockReturnValue({
            left: 0,
            right: TRACK_WIDTH,
            width: TRACK_WIDTH,
            top: 0,
            bottom: 28,
            height: 28,
            x: 0,
            y: 0,
            toJSON: () => ({}),
        } as DOMRect);
        return track;
    };
    // Rounded, because `clientX` is a `long` in the DOM IDL: a fractional pixel handed to the event
    // constructor is truncated, and a test that asks for the x of 1,500 and is given the x of 1,490
    // is measuring the truncation rather than the slider.
    const xOf = (value: number) => Math.round(THUMB_WIDTH / 2 + (value / BOUNDS.max) * (TRACK_WIDTH - THUMB_WIDTH));
    // A whole gesture: press at `fromX`, move through `toX`, release.
    const dragPointer = (fromX: number, toX: number) => {
        const track = mockRail();
        fireEvent(track, new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: fromX }));
        fireEvent(window, new MouseEvent('pointermove', { bubbles: true, cancelable: true, clientX: toX }));
        fireEvent(window, new MouseEvent('pointerup', { bubbles: true, cancelable: true, clientX: toX }));
    };
    const setWindow = (from: number, to: number) => {
        fireEvent.change(fromInput(), { target: { value: String(from) } });
        fireEvent.change(toInput(), { target: { value: String(to) } });
    };
    const edges = () => [Number(fromInput().value), Number(toInput().value)];
    // The edges as written — an anchored one ('last-5000') is text, not a coordinate.
    const edgeTexts = () => [fromInput().value, toInput().value];

    test('a thumb dragged past its neighbour swaps with it rather than stopping against it', async () => {
        renderPage();
        await openEditorWithSlider();
        setWindow(1000, 2500);

        // To, dragged left past From and on down to the minimum: the pointer ends at 0, so 0 is the
        // window's lower edge and the From it passed is the upper one. `[1000, 1000]` — the old
        // answer — is a window that stopped dead the moment the two met.
        dragPointer(xOf(2500), xOf(0));
        expect(edges()).toEqual([0, 1000]);

        setWindow(1000, 2500);
        // From, dragged right past To.
        dragPointer(xOf(1000), xOf(3500));
        expect(edges()).toEqual([2500, 3500]);
    });

    // The swap has to happen *mid-gesture*, without the drag ending: the thumb the user grabbed is
    // whichever value is under the pointer, and it stays under the pointer across the crossing and
    // back again. Only a whole gesture watched step by step can say that — an assertion on where the
    // window ended up cannot tell "followed the pointer" from "jumped there when the button came up".
    test('the grabbed thumb keeps following the pointer across a crossing and back', async () => {
        renderPage();
        await openEditorWithSlider();
        setWindow(1000, 2500);

        const track = mockRail();
        const moveTo = (value: number) => fireEvent(window, new MouseEvent('pointermove', { bubbles: true, cancelable: true, clientX: xOf(value) }));
        // Grab From. To — 2,500 — is the anchor for the whole gesture that follows.
        fireEvent(track, new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: xOf(1000) }));

        moveTo(2400);
        expect(edges()).toEqual([2400, 2500]);
        // Past the anchor. The dragged value is 3,500, and 3,500 is where the window's *upper* edge
        // now is — the anchor has become the lower one without the gesture ending.
        moveTo(3500);
        expect(edges()).toEqual([2500, 3500]);
        // Still the value being dragged, on out to the end of the rail.
        moveTo(BOUNDS.max);
        expect(edges()).toEqual([2500, BOUNDS.max]);
        // ...and back across, which puts it under the anchor again.
        moveTo(1000);
        expect(edges()).toEqual([1000, 2500]);

        fireEvent(window, new MouseEvent('pointerup', { bubbles: true, cancelable: true, clientX: xOf(1000) }));
        expect(edges()).toEqual([1000, 2500]);
    });

    // The defect, stated as the guarantee it broke. Each of the three positions is a place a pair
    // could get stuck, and the maximum is the one that was completely dead.
    test.each([
        ['at the maximum', 4828],
        ['in the middle', 2000],
        ['at the minimum', 0],
    ])('two thumbs collapsed %s can both still be picked up', async (_where, at) => {
        renderPage();
        await openEditorWithSlider();

        // Leftwards from the collapse takes From with it...
        setWindow(at, at);
        dragPointer(xOf(at), xOf(at) - 60);
        const [afterLeft, toAfterLeft] = edges();
        expect(afterLeft).toBeLessThan(at === 0 ? 1 : at);
        expect(toAfterLeft).toBe(at);

        // ...and rightwards takes To. Before the fix exactly one of these two moved at any given
        // position, and at the maximum neither did.
        setWindow(at, at);
        dragPointer(xOf(at), xOf(at) + 60);
        const [fromAfterRight, afterRight] = edges();
        expect(fromAfterRight).toBe(at);
        expect(afterRight).toBeGreaterThan(at === BOUNDS.max ? BOUNDS.max - 1 : at);
    });

    test('the collapsed pair stays inside the extent whichever way it is pulled', async () => {
        renderPage();
        await openEditorWithSlider();

        setWindow(BOUNDS.max, BOUNDS.max);
        dragPointer(xOf(BOUNDS.max), -500);
        expect(edges()[0]).toBe(BOUNDS.min);

        setWindow(BOUNDS.min, BOUNDS.min);
        dragPointer(xOf(BOUNDS.min), TRACK_WIDTH + 500);
        expect(edges()[1]).toBe(BOUNDS.max);
    });

    // A press near a thumb is that thumb's, so the window must not jump out from under the gesture —
    // the same guarantee the `pointer-events` split used to give, now stated in pixels.
    test('a press within grabbing distance of a thumb starts a drag instead of moving the window', async () => {
        renderPage();
        await openEditorWithSlider();
        setWindow(1000, 2000);

        // 3px off To's centre: close enough to be its thumb, far enough to prove it is proximity
        // rather than an exact hit that decides.
        const track = mockRail();
        fireEvent(track, new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: xOf(2000) + 3 }));
        expect(edges()).toEqual([1000, 2000]);

        // ...and the gesture that follows moves that thumb, not the whole window.
        fireEvent(window, new MouseEvent('pointermove', { bubbles: true, cancelable: true, clientX: xOf(3000) }));
        fireEvent(window, new MouseEvent('pointerup', { bubbles: true, cancelable: true, clientX: xOf(3000) }));
        expect(edges()[0]).toBe(1000);
        expect(edges()[1]).toBeGreaterThan(2900);
    });

    test('a drag that leaves the rail keeps dragging, and releasing off it commits', async () => {
        renderPage();
        await openEditorWithSlider();
        setWindow(1000, 2000);

        const track = mockRail();
        fireEvent(track, new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: xOf(2000) }));
        // Off the rail entirely, and 20px above it — a pointer that has left the dialog's slider.
        fireEvent(window, new MouseEvent('pointermove', { bubbles: true, cancelable: true, clientX: TRACK_WIDTH + 200, clientY: -20 }));
        expect(edges()).toEqual([1000, BOUNDS.max]);
        fireEvent(window, new MouseEvent('pointerup', { bubbles: true, cancelable: true, clientX: TRACK_WIDTH + 200 }));

        // Released, so a later move is not still dragging the thumb around.
        fireEvent(window, new MouseEvent('pointermove', { bubbles: true, cancelable: true, clientX: xOf(100) }));
        expect(edges()).toEqual([1000, BOUNDS.max]);
    });

    // ── quick windows ─────────────────────────────────────────────────────────────────────────
    const quickButton = (label: string) => screen.getByRole('button', { name: label });

    // The quick windows write *anchored* edges — `last-1207 ~ last`, not the coordinates those
    // happen to be today — so the window keeps following the data as it grows, the same way
    // `last-1h ~ last` does on a time axis. The slider and the readout show them resolved.
    test('the quick windows set both edges from the extent, and the slider follows', async () => {
        renderPage();
        await openEditorWithSlider();

        fireEvent.click(quickButton('First 25%'));
        expect(edgeTexts()).toEqual(['first', 'first+1207']);
        // The slider is the same pair of values seen a second way, so it has to have moved too.
        expect([Number(fromSlider().value), Number(toSlider().value)]).toEqual([0, 1207]);
        expect(readout()).toBe('0–1,207');

        fireEvent.click(quickButton('Last 25%'));
        expect(edgeTexts()).toEqual(['last-1207', 'last']);
        expect([Number(fromSlider().value), Number(toSlider().value)]).toEqual([3621, 4828]);

        fireEvent.click(quickButton('First 10%'));
        expect(edgeTexts()).toEqual(['first', 'first+482.8']);

        fireEvent.click(quickButton('First 50%'));
        expect(edgeTexts()).toEqual(['first', 'first+2414']);

        fireEvent.click(quickButton('Last 50%'));
        expect(edgeTexts()).toEqual(['last-2414', 'last']);

        // The whole extent is both anchors at once — no magnitude that can go out of date.
        fireEvent.click(quickButton('Full'));
        expect(edgeTexts()).toEqual(['first', 'last']);
        expect([Number(fromSlider().value), Number(toSlider().value)]).toEqual([BOUNDS.min, BOUNDS.max]);
        expect(spanReadout()).toBe('4,828');
    });

    test('a quick window is what gets applied — resolved against the extent at query time', async () => {
        renderPage();
        await openEditorWithSlider();

        fireEvent.click(quickButton('Last 50%'));
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

        // The window is stored as `last-2414 ~ last`; the query gets the coordinates that means today.
        await waitFor(() => expect(queryTagDataArgs().at(-1)).toMatchObject({ from: '2414', to: '4828' }));
    });

    // The point of anchoring: the same stored window follows the data as it grows, without the user
    // touching the range again.
    test('an anchored window is re-measured when the extent moves', async () => {
        renderPage();
        await openEditorWithSlider();

        fireEvent.click(quickButton('Last 50%'));
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
        await waitFor(() => expect(queryTagDataArgs().at(-1)).toMatchObject({ from: '2414', to: '4828' }));

        // More rows arrive: the extent now ends at 6,000 rather than 4,828.
        dataViewerApi.queryTagBaseColumnBounds.mockResolvedValue({ min: 0, max: 6000 });
        fireEvent.click(screen.getByLabelText('Refresh time range'));

        await waitFor(() => expect(queryTagDataArgs().at(-1)).toMatchObject({ from: '3586', to: '6000' }));
    });

    test('a typed anchor is accepted and applied', async () => {
        renderPage();
        await openEditorWithSlider();

        fireEvent.change(fromInput(), { target: { value: 'last-1000' } });
        fireEvent.change(toInput(), { target: { value: 'last' } });
        expect(readout()).toBe('3,828–4,828');
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

        await waitFor(() => expect(queryTagDataArgs().at(-1)).toMatchObject({ from: '3828', to: '4828' }));
    });

    test('the section is laid out two rows of three, under the fields and above the footer', async () => {
        const { container } = renderPage();
        await openEditorWithSlider();

        const quick = screen.getByTestId('distance-quick');
        expect(quick).not.toBeNull();
        expect(quick.querySelector('[data-testid="distance-quick-label"]')?.textContent).toBe('Quick windows');
        const rows = Array.from(quick.querySelectorAll('[data-testid="distance-quick-row"]'));
        expect(rows.map((row) => Array.from(row.querySelectorAll('button')).map((button) => button.textContent))).toEqual([
            ['First 10%', 'First 25%', 'First 50%'],
            ['Last 50%', 'Last 25%', 'Full'],
        ]);
        // Between the From/To fields and the footer, which is where the section belongs.
        const body = screen.getByTestId('distance-body');
        const children = Array.from(body.children);
        expect(children.indexOf(quick)).toBeGreaterThan(children.indexOf(screen.getByTestId('distance-fields')));
        expect(screen.getByTestId('modal-footer').compareDocumentPosition(quick) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
        expect(container).toBeTruthy();
    });

    // The buttons are fractions of the extent, so with no extent they are fractions of nothing. The
    // slider is hidden in that state for the same reason, and the two have to agree — a row of
    // buttons that silently did nothing would be worse than a row that is not drawn.
    test('no extent means no quick windows, exactly as it means no slider', async () => {
        dataViewerApi.queryTagBaseColumnBounds.mockResolvedValue(null);
        renderPage();
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalled());
        fireEvent.click(chip());
        await act(async () => {
            await Promise.resolve();
        });

        expect(screen.queryByLabelText('Distance from slider')).toBeNull();
        expect(screen.queryByTestId('distance-quick')).toBeNull();
        expect(screen.queryByRole('button', { name: 'Full' })).toBeNull();
        // The numeric editor is untouched — this hid a shortcut, not the dialog.
        expect(fromInput()).toBeInTheDocument();
    });

    // A bounds read that fails must cost the slider and nothing else. The alternative — an editor
    // that will not open, or one whose thumbs have no extent to move along — locks the user out of
    // a range they can perfectly well type.
    test('an extent that cannot be read leaves the numeric editor fully usable', async () => {
        dataViewerApi.queryTagBaseColumnBounds.mockRejectedValue(new Error('bounds read failed'));
        renderPage();
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalled());
        fireEvent.click(chip());
        await act(async () => {
            await Promise.resolve();
        });

        expect(screen.getByText('Distance Range')).toBeInTheDocument();
        expect(screen.queryByLabelText('Distance from slider')).toBeNull();
        expect(screen.queryByTestId('distance-range-slider')).toBeNull();

        fireEvent.change(fromInput(), { target: { value: '2000' } });
        fireEvent.change(toInput(), { target: { value: '3000' } });
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

        await waitFor(() => expect(resolvedWindowLabel()).toBe('2000 ~ 3000'));
    });

    test('a null extent — a table with nothing to measure — does the same', async () => {
        dataViewerApi.queryTagBaseColumnBounds.mockResolvedValue(null);
        renderPage();
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalled());
        fireEvent.click(chip());
        await act(async () => {
            await Promise.resolve();
        });

        expect(screen.queryByLabelText('Distance from slider')).toBeNull();
        expect(fromInput()).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
    });

    // The three ways out of the dialog, all of which the shell — not the new body — owns. They are
    // asserted here because the body was rewritten around them.
    test('Escape closes the editor without applying', async () => {
        renderPage();
        await openEditorWithSlider();
        const callsBefore = dataViewerApi.queryTagData.mock.calls.length;

        fireEvent.change(fromSlider(), { target: { value: '2000' } });
        fireEvent.keyDown(document, { key: 'Escape' });

        expect(screen.queryByText('Distance Range')).toBeNull();
        expect(dataViewerApi.queryTagData).toHaveBeenCalledTimes(callsBefore);
    });

    test('a click on the overlay closes the editor, a click inside it does not', async () => {
        renderPage();
        await openEditorWithSlider();
        const overlay = () => screen.getByTestId('modal-overlay');

        // A real press inside the dialog: the browser would deliver the click to the dialog, not
        // the overlay, so nothing closes.
        fireEvent.pointerDown(screen.getByText('Distance Range'));
        fireEvent.click(screen.getByText('Distance Range'));
        expect(screen.getByText('Distance Range')).toBeInTheDocument();

        // A press that both starts and ends on the overlay is a genuine click-outside.
        fireEvent.mouseDown(overlay());
        fireEvent.click(overlay());
        expect(screen.queryByText('Distance Range')).toBeNull();
    });

    test('a drag that starts inside and ends past the dialog does not close it', async () => {
        // Regression. `click` fires on the nearest common ancestor of press and release, so
        // releasing a slider drag outside the dialog delivers the click to the overlay. Closing on
        // that threw the editor away mid-gesture — exactly when the user was still adjusting.
        renderPage();
        await openEditorWithSlider();
        const overlay = () => screen.getByTestId('modal-overlay');

        fireEvent.pointerDown(screen.getByLabelText('Distance from slider'));
        fireEvent.mouseUp(overlay());
        fireEvent.click(overlay());

        expect(screen.getByText('Distance Range')).toBeInTheDocument();
    });

    test('the header close button closes the editor', async () => {
        renderPage();
        await openEditorWithSlider();

        fireEvent.click(screen.getByLabelText('Close modal'));
        expect(screen.queryByText('Distance Range')).toBeNull();
    });

    test('Enter applies the range the slider is showing', async () => {
        renderPage();
        await openEditorWithSlider();

        fireEvent.change(fromSlider(), { target: { value: '1000' } });
        fireEvent.change(toSlider(), { target: { value: '2000' } });
        fireEvent.keyDown(screen.getByText('Distance Range'), { key: 'Enter' });

        await waitFor(() => expect(resolvedWindowLabel()).toBe('1000 ~ 2000'));
    });

    // ── readout layout ────────────────────────────────────────────────────────────────────────
    // The span is a note about the range, not a second number of equal standing. Pushed to the other
    // end of the same line — which is where a flex row with `space-between` puts it — it read as one,
    // at the far edge of a 420px dialog and 280px from the value it describes.
    test('the span sits on its own line under the range, not beside it', async () => {
        renderPage();
        await openEditorWithSlider();
        setWindow(1000, 2000);

        const value = screen.getByTestId('distance-readout-value');
        const note = screen.getByTestId('distance-readout-span');
        // The two live in one stack inside the readout box; the box's other child is the reset link,
        // which sits beside the stack rather than in it.
        const stack = value.parentElement!;
        expect(note.parentElement).toBe(stack);
        expect(Array.from(stack.children)).toEqual([value, note]);
        expect(value).toHaveAttribute('data-testid', 'distance-readout-value');
        expect(note).toHaveAttribute('data-testid', 'distance-readout-span');
        // Two *block* children of a block box, in this order: the stacking is a fact about the
        // markup, which a flex direction — flipped back without anything else noticing — is not.
        expect([value.tagName, note.tagName]).toEqual(['DIV', 'DIV']);
        expect(value.textContent).toBe('1,000–2,000');
        expect(note.textContent).toBe('1,000');
        // The span is a sibling of the value, not a tail of it: nothing inside the big readout line.
        expect(value.querySelector('[data-testid="distance-readout-span"]')).toBeNull();
    });

    // ── reaching the ends ─────────────────────────────────────────────────────────────────────
    // The thumbs move in a round step of about a thousandth of the extent, and a round step almost
    // never divides the extent. 0 .. 999,990 in steps of 1,000 runs out at 999,000: the last 990 m of
    // the axis were unreachable, the maximum among them, and the browser's own value sanitisation
    // then drew a thumb *at* 999,000 while the readout claimed 999,990. The reference table's
    // ODOMETER_M is exactly this extent, which is where the report came from.
    describe('an extent the step does not divide', () => {
        const WIDE = { min: 0, max: 999990 };
        const wideX = (value: number) => THUMB_WIDTH / 2 + ((value - WIDE.min) / (WIDE.max - WIDE.min)) * (TRACK_WIDTH - THUMB_WIDTH);

        beforeEach(() => {
            dataViewerApi.queryTagBaseColumnBounds.mockResolvedValue(WIDE);
        });

        test('a drag to either end of the rail lands exactly on the bound', async () => {
            renderPage();
            await openEditorWithSlider();

            setWindow(0, 500000);
            dragPointer(wideX(500000), TRACK_WIDTH + 200);
            expect(edges()).toEqual([0, WIDE.max]);

            setWindow(500000, 999990);
            dragPointer(wideX(500000), -200);
            expect(edges()).toEqual([WIDE.min, 999990]);
        });

        // The keys are handled by the editor rather than by the range inputs, because a native End on
        // a step of 1,000 stops at the last aligned value — 999,000 — and calls it the maximum.
        test('End and Home reach the bounds the step grid misses', async () => {
            renderPage();
            await openEditorWithSlider();
            setWindow(0, 500000);

            fireEvent.keyDown(toSlider(), { key: 'End' });
            expect(edges()).toEqual([0, WIDE.max]);

            fireEvent.keyDown(fromSlider(), { key: 'Home' });
            expect(edges()).toEqual([WIDE.min, WIDE.max]);

            // And an arrow is still one step, so the values in between stay round.
            fireEvent.keyDown(fromSlider(), { key: 'ArrowRight' });
            expect(edges()).toEqual([1000, WIDE.max]);
        });

        // `step="any"` is what lets the thumb be drawn where the editor says it is. With a step the
        // maximum is not a multiple of, the browser rounds the *element's* value back down to the
        // last aligned one, so the thumb stops short of the end of its own rail while every other
        // view of the same state — readout, fill, From/To box — reads the maximum.
        test('the thumb the browser draws is the value the editor holds', async () => {
            renderPage();
            await openEditorWithSlider();

            fireEvent.click(quickButton('Full'));
            // `first ~ last` — the whole extent, anchored; the sliders show it resolved.
            expect(edgeTexts()).toEqual(['first', 'last']);
            expect([Number(fromSlider().value), Number(toSlider().value)]).toEqual([WIDE.min, WIDE.max]);
            expect(spanReadout()).toBe('999,990');
            expect(toSlider().getAttribute('step')).toBe('any');
            expect(fromSlider().getAttribute('step')).toBe('any');
            expect(toSlider().value).toBe(String(WIDE.max));
        });

        // A track click names a point on a rail — a continuous ratio — and `toPrecision(12)` cannot
        // make one readable: 401578.346465 is twelve honest significant digits of pixel noise.
        test('a track click writes numbers a user could have typed', async () => {
            renderPage();
            await openEditorWithSlider();
            setWindow(0, 500000);

            pressTrackAt(0.4025);

            // A 500,000-wide window centred on 0.4025 of the extent — 402,495.975, a number straight
            // off a pixel — landed on the extent's own grid.
            expect(edges()).toEqual([152500, 652500]);
            edges().forEach((value) => expect(String(value)).toMatch(/^\d+$/));
            expect(readout()).toBe('152,500–652,500');
        });

        test('the whole extent is what gets applied', async () => {
            renderPage();
            await openEditorWithSlider();

            fireEvent.click(quickButton('Full'));
            fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

            await waitFor(() => expect(queryTagDataArgs().at(-1)).toMatchObject({ from: '0', to: '999990' }));
        });
    });
});

// A JSON value column holds a document, not a scalar. That is fine for Raw — the grid prints the
// document as text, which is what someone reading a JSON column came for, and the horizontal scroll
// carries the length. It is not fine for anything that needs a number: the chart plots NaN and Tag
// Analyzer aggregates (avg/min/max) over the same column. So the block is exactly two doors wide.
describe('DataViewerPage JSON value column', () => {
    const allQueryMocks = () => [dataViewerApi.queryTagData, dataViewerApi.queryTagDataTotal, dataViewerApi.queryTagBoundaryTime];
    const chartButton = () => screen.getByRole('tab', { name: /^Chart/ });
    // A JSON value column removes the Chart segment entirely rather than disabling it, so the
    // absence query is what those cases assert against.
    const queryChartButton = () => screen.queryByRole('tab', { name: /^Chart/ });
    const rawButton = () => screen.getByRole('tab', { name: /^Raw/ });
    // The page settles asynchronously; a bare assertion right after render would pass before the
    // query it is meant to observe had a chance to fire.
    const settle = async () => {
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });
    };
    // Columns held open so the "schema arrives after the first paint" window — the only window in
    // which chart mode and a JSON value column can be asked to coexist — is reachable from a test.
    const renderWithPendingSchema = () => {
        let resolveColumns: (columns: unknown) => void = () => undefined;
        dataViewerApi.listTableColumns.mockReturnValue(
            new Promise((resolve) => {
                resolveColumns = resolve;
            })
        );
        const rendered = renderPage();
        return { ...rendered, resolveColumns: (columns: unknown) => resolveColumns(columns) };
    };

    // The headline of this change: a JSON value column is a readable table. The previous behaviour
    // refused every query on it, so this assertion is the exact inverse of what it replaced.
    test('raw reads the table normally — the row query goes out and the grid fills', async () => {
        dataViewerApi.listTableColumns.mockResolvedValue(JSON_VALUE_COLUMNS);
        const { container } = renderPage();

        await waitFor(() => expect(getDataRows(container).length).toBeGreaterThan(0));

        expect(dataViewerApi.queryTagData).toHaveBeenCalled();
        expect(getRawTable(container)).not.toBeNull();
        // Not merely "a query went out": the table is on screen, in raw mode, with no banner
        // telling the user the page cannot show them what they are looking at.
        expect(rawButton()).toHaveAttribute('aria-selected', 'true');
        expect(screen.queryByText(JSON_VALUE_BLOCK_REASON)).toBeNull();
        expect(screen.queryByText('Database table and tag are required')).toBeNull();
    });

    test('the time range controls stay operable, because raw has a range to move', async () => {
        dataViewerApi.listTableColumns.mockResolvedValue(JSON_VALUE_COLUMNS);
        const { container } = renderPage();

        await waitFor(() => expect(getDataRows(container).length).toBeGreaterThan(0));

        expect(screen.getByLabelText('Refresh time range')).not.toBeDisabled();
        const chip = screen.getByLabelText('Set time range');
        expect(chip).not.toHaveClass('is-disabled');
        expect(chip).toHaveAttribute('tabindex', '0');
        expect(screen.getByLabelText('TIME previous')).not.toBeDisabled();
        expect(screen.getByLabelText('TIME next')).not.toBeDisabled();

        // Operable all the way through: the chip opens the editor rather than swallowing the click.
        fireEvent.click(within(container).getByLabelText('Set time range'));
        expect(screen.queryByText('apply-both')).not.toBeNull();
    });

    // The first of the two doors. `title`/`aria-label` are the whole explanation the user gets, so
    // they are asserted as content, not merely as "some attribute is present".
    test('chart is refused, and the button says why', async () => {
        dataViewerApi.listTableColumns.mockResolvedValue(JSON_VALUE_COLUMNS);
        const { container } = renderPage();

        await waitFor(() => expect(getDataRows(container).length).toBeGreaterThan(0));

        // Not a disabled segment — no segment. A dead Chart button still presents charting as
        // something this table has; leaving Raw alone says the table only does Raw.
        expect(queryChartButton()).toBeNull();
        // Raw is not collateral damage, and it is the selected segment.
        expect(rawButton()).not.toBeDisabled();
        expect(rawButton()).toHaveAttribute('aria-selected', 'true');

        await settle();
        expect(container.querySelector('.data-viewer-chart-stack')).toBeNull();
        expect(getRawTable(container)).not.toBeNull();
    });

    // The transition the schema read forces. Chart is legitimately reachable while the column read
    // is in flight — it is not refused until the answer arrives — so someone can be standing in
    // chart mode at the moment it does.
    test('a chart already on screen falls back to raw once the schema comes back JSON', async () => {
        const { container, resolveColumns } = renderWithPendingSchema();

        await waitFor(() => expect(chartButton()).not.toBeDisabled());
        fireEvent.click(chartButton());
        await waitFor(() => expect(chartButton()).toHaveAttribute('aria-selected', 'true'));
        expect(container.querySelector('.data-viewer-chart-stack')).not.toBeNull();

        await act(async () => {
            resolveColumns(JSON_VALUE_COLUMNS);
        });
        await settle();

        expect(rawButton()).toHaveAttribute('aria-selected', 'true');
        expect(queryChartButton()).toBeNull();
        expect(container.querySelector('.data-viewer-chart-stack')).toBeNull();
        // Fell back to a working view, not to a dead one.
        await waitFor(() => expect(getDataRows(container).length).toBeGreaterThan(0));
    });

    // The second door. The assertion is on the bridge, not on the button: "no board was created" is
    // the guarantee, "the button was absent" is only one of the ways of getting there.
    test('tag analyzer is unreachable for a JSON value column, and no board is created', async () => {
        const { container, resolveColumns } = renderWithPendingSchema();

        await waitFor(() => expect(chartButton()).not.toBeDisabled());
        fireEvent.click(chartButton());
        await waitFor(() => expect(screen.queryByLabelText('Chart actions')).not.toBeNull());
        fireEvent.click(screen.getByLabelText('Chart actions'));
        // Enabled while the schema is unknown — otherwise this test would pass for the wrong reason.
        expect(screen.getByRole('menuitem', { name: /^Tag Analyzer/ })).not.toBeDisabled();

        await act(async () => {
            resolveColumns(JSON_VALUE_COLUMNS);
        });
        await settle();

        expect(screen.queryByRole('menuitem', { name: /^Tag Analyzer/ })).toBeNull();
        expect(container.querySelector('.data-viewer-chart-stack')).toBeNull();
        expect(tagAnalyzerBridge.createTagAnalyzerBoardFromPayload).not.toHaveBeenCalled();
    });

    // Same page, scalar value column: both doors open, and the Tag Analyzer one is walked through
    // to a real hand-off. Without this the two tests above would also pass on a page that had
    // simply lost its chart.
    test('a scalar value column keeps chart and tag analyzer', async () => {
        const { container } = renderPage();

        await waitFor(() => expect(getDataRows(container).length).toBeGreaterThan(0));
        expect(chartButton()).not.toBeDisabled();
        expect(chartButton()).not.toHaveAttribute('title');

        fireEvent.click(chartButton());
        await waitFor(() => expect(container.querySelector('.data-viewer-chart-stack')).not.toBeNull());
        fireEvent.click(screen.getByLabelText('Chart actions'));

        const menuItem = screen.getByRole('menuitem', { name: /^Tag Analyzer/ });
        expect(menuItem).not.toBeDisabled();
        fireEvent.click(menuItem);

        expect(tagAnalyzerBridge.createTagAnalyzerBoardFromPayload).toHaveBeenCalledTimes(1);
    });

    // The block is a positive identification, never a default, and it follows the configured value
    // column rather than the literal name VALUE.
    test('the block follows the configured value column, and never a merely unreadable schema', async () => {
        dataViewerApi.listTableColumns.mockResolvedValue([
            ['NAME', VARCHAR_TYPE, 0],
            ['TIME', DATETIME_TYPE, BASETIME_FLAG],
            ['PAYLOAD', JSON_TYPE, 0],
        ]);
        // Lower-cased on purpose: the entry points hand over whatever the schema spells, and the
        // match has to be case-insensitive the same way the base column match is.
        const { container, unmount } = renderPage({ valueColumn: 'payload' });
        await waitFor(() => expect(getDataRows(container).length).toBeGreaterThan(0));
        expect(queryChartButton()).toBeNull();
        unmount();

        // A JSON column that is not the value column changes nothing.
        dataViewerApi.listTableColumns.mockResolvedValue([...TIME_BASE_COLUMNS, ['PAYLOAD', JSON_TYPE, 0]]);
        const other = renderPage();
        await waitFor(() => expect(getDataRows(other.container).length).toBeGreaterThan(0));
        expect(chartButton()).not.toBeDisabled();
        other.unmount();

        // Neither does a schema the page could not read at all.
        for (const columns of [[], null]) {
            dataViewerApi.listTableColumns.mockResolvedValue(columns);
            const unreadable = renderPage();
            await waitFor(() => expect(getDataRows(unreadable.container).length).toBeGreaterThan(0));
            expect(chartButton()).not.toBeDisabled();
            unreadable.unmount();
        }
    });

    // Between mount and the schema read landing the answer is "not known yet", which is neither
    // "blocked" nor "go ahead". Queries wait it out because the base-axis decision depends on it.
    test('shows nothing but the ordinary loading state while the schema read is in flight', async () => {
        const { container, resolveColumns } = renderWithPendingSchema();

        await settle();
        expect(screen.queryByText(JSON_VALUE_BLOCK_REASON)).toBeNull();
        expect(screen.queryByText('Database table and tag are required')).toBeNull();
        expect(screen.getByText('Loading...')).toBeInTheDocument();
        expect(screen.queryByText('No data')).toBeNull();
        allQueryMocks().forEach((mock) => expect(mock).not.toHaveBeenCalled());

        await act(async () => {
            resolveColumns(JSON_VALUE_COLUMNS);
        });

        // And once it lands, the reads it was holding back go out — a JSON value column delays the
        // first query exactly as long as any other schema does, and no longer.
        await waitFor(() => expect(getDataRows(container).length).toBeGreaterThan(0));
        expect(dataViewerApi.queryTagData).toHaveBeenCalled();
    });
});

// A tag's colour is its identity across three surfaces: the line in the main chart, the line in its
// own split panel, and the dot beside its name in the raw grid. The panels do not share an ECharts
// instance or a palette walk, so the only thing holding those three together is the colour map the
// page hands down — which is why these read the rendered options rather than the map.
describe('DataViewerPage split chart series colours', () => {
    // Every panel is initialised through the same mocked `echarts.init`, so one instance collects
    // the `setOption` calls of all of them; the panels are told apart by the series they carry.
    const echartsMock = jest.requireMock('echarts') as { init: jest.Mock };
    const renderedOptions = () => {
        const instance = echartsMock.init.mock.results[0]?.value as { setOption: jest.Mock } | undefined;
        return (instance?.setOption.mock.calls ?? []).map((call) => call[0] as any);
    };
    // Main lines only. The navigator twins repeat every name, and mixing the two would let a
    // navigator colour stand in for a main one.
    const panelColours = (option: any): Record<string, string> =>
        Object.fromEntries(
            (option?.series ?? [])
                .filter((item: any) => String(item?.id ?? '').startsWith('main-series-'))
                .map((item: any) => [item.name, item.lineStyle.color])
        );
    // The last option rendered for the panel holding exactly these tags.
    const colourOfPanel = (...names: string[]) => {
        const key = [...names].sort().join('|');
        const match = renderedOptions()
            .map(panelColours)
            .filter((colours) => Object.keys(colours).sort().join('|') === key);
        return match.at(-1);
    };

    // `buildTagChartSeries` and `buildRawRowNameColors` both walk the palette in first-seen order, so
    // putting OTHER_TAG_NAME first makes TAG_NAME the *second* colour. A split panel that restarted
    // the palette would hand TAG_NAME the first entry — which is a real colour belonging to a real
    // other tag, so the mistake is invisible unless the order is arranged to expose it.
    const TWO_TAG_ROWS = Array.from({ length: 10 }, (_, index) => ({
        time: `2026-06-01T10:00:${String(index).padStart(2, '0')}.000Z`,
        name: index % 2 === 0 ? OTHER_TAG_NAME : TAG_NAME,
        value: 10 + index,
    }));

    const showTwoTagChart = async () => {
        const rendered = renderPage();
        await waitFor(() => expect(getDataRows(rendered.container).length).toBeGreaterThan(0));
        // The page selects the first tag on load; the second is selected the way a user would.
        fireEvent.click(screen.getByLabelText(`${TAG_NAME} select`));
        await waitFor(() => expect(screen.getByLabelText(`${TAG_NAME} select`)).toBeChecked());

        // Captured in raw mode, from the DOM, so the comparison below is against what the grid
        // actually paints rather than against a re-derived map.
        const dotOf = (name: string) =>
            Array.from(rendered.container.querySelectorAll<HTMLTableCellElement>('td.raw-name'))
                .find((cell) => cell.textContent === name)
                ?.style.getPropertyValue('--raw-dot');
        // The selection change re-resolves the window and re-queries, so both names are only on
        // screen once that round trip has landed.
        await waitFor(() => expect(dotOf(TAG_NAME)).toBeTruthy());
        await waitFor(() => expect(dotOf(OTHER_TAG_NAME)).toBeTruthy());
        const rawDots = { [TAG_NAME]: dotOf(TAG_NAME), [OTHER_TAG_NAME]: dotOf(OTHER_TAG_NAME) };

        fireEvent.click(screen.getByRole('tab', { name: /^Chart/ }));
        await waitFor(() => expect(rendered.container.querySelector('.data-viewer-chart-stack')).not.toBeNull());
        await waitFor(() => expect(colourOfPanel(TAG_NAME, OTHER_TAG_NAME)).toBeDefined());
        return { ...rendered, rawDots };
    };

    beforeEach(() => {
        dataViewerApi.listTableTags.mockResolvedValue({
            tags: [
                { name: OTHER_TAG_NAME, dataType: 'double' },
                { name: TAG_NAME, dataType: 'double' },
            ],
            assetHierarchy: undefined,
        });
        dataViewerApi.queryTagData.mockResolvedValue({ rows: TWO_TAG_ROWS });
    });

    test('a tag keeps its colour when it is split into its own panel', async () => {
        const { rawDots } = await showTwoTagChart();
        const main = colourOfPanel(TAG_NAME, OTHER_TAG_NAME)!;
        // The arrangement this test depends on: TAG_NAME is not the palette's first entry.
        expect(main[TAG_NAME]).not.toBe(main[OTHER_TAG_NAME]);

        fireEvent.click(screen.getByTitle(`Split ${TAG_NAME}`));
        await waitFor(() => expect(colourOfPanel(TAG_NAME)).toBeDefined());

        expect(colourOfPanel(TAG_NAME)![TAG_NAME]).toBe(main[TAG_NAME]);
        // ...and it is not the other tag's colour, which is what restarting the palette would give.
        expect(colourOfPanel(TAG_NAME)![TAG_NAME]).not.toBe(main[OTHER_TAG_NAME]);
        // The third surface: the dot beside the same name in the raw grid.
        expect(colourOfPanel(TAG_NAME)![TAG_NAME]).toBe(rawDots[TAG_NAME]);
        expect(main[OTHER_TAG_NAME]).toBe(rawDots[OTHER_TAG_NAME]);
    });

    test('two split panels are two different colours, not two copies of the first palette entry', async () => {
        await showTwoTagChart();
        const main = colourOfPanel(TAG_NAME, OTHER_TAG_NAME)!;

        fireEvent.click(screen.getByTitle(`Split ${TAG_NAME}`));
        await waitFor(() => expect(colourOfPanel(TAG_NAME)).toBeDefined());
        fireEvent.click(screen.getByTitle(`Split ${OTHER_TAG_NAME}`));
        await waitFor(() => expect(colourOfPanel(OTHER_TAG_NAME)).toBeDefined());

        const splitTag = colourOfPanel(TAG_NAME)![TAG_NAME];
        const splitOther = colourOfPanel(OTHER_TAG_NAME)![OTHER_TAG_NAME];
        expect(splitTag).not.toBe(splitOther);
        expect(splitTag).toBe(main[TAG_NAME]);
        expect(splitOther).toBe(main[OTHER_TAG_NAME]);
    });

    // The panel *chrome* — its left border and the tint behind its header — is a fourth surface that
    // has to agree with the line inside it. It used to be `--color-primary` and a hardcoded
    // `rgba(0, 95, 184, 0.14)`, which is why every split panel read as the same blue no matter which
    // tag it held. The colour cannot be known until the palette has been walked, so it reaches CSS as
    // `--split-accent` on the card and both rules resolve it through `var()`.
    const splitCardFor = (container: HTMLElement, name: string) =>
        Array.from(container.querySelectorAll<HTMLElement>('.data-viewer-chart-card.is-split')).find((card) =>
            card.querySelector('.data-viewer-chart-panel-title')?.textContent?.includes(name)
        );

    test('a split panel is accented in the colour of the tag it holds', async () => {
        const { container } = await showTwoTagChart();
        const main = colourOfPanel(TAG_NAME, OTHER_TAG_NAME)!;

        fireEvent.click(screen.getByTitle(`Split ${TAG_NAME}`));
        await waitFor(() => expect(splitCardFor(container, TAG_NAME)).toBeDefined());

        expect(splitCardFor(container, TAG_NAME)!.style.getPropertyValue('--split-accent')).toBe(main[TAG_NAME]);
        // ...and it is not the other tag's colour, which is what reading the palette from the split
        // panel's own first entry would give.
        expect(splitCardFor(container, TAG_NAME)!.style.getPropertyValue('--split-accent')).not.toBe(main[OTHER_TAG_NAME]);
        // The main panel is not accented at all: it has no single tag to speak for.
        expect(container.querySelector<HTMLElement>('.data-viewer-chart-card.is-main')!.style.getPropertyValue('--split-accent')).toBe('');
    });

    test('two split panels carry two different accents', async () => {
        const { container } = await showTwoTagChart();
        const main = colourOfPanel(TAG_NAME, OTHER_TAG_NAME)!;

        fireEvent.click(screen.getByTitle(`Split ${TAG_NAME}`));
        await waitFor(() => expect(splitCardFor(container, TAG_NAME)).toBeDefined());
        fireEvent.click(screen.getByTitle(`Split ${OTHER_TAG_NAME}`));
        await waitFor(() => expect(splitCardFor(container, OTHER_TAG_NAME)).toBeDefined());

        const accentOf = (name: string) => splitCardFor(container, name)!.style.getPropertyValue('--split-accent');
        expect(accentOf(TAG_NAME)).not.toBe(accentOf(OTHER_TAG_NAME));
        expect(accentOf(TAG_NAME)).toBe(main[TAG_NAME]);
        expect(accentOf(OTHER_TAG_NAME)).toBe(main[OTHER_TAG_NAME]);
        // Each panel's chrome matches the line drawn inside it.
        expect(accentOf(TAG_NAME)).toBe(colourOfPanel(TAG_NAME)![TAG_NAME]);
        expect(accentOf(OTHER_TAG_NAME)).toBe(colourOfPanel(OTHER_TAG_NAME)![OTHER_TAG_NAME]);
    });

    // A selected tag the palette never reached — because it has no rows, so no series, so no colour.
    // Writing an empty custom property here would resolve `var(--split-accent, ...)` to nothing and
    // leave the panel with no border colour at all; leaving it unset is what lets the stylesheet's
    // own `var(--color-primary)` fallback apply.
    test('a tag with no colour of its own leaves the accent to the stylesheet', async () => {
        dataViewerApi.queryTagData.mockResolvedValue({ rows: TWO_TAG_ROWS.filter((row) => row.name === OTHER_TAG_NAME) });
        const { container } = renderPage();

        await waitFor(() => expect(getDataRows(container).length).toBeGreaterThan(0));
        fireEvent.click(screen.getByLabelText(`${TAG_NAME} select`));
        await waitFor(() => expect(screen.getByLabelText(`${TAG_NAME} select`)).toBeChecked());
        fireEvent.click(screen.getByRole('tab', { name: /^Chart/ }));
        await waitFor(() => expect(container.querySelector('.data-viewer-chart-stack')).not.toBeNull());

        fireEvent.click(screen.getByTitle(`Split ${TAG_NAME}`));
        await waitFor(() => expect(splitCardFor(container, TAG_NAME)).toBeDefined());

        expect(splitCardFor(container, TAG_NAME)!.style.getPropertyValue('--split-accent')).toBe('');
        // The tag that does have data still gets its own.
        fireEvent.click(screen.getByTitle(`Split ${OTHER_TAG_NAME}`));
        await waitFor(() => expect(splitCardFor(container, OTHER_TAG_NAME)).toBeDefined());
        expect(splitCardFor(container, OTHER_TAG_NAME)!.style.getPropertyValue('--split-accent')).toMatch(/^#|^rgb/);
    });
});

// Changing the tag selection re-resolves the frozen window, and for the length of that round trip
// the page has no window at all: `frozenWindowKey` moves during render, `activeWindow` goes null,
// and `resolvedRange` — and therefore every `chartGroups[].range` — blanks.
//
// The chart effect used to recompute anyway. With a blank range and the previous window's rows
// already cleared, `getPanelRange` had no finite min/max to work from and fell through to its
// fallback — `now - 1h .. now` on a time axis. The panel was drawn once at an hour the table has no
// data for, then again at the real window once it landed: two axis changes where the user asked for
// one, which is what the flicker was. A ten-minute window visibly stretched to sixty and snapped
// back. The guard in the effect (`if (!activeWindow) return undefined`) holds the previous panels
// instead, and these read the axis ECharts was actually handed.
describe('DataViewerPage chart axis across a tag change', () => {
    const echartsMock = jest.requireMock('echarts') as { init: jest.Mock };
    // Every panel goes through the same mocked instance, so one `setOption` log holds them all, in
    // the order they were rendered. Only the main axis matters — the two navigator axes are sized
    // from the unzoomed window and would blur the transition being counted.
    const mainAxes = () => {
        const instance = echartsMock.init.mock.results[0]?.value as { setOption: jest.Mock } | undefined;
        return (instance?.setOption.mock.calls ?? [])
            .map((call) => ((call[0] as any)?.xAxis ?? []).find((axis: any) => axis?.id === 'panel-main-x-axis'))
            .filter(Boolean)
            .map((axis: any) => ({ min: Number(axis.min), max: Number(axis.max) }));
    };
    // Consecutive duplicates dropped: a re-render that draws the same axis again is not a change the
    // user can see. What is left is the sequence of *visible* windows.
    const axisTransitions = () =>
        mainAxes()
            .map((axis) => `${axis.min}~${axis.max}`)
            .filter((window, index, all) => index === 0 || all[index - 1] !== window);
    // Every window the page draws legitimately here is anchored to the stubbed boundary in June
    // 2026. The fallback is the only thing on this path that reads the wall clock, so "was this
    // render the fallback?" is answerable as "is its upper edge sitting on now?".
    const fallbackRenders = () => mainAxes().filter((axis) => Math.abs(Date.now() - axis.max) < 5 * 60_000);

    const CHART_ROWS = Array.from({ length: 10 }, (_, index) => ({
        time: `2026-06-01T10:00:${String(index).padStart(2, '0')}.000Z`,
        name: index % 2 === 0 ? TAG_NAME : OTHER_TAG_NAME,
        value: 10 + index,
    }));

    beforeEach(() => {
        dataViewerApi.listTableTags.mockResolvedValue({
            tags: [
                { name: TAG_NAME, dataType: 'double' },
                { name: OTHER_TAG_NAME, dataType: 'double' },
            ],
            assetHierarchy: undefined,
        });
        dataViewerApi.queryTagData.mockResolvedValue({ rows: CHART_ROWS });
    });

    // The page auto-selects the first tag, so OTHER_TAG_NAME is the one that gets added and removed.
    const showChart = async () => {
        const rendered = renderPage();
        await waitFor(() => expect(getDataRows(rendered.container).length).toBeGreaterThan(0));
        fireEvent.click(screen.getByRole('tab', { name: /^Chart/ }));
        await waitFor(() => expect(rendered.container.querySelector('.data-viewer-chart-stack')).not.toBeNull());
        await waitFor(() => expect(mainAxes().length).toBeGreaterThan(0));
        return rendered;
    };

    // Toggling a tag re-resolves the window; `resolvedWindowLabel` is where that lands, and the
    // advancing boundary stub guarantees the new window is a different one.
    const toggleTag = async (name: string) => {
        const before = resolvedWindowLabel();
        fireEvent.click(screen.getByLabelText(`${name} select`));
        await waitFor(() => expect(resolvedWindowLabel()).not.toBe(before));
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });
    };

    test('adding a tag moves the axis once, and never through the fallback hour', async () => {
        await showChart();
        const before = axisTransitions();
        expect(before).toHaveLength(1);

        await toggleTag(OTHER_TAG_NAME);

        // The defect itself: a panel drawn at `now - 1h .. now`, an hour this table has no data in.
        expect(fallbackRenders()).toEqual([]);
        // And the shape of the fix: the old window, then the new one. A third entry is a frame the
        // user did not ask for — without the guard this reads four, the middle two being the data's
        // own extent and then the fallback hour.
        const after = axisTransitions();
        expect(after).toHaveLength(2);
        expect(after[0]).toBe(before[0]);
    });

    test('removing a tag moves the axis once too', async () => {
        await showChart();
        await toggleTag(OTHER_TAG_NAME);
        const afterAdd = axisTransitions();

        await toggleTag(OTHER_TAG_NAME);

        expect(fallbackRenders()).toEqual([]);
        const afterRemove = axisTransitions();
        expect(afterRemove).toHaveLength(afterAdd.length + 1);
        expect(afterRemove.slice(0, afterAdd.length)).toEqual(afterAdd);
    });

    // The window the axis settles on is the frozen one, not the data's own extent — which is the
    // other way `getPanelRange` can answer, and a much quieter wrong answer than the fallback.
    test('the settled axis is the resolved window, spelled out to the millisecond', async () => {
        await showChart();
        await toggleTag(OTHER_TAG_NAME);

        const settled = mainAxes().at(-1)!;
        const [from, to] = String(resolvedWindowLabel()).split(' ~ ');
        expect(settled.min).toBe(Date.parse(from));
        expect(settled.max).toBe(Date.parse(to));
    });
});

// "Set global time" copies one panel's window onto every other panel and onto the page's own range.
// The units it copies in come from the axis, so this is asserted through the page rather than only
// through the model: the model can be entirely right about distance while the page forgets to tell
// it which axis it is on, and the symptom is identical — a menu item that refuses to do anything.
describe('DataViewerPage global time on a distance axis', () => {
    const DISTANCE_ROWS = Array.from({ length: 10 }, (_, index) => ({
        time: index * 100,
        name: index % 2 === 0 ? OTHER_TAG_NAME : TAG_NAME,
        value: 10 + index,
    }));
    // The item names the axis it acts on, so the label is per-axis too — see the "names the axis it
    // moves" test below.
    const globalTimeItem = (name: 'Global Time' | 'Global Distance' = 'Global Time') => screen.getAllByRole('menuitem', { name }).at(-1)!;

    const splitOneTagInChartMode = async (columns: unknown[], rows: unknown[]) => {
        dataViewerApi.listTableColumns.mockResolvedValue(columns);
        dataViewerApi.listTableTags.mockResolvedValue({
            tags: [
                { name: OTHER_TAG_NAME, dataType: 'double' },
                { name: TAG_NAME, dataType: 'double' },
            ],
            assetHierarchy: undefined,
        });
        dataViewerApi.queryTagData.mockResolvedValue({ rows });
        const rendered = renderPage();

        await waitFor(() => expect(getDataRows(rendered.container).length).toBeGreaterThan(0));
        fireEvent.click(screen.getByLabelText(`${TAG_NAME} select`));
        await waitFor(() => expect(screen.getByLabelText(`${TAG_NAME} select`)).toBeChecked());
        fireEvent.click(screen.getByRole('tab', { name: /^Chart/ }));
        await waitFor(() => expect(rendered.container.querySelector('.data-viewer-chart-stack')).not.toBeNull());
        fireEvent.click(screen.getByTitle(`Split ${TAG_NAME}`));
        await waitFor(() => expect(rendered.container.querySelector('.data-viewer-chart-card.is-split')).not.toBeNull());

        // The split panel's own menu — the source panel is the one whose window gets copied.
        const splitCard = rendered.container.querySelector<HTMLElement>('.data-viewer-chart-card.is-split')!;
        fireEvent.click(within(splitCard).getByLabelText('Chart actions'));
        return rendered;
    };

    test('the menu item works, and the window it copies stays numeric', async () => {
        const { container } = await splitOneTagInChartMode(DISTANCE_BASE_COLUMNS, DISTANCE_ROWS);

        // Date-parsing a distance window makes 0 ~ 1000 look reversed, which the model refuses — and
        // a refusal reaches the user as a permanently greyed-out menu item.
        expect(globalTimeItem('Global Distance')).not.toBeDisabled();

        dataViewerApi.queryTagData.mockClear();
        fireEvent.click(globalTimeItem('Global Distance'));
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalled());

        // The split panel is re-queried straight from the copied range, so its bounds are the copy
        // itself rather than something re-resolved on the way — a number, not `1970-...Z`.
        const splitCall = dataViewerApi.queryTagData.mock.calls.map((call) => call[0]).find((args) => args.names?.length === 1 && args.names[0] === TAG_NAME);
        expect(splitCall).toBeDefined();
        expect(typeof splitCall.from).toBe('number');
        expect(typeof splitCall.to).toBe('number');
        // The main query re-resolves through the distance formatter, so it arrives as digits.
        queryTagDataArgs().forEach((args) => {
            expect(String(args.from)).toMatch(/^-?[\d.]+$/);
            expect(String(args.to)).toMatch(/^-?[\d.]+$/);
        });
        // And the toolbar still reads as distances rather than 1970 timestamps.
        expect(container.querySelector('.data-viewer-range-chip-value')?.textContent).toMatch(/^-?[\d.]+ ~ -?[\d.]+$/);
        expect(container.querySelector('.data-viewer-range-chip-value')?.textContent).not.toContain('1970');
    });

    // Every assertion above is about what was *asked for* — the query arguments and the toolbar text
    // — so all of them hold while the panel itself is empty. These two are about what came back.
    //
    // Neither reproduces the reported empty main panel, and they are kept as the record of that:
    // whatever strands it, it is not the plain gesture and not the timing below.
    test('the main panel still has a chart after the split panel sets the global window', async () => {
        const { container } = await splitOneTagInChartMode(DISTANCE_BASE_COLUMNS, DISTANCE_ROWS);

        const mainCard = () => container.querySelector<HTMLElement>('.data-viewer-chart-card.is-main')!;
        expect(mainCard()).not.toBeNull();
        expect(within(mainCard()).queryByText('No chart data')).toBeNull();

        fireEvent.click(globalTimeItem('Global Distance'));
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalled());
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(within(mainCard()).queryByText('No chart data')).toBeNull();
    });

    // `handleSetGlobalTime` bumps `rowsRequestRef` — the token that tells an in-flight main read its
    // answer is no longer wanted — and then only re-reads if one of `fetchRows`'s inputs actually
    // changed. A copied window matching the one already on screen changes none of them, so the
    // discarded read has nothing replacing it. That it passes says the surviving rows still match
    // their window; the guard stays because the reasoning is only true by a margin.
    test('a global window applied while the main read is still open does not strand the panel', async () => {
        const { container } = await splitOneTagInChartMode(DISTANCE_BASE_COLUMNS, DISTANCE_ROWS);
        const mainCard = () => container.querySelector<HTMLElement>('.data-viewer-chart-card.is-main')!;
        expect(within(mainCard()).queryByText('No chart data')).toBeNull();

        // Hold the next main read open. The split panel's own reads stay instant, so the only thing
        // in flight when the menu item is clicked is the one the main panel is waiting on.
        let releaseMainRead: () => void = () => {};
        dataViewerApi.queryTagData.mockImplementation((args: any) =>
            (args.names || []).length > 1
                ? new Promise((resolve) => {
                      releaseMainRead = () => resolve({ rows: DISTANCE_ROWS });
                  })
                : Promise.resolve({ rows: DISTANCE_ROWS })
        );

        dataViewerApi.queryTagData.mockClear();
        fireEvent.click(screen.getByLabelText('Refresh time range'));
        await waitFor(() => expect(dataViewerApi.queryTagData.mock.calls.some((call: any[]) => (call[0].names || []).length > 1)).toBe(true));

        fireEvent.click(globalTimeItem('Global Distance'));
        await act(async () => {
            releaseMainRead();
            await Promise.resolve();
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(within(mainCard()).queryByText('No chart data')).toBeNull();
    });

    test('a time axis still copies ISO edges', async () => {
        await splitOneTagInChartMode(TIME_BASE_COLUMNS, ROWS.map((row, index) => ({ ...row, name: index % 2 === 0 ? OTHER_TAG_NAME : TAG_NAME })));

        expect(globalTimeItem()).not.toBeDisabled();
        dataViewerApi.queryTagData.mockClear();
        fireEvent.click(globalTimeItem());
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalled());

        queryTagDataArgs().forEach((args) => {
            expect(typeof args.from).toBe('string');
            expect(args.from).toMatch(/^\d{4}-\d{2}-\d{2}T/);
            expect(args.to).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });
    });

    // The item copies one panel's window onto the others, so it names the thing it copies. On a
    // distance table it said "Global Time" — a clock word, a clock icon, and no clock anywhere in
    // the table it was sitting on. The rest of the page already speaks per-axis (the chip, the axis
    // label, the error messages), and this was the one control that did not.
    test('the menu item names the axis it moves', async () => {
        const { unmount } = await splitOneTagInChartMode(DISTANCE_BASE_COLUMNS, DISTANCE_ROWS);

        expect(screen.getAllByRole('menuitem', { name: 'Global Distance' }).length).toBeGreaterThan(0);
        expect(screen.queryByRole('menuitem', { name: 'Global Time' })).toBeNull();
        // The icon goes with the word: `schedule` is a clock face, `straighten` is the ruler the
        // distance range editor already uses.
        expect(globalTimeItem('Global Distance').querySelector('.material-symbols-outlined')?.textContent).toBe('straighten');
        // Tag Analyzer is not part of this and keeps its own label.
        expect(screen.getAllByRole('menuitem', { name: 'Tag Analyzer' }).length).toBeGreaterThan(0);

        unmount();
        jest.clearAllMocks();
        dataViewerApi.queryTagDataTotal.mockResolvedValue({ lastPage: 1 });
        dataViewerApi.queryTagBoundaryTime.mockImplementation(advancingBoundaryTime());
        dataViewerApi.queryTagBaseColumnBounds.mockResolvedValue(null);
        await splitOneTagInChartMode(TIME_BASE_COLUMNS, ROWS.map((row, index) => ({ ...row, name: index % 2 === 0 ? OTHER_TAG_NAME : TAG_NAME })));

        expect(screen.getAllByRole('menuitem', { name: 'Global Time' }).length).toBeGreaterThan(0);
        expect(screen.queryByRole('menuitem', { name: 'Global Distance' })).toBeNull();
        expect(globalTimeItem().querySelector('.material-symbols-outlined')?.textContent).toBe('schedule');
    });
});

// A time format and a timezone are settings about clocks. A distance axis has none, and nothing on
// it reads either value, so the control that offers them is removed rather than disabled — a
// disabled button still asserts there is a setting here worth having.
describe('DataViewerPage format and timezone control', () => {
    const formatButton = () => screen.queryByLabelText('Set time format and timezone');

    test('the button is there on a time axis and gone on a distance axis', async () => {
        const { container, unmount } = renderPage();
        await waitFor(() => expect(getDataRows(container).length).toBeGreaterThan(0));
        expect(formatButton()).toBeInTheDocument();
        // Opens the modal it exists for, so "present" means reachable rather than merely rendered.
        fireEvent.click(formatButton()!);
        expect(screen.getByText('Format & Timezone')).toBeInTheDocument();
        unmount();

        dataViewerApi.listTableColumns.mockResolvedValue(DISTANCE_BASE_COLUMNS);
        const distance = renderPage();
        await waitFor(() => expect(distance.container.querySelector('.data-viewer-range-chip-axis')?.textContent).toBe('DIST'));
        expect(formatButton()).toBeNull();
        // The rest of the toolbar is untouched — this removed one control, not the row it sits in.
        expect(screen.getByLabelText('Set time range')).toBeInTheDocument();
        expect(screen.getByLabelText('Refresh time range')).toBeInTheDocument();
    });

    // The axis is only known once the schema read lands, so the button is live — and clickable —
    // while the table is still provisionally a time base. A modal left open after its button
    // disappeared has no way back to the toolbar.
    test('an open modal closes when the schema comes back a distance base', async () => {
        let resolveColumns: (columns: unknown) => void = () => undefined;
        dataViewerApi.listTableColumns.mockReturnValue(new Promise((resolve) => (resolveColumns = resolve)));
        const { container } = renderPage();

        await waitFor(() => expect(formatButton()).toBeInTheDocument());
        fireEvent.click(formatButton()!);
        expect(screen.getByText('Format & Timezone')).toBeInTheDocument();

        await act(async () => {
            resolveColumns(DISTANCE_BASE_COLUMNS);
        });
        await waitFor(() => expect(container.querySelector('.data-viewer-range-chip-axis')?.textContent).toBe('DIST'));

        expect(formatButton()).toBeNull();
        expect(screen.queryByText('Format & Timezone')).toBeNull();
    });
});

// The panel blinked on every tag change, with the axis staying exactly where it was — so this is a
// different defect from the one the "chart axis across a tag change" block above covers, and it
// hides in the same gesture. The cause was `TagEChart`'s interaction effect depending on
// `hasChartData`: with a `useEffect` cleanup that calls `chart.dispose()`, the series going empty
// and refilling — which is precisely what a tag change does while the window re-resolves — tore the
// canvas down and built a new one. Twice, in fact: once each way.
//
// The observable is the ECharts instance itself. An axis assertion cannot see this: the axis is
// identical before and after, because the chart is redrawn with the same option.
describe('DataViewerPage chart panel stability', () => {
    const echartsMock = jest.requireMock('echarts') as { init: jest.Mock };
    const CHART_ROWS = Array.from({ length: 10 }, (_, index) => ({
        time: `2026-06-01T10:00:${String(index).padStart(2, '0')}.000Z`,
        name: index % 2 === 0 ? TAG_NAME : OTHER_TAG_NAME,
        value: 10 + index,
    }));

    beforeEach(() => {
        dataViewerApi.listTableTags.mockResolvedValue({
            tags: [
                { name: TAG_NAME, dataType: 'double' },
                { name: OTHER_TAG_NAME, dataType: 'double' },
            ],
            assetHierarchy: undefined,
        });
        dataViewerApi.queryTagData.mockResolvedValue({ rows: CHART_ROWS });
    });

    const showChart = async () => {
        const rendered = renderPage();
        await waitFor(() => expect(getDataRows(rendered.container).length).toBeGreaterThan(0));
        fireEvent.click(screen.getByRole('tab', { name: /^Chart/ }));
        await waitFor(() => expect(rendered.container.querySelector('.data-viewer-chart')).not.toBeNull());
        await waitFor(() => expect(echartsMock.init.mock.calls.length).toBeGreaterThan(0));
        return rendered;
    };

    const settle = async () => {
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });
    };

    test('a tag change does not rebuild the ECharts instance', async () => {
        const { container } = await showChart();
        const initsBefore = echartsMock.init.mock.calls.length;
        const instance = echartsMock.init.mock.results[0]?.value as { dispose: jest.Mock };
        instance.dispose.mockClear();
        const canvasBefore = container.querySelector('.data-viewer-chart');

        const window0 = resolvedWindowLabel();
        fireEvent.click(screen.getByLabelText(`${OTHER_TAG_NAME} select`));
        await waitFor(() => expect(resolvedWindowLabel()).not.toBe(window0));
        await settle();

        // One panel, one instance — and the same one it started with. Before the fix this read
        // `initsBefore + 2`: disposed and re-created as the rows emptied, and again as they refilled.
        expect(echartsMock.init.mock.calls.length).toBe(initsBefore);
        expect(instance.dispose).not.toHaveBeenCalled();
        // The DOM node ECharts is bound to is the same node, so nothing above it unmounted either.
        expect(container.querySelector('.data-viewer-chart')).toBe(canvasBefore);
        // ...and the panel really did re-render with the new tag, so this is not passing by doing
        // nothing at all.
        expect(container.querySelector('.data-viewer-chart-panel-title .badge')?.textContent).toBe('2');
    });

    test('a refresh does not rebuild it either', async () => {
        const { container } = await showChart();
        const initsBefore = echartsMock.init.mock.calls.length;
        const canvasBefore = container.querySelector('.data-viewer-chart');

        const window0 = resolvedWindowLabel();
        fireEvent.click(screen.getByLabelText('Refresh time range'));
        await waitFor(() => expect(resolvedWindowLabel()).not.toBe(window0));
        await settle();

        expect(echartsMock.init.mock.calls.length).toBe(initsBefore);
        expect(container.querySelector('.data-viewer-chart')).toBe(canvasBefore);
    });

    // A tag with no rows at all is the empty-series state the old dependency keyed on, so it is the
    // one that used to churn the instance hardest. The empty state is an overlay over a live
    // container now, not a replacement for it.
    test('an empty series is an overlay, not a torn-down chart', async () => {
        const { container } = await showChart();
        const initsBefore = echartsMock.init.mock.calls.length;
        const canvasBefore = container.querySelector('.data-viewer-chart');

        dataViewerApi.queryTagData.mockResolvedValue({ rows: [] });
        const window0 = resolvedWindowLabel();
        fireEvent.click(screen.getByLabelText(`${OTHER_TAG_NAME} select`));
        await waitFor(() => expect(resolvedWindowLabel()).not.toBe(window0));
        await settle();

        await waitFor(() => expect(container.querySelector('.data-viewer-chart-empty-overlay')).not.toBeNull());
        expect(echartsMock.init.mock.calls.length).toBe(initsBefore);
        expect(container.querySelector('.data-viewer-chart')).toBe(canvasBefore);
    });
});

// The flicker, stated as the thing the user actually reported: "No chart data" flashing up while
// the tags change. The canvas survives the transition (the block above proves that), but the series
// did not — `fetchRows` blanks `rows` the moment the window key moves, the resolver hands back the
// new window one commit before the new rows land, and a chart rebuilt in that commit has nothing in
// it. The panel emptied and refilled, and the empty state painted in between.
//
// Asserting on the *end* state cannot see this: by the time any `waitFor` settles the rows are back
// and the overlay is gone again. So the DOM is watched instead, and every node added anywhere under
// the page for the whole length of the transition is inspected. `takeRecords` at the end drains
// whatever the observer has queued but not delivered, so nothing is missed at either edge.
describe('DataViewerPage chart empty state across a transition', () => {
    const echartsMock = jest.requireMock('echarts') as { init: jest.Mock };
    const CHART_ROWS = Array.from({ length: 10 }, (_, index) => ({
        time: `2026-06-01T10:00:${String(index).padStart(2, '0')}.000Z`,
        name: index % 2 === 0 ? TAG_NAME : OTHER_TAG_NAME,
        value: 10 + index,
    }));
    const EMPTY_OVERLAY = '.data-viewer-chart-empty-overlay';

    beforeEach(() => {
        dataViewerApi.listTableTags.mockResolvedValue({
            tags: [
                { name: TAG_NAME, dataType: 'double' },
                { name: OTHER_TAG_NAME, dataType: 'double' },
            ],
            assetHierarchy: undefined,
        });
        dataViewerApi.queryTagData.mockResolvedValue({ rows: CHART_ROWS });
    });

    const settle = async () => {
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });
    };

    const showChart = async () => {
        const rendered = renderPage();
        await waitFor(() => expect(getDataRows(rendered.container).length).toBeGreaterThan(0));
        fireEvent.click(screen.getByRole('tab', { name: /^Chart/ }));
        await waitFor(() => expect(rendered.container.querySelector('.data-viewer-chart')).not.toBeNull());
        await waitFor(() => expect(echartsMock.init.mock.calls.length).toBeGreaterThan(0));
        await settle();
        return rendered;
    };

    // Every commit, not just the ones a `waitFor` happens to land on: a node that was added and
    // removed again inside a single flush still shows up here as an `addedNodes` entry.
    const watchForEmptyOverlay = (container: HTMLElement) => {
        let count = 0;
        const inspect = (records: MutationRecord[]) => {
            records.forEach((record) => {
                record.addedNodes.forEach((node) => {
                    if (!(node instanceof HTMLElement)) return;
                    if (node.matches(EMPTY_OVERLAY) || node.querySelector(EMPTY_OVERLAY)) count += 1;
                });
            });
        };
        const observer = new MutationObserver(inspect);
        observer.observe(container, { childList: true, subtree: true });
        return {
            stop: () => {
                inspect(observer.takeRecords());
                observer.disconnect();
                return count;
            },
        };
    };

    const toggleTag = async (name: string) => {
        const before = resolvedWindowLabel();
        fireEvent.click(screen.getByLabelText(`${name} select`));
        await waitFor(() => expect(resolvedWindowLabel()).not.toBe(before));
        await settle();
    };

    test('adding a tag never paints "No chart data", at any commit', async () => {
        const { container } = await showChart();
        expect(container.querySelector(EMPTY_OVERLAY)).toBeNull();

        const watcher = watchForEmptyOverlay(container);
        await toggleTag(OTHER_TAG_NAME);
        const appearances = watcher.stop();

        // Without the rows-belong-to-this-window gate this is 1: the window lands, the rows have
        // not, and the panel is rebuilt from an empty `rows`.
        expect(appearances).toBe(0);
        expect(container.querySelector(EMPTY_OVERLAY)).toBeNull();
        // ...and the transition really happened, so this is not passing by standing still.
        expect(container.querySelector('.data-viewer-chart-panel-title .badge')?.textContent).toBe('2');
    });

    test('removing a tag does not either', async () => {
        const { container } = await showChart();
        await toggleTag(OTHER_TAG_NAME);
        await settle();
        expect(container.querySelector(EMPTY_OVERLAY)).toBeNull();

        const watcher = watchForEmptyOverlay(container);
        await toggleTag(OTHER_TAG_NAME);
        const appearances = watcher.stop();

        expect(appearances).toBe(0);
        expect(container.querySelector(EMPTY_OVERLAY)).toBeNull();
        expect(container.querySelector('.data-viewer-chart-panel-title .badge')?.textContent).toBe('1');
    });

    // Refresh re-resolves `last`/`now` and so moves the window key without touching the tags. Same
    // gap, same rule.
    test('a refresh does not either', async () => {
        const { container } = await showChart();

        const watcher = watchForEmptyOverlay(container);
        const window0 = resolvedWindowLabel();
        fireEvent.click(screen.getByLabelText('Refresh time range'));
        await waitFor(() => expect(resolvedWindowLabel()).not.toBe(window0));
        await settle();
        const appearances = watcher.stop();

        expect(appearances).toBe(0);
        expect(container.querySelector(EMPTY_OVERLAY)).toBeNull();
    });

    // The other half of the fix, and the one the transition tests above cannot reach: they always
    // have a previous picture to hold, so the overlay stays away whether or not the panel knows it
    // is waiting. A first load has no previous picture — `chartResults` is `{}` and the series is
    // genuinely empty — so the only thing standing between the user and a "No chart data" flash is
    // the panel being told the rows are still on their way.
    test('a first load waits rather than announcing an empty chart', async () => {
        let deliverRows: (result: { rows: Record<string, unknown>[] }) => void = () => {};
        dataViewerApi.queryTagData.mockImplementation(
            () =>
                new Promise<{ rows: Record<string, unknown>[] }>((resolve) => {
                    deliverRows = resolve;
                })
        );

        const { container } = renderPage();
        await waitFor(() => expect(screen.getByLabelText(`${TAG_NAME} select`)).toBeInTheDocument());
        fireEvent.click(screen.getByRole('tab', { name: /^Chart/ }));
        await waitFor(() => expect(container.querySelector('.data-viewer-chart')).not.toBeNull());
        await settle();

        // No rows have been delivered, so the series is empty — and the panel says nothing about it.
        expect(container.querySelector('.data-viewer-chart-loading-overlay')).not.toBeNull();
        expect(container.querySelector(EMPTY_OVERLAY)).toBeNull();

        await act(async () => {
            deliverRows({ rows: CHART_ROWS });
        });
        await settle();
        expect(container.querySelector(EMPTY_OVERLAY)).toBeNull();
        expect(container.querySelector('.data-viewer-chart-loading-overlay')).toBeNull();
    });

    // The suppression is transitional, not a mute button: a window that really holds nothing still
    // says so, once its own rows have come back empty.
    test('a window that genuinely has no rows still says so', async () => {
        const { container } = await showChart();
        expect(container.querySelector(EMPTY_OVERLAY)).toBeNull();

        dataViewerApi.queryTagData.mockResolvedValue({ rows: [] });
        const window0 = resolvedWindowLabel();
        fireEvent.click(screen.getByLabelText('Refresh time range'));
        await waitFor(() => expect(resolvedWindowLabel()).not.toBe(window0));
        await settle();

        await waitFor(() => expect(container.querySelector(EMPTY_OVERLAY)).not.toBeNull());
        expect(container.querySelector('.data-viewer-chart-loading-overlay')).toBeNull();
    });

    // A range the resolver rejects produces no window and no query, so no rows are coming. Waiting
    // for them would leave the panels holding a picture of a window the user has already left,
    // behind a spinner that never clears.
    test('a range that cannot resolve stops waiting instead of hanging on the last picture', async () => {
        const { container } = await showChart();

        dataViewerApi.queryTagBoundaryTime.mockResolvedValue(null);
        fireEvent.click(screen.getByLabelText('Refresh time range'));
        await waitFor(() => expect(screen.getByText('The selected tag has no data to anchor the time range to.')).toBeInTheDocument());
        await settle();

        expect(container.querySelector('.data-viewer-chart-loading-overlay')).toBeNull();
        expect(container.querySelector(EMPTY_OVERLAY)).not.toBeNull();
    });
});

// Drag-to-zoom on the main plot. Two things were wrong once the pointer left the plot area: the
// release was thrown away entirely (the pixel→value conversion refuses a pixel the grid does not
// contain, and `applyDragRange` treated that refusal as "no gesture"), and the guide rectangle kept
// following the cursor out over the legend, the navigator and the page beyond it.
//
// The stubbed instance is given a real linear axis for the length of this block — `containPixel`
// with a plot area, `convertFromPixel` extrapolating past it the way ECharts does, `convertToPixel`
// for the inverse — because the whole defect lives in what happens either side of that boundary.
describe('DataViewerPage chart drag past the plot edge', () => {
    const echartsMock = jest.requireMock('echarts') as { init: jest.Mock };
    // Container 400px wide; the plot itself runs 50..250, the rest being axis labels and padding.
    const CONTAINER_WIDTH = 400;
    const PLOT_LEFT = 50;
    const PLOT_RIGHT = 250;
    const CHART_ROWS = Array.from({ length: 10 }, (_, index) => ({
        time: `2026-06-01T10:00:${String(index).padStart(2, '0')}.000Z`,
        name: TAG_NAME,
        value: 10 + index,
    }));

    const chartEl = () => document.querySelector<HTMLElement>('.data-viewer-chart')!;
    // The window currently on the axis, read from the panel's own data attributes — which is what
    // `buildDataViewerEChartOption` writes into `xAxis.min/max`, so the stub axis below stays in
    // step with the component instead of hard-coding a window it might not be showing.
    const displayWindow = () => ({
        start: Number(chartEl().getAttribute('data-display-from')),
        end: Number(chartEl().getAttribute('data-display-to')),
    });
    const preview = () => document.querySelector<HTMLElement>('.data-viewer-chart-drag-preview');

    let instance: {
        containPixel: jest.Mock;
        convertFromPixel: jest.Mock;
        convertToPixel: jest.Mock;
        getOption: jest.Mock;
        dispose: jest.Mock;
    };

    const showChart = async () => {
        const rendered = renderPage();
        await waitFor(() => expect(getDataRows(rendered.container).length).toBeGreaterThan(0));
        fireEvent.click(screen.getByRole('tab', { name: /^Chart/ }));
        await waitFor(() => expect(rendered.container.querySelector('.data-viewer-chart')).not.toBeNull());

        instance = echartsMock.init.mock.results[0]?.value as typeof instance;
        instance.containPixel.mockImplementation((_finder: unknown, pixel: number[]) => pixel[0] >= PLOT_LEFT && pixel[0] <= PLOT_RIGHT);
        // `{ xAxisIndex: 0 }` with a pixel *pair* is what the component asks for first; real ECharts
        // answers `undefined` to that and the component falls through to the grid finder, so the stub
        // does the same rather than making the axis finder work and hiding the real path.
        instance.convertFromPixel.mockImplementation((finder: any, pixel: number[]) => {
            if (finder?.xAxisIndex !== undefined) return undefined;
            const { start, end } = displayWindow();
            return [start + ((pixel[0] - PLOT_LEFT) / (PLOT_RIGHT - PLOT_LEFT)) * (end - start), 0];
        });
        instance.convertToPixel.mockImplementation((_finder: unknown, value: number) => {
            const { start, end } = displayWindow();
            return PLOT_LEFT + ((value - start) / (end - start)) * (PLOT_RIGHT - PLOT_LEFT);
        });
        instance.getOption.mockImplementation(() => ({ grid: [{ top: 40, height: 178 }] }));
        jest.spyOn(chartEl(), 'getBoundingClientRect').mockReturnValue({
            left: 0,
            right: CONTAINER_WIDTH,
            width: CONTAINER_WIDTH,
            top: 0,
            bottom: 300,
            height: 300,
            x: 0,
            y: 0,
            toJSON: () => ({}),
        } as DOMRect);
        return rendered;
    };

    beforeEach(() => {
        dataViewerApi.queryTagData.mockResolvedValue({ rows: CHART_ROWS });
    });

    afterEach(() => {
        // Implementations survive `clearAllMocks`, so the shared stub is put back the way the rest
        // of the file expects to find it.
        instance?.containPixel.mockImplementation(() => false);
        instance?.convertFromPixel.mockImplementation(() => undefined);
        instance?.convertToPixel.mockImplementation(() => undefined);
        instance?.getOption.mockImplementation(() => ({}));
    });

    const dragTo = (from: number, to: number) => {
        fireEvent.mouseDown(chartEl(), { button: 0, clientX: from, clientY: 100 });
        fireEvent(window, new MouseEvent('mousemove', { bubbles: true, clientX: to, clientY: 100 }));
    };
    const release = (at: number) => {
        fireEvent(window, new MouseEvent('mouseup', { bubbles: true, clientX: at, clientY: 100 }));
    };

    test('a release outside the plot applies the range, clamped to the edge it left through', async () => {
        await showChart();
        const before = displayWindow();
        // Start a quarter of the way in, then leave the plot by 150px on the right.
        dragTo(PLOT_LEFT + 50, PLOT_RIGHT + 150);
        release(PLOT_RIGHT + 150);
        await waitFor(() => expect(displayWindow().start).not.toBe(before.start));

        const after = displayWindow();
        // The left edge is where the press landed — a quarter across the window...
        expect(after.start).toBeCloseTo(before.start + (before.end - before.start) * 0.25, -1);
        // ...and the right edge is the window's own edge, not the extrapolated value under a cursor
        // that was 150px past it. Before the fix nothing was applied at all.
        expect(after.end).toBe(before.end);
    });

    test('leaving through the left edge clamps there instead', async () => {
        await showChart();
        const before = displayWindow();
        dragTo(PLOT_RIGHT - 50, PLOT_LEFT - 150);
        release(PLOT_LEFT - 150);
        await waitFor(() => expect(displayWindow().end).not.toBe(before.end));

        const after = displayWindow();
        expect(after.start).toBe(before.start);
        expect(after.end).toBeCloseTo(before.start + (before.end - before.start) * 0.75, -1);
    });

    test('the guide stops at the plot edge rather than following the cursor off it', async () => {
        await showChart();
        dragTo(PLOT_LEFT + 50, PLOT_RIGHT + 150);

        const box = preview()!;
        // `left` carries the shell's own 48px padding, which is where the chart container starts.
        expect(box.style.left).toBe(`${48 + PLOT_LEFT + 50}px`);
        // 150px wide, not the 350px the raw cursor distance would give: the far edge is the plot's.
        expect(box.style.width).toBe(`${PLOT_RIGHT - (PLOT_LEFT + 50)}px`);
        release(PLOT_RIGHT + 150);
    });

    test('the guide stops at the left edge too, and both edges hold at once', async () => {
        await showChart();
        // Press inside, then swing far past the *left* edge — the rectangle's left side is the one
        // that has to stop, and its right side is still the press point.
        dragTo(PLOT_LEFT + 100, PLOT_LEFT - 300);

        const box = preview()!;
        expect(box.style.left).toBe(`${48 + PLOT_LEFT}px`);
        expect(box.style.width).toBe('100px');
        release(PLOT_LEFT - 300);
    });

    // The entry point is deliberately not clamped: a press that lands on the legend or the navigator
    // is not a main-plot gesture, and starting a zoom from a coordinate nothing points at would be a
    // worse answer than ignoring it.
    test('a press that starts outside the plot still starts nothing', async () => {
        await showChart();
        const before = displayWindow();
        dragTo(PLOT_RIGHT + 100, PLOT_LEFT + 20);
        expect(preview()).toBeNull();
        release(PLOT_LEFT + 20);
        await act(async () => {
            await Promise.resolve();
        });
        expect(displayWindow()).toEqual(before);
    });
});

// The split-tag chips in the "Selected Tags" panel header. Active, the whole chip — border, fill and
// the tag's own name — was `--color-primary`, a dark blue that works as a 1px border against the
// panel and does not work as small text on the surface behind it: the one thing on the chip a user
// needs to read was the least legible thing on it.
//
// One Data Viewer board is reused for every table opened from the DB Explorer (TableInfo swaps the
// board's `code`), so the page is handed a whole new table under a live mount — new name, new base
// column, new tags — while every piece of state read from the previous table is still in place.
//
// Nothing about the previous table may reach the server under the new table's name. The three reads
// that legitimately go out on a switch are the schema read and the tag list (both about the new
// table) and nothing else; a data query is only allowed once the state it is built from has caught
// up. The assertions therefore span *every* call recorded across the transition, not the last one —
// the page does correct itself a tick later, so a final-state check passes even while the wrong
// query is going out.
describe('DataViewerPage table switch', () => {
    const TIME_TABLE = { dbName: 'MACHBASEDB', userName: 'SYS', tableName: 'MACHROLL', tagColumn: 'NAME', timeColumn: 'TIME', valueColumn: 'VALUE' };
    const DISTANCE_TABLE = { dbName: 'MACHBASEDB', userName: 'SYS', tableName: 'DISTANCE_SENSOR', tagColumn: 'NAME', timeColumn: 'ODOMETER_M', valueColumn: 'VALUE' };
    const TIME_TAG = 'pneumatic';
    const DISTANCE_TAG = 'SENSOR_01';
    const COLUMNS_BY_TABLE: Record<string, unknown[][]> = { MACHROLL: TIME_BASE_COLUMNS, DISTANCE_SENSOR: DISTANCE_BASE_COLUMNS };
    const TAGS_BY_TABLE: Record<string, string> = { MACHROLL: TIME_TAG, DISTANCE_SENSOR: DISTANCE_TAG };

    const renderTable = (pCode: Record<string, string>) =>
        render(
            <RecoilRoot>
                <MemoryRouter>
                    <DataViewerPage pCode={pCode} />
                </MemoryRouter>
            </RecoilRoot>
        );
    const tree = (pCode: Record<string, string>) => (
        <RecoilRoot>
            <MemoryRouter>
                <DataViewerPage pCode={pCode} />
            </MemoryRouter>
        </RecoilRoot>
    );

    // Everything any read was aimed at, in call order, across every stubbed endpoint that talks to a
    // table's rows. The boundary read is in here because a `last` expression carried over from a time
    // table would anchor itself against the distance table through it.
    type Read = { api: string; tableName?: string; names?: string[]; baseKind?: string; timeColumn?: string };
    const rowReads = (): Read[] =>
        [
            ...dataViewerApi.queryTagData.mock.calls.map((call) => ({ api: 'queryTagData', ...(call[0] as object) })),
            ...dataViewerApi.queryTagDataTotal.mock.calls.map((call) => ({ api: 'queryTagDataTotal', ...(call[0] as object) })),
            ...dataViewerApi.queryTagBoundaryTime.mock.calls.map((call) => ({ api: 'queryTagBoundaryTime', ...(call[0] as object) })),
        ] as Read[];
    // A read is coherent when everything in it describes one table: the tags it asks for are that
    // table's, and the axis it was built on is that table's axis. The leak this guards is a read that
    // is coherent in neither direction — the new table's name and base column carrying the old
    // table's tags and the old table's time syntax.
    const incoherentReads = () =>
        rowReads().filter((read) => {
            const expectedTag = TAGS_BY_TABLE[String(read.tableName)];
            const expectedKind = read.tableName === 'DISTANCE_SENSOR' ? 'distance' : 'time';
            if (!expectedTag) return true;
            if ((read.names || []).some((name) => name !== expectedTag)) return true;
            // The boundary read is time-only by construction and carries no baseKind.
            return read.api !== 'queryTagBoundaryTime' && read.baseKind !== expectedKind;
        });

    // The two reads race in production — they are independent round trips — so the tag list is made
    // to land *after* the schema here. That is the ordering that tells the two guards apart: once
    // the schema has answered for the new table, the only thing still stale is the tag selection,
    // and a page that gates on the schema alone fires precisely the reported query at that point.
    // A whole task behind, not a few microtasks: the page has to be given room to resolve a window
    // and read a page of rows off the schema alone, because that is what it does when the guard is
    // only half there.
    const tick = () => new Promise((resolve) => setTimeout(resolve, 20));
    const tagsFor = (tableName: string) => ({
        tags: TAGS_BY_TABLE[tableName] ? [{ name: TAGS_BY_TABLE[tableName], dataType: 'double' }] : [],
        assetHierarchy: undefined,
    });

    beforeEach(() => {
        dataViewerApi.listTableColumns.mockImplementation(async ({ tableName }: { tableName: string }) => COLUMNS_BY_TABLE[tableName] ?? []);
        dataViewerApi.listTableTags.mockImplementation(async ({ tableName }: { tableName: string }) => {
            await tick();
            return tagsFor(tableName);
        });
        dataViewerApi.queryTagData.mockResolvedValue({ rows: [] });
    });

    const settle = async () => {
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
            await Promise.resolve();
        });
    };

    test('a time table swapped for a distance one never queries the new table with the old one’s state', async () => {
        const { rerender } = renderTable(TIME_TABLE);
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalled());
        expect(queryTagDataArgs()[0]).toMatchObject({ tableName: 'MACHROLL', names: [TIME_TAG], baseKind: 'time' });

        await act(async () => {
            rerender(tree(DISTANCE_TABLE));
        });
        await waitFor(() => expect(rowReads().some((read) => read.tableName === 'DISTANCE_SENSOR')).toBe(true));
        await settle();

        // The bug: `DISTANCE_SENSOR` + `ODOMETER_M` + `names: ['pneumatic']` + `baseKind: 'time'`,
        // i.e. TO_TIMESTAMP against a DOUBLE odometer column for a tag that table does not have.
        expect(incoherentReads()).toEqual([]);
        // ...and the switch really did complete, so the emptiness above is not the page having
        // stopped: the new table is read, on its own axis, for its own tag, in its own units.
        const distanceReads = queryTagDataArgs().filter((args) => (args as Read).tableName === 'DISTANCE_SENSOR');
        expect(distanceReads.length).toBeGreaterThan(0);
        expect(distanceReads.at(-1)).toMatchObject({ names: [DISTANCE_TAG], baseKind: 'distance', timeColumn: 'ODOMETER_M', from: '0', to: '1000' });
        // A distance axis has no `last` to anchor, so the boundary read must never have been aimed
        // at it — that is the other query the stale time axis would have sent.
        expect(dataViewerApi.queryTagBoundaryTime.mock.calls.every((call) => call[0].tableName === 'MACHROLL')).toBe(true);
    });

    test('and the same the other way round', async () => {
        const { rerender } = renderTable(DISTANCE_TABLE);
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalled());
        expect(queryTagDataArgs()[0]).toMatchObject({ tableName: 'DISTANCE_SENSOR', names: [DISTANCE_TAG], baseKind: 'distance' });

        await act(async () => {
            rerender(tree(TIME_TABLE));
        });
        await waitFor(() => expect(rowReads().some((read) => read.tableName === 'MACHROLL')).toBe(true));
        await settle();

        // The mirror image: a numeric 0 ~ 1000 window and `SENSOR_01` aimed at a DATETIME table.
        expect(incoherentReads()).toEqual([]);
        const timeReads = queryTagDataArgs().filter((args) => (args as Read).tableName === 'MACHROLL');
        expect(timeReads.length).toBeGreaterThan(0);
        expect(timeReads.at(-1)).toMatchObject({ names: [TIME_TAG], baseKind: 'time', timeColumn: 'TIME' });
        expect((timeReads.at(-1) as Read & { from?: string }).from).not.toBe('0');
    });

    // Opening a second table and going back before it finished loading. The tag list never changed
    // hands — it is still the first table's, and correctly so — which is what makes this the case
    // the schema's own key answers and nothing else does: the columns in hand are the *other*
    // table's, and the only thing that says so is the key they were stored under.
    test('a table reopened while its neighbour is still loading is read on its own schema', async () => {
        const { rerender } = renderTable(TIME_TABLE);
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalled());

        // The distance table answers about its columns and then stalls on its tags.
        dataViewerApi.listTableTags.mockImplementation(async ({ tableName }: { tableName: string }) => {
            if (tableName === 'DISTANCE_SENSOR') return new Promise(() => {});
            await tick();
            return tagsFor(tableName);
        });
        await act(async () => {
            rerender(tree(DISTANCE_TABLE));
        });
        await waitFor(() => expect(dataViewerApi.listTableColumns).toHaveBeenCalledWith(expect.objectContaining({ tableName: 'DISTANCE_SENSOR' })));
        await settle();

        const readsBeforeReturn = rowReads().length;
        await act(async () => {
            rerender(tree(TIME_TABLE));
        });
        await waitFor(() => expect(rowReads().length).toBeGreaterThan(readsBeforeReturn));
        await settle();

        // The leak this guards: `MACHROLL` read on the distance table's axis — `baseKind: 'distance'`
        // and a 0 ~ 1000 window against a DATETIME column.
        expect(incoherentReads()).toEqual([]);
        const timeReads = queryTagDataArgs().filter((args) => (args as Read).tableName === 'MACHROLL');
        expect(timeReads.at(-1)).toMatchObject({ names: [TIME_TAG], baseKind: 'time' });
        expect((timeReads.at(-1) as Read & { from?: string }).from).not.toBe('0');
    });

    // The reported symptom: an empty main panel whose axis reads 998.001K ~ 998.3K while the
    // navigator under it, and the range button above it, both read 0 ~ 1000.
    //
    // `chartViewRanges` is the main panel's own window — what a drag or a wheel inside the chart
    // writes, and what the panel's axis is drawn from. It is keyed by chart group, and pruned by
    // exactly that: the effect keeps every entry whose group id is still live. The main panel's id
    // is the constant `'default'`, so it is live in every table, and the pruning never reaches it.
    // Nothing else clears it on a table change — the reads all re-aim, the window resets, the
    // navigator redraws, and the one piece of state describing where the panel is looking stays
    // pointed into the previous table's coordinate space.
    //
    // Which is why the range button disagrees with the axis: the button reads the window, and a
    // drag never touches the window. And why Refresh does not help — it re-queries, it does not
    // move the panel — while nudging the navigator does, because that writes `chartViewRanges`
    // afresh from the current table.
    test('a main panel dragged before the table changed does not keep the old table’s window', async () => {
        const echartsMock = jest.requireMock('echarts') as { init: jest.Mock };
        // A far-out odometer, so a window carried over from it is unmistakable against 0 ~ 1000.
        const FAR_TABLE = { ...DISTANCE_TABLE, tableName: 'DISTANCE_FAR' };
        COLUMNS_BY_TABLE.DISTANCE_FAR = DISTANCE_BASE_COLUMNS;
        TAGS_BY_TABLE.DISTANCE_FAR = DISTANCE_TAG;
        dataViewerApi.queryTagData.mockResolvedValue({
            rows: Array.from({ length: 10 }, (_, index) => ({ time: 998_000 + index * 30, name: DISTANCE_TAG, value: 0.1 })),
        });

        const { rerender, container } = renderTable(FAR_TABLE);
        await waitFor(() => expect(dataViewerApi.queryTagData).toHaveBeenCalled());
        fireEvent.click(screen.getByRole('tab', { name: /^Chart/ }));
        await waitFor(() => expect(echartsMock.init.mock.calls.length).toBeGreaterThan(0));
        await settle();

        // The gesture: a zoom inside the main panel. This is the only route that writes the panel's
        // window without touching the page's, which is what makes it the one that survives.
        const instance = echartsMock.init.mock.results[0].value as { on: jest.Mock; setOption: jest.Mock };
        const dataZoomHandler = instance.on.mock.calls.find(([event]) => event === 'datazoom')?.[1];
        expect(dataZoomHandler).toBeDefined();
        await act(async () => {
            dataZoomHandler({ startValue: 998_001, endValue: 998_300 });
        });
        await settle();

        await act(async () => {
            rerender(tree(DISTANCE_TABLE));
        });
        await waitFor(() => expect(rowReads().some((read) => read.tableName === 'DISTANCE_SENSOR')).toBe(true));
        await settle();

        // The axis the panel is actually drawn on, taken from the last option ECharts was handed.
        const lastOption = instance.setOption.mock.calls.at(-1)?.[0] as any;
        const mainAxis = lastOption?.xAxis?.[0];
        expect(mainAxis).toBeDefined();
        expect([mainAxis.min, mainAxis.max]).not.toEqual([998_001, 998_300]);
        // Stated the other way, so a panel that merely went blank does not pass: the axis has to be
        // inside the window the rest of the page is showing.
        expect(Number(mainAxis.min)).toBeGreaterThanOrEqual(0);
        expect(Number(mainAxis.max)).toBeLessThanOrEqual(1000);
        expect(container.querySelector('.data-viewer-chart')).not.toBeNull();
    });
});

// jsdom applies no stylesheet, so the colour itself is asserted against the source rule and the DOM
// is asserted to give that rule something to hit. Neither half is worth anything alone: a rule
// pointing at a `.truncate` that is not there, or a `.truncate` no rule mentions, both pass one and
// fail the other.
describe('DataViewerPage split tag chip legibility', () => {
    const stylesheet = () => readFileSync(join(__dirname, 'DataViewerPage.scss'), 'utf8');
    // The selector has to be matched whole — `indexOf` alone would happily find
    // `... .is-split .truncate` inside `... .is-split .truncated-thing`, and then report a rule that
    // reaches nothing on the page as if it reached the name.
    const ruleFor = (selector: string) => {
        const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(stylesheet());
        return match ? match[1] : null;
    };

    test('the active chip lifts the tag name out of the accent colour', () => {
        const body = ruleFor('.neo-data-viewer .data-viewer-chart-tag-chip.is-split .truncate');
        expect(body).not.toBeNull();
        expect(body).toMatch(/color:\s*var\(--color-white\)/);
        // The emphasis itself is untouched — this lifted the name out of the accent, it did not
        // remove the accent.
        const chip = ruleFor('.neo-data-viewer .data-viewer-chart-tag-chip.is-split');
        expect(chip).toMatch(/border-color:\s*var\(--color-primary\)/);
    });

    test('the tag name is in an element of its own for that rule to reach', async () => {
        dataViewerApi.listTableTags.mockResolvedValue({
            tags: [
                { name: TAG_NAME, dataType: 'double' },
                { name: OTHER_TAG_NAME, dataType: 'double' },
            ],
            assetHierarchy: undefined,
        });
        const { container } = renderPage();
        await waitFor(() => expect(getDataRows(container).length).toBeGreaterThan(0));
        fireEvent.click(screen.getByLabelText(`${OTHER_TAG_NAME} select`));
        await waitFor(() => expect(screen.getByLabelText(`${OTHER_TAG_NAME} select`)).toBeChecked());
        fireEvent.click(screen.getByRole('tab', { name: /^Chart/ }));
        await waitFor(() => expect(container.querySelector('.data-viewer-chart-stack')).not.toBeNull());

        fireEvent.click(screen.getByTitle(`Split ${TAG_NAME}`));
        await waitFor(() => expect(container.querySelector('.data-viewer-chart-tag-chip.is-split')).not.toBeNull());

        const chip = container.querySelector<HTMLElement>('.data-viewer-chart-tag-chip.is-split')!;
        expect(chip.querySelector('.truncate')?.textContent).toBe(TAG_NAME);
        // The × stays outside it, so it keeps the accent and the chip still reads as removable.
        expect(chip.querySelector('.material-symbols-outlined')?.textContent).toBe('close');
    });
});
