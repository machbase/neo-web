// -----------------------------------------------------------------------------
// SIGN-IN PICTURES of this browser's own themes — kept in IndexedDB as they are
// -----------------------------------------------------------------------------
// A theme kept in the browser (theme.ts, THEMES IN THE BROWSER) can have a picture for the sign-in
// page. The picture is the file itself (a Blob), not text: it stays out of the theme list in
// localStorage, which is read whole before the first paint and shares about 5 MB with the rest of
// the web UI. One record per theme, under its id; the theme's entry only says it has one.
//
// Reads and writes are asynchronous. Where there is no IndexedDB (an old or locked-down browser)
// nothing is kept: a theme saved there has no picture, and the sign-in page shows the built-in one.

/** What a sign-in picture may be: a picture an `<img>` shows as it is, nothing that runs (no SVG). */
export const LOGIN_PICTURE_TYPES = ['image/webp', 'image/png', 'image/jpeg', 'image/gif', 'image/avif'];
/** The largest picture kept as it is; the builder makes a larger one smaller before saving. */
export const LOGIN_PICTURE_MAX_BYTES = 10 * 1024 * 1024;

export const isLoginPicture = (aValue: unknown): aValue is Blob =>
    typeof Blob !== 'undefined' && aValue instanceof Blob && LOGIN_PICTURE_TYPES.includes(aValue.type) && aValue.size > 0 && aValue.size <= LOGIN_PICTURE_MAX_BYTES;

/** Where the pictures are kept: IndexedDB in the browser, something else in tests. */
export interface PictureStore {
    get(aKey: string): Promise<unknown>;
    put(aKey: string, aBlob: Blob): Promise<void>;
    delete(aKey: string): Promise<void>;
}

const DB_NAME = 'neo-theme';
const STORE = 'pictures';

let sDb: Promise<IDBDatabase> | null = null;

const openDb = (): Promise<IDBDatabase> => {
    if (!sDb) {
        sDb = new Promise<IDBDatabase>((resolve, reject) => {
            if (typeof indexedDB === 'undefined') {
                reject(new Error('this browser cannot keep pictures'));
                return;
            }
            const sOpen = indexedDB.open(DB_NAME, 1);
            sOpen.onupgradeneeded = () => sOpen.result.createObjectStore(STORE);
            sOpen.onsuccess = () => resolve(sOpen.result);
            sOpen.onerror = () => reject(sOpen.error ?? new Error('this browser cannot keep pictures'));
            sOpen.onblocked = () => reject(new Error('the picture store is in use by an older tab'));
        });
        // a failed open is tried again next time (private mode switched off, the old tab closed)
        sDb.catch(() => {
            sDb = null;
        });
    }
    return sDb;
};

const run = <T>(aMode: IDBTransactionMode, aDo: (aStore: IDBObjectStore) => IDBRequest): Promise<T> =>
    openDb().then(
        (aDb) =>
            new Promise<T>((resolve, reject) => {
                const sTx = aDb.transaction(STORE, aMode);
                const sReq = aDo(sTx.objectStore(STORE));
                // done when the transaction is: a write is on disk then, not only queued
                sTx.oncomplete = () => resolve(sReq.result as T);
                sTx.onerror = () => reject(sTx.error ?? sReq.error ?? new Error('the picture store failed'));
                sTx.onabort = () => reject(sTx.error ?? new Error('the picture store failed'));
            })
    );

const indexedDbStore: PictureStore = {
    get: (aKey) => run('readonly', (s) => s.get(aKey)),
    put: (aKey, aBlob) => run('readwrite', (s) => s.put(aBlob, aKey)),
    delete: (aKey) => run('readwrite', (s) => s.delete(aKey)),
};

let sStore: PictureStore = indexedDbStore;

/** Tests keep pictures in memory (jsdom has no IndexedDB); null puts IndexedDB back. */
export const usePictureStore = (aStore: PictureStore | null) => {
    sStore = aStore ?? indexedDbStore;
};

/** A theme's sign-in picture; null when it has none or it cannot be read (checked again: storage is anyone's to edit). */
export const readThemePicture = async (aId: string): Promise<Blob | null> => {
    try {
        const sValue = await sStore.get(aId);
        return isLoginPicture(sValue) ? sValue : null;
    } catch {
        return null;
    }
};

/** Keeps a theme's sign-in picture (null: takes it away). Rejects with a reason the builder can show. */
export const writeThemePicture = async (aId: string, aBlob: Blob | null): Promise<void> => {
    try {
        if (aBlob) await sStore.put(aId, aBlob);
        else await sStore.delete(aId);
    } catch (e) {
        const sName = (e as { name?: unknown } | null)?.name;
        throw new Error(sName === 'QuotaExceededError' ? "this browser's storage for the web UI is full" : e instanceof Error ? e.message : String(e));
    }
};
