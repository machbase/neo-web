import { encodeFilePath } from '@/utils/filePath';

type WriteLifetime = { cancelled: boolean };
type FileWrite = { lifetime: WriteLifetime; result: Promise<any> };

const fileWrites = new Map<string, FileWrite>();
// Use the same path encoding as the file API, with conservative matching for
// case/Unicode aliases on macOS and Windows. This never changes the sent path.
const fileKey = (path: string) => encodeFilePath(path.normalize('NFC').toLowerCase()).replace(/\/$/, '');

/** Ordinary Save, Save As and TAZ share ordering and cancellation for each file. */
export const queueFileWrite = (path: string, write: () => Promise<any>): Promise<any> => {
    const key = fileKey(path);
    const previous = fileWrites.get(key);
    // Every pending write in this chain shares its file/session lifetime.
    const lifetime = previous?.lifetime ?? { cancelled: false };
    const run = () => lifetime.cancelled
        ? Promise.resolve({ success: false, reason: 'File save cancelled because its file or login session changed.' })
        : write();
    const result = previous ? previous.result.catch(() => undefined).then(run) : run();
    const entry = { lifetime, result };
    fileWrites.set(key, entry);
    const release = () => {
        if (fileWrites.get(key) === entry) fileWrites.delete(key);
    };
    void result.then(release, release);
    return result;
};

/** A delete/move also invalidates pending writes inside a folder. Sent requests cannot be undone. */
export const cancelPendingFileWrites = (path: string): void => {
    const target = fileKey(path);
    for (const [key, entry] of fileWrites) {
        if (key === target || key.startsWith(target + '/')) {
            entry.lifetime.cancelled = true;
            fileWrites.delete(key);
        }
    }
};

/** A new login must neither send nor wait for the previous session's pending writes. */
export const cancelAllPendingFileWrites = (): void => {
    for (const entry of fileWrites.values()) entry.lifetime.cancelled = true;
    fileWrites.clear();
};
