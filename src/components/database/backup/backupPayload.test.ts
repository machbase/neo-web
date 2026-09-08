import moment from 'moment';
import { buildBackupRequest, createBackupCode, ENTIRE_INSTANCE, normalizeBackupStatus, type BackupCode } from './backupPayload';

/** A ready-to-send form value, so each test can vary the one field it is about. */
const code = (aOverrides: Partial<BackupCode> = {}): BackupCode => ({ ...createBackupCode(), path: 'bk1', ...aOverrides });

/** Exactly what this page posted for a full database backup before per-database backup existed. */
const LEGACY_FULL_BODY = {
    type: 'database',
    tableName: '',
    duration: { type: 'full', after: '', from: '', to: '' },
    path: 'bk1',
};

const built = (aResult: ReturnType<typeof buildBackupRequest>) => ('request' in aResult ? aResult.request : undefined);
const failed = (aResult: ReturnType<typeof buildBackupRequest>) => ('error' in aResult ? aResult.error : undefined);

describe('createBackupCode', () => {
    it('starts with no database chosen, which is not the same as choosing all of them', () => {
        expect(createBackupCode().database).toBeNull();
    });
});

describe('normalizeBackupStatus', () => {
    it('answers a fresh form for every shape that means "nothing is running"', () => {
        const sFresh = createBackupCode();
        expect(normalizeBackupStatus(undefined)).toEqual(sFresh);
        expect(normalizeBackupStatus(null)).toEqual(sFresh);
        expect(normalizeBackupStatus({})).toEqual(sFresh);
        expect(normalizeBackupStatus({ path: 'bk1' })).toEqual(sFresh);
    });

    it('reads a running backup that named no database as "all databases", never as unchosen', () => {
        expect(normalizeBackupStatus({ type: 'database', path: 'bk1' }).database).toBe(ENTIRE_INSTANCE);
    });

    it('carries the database the server reports', () => {
        expect(normalizeBackupStatus({ type: 'database', database: 'FACTORY_A', path: 'bk1' }).database).toBe('FACTORY_A');
    });

    it('fills the fields the page renders, so a partial response cannot throw at render time', () => {
        const sCode = normalizeBackupStatus({ type: 'database', path: 'bk1' });
        expect(sCode.duration).toEqual({ type: 'full', after: '', from: '', to: '' });
        expect(sCode.tableName).toBe('');
    });

    it('keeps fields it does not know about — the status payload is the server\'s', () => {
        expect(normalizeBackupStatus({ type: 'database', path: 'bk1', elapsed: '3s' } as any)).toMatchObject({ elapsed: '3s' });
    });
});

describe('buildBackupRequest — the legacy request is unchanged', () => {
    it('sends no database field when all databases are chosen', () => {
        const sRequest = built(buildBackupRequest(code({ database: ENTIRE_INSTANCE }), { requireDatabase: true }));
        expect(sRequest).toEqual(LEGACY_FULL_BODY);
        expect(sRequest).not.toHaveProperty('database');
    });

    it('sends the same body on a server with no catalogue to choose from', () => {
        expect(built(buildBackupRequest(code(), { requireDatabase: false }))).toEqual(LEGACY_FULL_BODY);
    });
});

describe('buildBackupRequest — per-database backup', () => {
    it('names the database when one is chosen', () => {
        expect(built(buildBackupRequest(code({ database: 'FACTORY_A' }), { requireDatabase: true }))).toEqual({ ...LEGACY_FULL_BODY, database: 'FACTORY_A' });
    });

    it('refuses to guess when the choice was offered and not made', () => {
        expect(failed(buildBackupRequest(code(), { requireDatabase: true }))).toBe('Select a target database.');
    });

    it('drops a name that is not a plain identifier', () => {
        expect(failed(buildBackupRequest(code({ database: 'FACTORY A; DROP' }), { requireDatabase: true }))).toBe('Invalid database name.');
    });

    it('applies to incremental and time backups too', () => {
        const sIncremental = built(buildBackupRequest(code({ database: 'FACTORY_A', duration: { type: 'incremental', after: 'bk0', from: '', to: '' } }), { requireDatabase: true }));
        expect(sIncremental).toMatchObject({ database: 'FACTORY_A', duration: { type: 'incremental', after: 'bk0' } });
    });
});

describe('buildBackupRequest — table backup', () => {
    const OPTIONS = { requireDatabase: true };

    it('names the database, the same way a database backup does', () => {
        // The server refuses this today — 400, "database is only supported for database backup" —
        // and that answer is the point: it is the server's to give, and the day it stops giving it
        // this call starts working with no change here.
        expect(built(buildBackupRequest(code({ type: 'table', tableName: 'EXAMPLE', database: 'FACTORY_A' }), OPTIONS))).toEqual({
            ...LEGACY_FULL_BODY,
            type: 'table',
            tableName: 'EXAMPLE',
            database: 'FACTORY_A',
        });
    });

    it('sends no database for "all databases", which is the request it always sent', () => {
        const sRequest = built(buildBackupRequest(code({ type: 'table', tableName: 'EXAMPLE', database: ENTIRE_INSTANCE }), OPTIONS));
        expect(sRequest).not.toHaveProperty('database');
        expect(sRequest).toEqual({ ...LEGACY_FULL_BODY, type: 'table', tableName: 'EXAMPLE' });
    });

    it('asks for a database first, like a database backup does', () => {
        expect(failed(buildBackupRequest(code({ type: 'table', tableName: 'EXAMPLE' }), OPTIONS))).toBe('Select a target database.');
    });

    it('asks nothing of a server that offered no choice', () => {
        expect(built(buildBackupRequest(code({ type: 'table', tableName: 'EXAMPLE' }), { requireDatabase: false }))).toBeDefined();
    });
});

describe('buildBackupRequest — the guards the page used to apply silently', () => {
    it.each([
        [code({ database: ENTIRE_INSTANCE, path: '' }), 'Enter a destination path.'],
        [code({ type: 'table', tableName: '', database: ENTIRE_INSTANCE }), 'Select a table.'],
        [code({ database: ENTIRE_INSTANCE, duration: { type: '', after: '', from: '', to: '' } }), 'Select a time duration.'],
        [code({ database: ENTIRE_INSTANCE, duration: { type: 'incremental', after: '', from: '', to: '' } }), 'Enter the previous backup directory.'],
    ])('reports why it cannot send: %#', (aCode, aError) => {
        expect(failed(buildBackupRequest(aCode as BackupCode, { requireDatabase: true }))).toBe(aError);
    });
});

describe('buildBackupRequest — time range', () => {
    it('sends the server\'s word and epoch seconds', () => {
        const sFrom = '2024-08-01 00:00:00';
        const sTo = '2024-08-02 23:59:59';
        const sRequest = built(buildBackupRequest(code({ database: ENTIRE_INSTANCE, duration: { type: 'time range', after: '', from: sFrom, to: sTo } }), { requireDatabase: true }));
        expect(sRequest?.duration).toEqual({ type: 'time', after: '', from: String(moment(sFrom).unix()), to: String(moment(sTo).unix()) });
    });

    it('leaves the form value alone', () => {
        const sCode = code({ database: ENTIRE_INSTANCE, duration: { type: 'time range', after: '', from: '2024-08-01 00:00:00', to: '' } });
        buildBackupRequest(sCode, { requireDatabase: true });
        expect(sCode.duration.type).toBe('time range');
    });
});
