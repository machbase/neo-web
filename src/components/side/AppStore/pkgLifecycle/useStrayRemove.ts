// issue #1452 — the click-to-removal wiring for a stray `/public/` directory.
//
// Kept OUT of `usePkgCommand` on purpose. That hook is the package lifecycle: it
// takes the per-package busy lock, probes cgi-bin/health before and after, runs a
// flow that executes the package's own scripts, and syncs the detail tab's
// installed_* fields. None of that applies to a directory nothing ever installed —
// there is no service to probe, no script to run, and no installed state to sync.
// Widening `PkgCommand` to carry a sixth verb would push all of that machinery onto
// a case that needs none of it, and would let a future caller route "remove
// directory" into `runUninstall` by accident, which is the ONE thing this feature
// must not do (see `strayRemove.ts`).
//
// What IS shared is the aftermath: the scan cache must be dropped and the catalog
// rebuilt through the same `buildCatalog` both refresh paths use, or the card stays
// on screen describing a directory that is gone.

import { useRecoilCallback } from 'recoil';
import { Toast } from '@/design-system/components';
import type { SEARCH_RES } from '@/api/repository/appStore';
import { invalidateLocalArchiveCache } from '@/api/repository/onpremCatalog';
import { isCurUserEqualAdmin } from '@/utils';
import { useExperiment } from '@/hooks/useExperiment';
import { gCatalogScanWarnings, gCatalogStatus, gSearchPkgName, gSearchPkgs } from '@/recoil/appStore';
import { buildCatalog } from '../catalog';
import { runStrayRemove } from './strayRemove';
import type { StepResult } from './types';

/**
 * The names the catalog currently presents as REAL packages — every card that is
 * not itself a stray.
 *
 * This is the set `checkStrayRemoval` refuses to delete into. It is read from the
 * catalog the user is looking at rather than rebuilt, because the guard has to
 * answer for the state the click was made against.
 */
const knownPackageNames = (pkgs: SEARCH_RES): Set<string> => {
    const out = new Set<string>();
    for (const card of pkgs?.possibles ?? []) if (card?.name && !card.stray) out.add(card.name);
    return out;
};

/**
 * The directories the CURRENT catalog offers a Remove action for.
 *
 * A SECOND, TIGHTER GATE than the name check, and the one that makes the search
 * box irrelevant to safety: the argument must be a directory the classification
 * itself judged `strayArchive` in this very build. A clone (`removable: false`), a
 * `foreign` directory and anything not on screen at all are all absent from it.
 */
const removableStrayDirs = (pkgs: SEARCH_RES): Set<string> => {
    const out = new Set<string>();
    for (const card of pkgs?.possibles ?? []) if (card?.stray?.removable && card.stray.dir) out.add(card.stray.dir);
    return out;
};

/**
 * `remove(dir)` — delete `/public/{dir}/` and refresh the catalog.
 *
 * Returns the step result so a caller can show the log; `null` when the attempt
 * never started (not an admin, or the directory is not one this catalog offers to
 * remove). Never throws.
 */
export function useStrayRemove() {
    const { getExperiment } = useExperiment();
    return useRecoilCallback(
        ({ snapshot, set }) =>
            async (dir: string): Promise<StepResult | null> => {
                if (!isCurUserEqualAdmin()) return null;

                const catalog = await snapshot.getPromise(gSearchPkgs);
                if (!removableStrayDirs(catalog).has(dir)) {
                    Toast.warning(`"${dir}" is not offered for removal.`);
                    return null;
                }

                const result = await runStrayRemove(dir, knownPackageNames(catalog));

                if (result.ok) {
                    // The directory is gone, so BOTH the scan (which reads
                    // /public/ server-side) and the catalog are stale. Same
                    // invalidate-then-rebuild pair `usePkgCommand` runs after a
                    // command, and for the same reason: this is one of the few
                    // moments /public/ actually changes.
                    try {
                        invalidateLocalArchiveCache();
                        const search = await snapshot.getPromise(gSearchPkgName);
                        const { pkgs, mode, hubError, lastSyncAt, scanWarnings } = await buildCatalog({ search, experimentOn: getExperiment() });
                        set(gCatalogStatus, { mode, hubError, lastSyncAt });
                        set(gCatalogScanWarnings, scanWarnings);
                        set(gSearchPkgs, { installed: [], exact: [], possibles: pkgs, broken: [] } as SEARCH_RES);
                    } catch {
                        /* buildCatalog does not reject; keep the list as-is if it ever does */
                    }
                    Toast.success(`${dir} removed`);
                } else {
                    Toast.error(`Failed to remove ${dir}: ${result.reason}`);
                }
                return result;
            },
        []
    );
}
