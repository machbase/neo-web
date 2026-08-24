// The catalog's loading indicator: a 2px indeterminate bar on the seam between
// the pinned controls and the card list.
//
// INDETERMINATE, because `buildCatalog` has no measurable progress. It fans out to
// the hub, the server-side archive scan and the `/public/` listing, each of which
// may degrade independently; there is no fraction to report and inventing one
// ("33% — hub answered") would be a lie the user could catch.
//
// IT MUST NOT CHANGE THE PANEL'S LAYOUT. The bar is absolutely positioned over the
// bottom edge of its host, so nothing below it moves when a search rebuild starts
// and stops. The panel has already had two height-jump bugs (the pill bar's
// `content-box` pill, the search band's missing top margin) and a spinner that
// nudges the whole card list on every keystroke would be the third.

import './CatalogProgress.scss';

export interface CatalogProgressProps {
    /** A catalog build is in flight. */
    pLoading: boolean;
}

export const CatalogProgress = ({ pLoading }: CatalogProgressProps) =>
    pLoading ? <div className="app-store-catalog-progress" role="progressbar" aria-label="Loading catalog" /> : null;
