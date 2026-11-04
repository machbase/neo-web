// #1576: a shared board reads /db/* without a login; with the server's HTTP token auth on every one of those
// requests is 401 and the board showed "404 not found file name". The link now asks first and, when shared
// links cannot work, shows only a notice — the board, rollup, license and database requests never go out.

jest.mock('@/utils/shareAvailability', () => ({
    checkShareAvailable: jest.fn(),
    getKnownShareAvailable: jest.fn(() => undefined),
}));
jest.mock('./components/Dashboard/DashboardView', () => () => <div data-testid="public-board-stub" />);

import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { checkShareAvailable } from '@/utils/shareAvailability';
import PublicApp from './PublicApp';

const NOTICE = 'Shared links are not available on this server.';

const sFetch = jest.fn();
beforeEach(() => {
    sFetch.mockReset();
    sFetch.mockImplementation((aUrl: string) =>
        Promise.resolve({ ok: false, status: 401, url: aUrl, json: () => Promise.resolve({}), text: () => Promise.resolve('') })
    );
    (global as any).fetch = sFetch;
    localStorage.clear();
});
afterEach(() => {
    delete (global as any).fetch;
});

const renderLink = async () => {
    render(
        <MemoryRouter initialEntries={['/Z1576/board.dsh']}>
            <PublicApp />
        </MemoryRouter>
    );
    await act(async () => {});
};

describe('a shared link on a server with HTTP token auth on', () => {
    it('asks POST /db/tql once and then sends nothing: only the notice', async () => {
        jest.mocked(checkShareAvailable).mockImplementation(jest.requireActual('@/utils/shareAvailability').checkShareAvailable);
        await renderLink();
        expect(screen.getByRole('alert')).toHaveTextContent(NOTICE);
        expect(screen.queryByTestId('public-board-stub')).toBeNull();
        expect(sFetch.mock.calls.map((aCall) => aCall[0])).toEqual(['/db/tql']);
        expect(localStorage.getItem('V$ROLLUP_VER')).toBeNull();
    });

    it('the notice is the design-system card, the size of the viewport (also inside an iframe)', async () => {
        jest.mocked(checkShareAvailable).mockResolvedValue(false);
        await renderLink();
        const sCard = screen.getByTestId('error-boundary-region%3Apublic-board-unavailable');
        expect(sCard).toHaveStyle({ width: '100vw', height: '100vh' });
        expect(screen.queryByText('404 not found file name')).toBeNull();
        expect(sFetch).not.toHaveBeenCalled();
    });
});

describe('a shared link where shared links work', () => {
    it('opens the board and loads as before', async () => {
        jest.mocked(checkShareAvailable).mockResolvedValue(true);
        await renderLink();
        expect(screen.getByTestId('public-board-stub')).toBeInTheDocument();
        expect(screen.queryByText(NOTICE)).toBeNull();
        expect(sFetch.mock.calls.some((aCall) => String(aCall[0]).startsWith('/db/query'))).toBe(true);
    });

    it('draws nothing and reads nothing while the server is asked', async () => {
        jest.mocked(checkShareAvailable).mockReturnValue(new Promise(() => {}));
        await renderLink();
        expect(screen.queryByTestId('public-board-stub')).toBeNull();
        expect(screen.queryByText(NOTICE)).toBeNull();
        expect(sFetch).not.toHaveBeenCalled();
    });
});
