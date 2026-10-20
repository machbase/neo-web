// UrlDownloadModal takes the file name from the URL's last segment. That segment is already percent-encoded,
// and the /api/files builder encodes once more — so it must be decoded once first (issue-1544 r6).
import { render, screen, fireEvent, act, within, waitFor } from '@testing-library/react';
import { RecoilRoot, useRecoilValue } from 'recoil';
import { gBoardList } from '@/recoil/recoil';
import { UrlDownloadModal } from './UrlDownloadModal';
import * as api from '@/api/repository/api';
import request from '@/api/core';
import { gRecentDirectory } from '@/recoil/fileTree';

jest.mock('@/api/core', () => ({
    __esModule: true,
    // GET of the target folder answers an (empty) folder listing, every other request succeeds
    default: jest.fn((aReq: any) => Promise.resolve(aReq?.method === 'GET' ? { success: true, data: { isDir: true, children: [] } } : { success: true })),
}));

const okRequest = (aReq: any) => Promise.resolve(aReq?.method === 'GET' ? { success: true, data: { isDir: true, children: [] } } : { success: true });

let sBoards: any[] = [];
const BoardProbe = () => {
    sBoards = useRecoilValue(gBoardList) as any[];
    return null;
};

const renderModal = (aTabs?: any[]) => {
    const setIsOpen = jest.fn();
    const pCallback = jest.fn();
    render(
        <RecoilRoot
            initializeState={({ set }) => {
                set(gRecentDirectory, '/d/');
                if (aTabs) set(gBoardList, aTabs as any);
            }}
        >
            <UrlDownloadModal setIsOpen={setIsOpen} pCallback={pCallback} />
            <BoardProbe />
        </RecoilRoot>
    );
    return { setIsOpen, pCallback };
};

const download = async (aUrl: string) => {
    fireEvent.change(screen.getByRole('textbox'), { target: { value: aUrl } });
    await act(async () => {
        fireEvent.click(screen.getByText('OK'));
    });
};

