import moment from 'moment';
import { isDatabaseNameSafe } from '@/utils/sqlTargetDatabase';

/**
 * The backup form's value, and the request that comes out of it.
 *
 * This module exists because the same default literal used to be written out eight times — four
 * in the backup page, two in the explorer toolbar, two in the BACKUPS section — and every one of
 * them had to grow a field the day the server learned to back up a single database. Holding the
 * shape in one place is most of the point; the other part is `buildBackupRequest`, which is the
 * only thing that decides what actually goes on the wire.
 */

export type BackupType = 'database' | 'table';

/**
 * `time range` is the form's word and `time` is the server's. The conversion happens once, in
 * `buildBackupRequest`, so nothing else has to know there are two vocabularies.
 */
export type BackupDuration = { type: string; after: string; from: string; to: string };

export type BackupCode = {
    type: BackupType;
    /**
     * Which database to back up — three states, not two.
     *
     * `null` is "not chosen yet" and is the state a fresh form starts in: on a v8.7 server the
     * choice is deliberate, because picking wrong is only discovered at restore time and the two
     * mistakes are not symmetric. Wanting FACTORY_A and getting the whole instance still leaves
     * you holding the data; wanting the whole instance and getting FACTORY_A does not.
     *
     * `''` is an explicit "all databases", which sends no `database` field and is exactly the
     * request this page made before per-database backup existed.
     *
     * A name is a named database backup. Pre-v8.7 servers have no catalogue to choose from, so
     * the form never leaves `null` there and `requireDatabase` stays off — see below.
     */
    database: string | null;
    tableName: string;
    duration: BackupDuration;
    path: string;
};

/** An explicit "back up everything", as distinct from `null`'s "not chosen yet". */
export const ENTIRE_INSTANCE = '';

/**
 * What goes on the wire.
 *
 * `database` is optional and absent-by-omission rather than sent empty. The server reads a missing
 * field and an empty string the same way for a database backup, but rejects the field outright on
 * a table backup, and omitting it is the one form that is unambiguous in both directions.
 */
export type BackupRequest = {
    type: BackupType;
    tableName: string;
    duration: BackupDuration;
    path: string;
    database?: string;
};

export const createBackupCode = (): BackupCode => ({
    type: 'database',
    database: null,
    tableName: '',
    duration: { type: 'full', after: '', from: '', to: '' },
    path: '',
});

/**
 * The `/backup/archive/status` payload as the form's value.
 *
 * A response with no `type` means no backup is running, which is the same thing as a fresh form.
 * Unknown fields are carried through — the status response is the server's, not ours — but the
 * fields the page renders are guaranteed to exist, which they were not before: a response missing
 * `duration` used to reach `sPayload.duration.type` and throw.
 *
 * A running backup is never "unchosen", so an absent `database` here is `''`, not `null`.
 */
export const normalizeBackupStatus = (aData: any): BackupCode => {
    const sDefaults = createBackupCode();
    if (!aData || typeof aData !== 'object' || !aData.type) return sDefaults;
    return {
        ...sDefaults,
        ...aData,
        duration: { ...sDefaults.duration, ...(aData.duration ?? {}) },
        database: typeof aData.database === 'string' ? aData.database : ENTIRE_INSTANCE,
    };
};

/**
 * What a caller knows about the server that the form does not.
 *
 * `requireDatabase` is on wherever the page offered a choice, which is any server that answered
 * `V$DATABASES`. Off, the form never had a catalogue and the request goes out in its pre-v8.7
 * shape rather than failing a validation the user was never shown.
 */
export type BackupBuildOptions = { requireDatabase?: boolean };

/** `YYYY-MM-DD HH:mm:ss` as the epoch seconds the server wants, or the input when it is not a time. */
const convertTimestamp = (aTime: string) => {
    const sUnixTimestamp = moment(aTime).unix();
    return isNaN(sUnixTimestamp) ? aTime : sUnixTimestamp;
};

/**
 * The request, or why the form is not ready to send one.
 *
 * The guards are the ones the page already applied — it simply returned and left the button
 * looking broken. Returning the reason instead costs nothing and means a click never does nothing.
 */
export const buildBackupRequest = (aCode: BackupCode, aOptions?: BackupBuildOptions): { request: BackupRequest } | { error: string } => {
    if (!aCode?.type) return { error: 'Select a backup type.' };
    if (!aCode.path) return { error: 'Enter a destination path.' };
    if (aCode.type === 'table' && !aCode.tableName) return { error: 'Select a table.' };
    if (!aCode.duration?.type) return { error: 'Select a time duration.' };
    if (aCode.duration.type === 'incremental' && !aCode.duration.after) return { error: 'Enter the previous backup directory.' };

    const sDuration: BackupDuration = { ...aCode.duration };
    if (sDuration.type === 'time range') {
        sDuration.from = convertTimestamp(sDuration.from) + '';
        sDuration.to = convertTimestamp(sDuration.to) + '';
        sDuration.type = 'time';
    }

    const sRequest: BackupRequest = { type: aCode.type, tableName: aCode.tableName, duration: sDuration, path: aCode.path };

    // Both backup types name the database the same way, including the one the server does not
    // accept yet. Measured on v8.7 (engine dev-4158), `{type:'table', database:'FACTORY_A'}`
    // answers 400 *database is only supported for database backup* — but the engine itself can do
    // it: `SQL(use('FACTORY_A'), \`BACKUP TABLE … INTO DISK = …\`)` through /api/tql answers *table
    // backup completed*. What the parser refuses is the qualified name
    // (`BACKUP TABLE FACTORY_A.SYS.T` → ERR-2010), not the act, so this is an endpoint that has
    // not caught up rather than a limit of the database.
    //
    // So the request goes out and the server's own answer is what the user reads. Dropping the
    // field instead would be worse than a 400: a bare table name resolves in the default database,
    // which fails confusingly when no such table is there and silently backs up the *wrong* table
    // when a name happens to exist in both. And when the endpoint does catch up, nothing here
    // changes.
    if (aCode.database === null) {
        if (aOptions?.requireDatabase) return { error: 'Select a target database.' };
        return { request: sRequest };
    }
    if (aCode.database === ENTIRE_INSTANCE) return { request: sRequest };
    // Every name here comes from the server's own catalogue, so this rejects nothing in practice;
    // it exists so a value restored from a stale board cannot reach the backup statement.
    if (!isDatabaseNameSafe(aCode.database)) return { error: 'Invalid database name.' };
    return { request: { ...sRequest, database: aCode.database } };
};
