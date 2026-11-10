import fs from 'fs';
import path from 'path';
import { parseThemeTokens } from '../theme/themeTokens';
import { ALLOWED, KIND_OF, PART_OF_FILE, PART_STATE_TOKENS, TEXT_COLOURS, TEXT_ONLY, TOKEN_KINDS, type PaintRole, type PaintState, type TokenKind } from './tokenKinds';
import { STYLE_RULE_EXCEPTIONS } from './styleRules.allow';

// Every colour in the app's styles against the colour architecture (tokenKinds.ts, tokens/README):
// what it paints, in which state, with a token of which kind, and in a part with its own state tokens
// whether it takes the part's. A colour that is not a token at all is reported too; the exceptions
// (styleRules.allow.ts) say why each one that stays does.

const SRC = path.resolve(__dirname, '../..');
const read = (aRel: string) => fs.readFileSync(path.join(SRC, aRel), 'utf8');

const walk = (aDir: string, aOut: string[] = []): string[] => {
    for (const sName of fs.readdirSync(aDir)) {
        const sPath = path.join(aDir, sName);
        if (fs.statSync(sPath).isDirectory()) {
            if (sName !== 'public-dashboard' && sName !== 'node_modules') walk(sPath, aOut);
        } else if (/\.(scss|css|tsx)$/.test(sName) && !/\.test\./.test(sName)) aOut.push(path.relative(SRC, sPath));
    }
    return aOut;
};
const FILES = walk(SRC).filter((f) => !/^design-system\/tokens\/_(colors|darkIsland)\.scss$/.test(f));
/** The .ts files (chart colours name tokens too), for the checks that read text, not rules. */
const walkTs = (aDir: string, aOut: string[] = []): string[] => {
    for (const sName of fs.readdirSync(aDir)) {
        const sPath = path.join(aDir, sName);
        if (fs.statSync(sPath).isDirectory()) {
            if (sName !== 'public-dashboard' && sName !== 'node_modules') walkTs(sPath, aOut);
        } else if (/\.ts$/.test(sName) && !/\.test\.|\.d\.ts$/.test(sName) && !/tokens\/(tokenKinds|styleRules\.allow)\.ts$/.test(sPath)) aOut.push(path.relative(SRC, sPath));
    }
    return aOut;
};