describe('UrlDownloadModal — file name from url', () => {
    let sFetch: jest.Mock;
    let sPostSpy: jest.SpyInstance;
    beforeEach(() => {
        (request as unknown as jest.Mock).mockClear();
        // a test that fails half-way must not leak its request mock into the next ones
        (request as unknown as jest.Mock).mockImplementation(okRequest);
        sFetch = jest.fn(() => Promise.resolve({ status: 200, text: () => Promise.resolve('a,b\n1,2'), json: () => Promise.resolve({}) }));
        (global as any).fetch = sFetch;
        sPostSpy = jest.spyOn(api, 'postFileList');
    });
    afterEach(() => sPostSpy.mockRestore());

    it('decodes My%20Data.csv once: name "My Data.csv", wire URL encoded once', async () => {
        renderModal();
        await download('https://h/My%20Data.csv');

        expect(sFetch).toHaveBeenCalledWith('https://h/My%20Data.csv');
        expect(sPostSpy).toHaveBeenCalledTimes(1);
        expect(sPostSpy.mock.calls[0][2]).toBe('My Data.csv');
        const sPost = (request as unknown as jest.Mock).mock.calls.find((c) => c[0].method === 'POST')[0];
        expect(sPost.url).toBe('/api/files/d/My%20Data.csv');
    });

    it('a%2Fb.csv decodes to a/b.csv → rejected, no POST, error shown', async () => {
        renderModal();
        await download('https://h/a%2Fb.csv');

        expect(screen.getByTestId('url-download-error')).toHaveTextContent('Invalid file name');
        expect(sPostSpy).not.toHaveBeenCalled();
        expect((request as unknown as jest.Mock).mock.calls.some((c) => c[0].method === 'POST')).toBe(false);
    });

    it('an existing file (case-only too) asks first; cancel → no download, no POST (r11/r12)', async () => {
        (request as unknown as jest.Mock).mockImplementation((aReq: any) =>
            Promise.resolve(aReq.method === 'GET' ? { success: true, data: { isDir: true, children: [{ name: 'data.CSV', isDir: false }] } } : { success: true })
        );
        renderModal();
        await download('https://h/x/data.csv');

        const sDialog = await screen.findByTestId('file-overwrite-dialog');
        expect(sDialog).toHaveTextContent("A file named 'data.CSV' already exists.");
        expect((request as unknown as jest.Mock).mock.calls[0][0]).toMatchObject({ method: 'GET', url: '/api/files/d/' });
        expect(sFetch).not.toHaveBeenCalled();
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('cancel'));
        });
        expect(sFetch).not.toHaveBeenCalled();
        expect(sPostSpy).not.toHaveBeenCalled();
        (request as unknown as jest.Mock).mockImplementation(okRequest);
    });

    it('r20 M1: data.csv from the url over data.CSV → asked about data.CSV, after OK the POST writes the URL name data.csv', async () => {
        (request as unknown as jest.Mock).mockImplementation((aReq: any) =>
            Promise.resolve(aReq.method === 'GET' ? { success: true, data: { isDir: true, children: [{ name: 'data.CSV', isDir: false }] } } : { success: true })
        );
        renderModal();
        await download('https://h/x/data.csv');
        const sDialog = await screen.findByTestId('file-overwrite-dialog');
        expect(sDialog).toHaveTextContent("A file named 'data.CSV' already exists.");
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('confirm'));
        });
        await waitFor(() => expect(sPostSpy).toHaveBeenCalledTimes(1));
        expect(sPostSpy.mock.calls[0][2]).toBe('data.csv');
        (request as unknown as jest.Mock).mockImplementation(okRequest);
    });

    it('r20 M3: after a confirmed overwrite the tab open on that file shows the downloaded text', async () => {
        (request as unknown as jest.Mock).mockImplementation((aReq: any) =>
            Promise.resolve(aReq.method === 'GET' ? { success: true, data: { isDir: true, children: [{ name: 'data.csv', isDir: false }] } } : { success: true })
        );
        renderModal([
            { id: 'onFile', name: 'data.csv', path: '/d/', type: 'csv', code: 'old', savedCode: 'old' },
            { id: 'other', name: 'data.csv', path: '/x/', type: 'csv', code: 'x', savedCode: 'x' },
        ]);
        await download('https://h/x/data.csv');
        const sDialog = await screen.findByTestId('file-overwrite-dialog');
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('confirm'));
        });
        await waitFor(() => expect(sBoards.find((aT) => aT.id === 'onFile')).toMatchObject({ code: 'a,b\n1,2', savedCode: 'a,b\n1,2' }));
        expect(sBoards.find((aT) => aT.id === 'other')).toMatchObject({ code: 'x', savedCode: 'x' });
        (request as unknown as jest.Mock).mockImplementation(okRequest);
    });

    it('r20 M3: binary content (image) closes the tab open on the overwritten file', async () => {
        sFetch.mockImplementation(() => Promise.resolve({ status: 200, arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)), text: () => Promise.resolve(''), json: () => Promise.resolve({}) }));
        (request as unknown as jest.Mock).mockImplementation((aReq: any) =>
            Promise.resolve(aReq.method === 'GET' ? { success: true, data: { isDir: true, children: [{ name: 'p.png', isDir: false }] } } : new ArrayBuffer(0))
        );
        renderModal([{ id: 'img', name: 'p.png', path: '/d/', type: 'png', code: 'b64', savedCode: 'b64' }]);
        await download('https://h/p.png');
        const sDialog = await screen.findByTestId('file-overwrite-dialog');
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('confirm'));
        });
        await waitFor(() => expect(sBoards.find((aT) => aT.id === 'img')).toBeUndefined());
        (request as unknown as jest.Mock).mockImplementation(okRequest);
    });

    it('a failed lookup downloads nothing and shows the reason', async () => {
        (request as unknown as jest.Mock).mockImplementation((aReq: any) =>
            Promise.resolve(aReq.method === 'GET' ? { status: 500, headers: {}, data: { success: false, reason: 'lookup failed' } } : { success: true })
        );
        renderModal();
        await download('https://h/x/data.csv');
        expect(screen.getByTestId('url-download-error')).toHaveTextContent('lookup failed');
        expect(sFetch).not.toHaveBeenCalled();
        expect(sPostSpy).not.toHaveBeenCalled();
        (request as unknown as jest.Mock).mockImplementation(okRequest);
    });

    // r17: the allowed extensions are the ones the server stores as files (SERVER_FILE_EXTENSIONS, measured), not FileType
    describe('server file extensions (r17)', () => {
        const realisticFetch = () =>
            jest.fn(() =>
                Promise.resolve({
                    status: 200,
                    text: () => Promise.resolve('print(1)'),
                    // a non-JSON body: Response.json() rejects, as in the browser
                    json: () => Promise.reject(new SyntaxError('Unexpected token p in JSON')),
                    arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
                })
            );

        it.each([
            ['https://h/DATA.CSV', 'DATA.CSV', 'string'],
            ['https://h/x.py', 'x.py', 'string'],
            ['https://h/x.sh', 'x.sh', 'string'],
            ['https://h/x.htm', 'x.htm', 'string'],
            ['https://h/x.mjs', 'x.mjs', 'string'],
            ['https://h/img.PNG', 'img.PNG', 'binary'],
            // r18: the rest of the 29 server-file extensions
            ['https://h/r.markdown', 'r.markdown', 'string'],
            ['https://h/i.svg', 'i.svg', 'string'],
            ['https://h/a.apng', 'a.apng', 'binary'],
            ['https://h/x.avif', 'x.avif', 'binary'],
            ['https://h/scan.TIFF', 'scan.TIFF', 'binary'],
        ])('%s is downloaded and POSTed as %s', async (aUrl, aName, aKind) => {
            sFetch = realisticFetch();
            (global as any).fetch = sFetch;
            renderModal();
            await download(aUrl);
            await waitFor(() => expect(sPostSpy).toHaveBeenCalledTimes(1));
            expect(sPostSpy.mock.calls[0][2]).toBe(aName);
            const sPayload = sPostSpy.mock.calls[0][0];
            if (aKind === 'binary') expect(sPayload).toBeInstanceOf(ArrayBuffer);
            else expect(sPayload).toBe('print(1)');
            expect(screen.queryByTestId('url-download-error')).toBeNull();
        });

        it('img.PNG: the POST answers with an ArrayBuffer (interceptor responseType) → still success: callback + close', async () => {
            sFetch = realisticFetch();
            (global as any).fetch = sFetch;
            (request as unknown as jest.Mock).mockImplementation((aReq: any) => (aReq.method === 'POST' ? Promise.resolve(new ArrayBuffer(16)) : okRequest(aReq)));
            const { pCallback, setIsOpen } = renderModal();
            await download('https://h/img.PNG');
            await waitFor(() => expect(pCallback).toHaveBeenCalledTimes(1));
            expect(setIsOpen).toHaveBeenCalledWith(false);
            (request as unknown as jest.Mock).mockImplementation(okRequest);
        });

        it('a non-200 download shows an error and POSTs nothing (r18: it used to end silently)', async () => {
            sFetch = jest.fn(() => Promise.resolve({ status: 404, text: jest.fn(), json: jest.fn(), arrayBuffer: jest.fn() }));
            (global as any).fetch = sFetch;
            const { pCallback } = renderModal();
            await download('https://h/data.csv');
            expect(await screen.findByTestId('url-download-error')).toHaveTextContent('HTTP 404');
            expect(sPostSpy).not.toHaveBeenCalled();
            expect(pCallback).not.toHaveBeenCalled();
        });

        it('a failed POST shows the server reason', async () => {
            (request as unknown as jest.Mock).mockImplementation((aReq: any) =>
                aReq.method === 'POST' ? Promise.resolve({ status: 500, headers: {}, data: { success: false, reason: 'disk full' } }) : okRequest(aReq)
            );
            const { pCallback } = renderModal();
            await download('https://h/data.csv');
            expect(await screen.findByTestId('url-download-error')).toHaveTextContent('disk full');
            expect(pCallback).not.toHaveBeenCalled();
            (request as unknown as jest.Mock).mockImplementation(okRequest);
        });

        it('x.ipynb (a JSON document) is downloaded', async () => {
            sFetch = jest.fn(() => Promise.resolve({ status: 200, text: () => Promise.resolve('{}'), json: () => Promise.resolve({ cells: [] }), arrayBuffer: jest.fn() }));
            (global as any).fetch = sFetch;
            renderModal();
            await download('https://h/x.ipynb');
            await waitFor(() => expect(sPostSpy).toHaveBeenCalledTimes(1));
            expect(sPostSpy.mock.calls[0][2]).toBe('x.ipynb');
            expect(sPostSpy.mock.calls[0][0]).toEqual({ cells: [] });
        });

        it.each(['https://h/x.pdf', 'https://h/x.yaml', 'https://h/x.zip', 'https://h/.env.csv'])('%s → error before fetch, no POST', async (aUrl) => {
            renderModal();
            await download(aUrl);
            expect(screen.getByTestId('url-download-error')).toHaveTextContent('Invalid file name');
            expect(sFetch).not.toHaveBeenCalled();
            expect(sPostSpy).not.toHaveBeenCalled();
        });

        it('a body that fails to parse shows an error instead of an unhandled rejection; OK is usable again', async () => {
            sFetch = realisticFetch();
            (global as any).fetch = sFetch;
            renderModal();
            await download('https://h/broken.json');
            expect(await screen.findByTestId('url-download-error')).toHaveTextContent("Failed to download 'broken.json'");
            expect(sPostSpy).not.toHaveBeenCalled();
        });
    });

    it('query and fragment do not enter the name', async () => {
        renderModal();
        await download('https://h/x/data.csv?token=1#y');

        expect(sPostSpy).toHaveBeenCalledTimes(1);
        expect(sPostSpy.mock.calls[0][2]).toBe('data.csv');
    });
});
