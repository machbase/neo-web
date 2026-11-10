import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { READ_PANEL_EXTENSIONS } from '@/components/dashboard/extensions/registryScript';
import { PANEL_PACKAGE_SCRIPT } from './panelPackageScript';

describe('dashboard panel deployment', () => {
    let work: string;
    beforeEach(() => {
        work = fs.mkdtempSync(path.join(os.tmpdir(), 'neo-panel-package-'));
        fs.mkdirSync(work + '/public');
    });
    afterEach(() => fs.rmSync(work, { force: true, recursive: true }));

    function run(script: string, params: Record<string, string> = {}, onRead?: (file: string) => void) {
        const rows: string[] = [];
        // Neo's "buffer" encoding is Node's raw Buffer read. Keep the same files
        // and actual exclusive-create and rename behavior for the rest of the script.
        const runtimeFs = {
            ...fs,
            readFileSync(file: string, encoding: 'buffer' | 'utf8') {
                const result = encoding === 'buffer' ? fs.readFileSync(file) : fs.readFileSync(file, encoding);
                onRead?.(file);
                return result;
            },
            writeFileSync(file: string, value: string | Buffer, encoding: 'buffer' | 'utf8') {
                fs.writeFileSync(file, value, encoding === 'buffer' ? undefined : encoding);
            },
        };
        new Function('require', '$', script.replaceAll('/work/', work + '/'))(
            () => runtimeFs,
            { params, yield: (line: string) => rows.push(line) }
        );
        expect(rows).toHaveLength(1);
        if (rows[0].startsWith('__PKG_SCRIPT_ERROR__')) throw new Error(rows[0]);
        return JSON.parse(rows[0]);
    }

    function stage(job: string, panels: { typeId: string; label: string; module: string }[] | null, appName = 'sample') {
        const body = work + '/.extension/dashboard-panels/.staging/' + job + '/body';
        fs.mkdirSync(body, { recursive: true });
        fs.writeFileSync(body + '/package.json', JSON.stringify({ name: appName, version: job }));
        fs.writeFileSync(body + '/icon.png', Buffer.from([0x89, 0x50, 0xff, 0x00]));
        if (panels) {
            const ext = body + '/.extension/dashboard-panels';
            fs.mkdirSync(ext, { recursive: true });
            fs.writeFileSync(ext + '/manifest.json', JSON.stringify({ packageId: 'example/sample', contractVersion: 1, panels }));
            fs.writeFileSync(ext + '/note.js', 'export function activate() {}');
            fs.writeFileSync(ext + '/other.mjs', 'export function activate() { /* 메모 */ }');
            fs.mkdirSync(ext + '/folder.js');
        }
    }

    const panel = (typeId: string, module = './note.js') => ({ typeId, label: typeId, module });
    const deployment = (action: string, job: string, mode = 'update') => run(PANEL_PACKAGE_SCRIPT, { action, name: 'sample', job, mode, source: 'local' });

    function bodyInstalled(job: string, mode = 'update') {
        // Stand in for the existing package installer, outside the extension script.
        const source = work + '/.extension/dashboard-panels/.staging/' + job + '/body';
        fs.cpSync(source, work + '/public/sample', { recursive: true });
        deployment('body-ready', job, mode);
    }

    test('retries the same staged files, drops removed types and preserves bytes and user files', () => {
        stage('first', [panel('note'), panel('also-note'), panel('other', './other.mjs')]);
        deployment('prepare', 'first', 'install');
        deployment('copy', 'first', 'install');
        bodyInstalled('first', 'install');
        deployment('finish', 'first', 'install');
        expect(run(READ_PANEL_EXTENSIONS).map((entry: any) => entry.moduleId)).toEqual([0, 0, 2]);
        expect(run(READ_PANEL_EXTENSIONS, { packageId: 'example/sample', typeId: 'other', revision: 'first' })).toEqual([
            'export function activate() { /* 메모 */ }',
        ]);
        expect(fs.existsSync(work + '/public/sample/.extension/dashboard-panels')).toBe(false);
        fs.writeFileSync(work + '/public/sample/user.json', '{"mine":true}');

        stage('second', [panel('note')]);
        deployment('prepare', 'second');
        deployment('copy', 'second');
        expect(run(READ_PANEL_EXTENSIONS)).toEqual([]);
        expect(deployment('pending', 'second').job).toBe('second');
        expect(() => deployment('copy', 'first')).toThrow('incomplete');
        deployment('copy', 'second');
        bodyInstalled('second');
        deployment('finish', 'second');
        expect(run(READ_PANEL_EXTENSIONS).map((entry: any) => entry.typeId)).toEqual(['note']);

        stage('third', null);
        deployment('prepare', 'third');
        deployment('copy', 'third');
        bodyInstalled('third');
        deployment('finish', 'third');
        expect(run(READ_PANEL_EXTENSIONS)).toEqual([]);
        expect(fs.readFileSync(work + '/public/sample/user.json', 'utf8')).toBe('{"mine":true}');
        expect(fs.readFileSync(work + '/public/sample/icon.png')).toEqual(Buffer.from([0x89, 0x50, 0xff, 0x00]));
    });

    test('reserves the extension package ID before a second package can begin installation', () => {
        stage('first', [panel('note')]);
        deployment('prepare', 'first', 'install');
        stage('second', [panel('note')], 'other');
        expect(() => run(PANEL_PACKAGE_SCRIPT, { action: 'prepare', name: 'other', job: 'second', mode: 'install', source: 'local' })).toThrow(/already installed or reserved/);
        expect(fs.existsSync(work + '/public/other')).toBe(false);
    });

    test('never reads the new JS for an old revision when deployment finishes during a read', () => {
        stage('first', [panel('note')]);
        deployment('prepare', 'first', 'install');
        deployment('copy', 'first', 'install');
        bodyInstalled('first', 'install');
        deployment('finish', 'first', 'install');
        stage('second', [panel('note')]);
        fs.writeFileSync(work + '/.extension/dashboard-panels/.staging/second/body/.extension/dashboard-panels/note.js', 'export const revision = "new";');
        let replaced = false;
        const result = run(READ_PANEL_EXTENSIONS, { packageId: 'example/sample', typeId: 'note', revision: 'first' }, (file) => {
            if (!replaced && file.endsWith('/sample/registry.json')) {
                replaced = true;
                deployment('prepare', 'second');
                deployment('copy', 'second');
                bodyInstalled('second');
                deployment('finish', 'second');
            }
        });
        expect(replaced).toBe(true);
        expect(result).toEqual([]);
        expect(run(READ_PANEL_EXTENSIONS, { packageId: 'example/sample', typeId: 'note', revision: 'second' })).toEqual(['export const revision = "new";']);
    });

    test('extension processing never replaces an existing command with a staged body file', () => {
        stage('first', [panel('note')]);
        deployment('prepare', 'first', 'install');
        deployment('copy', 'first', 'install');
        bodyInstalled('first', 'install');
        deployment('finish', 'first', 'install');
        const userBin = work + '/public/sample/node_modules/.bin';
        fs.mkdirSync(userBin, { recursive: true });
        const userFile = userBin + '/local.js';
        const original = Buffer.from('user command\r\n');
        fs.writeFileSync(userFile, original);

        stage('second', [panel('note')]);
        const stagedBin = work + '/.extension/dashboard-panels/.staging/second/body/node_modules/.bin';
        fs.mkdirSync(stagedBin, { recursive: true });
        fs.writeFileSync(stagedBin + '/local.js', '// newly generated wrapper');
        deployment('prepare', 'second');
        deployment('copy', 'second');
        expect(fs.readFileSync(userFile)).toEqual(original);
        // Emulate the original installer preserving an unrelated command in the live folder.
        fs.unlinkSync(stagedBin + '/local.js');
        bodyInstalled('second');
        deployment('finish', 'second');
        expect(fs.readFileSync(userFile)).toEqual(original);
    });

    test('recovers an empty lock left by a process interruption', () => {
        stage('first', [panel('note')]);
        deployment('prepare', 'first', 'install');
        const locks = work + '/.extension/dashboard-panels/.locks';
        fs.mkdirSync(locks, { recursive: true });
        for (const lock of [locks + '/sample', locks + '/registry']) {
            fs.writeFileSync(lock, '');
            fs.utimesSync(lock, 0, 0);
        }
        expect(() => deployment('copy', 'first', 'install')).not.toThrow();
        expect(deployment('pending', 'first').job).toBe('first');
        expect(fs.existsSync(locks + '/registry')).toBe(false);
    });

    test.each(['./folder.js', './missing.mjs', './note.JS'])('rejects %s before touching the installed package', (module) => {
        stage('current', [panel('note')]);
        deployment('prepare', 'current');
        deployment('copy', 'current');
        bodyInstalled('current');
        deployment('finish', 'current');
        const before = fs.readFileSync(work + '/public/sample/package.json');
        stage('bad', [panel('note', module)]);
        expect(() => deployment('prepare', 'bad')).toThrow();
        expect(run(READ_PANEL_EXTENSIONS)[0].revision).toBe('current');
        expect(deployment('pending', 'bad')).toBeNull();
        expect(fs.readFileSync(work + '/public/sample/package.json')).toEqual(before);
    });
});
