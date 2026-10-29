import { getRequestSession, invalidateRequestSession } from '@/api/core/requestSession';
import {encodeFilePath} from '@/utils/filePath';
import { captureFileMutationPaths, forgetFileIdentities, type FileMutationScope } from '@/utils/fileIdentity';
import { getFileRequestFailure, getFileResponseBody } from '@/utils/fileRequestResult';

type Phase = 'queued' | 'sent' | 'acknowledging' | 'unknown' | 'finished' | 'cancelled';
type FileRead = {path: string; session: number; changed: boolean; cancelled: boolean};
type OwnerAction = {ownerId: string; session: number; number: number; pending: boolean};
type Operation = {
    number: number; kind: 'write' | 'mutation'; paths: string[]; session: number; phase: Phase;
    scope: FileMutationScope; observed: boolean; changed: boolean; done: Promise<void>; finish: () => void;
};

// File transmission and owner navigation have different orderings. An owner's
// newer failed action must still supersede an older Save As to another file.
const ownerActions = new Map<string, OwnerAction>();
const actions = new Set<OwnerAction>();
const operations = new Set<Operation>();
const reads = new Set<FileRead>();
const fileChanges = new Map<string, {number: number; scope: FileMutationScope}>();
const tabObservations = new Map<string, {path: string; savedCode: unknown; version: number}>();
export const getFileObservationVersion = (path: string) => Math.max(0, ...[...fileChanges.values()]
    .filter(change => change.scope(path) !== undefined).map(change => change.number));
// A snapshot observes a point in the shared operation clock. Later identity
// refinement may change which old writes match a path, but cannot change when it was read.
export const getFileObservationClock = () => nextNumber;
export const stampFileSnapshot = <T,>(board: T, path: string, observed = getFileObservationClock()): T => {
    const snapshot = board as any;
    if (snapshot.id !== undefined) tabObservations.set(snapshot.id, {path, savedCode: snapshot.savedCode, version: observed});
    return board;
};
export const isFileSnapshotCurrent = (board: any, path: string) => {
    const observed = tabObservations.get(board.id);
    return !observed || observed.path !== path || observed.savedCode !== board.savedCode || observed.version >= getFileObservationVersion(path);
};
const listeners = new Set<() => void>();
let nextNumber = 0, version = 0;
const changed = () => {version++; for (const listener of listeners) listener();};
export const subscribeFileOperations = (listener: () => void) => {listeners.add(listener); return () => {listeners.delete(listener);};};
export const getFileOperationVersion = () => version;
export const beginBoardSave = (ownerId: string) => {
    const action: OwnerAction = {ownerId, session: getRequestSession(), number: ++nextNumber, pending: true};
    actions.add(action); ownerActions.set(ownerId, action); changed();
    return {
        isLatest: () => action.session === getRequestSession() && ownerActions.get(ownerId) === action,
        isSaving: (id: string) => [...actions].some(other => other !== action && other.pending && other.session === getRequestSession() && other.ownerId === id),
        finish: () => {
            action.pending = false; actions.delete(action);
            if (![...actions].some(other => other.ownerId === ownerId)) ownerActions.delete(ownerId);
            changed();
        },
    };
};
export const hasPendingBoardSave = (ownerId: string) => [...actions].some(action =>
    action.pending && action.session === getRequestSession() && action.ownerId === ownerId);

type FileOperationFailure = {success: boolean; reason: string; fileMutationBlocked?: boolean; fileOperationCancelled?: boolean};
const cancelledResult = (): FileOperationFailure => ({success: false, reason: 'File operation cancelled because its owner or login changed.', fileOperationCancelled: true});
const blockedResult = (): FileOperationFailure => ({success: false, reason: 'The earlier file request is not confirmed. Save the draft to a different path.', fileMutationBlocked: true});
const active = (operation: Operation) => !['finished', 'cancelled'].includes(operation.phase);
const affected = (operation: Operation, path: string) => operation.scope(path) !== undefined;
const overlapping = (a: Operation, b: Operation) => a.paths.some(left => b.paths.some(right => {
    const forward = [a.scope.relation(left, right), b.scope.relation(left, right)];
    const reverse = [a.scope.relation(right, left), b.scope.relation(right, left)];
    if (forward.includes('same') || reverse.includes('same')) return true;
    // One verified separate relationship beats another scope's lack of facts.
    return !forward.includes('different') || !reverse.includes('different');
}));
const unknownAt = (path: string) => [...operations].some(operation => operation.phase === 'unknown' && affected(operation, path));

