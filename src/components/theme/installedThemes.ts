// The installed packages that declare a theme: `/public/<dir>/package.json` with `neoTheme`.
//
// Read on demand (the Theme dialog opening), never at startup: the remembered choice already
// carries its stylesheet path (theme.ts), so the first paint does not wait for this.

import { getFileList } from '@/api/repository/api';
import { readManifest } from '@/components/side/AppStore/pkgLifecycle/manifest';
import { parseThemeManifest, type ThemeChoice } from '@/design-system/theme';

type Listing = { children?: { name?: unknown; isDir?: unknown }[] };

/**
 * Every installed theme, by label; null when `/public/` itself cannot be listed (that is not
 * "no theme installed"). A package whose manifest cannot be read is left out.
 */
export const listInstalledThemes = async (): Promise<ThemeChoice[] | null> => {
    let sDirs: string[] = [];
    try {
        const sRes: any = await getFileList('', '/public/', '');
        const sListing: Listing | undefined = sRes?.data ?? sRes;
        if (!Array.isArray(sListing?.children)) return null;
        sDirs = sListing.children.filter((c) => c.isDir === true && typeof c.name === 'string').map((c) => c.name as string);
    } catch {
        return null;
    }
    const sThemes = await Promise.all(sDirs.map(async (aDir) => parseThemeManifest(aDir, await readManifest(aDir))));
    return sThemes.filter((t): t is ThemeChoice => t !== null).sort((a, b) => a.label.localeCompare(b.label));
};
