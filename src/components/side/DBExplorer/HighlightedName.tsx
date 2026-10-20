import { findMatch } from './explorerFilter';

/**
 * A tree name with the searched-for run marked.
 *
 * Only the first occurrence is marked. Marking every one turns a name like
 * `TAG_TAG_ROLLUP` under the query `tag` into a striped band that is harder to read than
 * the plain name, and the point here is to show *why* the row is in the list.
 */
export const HighlightedName = ({ pText, pQuery }: { pText: string; pQuery: string }) => {
    const sMatch = findMatch(pText, pQuery);
    if (!sMatch) return <>{pText}</>;

    return (
        <>
            {pText.slice(0, sMatch.start)}
            <span className="db-explorer-match">{pText.slice(sMatch.start, sMatch.end)}</span>
            {pText.slice(sMatch.end)}
        </>
    );
};
