import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RecoilRoot } from 'recoil';
import Tql from './index';
import { getTqlChart } from '@/api/repository/machiot';

// Heavy / canvas-bound dependencies are stubbed so the test stays focused on the
// CSV header-toggle slicing logic in the result <Table />.
jest.mock('@/api/repository/machiot', () => ({
    getTqlChart: jest.fn(),
}));

// MonacoEditor pulls in monaco-editor (canvas, web workers) which jsdom cannot
// run. Stub it to a no-op element.
jest.mock('@/components/monaco/MonacoEditor', () => ({
    MonacoEditor: () => <div data-testid="monaco-stub" />,
}));

// ShowVisualization renders echarts/highcharts; never exercised by CSV results.
jest.mock('./ShowVisualization', () => ({
    ShowVisualization: () => <div data-testid="visualization-stub" />,
}));

// Markdown transitively imports mermaid (ESM, not transformed by jest); never
// exercised by CSV results.
jest.mock('../worksheet/Markdown', () => ({
    Markdown: () => <div data-testid="markdown-stub" />,
}));

// split-pane-react relies on ResizeObserver, which jsdom does not implement.
class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
}
beforeAll(() => {
    (global as any).ResizeObserver = (global as any).ResizeObserver ?? ResizeObserverStub;
});

const CSV_HEADERS = { 'content-type': 'text/csv' };

// Three-row CSV body. The bug under test sliced row 0 ("a,1") off the result on
// a fresh query whenever the header toggle had been turned OFF previously.
const CSV_BODY = 'a,1\nb,2\nc,3';
const CSV_ROW_COUNT = CSV_BODY.split('\n').length; // 3

const csvResponse = () => ({ status: 200, headers: CSV_HEADERS, data: CSV_BODY });

const renderTql = () =>
    render(
        <RecoilRoot>
            <Tql
                pIsActiveTab
                pCode="FAKE() // body is irrelevant, getTqlChart is mocked"
                pIsSave={false}
                setIsSaveModal={jest.fn()}
                pHandleSaveModalOpen={jest.fn()}
                pSetDragStat={jest.fn()}
            />
        </RecoilRoot>
    );

const runQuery = () => fireEvent.click(screen.getByRole('button', { name: 'Run code' }));

// Body rows in the result <Table /> carry the `result-body-tr` class
// (CommonTable standard mode for small CSV results).
const getBodyRowCount = () => document.querySelectorAll('tr.result-body-tr').length;

const getHeaderToggleButton = () =>
    screen.queryByRole('button', { name: 'Hide header' }) ?? screen.getByRole('button', { name: 'Show header' });

