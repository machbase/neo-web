import fs from 'fs';
import path from 'path';
import { parseThemeTokens } from './themeTokens';

const read = (f: string) => fs.readFileSync(path.resolve(__dirname, '../tokens', f), 'utf8');

test('reads every themed() declaration with its dark default, resolving Sass references', () => {
    const sTokens = parseThemeTokens([
        `$bg-primary: themed(bg-primary, #1e1e1e); //#1c1c21\n$bg-header: themed(bg-header, $bg-primary);\n$plain: 4px;\n/** $not: themed(no, #000); */`,
        `$shadow-switch: themed(shadow-switch, 1px 2px 3px #00000020); // Switch button active`,
    ]);
    expect(sTokens).toEqual([
        { name: 'bg-primary', dark: '#1e1e1e' },
        { name: 'bg-header', dark: '#1e1e1e' },
        { name: 'shadow-switch', dark: '1px 2px 3px #00000020' },
    ]);
});

test('the real token files: every token once, every default concrete', () => {
    const sTokens = parseThemeTokens([read('_colors.scss'), read('_shadows.scss'), read('_border-radius.scss')]);
    const sNames = sTokens.map((t) => t.name);
    expect(new Set(sNames).size).toBe(sNames.length);
    expect(sNames).toEqual(expect.arrayContaining(['bg-primary', 'text-primary', 'primary-base', 'text-on-accent', 'shadow-xl', 'radius-scale']));
    expect(sTokens.find((t) => t.name === 'radius-scale')?.dark).toBe('1');
    // Every name the stylesheets set as `themed(<name>, …)` is a declared token.
    expect(sTokens.length).toBe((read('_colors.scss') + read('_shadows.scss') + read('_border-radius.scss')).match(/^\$[a-z0-9-]+:\s*themed\(/gm)?.length);
    for (const t of sTokens) expect(t.dark).not.toMatch(/\$|themed\(/);
});
