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
     * request this page made before per-database backup existed. It is a `type: 'database'`
     * answer only — one instance-wide image. A table backup cannot mean it, and
     * `buildBackupRequest` refuses the pair rather than letting the server resolve the table in
     * whichever database it happens to default to.
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
 * Why "all databases" and a table backup cannot be combined.
 *
 * Exported because the page shows the same sentence next to the table picker before the button is
 * ever pressed — the form should say what it needs, not wait to be asked.
 */
export const TABLE_BACKUP_NEEDS_ONE_DATABASE = 'Select one target database — a table backup cannot span all databases.';

/**
 * What goes on the wire.
 *
 * `database` is optional and absent-by-omission rather than sent empty. Omitting it is the one
 * form that is unambiguous: for a database backup it means the whole instance, and a table backup
 * never gets here without a name, because omission there silently means the default database.
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

    // Both backup types name the database the same way, and the field takes a *name*. Measured
    // on v8.7.0-rc2-snapshot through `POST /web/api/backup/archive`: `{type:'table',
    // database:'FACTORY_A', tableName:'STATZ'}` backed up FACTORY_A's STATZ (verified by reading
    // the archive's `backup.trc` table ids back through `M$SYS_TABLES`: DATABASE_ID 2), and
    // `tableName:'KEV.K_TABLE'` reached that database's user-owned table too. The catalogue's
    // numeric `id` is not a substitute — `database:'2'` answers *MACHCLI-ERR-2839, Database (2)
    // does not exist*.
    //
    // An earlier comment here recorded a 400 *database is only supported for database backup* on
    // a table backup. That endpoint has since caught up; the request below is the one that works.
    if (aCode.database === null) {
        if (aOptions?.requireDatabase) return { error: 'Select a target database.' };
        return { request: sRequest };
    }
    if (aCode.database === ENTIRE_INSTANCE) {
        // Omitting the field is what "all databases" has always meant, and for a database backup
        // it still does: one image of the whole instance. For a table backup it means nothing of
        // the kind. The backup daemon resolves a bare table name in its own connection's default
        // database, so "all databases" quietly became MACHBASEDB — measured, `{type:'table',
        // tableName:'STATZ'}` with no `database` answers *MACHCLI-ERR-2025, Table STATZ does not
        // exist* although STATZ exists in FACTORY_A, and where the name exists in both the wrong
        // copy is backed up with no error at all.
        //
        // There is no request that means "this table, in every database": one archive holds one
        // database's tables. So the choice has to be made, and it is made here rather than by
        // fanning out silently.
        //
        // Only where a choice was actually offered. A pre-v8.7 server has one database and no
        // catalogue to pick from, and there the omitted field is both the legacy request and the
        // correct one.
        if (aCode.type === 'table' && aOptions?.requireDatabase) return { error: TABLE_BACKUP_NEEDS_ONE_DATABASE };
        return { request: sRequest };
    }
    // Every name here comes from the server's own catalogue, so this rejects nothing in practice;
    // it exists so a value restored from a stale board cannot reach the backup statement.
    if (!isDatabaseNameSafe(aCode.database)) return { error: 'Invalid database name.' };
    return { request: { ...sRequest, database: aCode.database } };
};