describe('Tql CSV header toggle', () => {
    beforeEach(() => {
        jest.mocked(getTqlChart).mockResolvedValue(csvResponse() as any);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('initial query renders every CSV row with synthetic column headers', async () => {
        renderTql();
        runQuery();

        await waitFor(() => expect(getBodyRowCount()).toBe(CSV_ROW_COUNT));

        // Synthetic headers come from TqlCsvParser: column0, column1, ...
        expect(screen.getByText('column0')).toBeInTheDocument();
        expect(screen.getByText('column1')).toBeInTheDocument();
        // First data row must be present (not sliced).
        const firstRow = document.querySelectorAll('tr.result-body-tr')[0];
        expect(within(firstRow as HTMLElement).getByText('a')).toBeInTheDocument();
    });

    test('toggling the header off slices the first row only for the current result', async () => {
        renderTql();
        runQuery();

        await waitFor(() => expect(getBodyRowCount()).toBe(CSV_ROW_COUNT));

        // Header toggle ON -> OFF: first row is dropped (used as header labels).
        fireEvent.click(getHeaderToggleButton());

        await waitFor(() => expect(getBodyRowCount()).toBe(CSV_ROW_COUNT - 1));
    });

    test('REGRESSION: re-running after toggle OFF must not drop the first row of the new result', async () => {
        renderTql();

        // Query 1
        runQuery();
        await waitFor(() => expect(getBodyRowCount()).toBe(CSV_ROW_COUNT));

        // Toggle header OFF -> leaves sIsHeader === false in the bug scenario.
        fireEvent.click(getHeaderToggleButton());
        await waitFor(() => expect(getBodyRowCount()).toBe(CSV_ROW_COUNT - 1));

        // Query 2: getTqlData must reset the header toggle back to ON so the new
        // result shows every row. Before the fix, sIsHeader stayed false and the
        // first row of the new result was sliced off.
        runQuery();

        await waitFor(() => expect(getTqlChart).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(getBodyRowCount()).toBe(CSV_ROW_COUNT));

        // First row of the fresh result is intact.
        const firstRow = document.querySelectorAll('tr.result-body-tr')[0];
        expect(within(firstRow as HTMLElement).getByText('a')).toBeInTheDocument();
    });

    test('single result toggle on->off->on keeps header labels and first-row handling consistent', async () => {
        renderTql();
        runQuery();
        await waitFor(() => expect(getBodyRowCount()).toBe(CSV_ROW_COUNT));

        // ON: synthetic headers, all rows shown.
        expect(screen.getByText('column0')).toBeInTheDocument();

        // ON -> OFF: first row ("a", "1") becomes the header labels, row count drops.
        // Scope to the <thead> because "1" also appears in the row-number column.
        fireEvent.click(getHeaderToggleButton());
        await waitFor(() => expect(getBodyRowCount()).toBe(CSV_ROW_COUNT - 1));
        const thead = document.querySelector('thead') as HTMLElement;
        expect(within(thead).getByText('a')).toBeInTheDocument();
        expect(within(thead).getByText('1')).toBeInTheDocument();

        // OFF -> ON: synthetic headers restored, all rows shown again.
        fireEvent.click(getHeaderToggleButton());
        await waitFor(() => expect(getBodyRowCount()).toBe(CSV_ROW_COUNT));
        expect(screen.getByText('column0')).toBeInTheDocument();
    });
});

// machbase/neo #1421 — an empty text/csv response must render a centered
// "No record" text (not a crash, not raw error text, and no table frame). This is
// the SAME empty-state used by the ndjson sink, so both sinks look identical when
// the query produced zero rows.
describe('Tql empty CSV result (neo #1421)', () => {
    // A body of "\n" is what the backend returns for a query that produced no
    // rows. TqlCsvParser guards it to [[], []] (Phase 1), so sCsv/sCsvHeader end
    // up empty while sResultType stays 'csv'.
    const emptyCsvResponse = () => ({ status: 200, headers: CSV_HEADERS, data: '\n' });

    beforeEach(() => {
        jest.mocked(getTqlChart).mockResolvedValue(emptyCsvResponse() as any);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders a centered "No record" text (no table), no error, and no header toggle', async () => {
        renderTql();
        runQuery();

        // Empty CSV renders a bare centered "No record" — identical to the ndjson
        // empty state — with NO table frame.
        await waitFor(() => expect(screen.getByText(/no record/i)).toBeInTheDocument());
        expect(document.querySelector('.table-wrapper')).not.toBeInTheDocument();

        // Zero data rows, no crash.
        expect(getBodyRowCount()).toBe(0);

        // No raw error text leaked, and the transient "Processing..." text is
        // cleared once the CSV result renders.
        expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
        expect(screen.queryByText('Processing...')).not.toBeInTheDocument();

        // Action B: the header toggle button is hidden for an empty result, so
        // there is no dead/no-op button and no way to reach handleChangeHeader
        // with an undefined first row.
        expect(screen.queryByRole('button', { name: 'Hide header' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Show header' })).not.toBeInTheDocument();
    });

    test('a non-empty result rendered after an empty one restores the working header toggle', async () => {
        renderTql();

        // Query 1: empty result -> "No record", no table, no toggle button.
        runQuery();
        await waitFor(() => expect(screen.getByText(/no record/i)).toBeInTheDocument());
        expect(document.querySelector('.table-wrapper')).not.toBeInTheDocument();
        expect(getBodyRowCount()).toBe(0);
        expect(screen.queryByRole('button', { name: /header$/ })).not.toBeInTheDocument();

        // Query 2: real CSV -> toggle button comes back and works without crashing.
        jest.mocked(getTqlChart).mockResolvedValue(csvResponse() as any);
        runQuery();
        await waitFor(() => expect(getBodyRowCount()).toBe(CSV_ROW_COUNT));
        expect(() => fireEvent.click(getHeaderToggleButton())).not.toThrow();
        await waitFor(() => expect(getBodyRowCount()).toBe(CSV_ROW_COUNT - 1));
    });
});

// machbase/neo #1421 — an empty ndjson response (whitespace-only body) must show
// the same centered "No record" hint instead of an invisible blank <pre>. The
// ndjson result type is only set after a run, so the blank check is safe.
describe('Tql empty ndjson result (neo #1421)', () => {
    const NDJSON_HEADERS = { 'content-type': 'application/x-ndjson' };

    // A whitespace-only body is what reaches the ndjson branch for a zero-row
    // result: DetermineTqlResultType keeps it as NDJSON (non-empty string) while
    // the payload is visually blank.
    const emptyNdjsonResponse = () => ({ status: 200, headers: NDJSON_HEADERS, data: '\n' });

    beforeEach(() => {
        jest.mocked(getTqlChart).mockResolvedValue(emptyNdjsonResponse() as any);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders a centered "No record" hint instead of a blank pane', async () => {
        renderTql();
        runQuery();

        await waitFor(() => expect(screen.getByText(/no record/i)).toBeInTheDocument());

        // No raw <pre> body is rendered for the blank result, and the transient
        // "Processing..." text is cleared once the ndjson result renders.
        expect(document.querySelector('pre')).not.toBeInTheDocument();
        expect(screen.queryByText('Processing...')).not.toBeInTheDocument();
    });

    test('a non-empty ndjson result rendered after an empty one shows the raw body', async () => {
        renderTql();

        // Query 1: empty ndjson -> "No record".
        runQuery();
        await waitFor(() => expect(screen.getByText(/no record/i)).toBeInTheDocument());

        // Query 2: real ndjson payload -> raw <pre> body, no "No record".
        jest.mocked(getTqlChart).mockResolvedValue({ status: 200, headers: NDJSON_HEADERS, data: '{"a":1}\n{"a":2}' } as any);
        runQuery();
        await waitFor(() => expect(document.querySelector('pre')?.textContent).toContain('{"a":1}'));
        expect(screen.queryByText(/no record/i)).not.toBeInTheDocument();
    });
});
