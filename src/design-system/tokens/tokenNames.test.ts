import fs from 'fs';
import path from 'path';
import { parseThemeTokens } from '../theme/themeTokens';

// Every theme variable a style names (`var(--neo-x)`, `t.$x` from the token modules) is one the token
// sources declare — anywhere under src, the public dashboard included. A renamed or removed token
// otherwise fails quietly: a var() falls back to its literal and stops following the theme, and a
// Sass name only breaks the build once something imports the file.

const SRC = path.resolve(__dirname, '../..');
const TOKENS = path.resolve(__dirname);
const read = (f: string) => fs.readFileSync(f, 'utf8');
const walk = (aDir: string, aOut: string[] = []): string[] => {
    for (const sName of fs.readdirSync(aDir)) {
        const sPath = path.join(aDir, sName);
        if (fs.statSync(sPath).isDirectory()) {
            if (sName !== 'node_modules') walk(sPath, aOut);
        } else if (/\.(scss|css|tsx?|svg)$/.test(sName) && !/\.test\./.test(sName)) aOut.push(sPath);
    }
    return aOut;
};
const FILES = walk(SRC);
const noComments = (aText: string) => aText.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/[^\n]*/g, '$1');

const NAMES = new Set(parseThemeTokens(['_colors.scss', '_shadows.scss', '_border-radius.scss', '_effects.scss'].map((f) => read(path.join(TOKENS, f)))).map((t) => t.name));
/** Every Sass variable the token modules define (colours, spacing, sizes…). */
const SASS = new Set<string>();
for (const f of fs.readdirSync(TOKENS).filter((f) => f.endsWith('.scss'))) for (const m of read(path.join(TOKENS, f)).matchAll(/^\$([a-z0-9-]+)\s*:/gm)) SASS.add(m[1]);

test('every --neo-* variable a style names is a theme token', () => {
    const sUnknown: string[] = [];
    for (const f of FILES) {
        if (f.startsWith(TOKENS + path.sep)) continue;
        for (const m of noComments(read(f)).matchAll(/var\(\s*--neo-([a-z0-9-]+)/g)) if (!NAMES.has(m[1])) sUnknown.push(`${path.relative(SRC, f)}  --neo-${m[1]}`);
    }
    expect(sUnknown).toEqual([]);
});

test('every Sass name taken from the token modules exists there', () => {
    const sUnknown: string[] = [];
    for (const f of FILES.filter((f) => f.endsWith('.scss'))) {
        const sText = noComments(read(f));
        // the namespaces this file binds to the token modules: `@use '…/design-system/tokens' as t;`, `@use '../../tokens/colors' as c;`
        const sSpaces = [...sText.matchAll(/@use\s+['"][^'"]*tokens(?:\/[_a-z-]+)?['"]\s+as\s+([a-z]+)\s*;/g)].map((m) => m[1]);
        for (const sNs of sSpaces) {
            for (const m of sText.matchAll(new RegExp(`(?<![\\w-])${sNs}\\.\\$([a-z0-9-]+)`, 'g'))) if (!SASS.has(m[1])) sUnknown.push(`${path.relative(SRC, f)}  ${sNs}.$${m[1]}`);
        }
    }
    expect(sUnknown).toEqual([]);
});

/** The file a Sass `@use` names: relative to the file, or `@/…` from src; a partial or a folder's index. */
const resolveUse = (aFrom: string, aPath: string): string | null => {
    const sBase = aPath.startsWith('@/') ? path.join(SRC, aPath.slice(2)) : path.resolve(path.dirname(aFrom), aPath);
    const sDir = path.dirname(sBase), sName = path.basename(sBase);
    for (const c of [`${sBase}.scss`, path.join(sDir, `_${sName}.scss`), path.join(sBase, 'index.scss'), path.join(sBase, '_index.scss')]) if (fs.existsSync(c)) return c;
    return null;
};
/** The variables a module gives: its own, and those of the modules it forwards. */
const varsOf = (aFile: string, aSeen = new Set<string>()): Set<string> => {
    const sOut = new Set<string>();
    if (aSeen.has(aFile)) return sOut;
    aSeen.add(aFile);
    const sText = noComments(read(aFile));
    for (const m of sText.matchAll(/^\s*\$([a-z0-9-]+)\s*:/gm)) sOut.add(m[1]);
    for (const m of sText.matchAll(/@forward\s+['"]([^'"]+)['"]/g)) {
        const f = resolveUse(aFile, m[1]);
        if (f) for (const v of varsOf(f, aSeen)) sOut.add(v);
    }
    return sOut;
};

test('every Sass name a file takes from a module it @uses exists there (a part\'s own theme module included)', () => {
    const sUnknown: string[] = [];
    for (const f of FILES.filter((f) => f.endsWith('.scss'))) {
        const sText = noComments(read(f));
        // `@use 'x/theme' as t;`, or without `as` the path's last name (`@use '../ui/theme';` is `theme.`)
        for (const u of sText.matchAll(/@use\s+['"]([^'"]+)['"](?:\s+as\s+([a-z0-9_*-]+))?\s*;/g)) {
            if (u[1].startsWith('sass:') || u[2] === '*') continue;
            const sNs = u[2] ?? path.basename(u[1]).replace(/^_/, '').replace(/\.scss$/, '');
            const sModule = resolveUse(f, u[1]);
            if (!sModule) continue;
            const sVars = varsOf(sModule);
            for (const m of sText.matchAll(new RegExp(`(?<![\\w-])${sNs}\\.\\$([a-z0-9-]+)`, 'g'))) if (!sVars.has(m[1])) sUnknown.push(`${path.relative(SRC, f)}  ${sNs}.$${m[1]}`);
        }
    }
    expect(sUnknown).toEqual([]);
});