/** Sent reservations survive logout. Their responses cannot update a new UI,
 * but their server work may still be running on the same physical path. */
export const getUnknownFileIdentityPaths = (path: string): string[] => [...new Set([...operations]
    .filter(operation => active(operation) && affected(operation, path))
    .flatMap(operation => operation.paths.filter(target => operation.scope.relation(path, target) === 'unknown')))];
export const hasPendingFileWrite = (path: string): boolean => [...operations].some(operation => active(operation) && affected(operation, path));
export const isFileStateUnconfirmed = (path: string): boolean => unknownAt(path);

function createOperation(kind: Operation['kind'], paths: string[]): Operation {
    let finish!: () => void;
    const operation: Operation = {number: ++nextNumber, kind, paths, session: getRequestSession(), phase: 'queued',
        scope: captureFileMutationPaths(paths), observed: false, changed: false, done: new Promise<void>(resolve => {finish = resolve;}), finish: () => finish()};
    operations.add(operation); changed(); return operation;
}
function closeOperation(operation: Operation) {
    if (operation.phase !== 'unknown') {operation.phase = 'finished'; operations.delete(operation);}
    operation.finish(); changed();
}
function cancelQueued(operation: Operation) {
    if (operation.phase !== 'queued') return;
    operation.phase = 'cancelled'; operations.delete(operation); operation.finish(); changed();
}
function notifyReads(operation: Operation, result?: any) {
    if (operation.observed) return;
    // Neo rejects 401 in authentication, before the file handler runs. Keep a
    // fresh read's saved baseline when this old-login rejection arrives late.
    if (result?.status === 401 && !isUncertainFileResult(result)) return;
    operation.observed = true; operation.changed = true;
    const number = ++nextNumber;
    for (const path of operation.paths) fileChanges.set(encodeFilePath(path), {number, scope: operation.scope});
    for (const reader of reads) if (affected(operation, reader.path)) reader.changed = true;
}

/** A Neo completion response ends a request. A gateway/transport failure does
 * not. GET results, including 404, are never used as a request-completion proof. */
export const isUncertainFileResult = (value: any): boolean => {
    const failure = getFileRequestFailure(value);
    if (!failure) return false;
    if (failure.transport || [502,503,504].includes(value?.status)) return true;
    const body = getFileResponseBody(value);
    return body?.success !== false;
};

export type FileWriteContext = {hasPendingWrite: (path?: string) => boolean; isCurrent: () => boolean; canRetry: () => boolean; read: ConsistentFileReader};
export type FileWriteOptions = {
    onBlocked?: (reason: string) => void;
    /** Non-interactive identity lookup belongs to the reservation too. */
    prepare?: (context: FileWriteContext) => Promise<void>;
    beforeWrite?: (context: FileWriteContext) => Promise<boolean>;
    /** Reuse the final pure owner/dialog guard for a new physical HTTP retry. */
    canRetry?: (context: FileWriteContext) => boolean;
    onResult?: (result: any, context: FileWriteContext) => void | Promise<void>;
    onUncertain?: (context: FileWriteContext) => void | Promise<void>;
    onCancelled?: (path: string, isAffected?: (path: string) => boolean) => void;
    /** A terminal rejection may have partially changed the file. */
    onRejected?: (context: FileWriteContext) => void | Promise<void>;
};
export class UncertainFileWriteError extends Error {
    constructor(error: unknown) {super(error instanceof Error ? error.message : 'Could not confirm whether the file was saved.'); this.name = 'UncertainFileWriteError';}
}

