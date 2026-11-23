import { AxiosError } from 'axios';
import request from '@/api/core';
import { postFileList } from '@/api/repository/api';
import { deleteFile, getFiles, moveFile } from '@/api/repository/fileTree';
import { FileCopy } from '@/utils/UpdateTree';

it('saving a board opened by its exact encoded filename leaves its neighbor untouched', async () => {
    const repository = new Map([
        ['/folder/plan%23.dsh', 'before exact dashboard'],
        ['/folder/plan#.dsh', 'before unrelated dashboard'],
    ]);
    const savedAdapter = request.defaults.adapter;
    const calls: Array<[string | undefined, string]> = [];
    request.defaults.adapter = async (config) => {
        const url = new URL(request.getUri(config), 'http://fixture.invalid');
        const repoPath = decodeURIComponent(url.pathname.slice('/web/api/files'.length));
        calls.push([config.method, repoPath]);
        if (config.method === 'post') repository.set(repoPath, config.data);
        return { config, data: config.method === 'get' ? repository.get(repoPath) : { success: true }, status: 200, headers: {}, statusText: 'OK' };
    };
    try {
        expect(await getFiles('/folder/plan%23.dsh', {rawText: true})).toBe('before exact dashboard');
        await postFileList('changed dashboard', '/folder/', 'plan%23.dsh');
        expect(calls).toEqual([['get', '/folder/plan%23.dsh'], ['post', '/folder/plan%23.dsh']]);
        expect(repository.get('/folder/plan#.dsh')).toBe('before unrelated dashboard');
    } finally {
        request.defaults.adapter = savedAdapter;
    }
});

it.each([
    ['/Camera%23.dsh', '/Camera#.dsh'],
    ['/west\\cam.dsh', '/west/cam.dsh'],
])('moves and deletes the exact file %s', async (source, neighbor) => {
    const destination = '/moved' + source;
    const repository = new Map([[source, 'selected bytes'], [neighbor, 'neighbor bytes']]);
    const savedAdapter = request.defaults.adapter;
    request.defaults.adapter = async config => {
        const url = new URL(request.getUri(config), 'http://fixture.invalid');
        const file = decodeURIComponent(url.pathname.slice('/web/api/files'.length));
        if (config.method === 'put') {
            const contents = repository.get(file);
            repository.delete(file);
            if (contents) repository.set(JSON.parse(config.data).destination, contents);
        } else if (config.method === 'delete') {
            repository.delete(file);
        }
        return { config, data: { success: true }, status: 200, headers: {}, statusText: 'OK' };
    };
    try {
        await moveFile(source, destination);
        expect([...repository]).toEqual([[neighbor, 'neighbor bytes'], [destination, 'selected bytes']]);
        const split = destination.lastIndexOf('/');
        await deleteFile(destination.slice(0, split), destination.slice(split + 1));
        expect([...repository]).toEqual([[neighbor, 'neighbor bytes']]);
    } finally {
        request.defaults.adapter = savedAdapter;
    }
});

it('separates the recursive option from a literal question mark in the folder name', async () => {
    const savedAdapter = request.defaults.adapter;
    const paths: Array<[string, string]> = [];
    request.defaults.adapter = async config => {
        const url = new URL(request.getUri(config), 'http://fixture.invalid');
        paths.push([decodeURIComponent(url.pathname), url.search]);
        return { config, data: { success: true }, status: 200, headers: {}, statusText: 'OK' };
    };
    try {
        await deleteFile('/', 'archive', true);
        await deleteFile('/', 'archive?recursive=true', true);
        expect(paths).toEqual([
            ['/web/api/files/archive', '?recursive=true'],
            ['/web/api/files/archive?recursive=true', '?recursive=true'],
        ]);
    } finally {
        request.defaults.adapter = savedAdapter;
    }
});

it.each([
    { source: 'clip.dsh', contents: 'source contents', existing: ['clip (2).dsh'], occupied: undefined, expected: 'clip (1).dsh' },
    { source: 'clip.dsh', contents: 'source contents', existing: ['clip (1).dsh', 'CLIP (2).DSH'], occupied: undefined, expected: 'clip (3).dsh' },
    { source: 'empty.txt', contents: '', existing: [], occupied: undefined, expected: 'empty (1).txt' },
    { source: 'status.json', contents: '{"success":false,"status":503}', existing: [], occupied: undefined, expected: 'status (1).json' },
    { source: 'clip.dsh', contents: 'source contents', existing: [], occupied: 'clip (1).dsh', expected: 'clip (2).dsh' },
])('copies $source to $expected without replacing another entry', async ({ source, contents, existing, occupied, expected }) => {
    const folder = '/Keep #1/';
    const files = new Map([[source, contents], ...existing.map(name => [name, 'neighbor contents'] as const)]);
    const entries = [...files.keys()].map(name => ({ name, isDir: name === 'clip (1).dsh' }));
    const savedAdapter = request.defaults.adapter;
    request.defaults.adapter = async config => {
        const url = new URL(request.getUri(config), 'http://fixture.invalid');
        const name = decodeURIComponent(url.pathname).split('/').pop() ?? '';
        const reply = (data: any, status = 200) => ({ config, data, status, headers: {}, statusText: 'OK' });
        if (config.method === 'get') return reply({ success: true, data: { isDir: true, children: entries } });
        expect(config.method).toBe('put');
        const { copyTo } = JSON.parse(config.data);
        const candidate = copyTo.slice(folder.length);
        if (candidate === occupied) {
            files.set(candidate, 'simultaneous save');
            throw new AxiosError('destination occupied', undefined, config, undefined, reply({ success: false }, 409));
        }
        files.set(candidate, files.get(name)!);
        return reply({ success: true });
    };
    try {
        const file = { name: source, id: source, path: folder, depth: 2, content: '', parentId: 'Keep #1', type: 0 };
        await expect(FileCopy(file)).resolves.toMatchObject({ name: expected });
        expect(files.get(expected)).toBe(contents);
        expect(existing.map(name => files.get(name))).toEqual(existing.map(() => 'neighbor contents'));
        if (occupied) expect(files.get(occupied)).toBe('simultaneous save');
    } finally {
        request.defaults.adapter = savedAdapter;
    }
});
