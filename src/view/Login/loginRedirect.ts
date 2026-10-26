/**
 * The path the stored 'view' value (written as `{"path":"/view/…"}` when a board is opened signed out) asks to
 * return to after sign-in, or null when there is none or it cannot be read. Parsed unguarded, a broken value threw
 * after a successful sign-in, so the screen stayed on the login form with no word (F-48).
 */
export const readViewPath = (aStored: string | null): string | null => {
    if (aStored === null) return null;
    try {
        const sPath = JSON.parse(aStored)?.path;
        return typeof sPath === 'string' && sPath !== '' ? sPath : null;
    } catch {
        return null;
    }
};