/** Sass names in the token module → the token they are (`$side-text-muted` is side-text-muted). */
const SASS_TOKEN = new Map<string, string>();
for (const sLine of read('design-system/tokens/_colors.scss').split('\n')) {
    const m = /^\$([a-z0-9-]+):\s*(.+?);/.exec(sLine);
    if (!m) continue;
    const t = /^themed\(\s*([a-z0-9-]+)/.exec(m[2]) ?? /^var\(--neo-([a-z0-9-]+)/.exec(m[2]);
    if (t) SASS_TOKEN.set(m[1], t[1]);
    else {
        const sAlias = /^\$([a-z0-9-]+)$/.exec(m[2].trim());
        if (sAlias && SASS_TOKEN.has(sAlias[1])) SASS_TOKEN.set(m[1], SASS_TOKEN.get(sAlias[1])!);
    }
}
/**
 * Tokens that fall back to another token (_colors.scss `themed(side-hover-bg, $bg-hover-block)`): the
 * parts' own and a few shared steps. A theme that leaves one unset — every preset leaves the parts'
 * unset — shows what the site names after it, so that must be a token, never the dark screen's colour.
 */
const FALLS_BACK = new Map<string, string>();
for (const sLine of read('design-system/tokens/_colors.scss').split('\n')) {
    const m = /^\$[a-z0-9-]+:\s*themed\(\s*([a-z0-9-]+)\s*,\s*\$([a-z0-9-]+)\s*\)/.exec(sLine);
    if (m && SASS_TOKEN.has(m[2])) FALLS_BACK.set(m[1], SASS_TOKEN.get(m[2])!);
}
/** Tag Analyzer's own colour names (ui/_theme.scss). */
const TA_VARS = new Map<string, string>();
for (const sLine of read('components/tagAnalyzer/ui/_theme.scss').split('\n')) {
    const m = /^\$([a-z0-9-]+):\s*(.+?);/.exec(sLine);
    if (m) TA_VARS.set(m[1], m[2]);
}
/** Custom properties a part sets for its subtree (`--page-bg`, the data viewer's `--color-*`…): what they hold. */
const HOOKS = new Map<string, string>();
for (const f of FILES.filter((f) => /\.(scss|css)$/.test(f))) {
    for (const sLine of read(f).split('\n')) {
        const m = /^\s*--(?!neo-)([a-z0-9-]+)\s*:\s*(.+?);/.exec(sLine);
        if (m && !HOOKS.has(m[1])) HOOKS.set(m[1], m[2]);
    }
}

// a hex or rgb() colour, or a CSS colour name — the greys and the other names the code has used (`darkgray` slipped past `\bgray\b`)
/** The legacy globals files @import (assets/scss/variables.scss): their values, so a site using one is judged by what it holds. */
const GLOBALS = new Map<string, string>();
for (const sLine of read('assets/scss/variables.scss').split('\n')) {
    const m = /^\$([a-z0-9-]+):\s*(.+?);/.exec(sLine);
    if (m) GLOBALS.set(m[1], m[2]);
}

const LITERAL = /#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d|\b(white|black|red|blue|green|yellow|orange|(?:dark|light|dim|slate)?gr[ae]y|silver|gainsboro|whitesmoke|dodgerblue|tomato|crimson|gold|navy|teal|purple|lime|aqua|cyan|magenta|maroon|olive|pink|brown)\b/i;
/** The token a value paints with: the first in reading order — a var() chain's outer token, a Sass name, a hook or a local. */
function tokenIn(aValue: string, aLocals: Map<string, string>, aDepth = 0): string | null {
    if (aDepth > 4) return null;
    const sFound: [number, string, string][] = [];
    const add = (aRe: RegExp, aKind: string) => {
        for (const m of aValue.matchAll(aRe)) sFound.push([m.index ?? 0, aKind, m[1]]);
    };
    add(/var\(\s*--neo-([a-z0-9-]+)/g, 'token');
    add(/\b(?:t|c|th|tokens)\.\$([a-z0-9-]+)/g, 'sass');
    add(/\b(?:t|c|th)\.themed\(\s*([a-z0-9-]+)/g, 'token');
    add(/(?<![\w.-])themed\(\s*([a-z0-9-]+)/g, 'token');
    add(/\btheme\.\$([a-z0-9-]+)/g, 'ta');
    add(/var\(\s*--(?!neo-)([a-z0-9-]+)/g, 'hook');
    for (const m of aValue.matchAll(/(?<![\w.-])\$([a-z0-9-]+)/g)) {
        if (aLocals.has(m[1])) sFound.push([m.index ?? 0, 'local', m[1]]);
        else if (GLOBALS.has(m[1])) sFound.push([m.index ?? 0, 'global', m[1]]);
    }
    if (!sFound.length) return LITERAL.test(aValue) ? 'LITERAL' : null;
    const [, sKind, sName] = sFound.sort((a, b) => a[0] - b[0])[0];
    if (sKind === 'token') return sName;
    if (sKind === 'sass') return SASS_TOKEN.get(sName) ?? `?${sName}`;
    if (sKind === 'ta') return tokenIn(TA_VARS.get(sName) ?? '', new Map(), aDepth + 1) ?? `ta:${sName}`;
    if (sKind === 'hook') {
        const sHeld = HOOKS.get(sName);
        return (sHeld && tokenIn(sHeld, new Map(), aDepth + 1)) || `hook:${sName}`;
    }
    if (sKind === 'global') return tokenIn(GLOBALS.get(sName)!, new Map(), aDepth + 1) ?? `local:${sName}`;
    return tokenIn(aLocals.get(sName)!, aLocals, aDepth + 1) ?? `local:${sName}`;
}

const BG = /^(background|background-color)$/;
const FG = /^(color|fill|stroke|caret-color|-webkit-text-fill-color|text-decoration-color)$/;
const LINE = /^(border|border-(top|right|bottom|left)|border(-[a-z]+)?-color|outline|outline-color|column-rule-color)$/;
const SELECTED = /(\.active\b|--active\b|is-active|activeItem|active-item|(?<![a-z])selected(?!-?(box|Box|SeriesList|-series|List|-list|Count|-count|-value|Value))|Selected(?!Box|SeriesList|List|Count|Value)|:checked|aria-selected|aria-pressed|aria-current|--on\b|is-checked|\.on\b|isActive|IsActive|IsSelected|--current|is-current)/;
const OPEN = /is-open|--open\b|\.open\b/;
const DISABLED = /:disabled|--disabled|is-disabled|\[disabled\]|readonly|Readonly/;
const DIALOGISH = /Modal|modal|Dialog|dialog|appView|Popover|popover/;

/**
 * One thing, one colour. A field and a menu have their own tokens (field-*, menu-*), so a theme that
 * gives inputs a colour gives it to every input: wherever one is drawn, its colour names the part's
 * token first (README, "One thing, one colour"). These are the field and the menu item as a selector
 * names them; a label, a wrapper, an icon or a placeholder beside them is not.
 */
const FIELD_EL = /(^|[\s>+~,(])(input|textarea|select)(?![\w-])|__input(?![\w-])|[.-]input(?![\w-])|\.textarea(?![\w-])/;
const MENU_ITEM_EL = /__option(?![\w-])|-option(?![\w-])|options-item|[Mm]enu-?[Ii]tem(?![\w-])|dropdownItem|__item(?![\w-])/;
const MENU_FILE = /menu|Menu|dropdown|Dropdown|combobox|Combobox|[Ss]elect|[Pp]icker/;
const NOT_THE_PART = /checkbox|radio|switch|range|color\]|label|helper|hint|placeholder|wrapper|icon|description|empty|meta|-sub\b|disabled/i;
/** A field or a menu item painted with something other than its part's tokens (null when it is not one, or is). */
function partSlot(aFile: string, aRole: PaintRole, aToken: string, aKind: TokenKind, aContext: string, aLeaf: string): string | null {
    const sLeaf = aLeaf.replace(/:not\((?:[^()]|\([^()]*\))*\)/g, '');
    if (!sLeaf || NOT_THE_PART.test(sLeaf) || aRole === 'shape') return null;
    const sState = stateOf(aContext);
    if (['signal', 'focus', 'accent'].includes(aKind)) return null;
    if (FIELD_EL.test(sLeaf) && (sState === 'rest' || sState === 'open')) {
        // what is typed in a field is the page's text (a glyph token); its ground and outline are the field's own
        if (aRole === 'fg') return aKind === 'glyph' || aToken === 'field-icon' ? null : `a field's text: ${aToken}, not a text token`;
        const sWant = aRole === 'bg' ? /^field-/ : /^field-border$/;
        return sWant.test(aToken) ? null : `a field's ${aRole}: ${aToken}, not field-*`;
    }
    if (MENU_ITEM_EL.test(sLeaf) && MENU_FILE.test(`${aFile} ${aContext}`)) {
        // a menu item's words are the page's text: any glyph token
        if (aRole === 'bg' && (sState === 'hover' || sState === 'focus') && aKind === 'hover') {
            return aToken === 'menu-item-hover-bg' ? null : `a menu item under the pointer: ${aToken}, not menu-item-hover-bg`;
        }
    }
    return null;
}

function stateOf(aContext: string): PaintState {
    const sBare = aContext.replace(/:not\((?:[^()]|\([^()]*\))*\)/g, '');
    const sHover = sBare.includes(':hover') || aContext.includes('hover-effect');
    const sSelected = SELECTED.test(sBare);
    if (sHover && sSelected) return 'selected-hover';
    if (sHover) return 'hover';
    if (sSelected) return 'selected';
    if (DISABLED.test(sBare)) return 'disabled';
    if (/:focus|--focused|is-focused|:active\b(?!-)/.test(aContext)) return 'focus';
    return OPEN.test(sBare) ? 'open' : 'rest';
}

interface Finding { file: string; line: number; what: string; token: string; context: string; value: string }

function judge(aFile: string, aLine: number, aProp: string, aValue: string, aContext: string, aLocals: Map<string, string>, aLeaf = ''): Finding | null {
    if (/transparent|inherit|currentColor|none|initial|unset/.test(aValue) && !/var\(|#|rgb|\$/.test(aValue)) return null;
    // a ring drawn with box-shadow (`0 0 0 2px …`, `inset 2px 0 0 0 …`: no blur) is a line; accent-color colours a native control
    const sRing = (aProp === 'box-shadow' || aProp === 'boxShadow') && /(^|,)\s*(inset\s+)?-?\d+(px)?\s+-?\d+(px)?\s+0(px)?\s/.test(aValue);
    const sRole: PaintRole | null =
        aProp === 'shape' ? 'shape' : BG.test(aProp) ? 'bg' : FG.test(aProp) ? 'fg' : LINE.test(aProp) || sRing || aProp === 'accent-color' || aProp === 'accentColor' ? 'line' : null;
    if (!sRole) return null;
    if (sRole === 'line' && !/var\(|#|rgb|\$|color-mix/.test(aValue)) return null;
    const sToken = tokenIn(aValue, aLocals);
    if (!sToken) return null;
    const sState: PaintState = sRole === 'bg' ? stateOf(aContext) : 'rest';
    const at = (aWhat: string): Finding => ({ file: aFile, line: aLine, what: aWhat, token: sToken, context: aContext.slice(-80), value: aValue.slice(0, 80) });
    if (sToken === 'LITERAL') return at(`${sRole}: a colour that is no token`);
    const sKind = KIND_OF[sToken];
    if (!sKind) return /^(hook|local|ta):|^\?/.test(sToken) ? null : at(`${sRole}: --neo-${sToken} is not a theme token`);
    if (sKind === 'scalar') return null;
    const sSlot = partSlot(aFile, sRole, sToken, sKind, aContext, aLeaf);
    if (sSlot) return at(sSlot);
    const sAllowed = new Set<TokenKind>(ALLOWED[sRole][sState] ?? ALLOWED[sRole].rest);
    if (sRole === 'bg' && sState === 'selected' && /tab/i.test(aContext)) sAllowed.add('surface'); // a selected tab is the open page's surface
    if (sRole === 'bg' && sState === 'selected-hover' && sToken === 'menu-item-hover-bg') sAllowed.add('hover'); // a menu's chosen option shows a check; the row hovers
    if (sRole === 'bg' && /dot|mask|icon|glyph|swatch-mark/i.test(aContext)) sAllowed.add('glyph'); // a dot or a masked icon is drawn with its fill
    if (sRole === 'line' && /checkbox|check|tick/i.test(aContext)) sAllowed.add('glyph'); // a tick drawn with borders is a glyph
    if (sRole === 'fg' && TEXT_COLOURS.includes(sToken)) sAllowed.add(sKind); // a signal or the accent as text
    // a text colour paints text: a fill or a line takes the -main token (a status dot or a mark is drawn like a glyph)
    if ((sRole === 'bg' || sRole === 'line') && TEXT_ONLY.includes(sToken) && !/dot|circle|mask|icon|glyph|swatch-mark|marker/i.test(aContext.split(/\s+/).slice(-3).join(' '))) return at(`${sRole}: ${sToken} is a text colour`);
    if (sRole === 'line' && sToken === 'selected-text' && SELECTED.test(aContext)) return null; // a selected row's marker: the selection's ink
    if (sRole === 'fg' && (aProp === 'stroke' || aProp === 'fill')) ['line', 'surface', 'fill', 'accent', 'signal', 'focus'].forEach((k) => sAllowed.add(k as TokenKind)); // an SVG shape's outline and fill
    if (!sAllowed.has(sKind)) return at(`${sRole} ${sState}: a ${sKind} token`);
    if (sRole === 'bg' && (sState === 'hover' || sState === 'selected') && (sKind === 'hover' || sKind === 'selection') && !/^(scrollbar|menu-)/.test(sToken)) {
        const sPart = PART_OF_FILE.find(([aRe]) => aRe.test(aFile))?.[1];
        const sOwn = sPart && !DIALOGISH.test(`${aFile} ${aContext}`) ? PART_STATE_TOKENS[sPart] : undefined;
        if (sOwn && sOwn[sState] && !sToken.startsWith(`${sOwn.prefix}-`)) return at(`${sPart} ${sState}: the shared ${sToken}, not ${sOwn[sState]}`);
    }
    return null;
}

function scanStyles(aFile: string): Finding[] {
    const sSource = read(aFile).replace(/\/\*[\s\S]*?\*\//g, (m) => '\n'.repeat(m.split('\n').length - 1));
    const sLines = sSource.split('\n');
    const sLocals = new Map<string, string>();
    for (const sLine of sLines) {
        const m = /^\s*\$([a-z0-9-]+):\s*(.+?);/.exec(sLine);
        if (m) sLocals.set(m[1], m[2]);
    }
    const sOut: Finding[] = [];
    const sStack: string[] = [];
    let sPending = '';
    sLines.forEach((aLine, i) => {
        const sCode = aLine.replace(/(?<![:'"])\/\/.*$/, '');
        // a line is cut at its braces: the text before a `{` is a selector, the rest are declarations in
        // the block open at that point — so `.a { color: x; }` on one line is judged too (`#{…}` is no brace)
        const sParts = sCode.replace(/#\{([^{}]*)\}/g, '#\u0001$1\u0002').split(/([{}])/);
        sParts.forEach((aPart, k) => {
            if (aPart === '{') return;
            if (aPart === '}') {
                sStack.pop();
                return;
            }
            if (sParts[k + 1] === '{') {
                sStack.push(`${sPending} ${aPart}`.trim());
                sPending = '';
                return;
            }
            if (!sStack.length) return;
            for (const sDecl of aPart.replace(/\u0001/g, '{').replace(/\u0002/g, '}').split(/;(?![^(]*\))/)) {
                const m = /^\s*([a-z-]+)\s*:\s*(.+?)\s*$/.exec(sDecl);
                if (m && !/^\s*[@$&.]/.test(sDecl)) {
                    const f = judge(aFile, i + 1, m[1], m[2], sStack.join(' '), sLocals, sStack[sStack.length - 1]);
                    if (f) sOut.push(f);
                }
            }
        });
        const sTrim = sCode.trim();
        if (sTrim.endsWith(',') && !sTrim.includes('{')) sPending += ` ${sTrim}`;
        else if (/[{};]/.test(sTrim)) sPending = '';
    });
    return sOut;
}

function scanComponent(aFile: string): Finding[] {
    const sLines = read(aFile).split('\n');
    const sOut: Finding[] = [];
    sLines.forEach((aLine, i) => {
        const sContext = sLines.slice(Math.max(0, i - 2), i + 1).join(' ');
        for (const m of aLine.matchAll(/\b(background(?:Color)?|color|fill|stroke|borderColor|border(?:Top|Bottom|Left|Right)?|outline|stopColor|boxShadow|accentColor)\s*:\s*([`'"])(.*?)\2/g)) {
            let sProp = { backgroundColor: 'background', borderColor: 'border-color', stopColor: 'fill', boxShadow: 'box-shadow', accentColor: 'accent-color' }[m[1]] ?? m[1];
            sProp = sProp.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
            if (sProp === 'fill' || sProp === 'stroke') sProp = 'shape'; // an SVG drawing's shape, not text
            const f = judge(aFile, i + 1, sProp, m[3], sContext, new Map());
            if (f) sOut.push(f);
        }
        // `prop: cond ? 'a' : 'b'` — both colours
        for (const m of aLine.matchAll(/\b(background(?:Color)?|color|borderColor|outline|boxShadow)\s*:\s*[^,'"`{}]*\?\s*([`'"])(.*?)\2\s*:\s*([`'"])(.*?)\4/g)) {
            let sProp = { backgroundColor: 'background', borderColor: 'border-color', boxShadow: 'box-shadow' }[m[1]] ?? m[1];
            sProp = sProp.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
            for (const sValue of [m[3], m[5]]) {
                const f = judge(aFile, i + 1, sProp, sValue, sContext, new Map());
                if (f) sOut.push(f);
            }
        }
        for (const m of aLine.matchAll(/\b(fill|stroke|color)=\{?["']([^"']*var\(--neo[^"']*)["']/g)) {
            const f = judge(aFile, i + 1, m[1], m[2], aLine, new Map());
            if (f) sOut.push(f);
        }
        // a colour written into an SVG or icon attribute — `stroke="#f1f1f1"`, `fill={a ? '#d6d6d6' : '#555'}` —
        // is a colour the theme cannot reach (the New tab clock's hands stayed white on a light dial)
        const sAttrRole = (aProp: string) => (aProp === 'color' ? 'fg' : 'shape');
        if (/^\s*(\/\/|\{\/\*)/.test(aLine)) return; // code left in a comment
        for (const m of aLine.matchAll(/\b(fill|stroke|stopColor|color)=\{?["'](#[0-9a-fA-F]{3,8}|rgba?\([^"']*\))["']/g)) {
            const f = judge(aFile, i + 1, sAttrRole(m[1]), m[2], sContext, new Map());
            if (f) sOut.push(f);
        }
        for (const m of aLine.matchAll(/\b(fill|stroke|stopColor|color)=\{[^}]*\?\s*["']([^"']*)["']\s*:\s*["']([^"']*)["']/g)) {
            for (const sValue of [m[2], m[3]]) {
                if (!/^(#[0-9a-fA-F]{3,8}|rgba?\()/.test(sValue)) continue;
                const f = judge(aFile, i + 1, sAttrRole(m[1]), sValue, sContext, new Map());
                if (f) sOut.push(f);
            }
        }
    });
    return sOut;
}

/** `var(--neo-<a token that falls back>, <a colour>)`: the theme that leaves the token unset gets the dark colour. */
function scanFallbacks(aFile: string): Finding[] {
    const sOut: Finding[] = [];
    read(aFile).split('\n').forEach((aLine, i) => {
        for (const m of aLine.matchAll(/var\(--neo-([a-z0-9-]+),\s*([^\s][^)]{0,40})/g)) {
            const sBack = FALLS_BACK.get(m[1]);
            if (sBack && !/^(var\(--|(t|c|th|theme)\.\$|#\{)/.test(m[2])) {
                sOut.push({ file: aFile, line: i + 1, what: `--neo-${m[1]} falls back to ${sBack}: name a token after it, not a colour`, token: m[1], context: aLine.trim().slice(0, 80), value: m[2] });
            }
        }
    });
    return sOut;
}

const FINDINGS = FILES.flatMap((f) => [...(f.endsWith('.tsx') ? scanComponent(f) : scanStyles(f)), ...scanFallbacks(f)]);
const USED = new Set<number>();
const excuse = (aFinding: Finding) => {
    const sLine = read(aFinding.file).split('\n')[aFinding.line - 1];
    const k = STYLE_RULE_EXCEPTIONS.findIndex((e) => e.file.test(aFinding.file) && (!e.match || e.match.test(sLine)));
    if (k >= 0) USED.add(k);
    return k >= 0;
};
const VIOLATIONS = FINDINGS.filter((f) => !excuse(f));

test('every theme token has exactly one kind', () => {
    const sTokens = parseThemeTokens(['_colors.scss', '_shadows.scss', '_border-radius.scss', '_effects.scss'].map((f) => read(`design-system/tokens/${f}`))).map((t) => t.name);
    const sKinded = Object.values(TOKEN_KINDS).flat();
    expect(sTokens.filter((t) => !KIND_OF[t])).toEqual([]);
    expect(sKinded.filter((t) => !sTokens.includes(t))).toEqual([]);
    expect(sKinded.length).toBe(new Set(sKinded).size);
});

test('every colour in the styles is a token of the kind its place and state take', () => {
    expect(FINDINGS.length).toBeGreaterThan(50); // the scan reads the styles (the exceptions alone find this many)
    expect(VIOLATIONS.map((f) => `${f.file}:${f.line}  ${f.what}  [${f.token}]  ${f.context.trim()}`)).toEqual([]);
});

/**
 * Every token is written one way: as the token sources define it (`t.$field-bg`, or that written out).
 * A site that kept its own dark value after the token — `var(--neo-field-bg, var(--neo-bg-elevated,
 * #323644))` — showed its own colour on the dark screen, so a thing was one colour in a theme and
 * several without one. The lines styleRules.allow.ts lets stand keep theirs (a light mode's line, a
 * terminal's black…); a chart's literal→token table keeps the chart's own colour as the fallback.
 */
const LITERAL_TABLES = /^(components\/tagAnalyzer\/chart\/chartThemeColors|components\/dataViewer\/chartPalette)\.ts$/;
const SASS_SOURCE = new Map<string, string>();
for (const sLine of ['_colors.scss', '_shadows.scss', '_effects.scss', '_border-radius.scss'].flatMap((f) => read(`design-system/tokens/${f}`).split('\n'))) {
    const m = /^\$([a-z0-9-]+):\s*(.+?);/.exec(sLine);
    if (m) SASS_SOURCE.set(m[1], m[2].trim());
}
const expandSass = (aValue: string): string => {
    const m = /^themed\(\s*([a-z0-9-]+)\s*,\s*(.+)\)$/.exec(aValue.trim());
    if (m) return `var(--neo-${m[1]}, ${expandSass(m[2])})`;
    const sAlias = /^\$([a-z0-9-]+)$/.exec(aValue.trim());
    return sAlias && SASS_SOURCE.has(sAlias[1]) ? expandSass(SASS_SOURCE.get(sAlias[1])!) : aValue.trim();
};
const CANONICAL = new Map([...SASS_SOURCE].filter(([n, v]) => new RegExp(`^themed\\(\\s*${n}\\s*,`).test(v)).map(([n, v]) => [n, expandSass(v)]));
const closing = (aText: string, aOpen: number): number => {
    let sDepth = 0;
    for (let i = aOpen; i < aText.length; i++) {
        if (aText[i] === '(') sDepth++;
        else if (aText[i] === ')' && --sDepth === 0) return i + 1;
    }
    return aText.length;
};

test('every token is written one way, so the dark screen shows one colour for it too', () => {
    expect(CANONICAL.get('field-bg')).toBe('var(--neo-field-bg, var(--neo-bg-elevated, #2c2c2c))');
    expect(CANONICAL.size).toBeGreaterThan(100);
    const sOff: string[] = [];
    for (const f of [...FILES, ...walkTs(SRC)].filter((f) => !LITERAL_TABLES.test(f))) {
        const sText = read(f);
        let sSkipTo = 0;
        for (const m of sText.matchAll(/var\(\s*--neo-([a-z0-9-]+)\s*,/g)) {
            const sAt = m.index ?? 0;
            if (sAt < sSkipTo) continue; // the inner token of a chain checked as its outer one
            const sEnd = closing(sText, sAt + 3);
            sSkipTo = sEnd;
            const sWant = CANONICAL.get(m[1]);
            const sGot = sText.slice(sAt, sEnd);
            const sLine = sText.slice(sText.lastIndexOf('\n', sAt) + 1, sText.indexOf('\n', sAt) < 0 ? undefined : sText.indexOf('\n', sAt));
            const sExc = STYLE_RULE_EXCEPTIONS.findIndex((e) => e.file.test(f) && (!e.match || e.match.test(sLine)));
            if (sExc >= 0) {
                USED.add(sExc);
                continue;
            }
            if (sWant && sGot !== sWant) sOff.push(`${f}:${sText.slice(0, sAt).split('\n').length}  ${sGot}  (write ${sWant})`);
        }
    }
    expect(sOff).toEqual([]);
});

test('every exception still covers something', () => {
    expect(STYLE_RULE_EXCEPTIONS.filter((_, k) => !USED.has(k)).map((e) => `${e.file} ${e.match ?? ''}`)).toEqual([]);
});

/**
 * Colours kept in a table in a .ts file (a level's colour, a level's fill…): a table named for text
 * (`…COLORS`, `…TEXT`, `…INK`) holds text colours, one named for fills (`…FILLS`, `…BG`) no text-only
 * colour — the class of slip the console's repeat badge made twice.
 */
test('a colour table in a .ts file holds the kind its name says', () => {
    const sOff: string[] = [];
    for (const f of walkTs(SRC).filter((f) => !LITERAL_TABLES.test(f))) {
        const sText = read(f);
        for (const m of sText.matchAll(/const\s+([A-Z][A-Z0-9_]*)\s*(?::[^=]+)?=\s*\{([\s\S]*?)\n\};/g)) {
            const sFills = /FILL|_BG|BACKGROUND/.test(m[1]);
            const sTexts = !sFills && /COLOU?RS?$|TEXT|INK/.test(m[1]);
            if (!sFills && !sTexts) continue;
            for (const t of m[2].matchAll(/var\(--neo-([a-z0-9-]+)/g)) {
                const sKind = KIND_OF[t[1]];
                if (sFills && TEXT_ONLY.includes(t[1])) sOff.push(`${f} ${m[1]}: ${t[1]} is a text colour`);
                if (sTexts && !(sKind === 'glyph' || sKind === 'content' || TEXT_COLOURS.includes(t[1]))) sOff.push(`${f} ${m[1]}: ${t[1]} (${sKind}) is not text`);
            }
        }
    }
    expect(sOff).toEqual([]);
});

test('no call site uses themed() — it writes the token (themed() is the token sources\')', () => {
    const sOff = FILES.filter((f) => /\.scss$/.test(f) && !/^design-system\/tokens\/_/.test(f)).filter((f) => /(^|[^\w$-])([a-z]+\.)?themed\(/.test(read(f).replace(/\/\/[^\n]*/g, '')));
    expect(sOff).toEqual([]);
});
