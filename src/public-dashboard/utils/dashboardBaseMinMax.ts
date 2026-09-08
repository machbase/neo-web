import { fetchBlockTimeMinMax } from '../api/repository/machiot';
import { createBlockBaseMinMaxFetcher } from '@/utils/dashboardBaseMinMax';

/**
 * The public view's reader for a block's base-column extent.
 *
 * Same logic as the editor's — it is literally the same function, built here over this tree's
 * transport. That is the whole difference: the public dashboard is unauthenticated and queries
 * `/db/query`, where the editor sends a bearer token to `/web/api/query`. Borrowing the editor's
 * fetcher here answered 401, which on a distance axis leaves `first`/`last` unresolvable.
 */
export const fetchBlockBaseMinMax = createBlockBaseMinMaxFetcher(fetchBlockTimeMinMax);