export const queueFileWrite = async (path: string, write: (context: FileWriteContext) => Promise<any>, options?: FileWriteOptions): Promise<any> => {
    const operation = createOperation('write', [path]);
    // Retain encountered mutations while identity lookups wait. They may finish
    // before this write is ready; that must not replay an old-path write later.
    const preceding = [...operations].filter(other => other !== operation);
    const context: FileWriteContext = {
        read: (path, read) => readFileConsistently(path, read, operation),
        isCurrent: () => operation.session === getRequestSession() && operation.phase !== 'cancelled',
        canRetry: () => context.isCurrent() && (options?.canRetry?.(context) ?? true),
        hasPendingWrite: target => [...operations].some(other => other.number > operation.number && other.kind === 'write' &&
            active(other) && affected(other, target ?? path)),
    };
    const block = () => {
        const result = blockedResult();
        if (context.isCurrent()) options?.onBlocked?.(result.reason);
        return result;
    };
    try {
        if (options?.prepare) await options.prepare(context);
        if (!context.isCurrent()) return cancelledResult();
        const previous = preceding.filter(other => (active(other) || other.kind === 'mutation') && overlapping(operation, other));
        // Structural changes and unknown requests reject new writes. Do not
        // retain them for a surprising automatic replay after a later lookup.
        if (previous.some(other => other.kind === 'mutation' || other.phase === 'unknown' || other.session !== operation.session)) return block();
        if (previous.length) await Promise.all(previous.map(other => other.done));
        if (!context.isCurrent()) return cancelledResult();
        if (unknownAt(path)) return block();
        if (options?.beforeWrite && !await options.beforeWrite(context)) return cancelledResult();
        if (!context.isCurrent()) return cancelledResult();
        if ([...operations].some(other => other !== operation && other.number < operation.number && other.kind === 'mutation' && active(other) && affected(other, path))) return block();
        operation.scope.capture();
        operation.phase = 'sent'; changed();
        let value: any;
        try {value = await write(context);}
        catch (error) {
            operation.phase = 'unknown'; notifyReads(operation); changed();
            if (context.isCurrent()) await options?.onUncertain?.(context);
            if (options?.onUncertain && context.isCurrent()) throw new UncertainFileWriteError(error);
            if (!context.isCurrent()) return cancelledResult();
            throw error;
        }
        notifyReads(operation, value);
        if (isUncertainFileResult(value)) {
            operation.phase = 'unknown'; changed();
            if (context.isCurrent()) await options?.onUncertain?.(context);
            if (options?.onUncertain && context.isCurrent()) throw new UncertainFileWriteError(value);
        } else {
            operation.phase = 'acknowledging'; changed();
            if (context.isCurrent()) {
                if (getFileRequestFailure(value)) await options?.onRejected?.(context);
                await options?.onResult?.(value, context);
            }
        }
        return context.isCurrent() ? value : cancelledResult();
    } finally {closeOperation(operation);}
};

export type ConsistentFileReader = <T>(path: string, read: () => Promise<T>) => Promise<T | ReturnType<typeof cancelledResult>>;
export const readFileConsistently = async <T>(path: string, read: () => Promise<T>, permit?: Operation): Promise<T | ReturnType<typeof cancelledResult>> => {
    const session = getRequestSession();
    const blocked = () => [...operations].some(other => other !== permit && active(other) && affected(other, path) &&
        (other.kind === 'mutation' && (other.phase === 'unknown' || !permit || other.number < permit.number || other.phase === 'sent')));
    if (blocked()) return blockedResult();
    const state: FileRead = {path, session, changed: false, cancelled: false}; reads.add(state);
    try {
        do {
            state.changed = false;
            const result = await read();
            if (state.cancelled || session !== getRequestSession()) return cancelledResult();
            if (blocked()) return blockedResult();
            if (!state.changed) return result;
        } while (true);
    } finally {reads.delete(state);}
};

