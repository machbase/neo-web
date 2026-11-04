/**
 * Whether links that open without a login — a shared board (`/web/ui/board/...`) and a saved file's
 * `/db/tql/<path>` — work on this server (#1576, until #1559). They call `/db/*`, which takes API tokens
 * only, so with the server's HTTP token auth on (the default since 8.7.2) they get 401 even in the
 * browser of a logged-in user. No server response says whether that auth is on, so this asks the way such
 * a link does: no headers (no login token, no console header — not through `request`) and a TQL that
 * touches no database. Only a 200 means available; 401, any other status or a network error does not.
 * Asked once per app load; every caller shares the one answer.
 */
const PROBE_TQL = 'FAKE(once(1))\nCSV()';

let sAnswer: Promise<boolean> | undefined;
let sKnown: boolean | undefined;

export const checkShareAvailable = (): Promise<boolean> => {
    if (!sAnswer) {
        sAnswer = Promise.resolve()
            .then(() => fetch('/db/tql', { method: 'POST', body: PROBE_TQL }))
            .then((aRes) => aRes.status === 200)
            .catch(() => false)
            .then((aAvailable) => (sKnown = aAvailable));
    }
    return sAnswer;
};

/** The answer once it is in, `undefined` before: lets a screen mounted later start from it instead of hiding first. */
export const getKnownShareAvailable = (): boolean | undefined => sKnown;
