import {AxiosError} from 'axios';
import request from './index';
import {getFiles, moveFile} from '@/api/repository/fileTree';
import {isFileStateUnconfirmed, readFileConsistently} from '@/api/repository/fileWriteQueue';
import {getFileRequestFailure} from '@/utils/fileRequestResult';

jest.mock('@/design-system/components', () => ({Toast: {error: jest.fn(), success: jest.fn()}}));

test('a binary folder rename rejection keeps the source readable and never publishes a successful move', async () => {
    const originalAdapter = request.defaults.adapter;
    const onMoved = jest.fn();
    const files = new Map([
        ['/src.png/a.wrk', JSON.stringify({sheet: [{id: 'cell', contents: 'KEEP WRK'}]})],
        ['/src.png/a.dsh', JSON.stringify({dashboard: {title: 'KEEP DSH'}})],
        ['/target.png/sentinel.txt', 'KEEP TARGET'],
    ]);
    const before = new Map(files);
    const puts: string[] = [];
    request.defaults.adapter = async config => {
        const response = (data: unknown) => ({data, config, status: 200, statusText: 'OK', headers: {}});
        const path = config.url!.replace('/api/files', '');
        if (config.method === 'put') {
            puts.push(path);
            // The real interceptor selects binary responses even for a folder named *.png.
            expect(config.responseType).toBe('arraybuffer');
            const {destination} = JSON.parse(config.data);
            if (destination === '/target.png') {
                // Neo os.Rename rejects an existing nonempty target without moving any files.
                const data = new TextEncoder().encode(JSON.stringify({success: false, reason: 'destination already exists'})).buffer;
                throw new AxiosError('Request failed with status code 500', AxiosError.ERR_BAD_RESPONSE, config, undefined,
                    {...response(data), status: 500, statusText: 'Internal Server Error'});
            }
            for (const [name, bytes] of [...files]) if (name.startsWith(path + '/')) {
                files.set(destination + name.slice(path.length), bytes);
                files.delete(name);
            }
            return response({success: true});
        }
        expect(config.method).toBe('get');
        expect(files.has(path)).toBe(true);
        return response(files.get(path));
    };
    try {
        const rejected = await moveFile('/src.png', '/target.png', {onMoved});
        expect(getFileRequestFailure(rejected)).toEqual({reason: 'destination already exists', transport: false});
        expect(onMoved).not.toHaveBeenCalled();
        expect(isFileStateUnconfirmed('/src.png/a.wrk')).toBe(false);
        expect(isFileStateUnconfirmed('/target.png/a.dsh')).toBe(false);
        for (const [name, bytes] of before) {
            expect(await readFileConsistently(name, () => getFiles(name, {rawText: true}))).toBe(bytes);
        }
        expect(files).toEqual(before);

        // A definite failure must release the operation; a later valid move still succeeds.
        expect(await moveFile('/src.png', '/renamed.png', {onMoved})).toMatchObject({success: true});
        expect(onMoved).toHaveBeenCalledTimes(1);
        expect(puts).toEqual(['/src.png', '/src.png']);
        expect(files).toEqual(new Map([...before].map(([name, bytes]) => [name.replace(/^\/src\.png\//, '/renamed.png/'), bytes])));
    } finally {
        request.defaults.adapter = originalAdapter;
    }
});
