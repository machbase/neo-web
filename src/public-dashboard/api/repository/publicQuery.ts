/**
 * The public view's SQL transport.
 *
 * A shared board is read by someone who is not logged in, so it goes to `/db/query` rather than
 * the editor's `/web/api/query` — measured against a v8.7 server, the latter answers
 * `401 missing authorization header` without a bearer token, and the response interceptor then
 * tries a relogin and raises a "Session expired" toast on a page that never had a session.
 *
 * It lives in its own module, apart from `machiot.ts`, so that `currentDatabase.ts` can build the
 * database resolver on it without the two files importing each other.
 */
export const executeQuery = async (query: string) => {
    try {
        const response = await fetch(`/db/query?q=${encodeURIComponent(query)}`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
            },
        });

        if (response.ok) {
            const result = await response.json();
            return result;
        } else {
            // A rejected SQL statement is an HTTP 500 whose *body* carries the engine's reason
            // (`{"success":false,"reason":"MACHCLI-ERR-2056, Column name (MIN_TIME) not found."}`).
            // `statusText` alone is "Internal Server Error", which tells a caller nothing about
            // what to do next — the tag stat reader keys its retry on the reason text.
            const reason = await response
                .json()
                .then((body: any) => String(body?.reason ?? '').trim())
                .catch(() => '');
            return {
                data: { reason: reason || `Query failed: ${response.statusText}` },
                status: response.status,
                success: false,
            };
        }
    } catch (error) {
        return {
            data: { reason: `Network error: ${error}` },
            status: 500,
            success: false,
        };
    }
};
