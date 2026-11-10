// The installed packages that declare themes: `/public/<dir>/package.json` with `neoTheme`.
//
// Read on demand (the Theme dialog opening), never at startup: the remembered choice already
// carries its stylesheet path (theme.ts), so the first paint does not wait for this.
//
// A package declares one theme (`neoTheme.stylesheet`), an index of them (`neoTheme.index`, JSON
// files listing entries), or neither — the theme builder, a theme package for its app alone.

import { getFileList } from '@/api/repository/api';
import { readManifest } from '@/components/side/AppStore/pkgLifecycle/manifest';
import { checkHtmlExists } from '@/components/side/AppStore/appTabs';
import { declaresTheme, parseThemeIndex, parseThemeManifest, themeIndexFiles, type ThemeChoice } from '@/design-system/theme';

type Listing = { children?: { name?: unknown; isDir?: unknown }[] };

/** A theme as the dialog lists it: the choice plus what is shown beside it. */
export interface InstalledTheme extends ThemeChoice {
    /** Up to eight colours an index entry gives for its row (`swatch`); none for a single-theme package. */
    swatch: string[];
    /** A short word an index entry gives (`note`, e.g. "Preset"); the package name otherwise. */
    detail: string;
}

/** The themes of one package, in the order the package lists them. */
export interface ThemePackage {
    pkg: string;
    /** `neoTheme.label` of a package with an index, the package name otherwise. */
    label: string;
    /** The package has an app (`main.html`) to make or edit its themes in. */
    hasApp: boolean;
    themes: InstalledTheme[];
}

const SWATCH = /^(#[0-9a-fA-F]{3,8}|rgba?\([0-9.,\s%]+\))$/;

const readJson = async (aPkg: string, aFile: string): Promise<unknown> => {
    try {
        const sRes: any = await getFileList('', `/public/${aPkg}/`, aFile);
        const sPayload = sRes?.data ?? sRes;
        return typeof sPayload === 'string' ? JSON.parse(sPayload) : sPayload;
    } catch {
        // Not there or not JSON.
        return null;
    }
};

const entryExtras = (aIndex: unknown, aChoice: ThemeChoice): Pick<InstalledTheme, 'swatch' | 'detail'> => {
    const sList = Array.isArray(aIndex) ? aIndex : ((aIndex as { themes?: unknown } | null)?.themes as unknown[] | undefined);
    const sEntry = Array.isArray(sList) ? (sList.find((e) => (e as { stylesheet?: unknown })?.stylesheet === aChoice.stylesheet) as Record<string, unknown> | undefined) : undefined;
    const sSwatch = Array.isArray(sEntry?.swatch) ? sEntry.swatch.filter((c): c is string => typeof c === 'string' && SWATCH.test(c.trim())).slice(0, 8) : [];
    const sNote = typeof sEntry?.note === 'string' && sEntry.note.trim() ? sEntry.note.trim().slice(0, 24) : aChoice.pkg;
    return { swatch: sSwatch, detail: sNote };
};

const readPackage = async (aDir: string): Promise<ThemePackage | null> => {
    const sManifest = await readManifest(aDir);
    // the installed version goes with each choice: it is in the stylesheet's address (themeStylesheetHref)
    const sVersion = typeof sManifest?.version === 'string' ? { version: sManifest.version } : {};
    const sSingle = parseThemeManifest(aDir, sManifest);
    if (sSingle) return { pkg: aDir, label: sSingle.label, hasApp: false, themes: [{ ...sSingle, ...sVersion, swatch: [], detail: aDir }] };
    if (!declaresTheme(aDir, sManifest)) return null;
    const sFiles = themeIndexFiles(sManifest);
    const sIndexes = await Promise.all(sFiles.map((f) => readJson(aDir, f)));
    const sSeen = new Set<string>();
    const sThemes: InstalledTheme[] = [];
    sIndexes.forEach((aIndex) => {
        for (const sChoice of parseThemeIndex(aDir, aIndex)) {
            if (sSeen.has(sChoice.stylesheet)) continue;
            sSeen.add(sChoice.stylesheet);
            sThemes.push({ ...sChoice, ...sVersion, ...entryExtras(aIndex, sChoice) });
        }
    });
    const sLabel = (sManifest as { neoTheme?: { label?: unknown } } | null)?.neoTheme?.label;
    return {
        pkg: aDir,
        label: typeof sLabel === 'string' && sLabel.trim() ? sLabel.trim() : aDir,
        hasApp: await checkHtmlExists(`${window.location.origin}/public/${encodeURIComponent(aDir)}/main.html`),
        themes: sThemes,
    };
};

/**
 * Every installed theme package, by label; null when `/public/` itself cannot be listed (that
 * is not "no theme installed"). A package whose manifest cannot be read is left out.
 */
export const listThemePackages = async (): Promise<ThemePackage[] | null> => {
    let sDirs: string[] = [];
    try {
        const sRes: any = await getFileList('', '/public/', '');
        const sListing: (Listing & { isDir?: unknown }) | undefined = sRes?.data ?? sRes;
        // an empty folder is listed without `children` (no package installed, or the last one
        // uninstalled): that is "none", not a listing that failed
        const sChildren = Array.isArray(sListing?.children) ? sListing.children : sListing?.isDir === true ? [] : null;
        if (!sChildren) return null;
        sDirs = sChildren.filter((c) => c.isDir === true && typeof c.name === 'string').map((c) => c.name as string);
    } catch {
        return null;
    }
    const sPackages = await Promise.all(sDirs.map(readPackage));
    return sPackages.filter((p): p is ThemePackage => p !== null).sort((a, b) => a.label.localeCompare(b.label));
};

/** Every installed theme, flat (single-theme packages and index entries alike). */
export const listInstalledThemes = async (): Promise<InstalledTheme[] | null> => {
    const sPackages = await listThemePackages();
    return sPackages && sPackages.flatMap((p) => p.themes);
};
