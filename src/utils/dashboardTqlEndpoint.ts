/**
 * Where a dashboard panel's generated TQL posts its queries.
 *
 * The editor goes through /web/api/tql with the session token. A shared link (/web/ui/board/...,
 * rendered by PublicApp - see Routes.tsx) can be opened without a session, so its panels use /db/tql;
 * a saved script (aIsSave) runs outside the app and has always used /db/tql too. The shared link reads
 * the board with the editor's parsers, so the choice is made here rather than in a copy of them (#1566).
 */
export const isPublicBoardView = (): boolean => typeof window !== 'undefined' && /^\/web\/ui\/board(\/|$)/.test(window.location.pathname);

export const dashboardTqlPath = (aIsSave?: boolean): string => (aIsSave || isPublicBoardView() ? '/db/tql' : '/web/api/tql');
