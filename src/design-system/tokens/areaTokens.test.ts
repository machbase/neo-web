import fs from 'fs';
import path from 'path';

// The area tokens (_colors.scss, Areas): each part of the screen has its own colours, falling back
// to the system token it drew with before — so no theme and every existing theme look the same —
// and a dark island (a panel drawn dark on its own) resets them like every other token.

const read = (f: string) => fs.readFileSync(path.resolve(__dirname, f), 'utf8');
const sColors = read('_colors.scss').replace(/\/\/[^\n]*/g, '');
const sAreas = sColors.slice(sColors.indexOf('$text-inherited'));
const sAreaTokens = [...sAreas.matchAll(/^\$([a-z0-9-]+):\s*themed\(\s*([a-z0-9-]+)\s*,\s*(.+?)\);/gm)];

test('every area token falls back to a system token, and is named after itself', () => {
    expect(sAreaTokens.length).toBeGreaterThan(15);
    for (const [, sVar, sName, sFallback] of sAreaTokens) {
        expect(sName).toBe(sVar);
        expect(sFallback).toMatch(/^\$[a-z0-9-]+$/);
    }
});

test('text an area inherits keeps the page colour (index.css :root), not text-primary\'s default', () => {
    expect(sColors).toMatch(/\$text-inherited: var\(--neo-text-primary, rgba\(255, 255, 255, 0\.87\)\);/);
    expect(read('../../index.css')).toMatch(/color: var\(--neo-text-primary, rgba\(255, 255, 255, 0\.87\)\);/);
});

test('a dark island resets every token and the hooks the parts set for their components', () => {
    const sIsland = read('_darkIsland.scss');
    const sAll = (sColors + read('_shadows.scss').replace(/\/\/[^\n]*/g, '')).matchAll(/^\$[a-z0-9-]+:\s*themed\(\s*([a-z0-9-]+)/gm);
    for (const [, sName] of sAll) expect(sIsland).toContain(`--neo-${sName}: initial;`);
    for (const sHook of ['--ghost-icon', '--ghost-icon-hover', '--page-bg']) expect(sIsland).toContain(`${sHook}: initial;`);
});
