import fs from 'fs';
import path from 'path';
import { partOfToken } from './tokenKinds';
import { parseThemeTokens } from '../theme/themeTokens';

// The area tokens (_colors.scss, Areas): each part of the screen has its own colours, falling back
// to the system token it drew with before — so no theme and every existing theme look the same —
// and a dark island (a panel drawn dark on its own) resets them like every other token.

const read = (f: string) => fs.readFileSync(path.resolve(__dirname, f), 'utf8');
const sColors = read('_colors.scss').replace(/\/\/[^\n]*/g, '');
const sAreas = sColors.slice(sColors.indexOf('$gnb-bg'));
const sAreaTokens = [...sAreas.matchAll(/^\$([a-z0-9-]+):\s*themed\(\s*([a-z0-9-]+)\s*,\s*(.+?)\);/gm)];

test('every area token falls back to a system token, and is named after itself', () => {
    expect(sAreaTokens.length).toBeGreaterThan(15);
    for (const [, sVar, sName, sFallback] of sAreaTokens) {
        expect(sName).toBe(sVar);
        expect(sFallback).toMatch(/^\$[a-z0-9-]+$/);
    }
});

test('the page text and the parts\' text are text-primary, one dark value (no second default for inherited text)', () => {
    expect(sColors).not.toMatch(/\$text-inherited/);
    expect(sColors).toMatch(/\$side-text: themed\(side-text, \$text-primary\);/);
    expect(read('../../index.css')).toMatch(/color: var\(--neo-text-primary, #f1f1f1\);/);
});

test('a dark island resets every token and the hooks the parts set for their components', () => {
    const sIsland = read('_darkIsland.scss');
    const sAll = (sColors + read('_shadows.scss').replace(/\/\/[^\n]*/g, '')).matchAll(/^\$[a-z0-9-]+:\s*themed\(\s*([a-z0-9-]+)/gm);
    for (const [, sName] of sAll) expect(sIsland).toContain(`--neo-${sName}: initial;`);
    for (const sHook of ['--ghost-icon', '--ghost-icon-hover', '--ghost-hover-bg', '--page-bg', '--label-text']) expect(sIsland).toContain(`${sHook}: initial;`);
});

test('every part token names its part (the theme builder groups the token list by it), a shared token none', () => {
    for (const [, , sName] of sAreaTokens) if (!/^(bg-canvas)$/.test(sName)) expect([sName, partOfToken(sName)]).toEqual([sName, expect.any(String)]);
    for (const sName of ['menu-bg', 'menu-item-hover-bg', 'menu-shadow', 'dialog-border', 'tooltip-text']) expect(partOfToken(sName)).not.toBeNull();
    for (const sName of ['bg-primary', 'text-muted', 'text-icon', 'border-color-default', 'warning-text']) expect(partOfToken(sName)).toBeNull();
});

test("README's Variables table is the token list: every token, its dark value and what it falls back to", () => {
    const sTokens = parseThemeTokens(['_colors.scss', '_shadows.scss', '_border-radius.scss', '_effects.scss'].map(read));
    const sRows = [...read('README.md').matchAll(/^\| `--neo-([a-z0-9-]+)` \| `([^`]*)` \| (?:`--neo-([a-z0-9-]+)`)? \|$/gm)].map((m) => ({ name: m[1], dark: m[2], fallback: m[3] }));
    expect(sRows).toEqual(sTokens.map((t) => ({ name: t.name, dark: t.dark, fallback: t.fallback })));
});
