// The README of an INSTALLED package, for the app view's side panel.
//
// ONE SOURCE, AND ONLY ONE: `/public/{name}/README.md`. This hook is only ever
// used from a package's own `APP:` tab, which exists because `main.html` was
// found on disk — so the package is installed, its README is on the same origin
// as the console, and it is the copy that matches the INSTALLED version rather
// than whatever the repo's default branch says today.
//
// That is why this is not `info.tsx`'s `getReadme`. That one serves the catalog
// detail tab, where the package may not be installed at all, so it carries three
// more branches (local-only policy, missing repository metadata, a
// raw.githubusercontent fetch with relative-image rewriting). None of them can be
// reached from here, and the shared part — actually reading the file — is already
// factored out as `readLocalReadme`.

import { useEffect, useState } from 'react';
import { readLocalReadme } from '@/api/repository/onpremCatalog';
import { getInstalledVersion } from '@/components/side/AppStore/pkgLifecycle/manifest';

export interface InstalledReadme {
    /** Markdown source, or `null` once we know the package ships none. */
    readme: string | null;
    /** `package.json` version, `''` when unreadable. Shown as the panel's badge. */
    version: string;
    /** The first read is still in flight; nothing is known yet. */
    loading: boolean;
}

export const useInstalledReadme = (appName: string): InstalledReadme => {
    // READ ON MOUNT, NOT ON FIRST OPEN. The caller decides whether to offer the
    // README button at all, and it can only do that honestly once it knows there
    // is one — a button that opens onto "this package ships no README" is worse
    // than no button. The cost is a single same-origin GET per app tab.
    const [sState, setState] = useState<InstalledReadme>({ readme: null, version: '', loading: true });

    useEffect(() => {
        let cancelled = false;
        setState({ readme: null, version: '', loading: true });
        void Promise.all([readLocalReadme(appName), getInstalledVersion(appName)]).then(([readme, version]) => {
            if (cancelled) return;
            setState({ readme, version, loading: false });
        });
        return () => {
            cancelled = true;
        };
    }, [appName]);

    return sState;
};
