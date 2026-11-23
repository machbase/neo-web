import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { READ_PANEL_EXTENSIONS } from '@/components/dashboard/extensions/registryScript';
import { PANEL_PACKAGE_SCRIPT } from './panelPackageScript';

describe('dashboard panel deployment', () => {
    type FileFaults = { beforeWrite?(file: string): void; beforeUnlink?(file: string): void };
    let work: string;
    beforeEach(() => {
        work = fs.mkdtempSync(path.join(os.tmpdir(), 'neo-panel-package-'));
        fs.mkdirSync(work + '/public');
    });
    afterEach(() => fs.rmSync(work, { force: true, recursive: true }));

    function run(script: string, params: Record<string, string> = {}, onRead?: (file: string) => void, faults?: FileFaults) {
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
                faults?.beforeWrite?.(file);
                fs.writeFileSync(file, value, encoding === 'buffer' ? undefined : encoding);
            },
            unlinkSync(file: string) {
                faults?.beforeUnlink?.(file);
                fs.unlinkSync(file);
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

    function stage(job: string, panels: { typeId: string; label: string; module: string }[] | null, appName = 'sample', contractVersion = 1) {
        const body = work + '/.extension/dashboard-panels/.staging/' + job + '/body';
        fs.mkdirSync(body, { recursive: true });
        fs.writeFileSync(body + '/package.json', JSON.stringify({ name: appName, version: job, scripts: { install: './scripts/install.js' } }));
        fs.writeFileSync(body + '/icon.png', Buffer.from([0x89, 0x50, 0xff, 0x00]));
        fs.mkdirSync(body + '/scripts');
        fs.writeFileSync(body + '/scripts/install.js', '');
        if (panels) {
            const ext = body + '/assets';
            fs.mkdirSync(ext, { recursive: true });
            fs.writeFileSync(body + '/scripts/install.js', 'require(process.argv[process.argv.length - 1]).panels.register(' + JSON.stringify({ packageId: 'example/sample', contractVersion, panels }) + ');');
            fs.writeFileSync(ext + '/note.js', 'export function activate() {}');
            fs.writeFileSync(ext + '/other.mjs', 'export function activate() { /* 메모 */ }');
            fs.mkdirSync(ext + '/folder.js');
        }
    }

    const panel = (typeId: string, module = './assets/note.js') => ({ typeId, label: typeId, module });
    const deployment = (action: string, job: string, mode = 'update', faults?: FileFaults) => run(PANEL_PACKAGE_SCRIPT, { action, name: 'sample', job, mode, source: 'local' }, undefined, faults);

    test.each([0, 2])('rejects unsupported contract %i before changing the installed API extension or user files', (unsupportedVersion) => {
        stage('api', [panel('note')], 'sample', 1);
        deployment('prepare', 'api', 'install');
        deployment('copy', 'api', 'install');
        bodyInstalled('api', 'install');
        deployment('finish', 'api', 'install');
        const userPath = work + '/public/sample/user.dsh';
        const original = '{"panels":[{"id":"keep","extension":{"settings":{"source":"a"}}}]}';
        fs.writeFileSync(userPath, original);
        const registry = run(READ_PANEL_EXTENSIONS);
        stage('unsupported', [panel('note')], 'sample', unsupportedVersion);
        deployment('prepare', 'unsupported');
        deployment('copy', 'unsupported');
        expect(() => bodyInstalled('unsupported')).toThrow('Invalid dashboard panel extension registration');
        expect(run(READ_PANEL_EXTENSIONS)).toEqual(registry);
        expect(fs.readFileSync(userPath, 'utf8')).toBe(original);
        expect(deployment('pending', 'unsupported').phase).toBe('applying');
    });

    test('updates API extensions without changing user files', () => {
        stage('api-v1', [panel('note')], 'sample', 1);
        deployment('prepare', 'api-v1', 'install');
        deployment('copy', 'api-v1', 'install');
        bodyInstalled('api-v1', 'install');
        deployment('finish', 'api-v1', 'install');
        expect(run(READ_PANEL_EXTENSIONS)).toEqual([expect.objectContaining({ contractVersion: 1, typeId: 'note' })]);
        const dashboard = '{"panels":[{"id":"preserved","type":"Unrecognized custom panel","chartOptions":{"source":{"serverId":"server-1"}}}]}';
        fs.writeFileSync(work + '/public/sample/user.dsh', dashboard);
        stage('api-update', [panel('note')]);
        deployment('prepare', 'api-update');
        deployment('copy', 'api-update');
        bodyInstalled('api-update');
        deployment('finish', 'api-update');
        expect(run(READ_PANEL_EXTENSIONS)).toEqual([expect.objectContaining({ contractVersion: 1 })]);
        expect(fs.readFileSync(work + '/public/sample/user.dsh', 'utf8')).toBe(dashboard);
    });

    test('rejects unknown contracts before touching an installed package', () => {
        fs.mkdirSync(work + '/public/sample');
        fs.writeFileSync(work + '/public/sample/user.json', '{"original":true}');
        stage('future', [panel('note')], 'sample', 3);
        deployment('prepare', 'future');
        deployment('copy', 'future');
        expect(() => bodyInstalled('future')).toThrow('Invalid dashboard panel extension registration');
        expect(fs.readFileSync(work + '/public/sample/user.json', 'utf8')).toBe('{"original":true}');
        expect(deployment('pending', 'future').phase).toBe('applying');
    });

    function executeInstall(job: string) {
        const stagePath = work + '/.extension/dashboard-panels/.staging/' + job;
        const install = stagePath + '/body/scripts/install.js';
        if (!fs.existsSync(install)) return;
        const sdkPath = stagePath + '/neo-install-api.js';
        const sdk: { panels?: { register(value: unknown): void } } = {};
        new Function('require', 'exports', fs.readFileSync(sdkPath, 'utf8'))(() => fs, sdk);
        const childProcess = {
            exec: jest.fn((...args: string[]) => {
                expect(args.slice(0, 3)).toEqual(['pkg', 'run', '-C']);
                expect(args.slice(-2)).toEqual(['install', sdkPath]);
                try {
                    new Function('require', 'process', fs.readFileSync(install, 'utf8'))((id: string) => {
                        expect(id).toBe(sdkPath);
                        return sdk;
                    }, { argv: ['jsh', install, 'existing-arg', sdkPath], exit: () => { throw new Error('exit 1'); } });
                    return 0;
                } catch (_) {
                    // Actual Neo JSH returns 1 for a child throw or process.exit(1).
                    return 1;
                }
            }),
        };
        new Function('require', fs.readFileSync(stagePath + '/run-install.js', 'utf8'))((id: string) => id === 'process' ? childProcess : fs);
        return sdk;
    }

    function bodyInstalled(job: string, mode = 'update') {
        // Stand in for the existing package installer, outside the extension script.
        const source = work + '/.extension/dashboard-panels/.staging/' + job + '/body';
        fs.cpSync(source, work + '/public/sample', { recursive: true });
        executeInstall(job);
        deployment('body-ready', job, mode);
    }

    function interruptAfterPublication(job: string) {
        const pending = work + '/.extension/dashboard-panels/sample/pending.json';
        expect(() => deployment('finish', job, 'update', {
            beforeUnlink(file) {
                if (file === pending) throw new Error('interrupted after publication');
            },
        })).toThrow('interrupted after publication');
        expect(deployment('pending', job).phase).toBe('body-ready');
    }

    test('retries only cleanup after publication without rewriting active modules or the registry', () => {
        stage('published', [panel('note'), panel('other', './assets/other.mjs')]);
        deployment('prepare', 'published', 'install');
        deployment('copy', 'published', 'install');
        bodyInstalled('published', 'install');
        const dashboard = work + '/public/sample/user.dsh';
        fs.writeFileSync(dashboard, '{"panels":[{"id":"keep","settings":{"camera":"cam-1"}}]}\r\n');
        const dashboardBytes = fs.readFileSync(dashboard);
        interruptAfterPublication('published');
        const installed = work + '/.extension/dashboard-panels/sample';
        const registryBytes = fs.readFileSync(installed + '/registry.json');
        const moduleBytes = fs.readFileSync(installed + '/modules/published/0.js');

        expect(() => deployment('finish', 'published', 'update', {
            beforeWrite(file) {
                if (file.startsWith(installed + '/modules/') || file.startsWith(installed + '/registry-')) {
                    throw new Error('published files must not be rewritten');
                }
            },
        })).not.toThrow();

        expect(fs.readFileSync(installed + '/registry.json')).toEqual(registryBytes);
        expect(fs.readFileSync(installed + '/modules/published/0.js')).toEqual(moduleBytes);
        expect(fs.readFileSync(dashboard)).toEqual(dashboardBytes);
        expect(deployment('pending', 'published')).toBeNull();
        expect(fs.existsSync(work + '/.extension/dashboard-panels/.staging/published')).toBe(false);
    });

    test('retries an interrupted copy before publication while preserving the old module and user data', () => {
        stage('old', [panel('note')]);
        deployment('prepare', 'old', 'install');
        deployment('copy', 'old', 'install');
        bodyInstalled('old', 'install');
        deployment('finish', 'old');
        const installed = work + '/.extension/dashboard-panels/sample';
        const oldRegistry = fs.readFileSync(installed + '/registry.json');
        const oldModule = fs.readFileSync(installed + '/modules/old/0.js');
        const dashboard = work + '/public/sample/user.dsh';
        fs.writeFileSync(dashboard, '{"keep":"사용자 설정"}\r\n');
        const dashboardBytes = fs.readFileSync(dashboard);
        stage('new', [panel('note')]);
        fs.writeFileSync(work + '/.extension/dashboard-panels/.staging/new/body/assets/note.js', 'export const updated = true;');
        deployment('prepare', 'new');
        deployment('copy', 'new');
        bodyInstalled('new');
        const newModule = installed + '/modules/new/0.js';
        expect(() => deployment('finish', 'new', 'update', {
            beforeWrite(file) {
                if (file === newModule) {
                    fs.writeFileSync(file, '');
                    throw new Error('interrupted copy before publication');
                }
            },
        })).toThrow('interrupted copy before publication');
        expect(fs.readFileSync(installed + '/registry.json')).toEqual(oldRegistry);
        expect(fs.readFileSync(installed + '/modules/old/0.js')).toEqual(oldModule);
        expect(fs.readFileSync(dashboard)).toEqual(dashboardBytes);
        deployment('finish', 'new');
        expect(fs.readFileSync(newModule, 'utf8')).toBe('export const updated = true;');
        expect(run(READ_PANEL_EXTENSIONS)[0].revision).toBe('new');
        expect(fs.readFileSync(installed + '/modules/old/0.js')).toEqual(oldModule);
        expect(fs.readFileSync(dashboard)).toEqual(dashboardBytes);
    });

    test('refuses changed registration data for an already published revision without touching active files', () => {
        stage('published', [panel('note')]);
        deployment('prepare', 'published', 'install');
        deployment('copy', 'published', 'install');
        bodyInstalled('published', 'install');
        interruptAfterPublication('published');
        const installed = work + '/.extension/dashboard-panels/sample';
        const registryBytes = fs.readFileSync(installed + '/registry.json');
        const moduleBytes = fs.readFileSync(installed + '/modules/published/0.js');
        const stagedRegistry = work + '/.extension/dashboard-panels/.staging/published/registry.json';
        const changed = JSON.parse(fs.readFileSync(stagedRegistry, 'utf8'));
        changed.panels[0].label = 'Changed after publication';
        fs.writeFileSync(stagedRegistry, JSON.stringify(changed));
        expect(() => deployment('finish', 'published')).toThrow('published dashboard panel registration differs');
        expect(fs.readFileSync(installed + '/registry.json')).toEqual(registryBytes);
        expect(fs.readFileSync(installed + '/modules/published/0.js')).toEqual(moduleBytes);
        expect(deployment('pending', 'published').phase).toBe('body-ready');
    });

    test('retries cleanup after an unregistered update without restoring registration or deleting user data', () => {
        stage('old', [panel('note')]);
        deployment('prepare', 'old', 'install');
        deployment('copy', 'old', 'install');
        bodyInstalled('old', 'install');
        deployment('finish', 'old');
        const dashboard = work + '/public/sample/user.dsh';
        fs.writeFileSync(dashboard, '{"keep":true}');
        stage('removed', null);
        deployment('prepare', 'removed');
        deployment('copy', 'removed');
        bodyInstalled('removed');
        interruptAfterPublication('removed');
        expect(run(READ_PANEL_EXTENSIONS)).toEqual([]);
        deployment('finish', 'removed');
        expect(run(READ_PANEL_EXTENSIONS)).toEqual([]);
        expect(deployment('pending', 'removed')).toBeNull();
        expect(fs.readFileSync(dashboard, 'utf8')).toBe('{"keep":true}');
    });

    test('retries the same staged files, drops removed types and preserves bytes and user files', () => {
        stage('first', [panel('note'), panel('also-note'), panel('other', './assets/other.mjs')]);
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
        expect(run(READ_PANEL_EXTENSIONS).map((entry: any) => entry.typeId)).toEqual(['note', 'also-note', 'other']);
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

    test('reserves an API-registered package ID before another installation commits', () => {
        stage('first', [panel('note')]);
        deployment('prepare', 'first', 'install');
        deployment('copy', 'first', 'install');
        bodyInstalled('first', 'install');
        stage('second', [panel('note')], 'other');
        run(PANEL_PACKAGE_SCRIPT, { action: 'prepare', name: 'other', job: 'second', mode: 'install', source: 'local' });
        run(PANEL_PACKAGE_SCRIPT, { action: 'copy', name: 'other', job: 'second', mode: 'install', source: 'local' });
        fs.cpSync(work + '/.extension/dashboard-panels/.staging/second/body', work + '/public/other', { recursive: true });
        executeInstall('second');
        expect(() => run(PANEL_PACKAGE_SCRIPT, { action: 'body-ready', name: 'other', job: 'second' })).toThrow(/already installed or reserved/);
        deployment('finish', 'first', 'install');
        expect(run(READ_PANEL_EXTENSIONS)).toHaveLength(1);
    });

    test('never reads the new JS for an old revision when deployment finishes during a read', () => {
        stage('first', [panel('note')]);
        deployment('prepare', 'first', 'install');
        deployment('copy', 'first', 'install');
        bodyInstalled('first', 'install');
        deployment('finish', 'first', 'install');
        stage('second', [panel('note')]);
        fs.writeFileSync(work + '/.extension/dashboard-panels/.staging/second/body/assets/note.js', 'export const revision = "new";');
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

    test('ignores a fixed-path manifest when the install API is not called', () => {
        stage('plain', null);
        const old = work + '/.extension/dashboard-panels/.staging/plain/body/.extension/dashboard-panels';
        fs.mkdirSync(old, { recursive: true });
        const declaration = JSON.stringify({ packageId: 'legacy', contractVersion: 1, panels: [panel('legacy')] });
        fs.writeFileSync(old + '/manifest.json', declaration);
        deployment('prepare', 'plain', 'install');
        deployment('copy', 'plain', 'install');
        bodyInstalled('plain', 'install');
        deployment('finish', 'plain', 'install');
        expect(run(READ_PANEL_EXTENSIONS)).toEqual([]);
        expect(fs.readFileSync(work + '/public/sample/.extension/dashboard-panels/manifest.json', 'utf8')).toBe(declaration);
    });

    test('rejects repeated registration and clears the failed request before retrying', () => {
        stage('first', [panel('note')]);
        deployment('prepare', 'first', 'install');
        deployment('copy', 'first', 'install');
        bodyInstalled('first', 'install');
        deployment('finish', 'first', 'install');
        stage('second', [panel('note')]);
        deployment('prepare', 'second');
        deployment('copy', 'second');
        fs.cpSync(work + '/.extension/dashboard-panels/.staging/second/body', work + '/public/sample', { recursive: true });
        const sdk = executeInstall('second');
        expect(() => sdk!.panels!.register({})).toThrow('only be registered once');
        expect(() => deployment('body-ready', 'second')).toThrow('registration failed');
        expect(run(READ_PANEL_EXTENSIONS)[0].revision).toBe('first');
        deployment('copy', 'second');
        bodyInstalled('second');
        deployment('finish', 'second');
        expect(run(READ_PANEL_EXTENSIONS)[0].revision).toBe('second');
    });

    test.each(['throw new Error("install failed");', 'process.exit(1);'])('rejects an install failure after registration and permits retry: %s', (failure) => {
        stage('failing', [panel('note')]);
        deployment('prepare', 'failing', 'install');
        deployment('copy', 'failing', 'install');
        fs.cpSync(work + '/.extension/dashboard-panels/.staging/failing/body', work + '/public/sample', { recursive: true });
        const install = work + '/.extension/dashboard-panels/.staging/failing/body/scripts/install.js';
        const original = fs.readFileSync(install, 'utf8');
        fs.writeFileSync(install, original + failure);
        expect(() => executeInstall('failing')).toThrow('exit code 1');
        expect(() => deployment('install-result', 'failing')).toThrow('did not complete successfully');
        expect(() => deployment('body-ready', 'failing')).toThrow('did not complete successfully');
        expect(run(READ_PANEL_EXTENSIONS)).toEqual([]);
        deployment('copy', 'failing');
        fs.writeFileSync(install, original);
        bodyInstalled('failing', 'install');
        deployment('finish', 'failing', 'install');
        expect(run(READ_PANEL_EXTENSIONS)).toHaveLength(1);
    });

    test('does not publish an install before its matching success marker exists', () => {
        stage('marker', [panel('note')]);
        deployment('prepare', 'marker', 'install');
        deployment('copy', 'marker', 'install');
        fs.cpSync(work + '/.extension/dashboard-panels/.staging/marker/body', work + '/public/sample', { recursive: true });
        expect(() => deployment('body-ready', 'marker')).toThrow('did not complete successfully');
        const success = work + '/.extension/dashboard-panels/.staging/marker/install-success.json';
        fs.writeFileSync(success, JSON.stringify({ name: 'sample', job: 'other-job' }));
        expect(() => deployment('body-ready', 'marker')).toThrow();
        expect(run(READ_PANEL_EXTENSIONS)).toEqual([]);
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

    test.each(['./assets/folder.js', './assets/missing.mjs', './assets/note.JS', '../note.js'])('rejects %s before touching the installed package', (module) => {
        stage('current', [panel('note')]);
        deployment('prepare', 'current');
        deployment('copy', 'current');
        bodyInstalled('current');
        deployment('finish', 'current');
        const before = fs.readFileSync(work + '/public/sample/package.json');
        stage('bad', [panel('note', module)]);
        deployment('prepare', 'bad');
        deployment('copy', 'bad');
        expect(() => bodyInstalled('bad')).toThrow();
        expect(run(READ_PANEL_EXTENSIONS)[0].revision).toBe('current');
        expect(deployment('pending', 'bad').phase).toBe('applying');
        expect(JSON.parse(before.toString()).version).toBe('current');
    });
    test('publishes only finished modules and removes public registration on uninstall', () => {
        const panels = [{ typeId: 'video', label: 'Video', module: './assets/note.js' }];
        stage('public-first', panels);
        deployment('prepare', 'public-first'); deployment('copy', 'public-first');
        bodyInstalled('public-first');
        expect(fs.existsSync(work + '/public/.dashboard-panels/registry.json')).toBe(false);
        fs.mkdirSync(work + '/.extension/dashboard-panels/broken');
        fs.writeFileSync(work + '/.extension/dashboard-panels/broken/registry.json', 'invalid json');
        deployment('finish', 'public-first');
        const published = JSON.parse(fs.readFileSync(work + '/public/.dashboard-panels/registry.json', 'utf8'));
        expect(published).toEqual([{ packageId: 'example/sample', typeId: 'video', label: 'Video', contractVersion: 1,
            revision: 'public-first', moduleId: 0, moduleUrl: '/public/.dashboard-panels/sample/public-first/0.js' }]);
        expect(fs.readFileSync(work + published[0].moduleUrl, 'utf8')).toBe('export function activate() {}');
        expect(JSON.stringify(published)).not.toMatch(/pending|staging|settings|work/);
        expect(fs.readdirSync(work + '/public/.dashboard-panels/sample/public-first')).toEqual(['0.js']);
        fs.rmSync(work + '/public/sample', { recursive: true });
        deployment('remove', 'public-first');
        expect(JSON.parse(fs.readFileSync(work + '/public/.dashboard-panels/registry.json', 'utf8'))).toEqual([]);
        expect(fs.existsSync(work + '/public/.dashboard-panels/sample')).toBe(false);
    });
    test('keeps a failed public publication retryable without replacing unrelated data', () => {
        stage('public-retry', [{ typeId: 'video', label: 'Video', module: './assets/note.js' }]);
        deployment('prepare', 'public-retry'); deployment('copy', 'public-retry'); bodyInstalled('public-retry');
        fs.writeFileSync(work + '/public/sample/user.json', '{"keep":7}');
        expect(() => deployment('finish', 'public-retry', 'update', {
            beforeWrite: file => { if (file.endsWith('/.dashboard-panels/registry.tmp')) throw new Error('publication denied'); }
        })).toThrow('publication denied');
        expect(deployment('pending', 'public-retry').phase).toBe('body-ready');
        deployment('finish', 'public-retry');
        expect(fs.readFileSync(work + '/public/sample/user.json', 'utf8')).toBe('{"keep":7}');
        expect(fs.existsSync(work + '/public/.dashboard-panels/registry.json')).toBe(true);
    });

    test('keeps the published revision usable when a new public module cannot finish writing', () => {
        stage('public-old', [{ typeId: 'video', label: 'Video', module: './assets/note.js' }]);
        deployment('prepare', 'public-old'); deployment('copy', 'public-old'); bodyInstalled('public-old'); deployment('finish', 'public-old');
        const publicRegistry = work + '/public/.dashboard-panels/registry.json';
        const oldRegistry = fs.readFileSync(publicRegistry, 'utf8');
        const oldModule = work + '/public/.dashboard-panels/sample/public-old/0.js';
        const oldSource = fs.readFileSync(oldModule, 'utf8');
        stage('public-new', [{ typeId: 'video', label: 'Video', module: './assets/note.js' }]);
        fs.writeFileSync(work + '/.extension/dashboard-panels/.staging/public-new/body/assets/note.js', 'export function activate() { /* next */ }');
        deployment('prepare', 'public-new'); deployment('copy', 'public-new'); bodyInstalled('public-new');
        expect(() => deployment('finish', 'public-new', 'update', { beforeWrite: file => {
            if (file.endsWith('/public-new/0.js.tmp')) throw new Error('module publication denied');
        } })).toThrow('module publication denied');
        expect(fs.readFileSync(publicRegistry, 'utf8')).toBe(oldRegistry);
        expect(fs.readFileSync(oldModule, 'utf8')).toBe(oldSource);
        deployment('finish', 'public-new');
        expect(JSON.parse(fs.readFileSync(publicRegistry, 'utf8'))[0].revision).toBe('public-new');
        expect(fs.readFileSync(work + '/public/.dashboard-panels/sample/public-new/0.js', 'utf8')).toContain('/* next */');
        expect(fs.readFileSync(oldModule, 'utf8')).toBe(oldSource);
    });

});