export type FileMutationContext = {
    scope: FileMutationScope; read: ConsistentFileReader; isCurrent: () => boolean; commit: () => void; unchanged: () => void;
};
export const runFileMutation = async <T>(paths: string[], mutate: (isCurrent: () => boolean, context: FileMutationContext) => Promise<T>, prepare?: (context: FileMutationContext) => Promise<void>, onResult?: (result: T, context: FileMutationContext) => Promise<void>): Promise<T | ReturnType<typeof cancelledResult>> => {
    const operation = createOperation('mutation', paths);
    const isCurrent = () => operation.session === getRequestSession() && operation.phase !== 'cancelled';
    const context: FileMutationContext = {scope: operation.scope, isCurrent, commit: () => notifyReads(operation), unchanged: () => {operation.observed = true;}, read: (path, read) => readFileConsistently(path, read, operation)};
    try {
        for (const other of operations) if (other !== operation && other.number < operation.number && other.kind === 'write' && other.phase === 'queued' &&
            paths.some(path => other.paths.some(target => operation.scope.relation(target, path) === 'same'))) cancelQueued(other);
        if (prepare) await prepare(context);
        if (!isCurrent()) return cancelledResult();
        operation.scope.capture();
        // Writes may start their own lookup while this mutation prepares.
        // Once proven related, cancel them too, including newer unsent writes.
        for (const other of operations) if (other !== operation && other.kind === 'write' && other.phase === 'queued' &&
            paths.some(path => other.paths.some(target => operation.scope.relation(target, path) === 'same'))) cancelQueued(other);
        const previous = [...operations].filter(other => other !== operation && other.number < operation.number && active(other) && overlapping(operation, other));
        if (previous.some(other => other.phase === 'unknown' || other.session !== operation.session)) return blockedResult();
        // Cancel unsent writes only. A sent success still acknowledges its file
        // before the mutation changes the path. Earlier owned reads survive.
        for (const other of previous) if (other.kind === 'write') cancelQueued(other);
        await Promise.all(previous.map(other => other.done));
        if (!isCurrent()) return cancelledResult();
        if (paths.some(unknownAt)) return blockedResult();
        operation.scope.capture(); operation.phase = 'sent'; changed();
        let result: T;
        try {result = await mutate(isCurrent, context);}
        catch (error) {operation.phase = 'unknown'; notifyReads(operation); if (!isCurrent()) return cancelledResult(); throw error;}
        if (isUncertainFileResult(result)) operation.phase = 'unknown';
        else operation.phase = 'acknowledging';
        notifyReads(operation, result);
        // The wire result is final before readback/UI work. A stale GET 401
        // cannot turn a completed PUT into an unknown physical request.
        if (isCurrent() && onResult) {
            try { await onResult(result, context); }
            catch (error) { if (isCurrent()) throw error; }
        }
        return isCurrent() ? result : cancelledResult();
    } finally {
        if (operation.changed && operation.phase !== 'finished')
            for (const path of paths) forgetFileIdentities(path, candidate => operation.scope(candidate) !== undefined);
        closeOperation(operation);
    }
};

/** Compatibility cancellation: only unsent writes can be cancelled. Structural
 * API callers use runFileMutation to drain sent work before DELETE or PUT. */
export const cancelPendingFileWrites = (path: string): void => {
    for (const operation of operations) if (operation.kind === 'write' && affected(operation, path)) cancelQueued(operation);
};
export const cancelAllPendingFileWrites = (): void => {
    invalidateRequestSession();
    for (const operation of operations) {
        cancelQueued(operation);
        // A completed wire request has no physical work left. Old readback can
        // still settle later, but must neither reserve nor invalidate new-login files.
        if (operation.phase === 'acknowledging') closeOperation(operation);
    }
    for (const reader of reads) reader.cancelled = true;
    reads.clear(); ownerActions.clear(); actions.clear(); tabObservations.clear(); forgetFileIdentities(); changed();
};

/** Each isolated test owns its simulated server. Production logout deliberately
 * does not discard live or unknown physical reservations. */
export const resetFileOperationsForTests = (): void => {
    cancelAllPendingFileWrites();
    for (const operation of operations) operation.finish();
    operations.clear(); fileChanges.clear(); changed();
};
