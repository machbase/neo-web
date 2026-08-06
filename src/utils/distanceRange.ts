/**
 * The distance (numeric base) range editor's arithmetic, shared by both editors that draw one:
 * the Data Viewer's `DistanceRangeModal` and the dashboard's `DistanceRangeTab`.
 *
 * The two own their own shells — one is a dialog on the `.neo-data-viewer` tokens, the other a tab
 * body inside the shared Modal — but a thumb drag, a track click and a "First 25%" have to mean the
 * same number in both, so every value the slider can produce is computed here and nowhere else.
 */

// A distance edge is a bare decimal number. `Number()` alone is too generous to build SQL from: it
// accepts '0x10' (16), '0b11' (3), 'Infinity', and whitespace-only strings (0), and every one of
// those would either be a silently wrong bound or a literal the server rejects. Requiring the plain
// decimal shape first means the value interpolated into the WHERE clause is always something the
// user could have typed into the editor — which is also what makes the interpolation injection-safe.
const DECIMAL_LITERAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

/**
 * A distance range edge as a number, or `null` when the value is not one.
 *
 * `null` is the refusal every distance caller keys off: the SQL builders drop the bound rather than
 * emit the raw text, and the page reports the range as invalid rather than querying with it.
 */
export function parseDistanceValue(value: unknown): number | null {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const text = String(value ?? '').trim();
    if (!text || !DECIMAL_LITERAL.test(text)) return null;
    const numeric = Number(text);
    return Number.isFinite(numeric) ? numeric : null;
}

/** A distance value as text. Never a date — that is the whole point of it existing. */
export function formatDistanceValue(value: unknown) {
    const numeric = parseDistanceValue(value);
    if (numeric !== null) return String(numeric);
    return value === null || value === undefined ? '' : String(value);
}

// A window edge that survives being written into a text input. `(4828 / 3) * 2` is
// 3218.6666666666665 and `0.1 + 0.2` is 0.30000000000000004; either one printed into the From box
// is a number nobody typed and nobody can retype. Twelve significant digits is past anything the
// slider's ~1/1000-of-extent step can resolve, so this only ever removes the noise.
const roundDistanceEdge = (value: number) => Number(Number(value).toPrecision(12));

/**
 * The finest number the distance editor will write into an edge, for a given extent.
 *
 * `roundDistanceEdge` scrubs the last-bit noise of a float multiplication, but it cannot scrub the
 * noise of a *pixel ratio*: `401578.346465` is twelve honest significant digits and still a number
 * nobody chose and nobody can retype. Quantising to a ten-thousandth of the extent's own decade is
 * what turns one back into a number — tenths on a 4,828 m extent, tens on a 999,990 m one — while
 * staying far finer than the ~1/1000-of-extent step the thumbs move in, so it never costs a value
 * anybody was aiming at.
 */
function distanceQuantum(extent: number) {
    if (!Number.isFinite(extent) || extent <= 0) return 0;
    return 10 ** (Math.floor(Math.log10(extent)) - 4);
}

const quantizeDistanceEdge = (value: number, quantum: number) =>
    quantum > 0 ? roundDistanceEdge(Math.round(value / quantum) * quantum) : roundDistanceEdge(value);

/**
 * A distance value read off the slider — a pixel on the rail, or an arrow key — as the number the
 * editor will actually hold. Three things, in this order, and the order is the point:
 *
 * 1. **The bounds are sticky.** The thumbs move in a round step of about a thousandth of the extent,
 *    and a round step almost never divides the extent: 0 .. 999,990 in steps of 1,000 runs out at
 *    999,000 and the last 990 m of the axis are unreachable, which is exactly the range the user
 *    could not apply. Anything within half a step of an end therefore *is* that end, so "drag it all
 *    the way over" and `End` land on the real bound rather than near it.
 * 2. **The interior snaps to the step grid**, so the values between the two ends stay round.
 * 3. **What comes out is quantised and clamped**, so a fractional step cannot leave
 *    `1930.0000000000002` in the From box and nothing can escape the extent.
 */
export function snapDistanceEdge({ value, min, max, step }: { value?: unknown; min?: unknown; max?: unknown; step?: unknown } = {}) {
    const numeric = Number(value);
    const lower = Number(min);
    const upper = Number(max);
    if (!Number.isFinite(numeric)) return Number.isFinite(lower) ? lower : 0;
    // No extent is no rail. The editor does not draw one in that state, so the honest answer is the
    // value it was handed rather than a bound invented out of a broken interval.
    if (!Number.isFinite(lower) || !Number.isFinite(upper) || !(upper > lower)) return roundDistanceEdge(numeric);

    const grid = Number(step);
    const reach = Number.isFinite(grid) && grid > 0 ? grid / 2 : 0;
    if (numeric - lower <= reach) return lower;
    if (upper - numeric <= reach) return upper;

    const snapped = Number.isFinite(grid) && grid > 0 ? lower + Math.round((numeric - lower) / grid) * grid : numeric;
    return Math.min(upper, Math.max(lower, quantizeDistanceEdge(snapped, distanceQuantum(upper - lower))));
}

/**
 * Where the window lands when the slider's *track* is clicked, rather than a thumb dragged.
 *
 * The click names a centre, not an edge: the window keeps the width it already had and slides so
 * that the clicked point is in the middle of it. That is the whole reason this is not just "set the
 * nearest thumb" — a user who has already chosen a 500 m window and wants to see the next stretch of
 * track is asking to move the window, not to resize it.
 *
 * Clamping moves the window instead of shrinking it. Pushing an edge back to the bound while the
 * other stayed put would quietly narrow a window the user never asked to narrow, so a click near
 * either end parks the same-width window flush against that end.
 */
export function buildDistanceSliderClickRange({
    ratio,
    from,
    to,
    min,
    max,
}: {
    ratio?: unknown;
    from?: unknown;
    to?: unknown;
    min?: unknown;
    max?: unknown;
} = {}): { from: number; to: number } | null {
    const lower = Number(min);
    const upper = Number(max);
    const position = Number(ratio);
    if (![lower, upper, position].every(Number.isFinite)) return null;
    // No extent is no track: the editor does not draw the slider at all in that state, so there is
    // nothing a click could mean.
    if (!(upper > lower)) return null;

    const extent = upper - lower;
    const clampToExtent = (value: number) => Math.min(Math.max(value, lower), upper);
    const start = parseDistanceValue(from);
    const end = parseDistanceValue(to);
    // An edge that does not parse has no width to preserve. The bound is where the modal already
    // parks that thumb, so reading it the same way here keeps the click consistent with what is
    // drawn rather than inventing a span out of a value nobody can see.
    const currentStart = start === null ? lower : clampToExtent(start);
    const currentEnd = end === null ? upper : clampToExtent(end);
    const span = Math.min(Math.max(currentEnd - currentStart, 0), extent);

    const centre = lower + Math.min(Math.max(position, 0), 1) * extent;
    // Quantised *before* the clamp, so the two ends still park flush against the bound rather than a
    // rounding of it. The ratio is a pixel position, which is where `401578.346465` comes from — see
    // `distanceQuantum` — and the clamp is what preserves the width the click promised to keep.
    let nextStart = quantizeDistanceEdge(centre - span / 2, distanceQuantum(extent));
    if (nextStart < lower) nextStart = lower;
    if (nextStart + span > upper) nextStart = upper - span;

    return { from: roundDistanceEdge(nextStart), to: roundDistanceEdge(nextStart + span) };
}

/**
 * The window a "quick window" button sets: a fraction of the extent, anchored to one of its ends.
 *
 * `First 25%` is the first quarter of the *extent*, not of whatever window happens to be open — the
 * buttons exist precisely so that a window nobody can find their way back from is one click away
 * from a known one. `Full` is the whole extent, which is the same thing as `First 100%`, so it goes
 * through here too rather than being special-cased at the call site.
 *
 * Returns `null` on an extent that is not a real interval, which is the same answer the slider gives
 * it: with no extent there is no fraction of anything to take, and the buttons are not drawn.
 */
export function buildDistanceQuickWindow({
    min,
    max,
    edge = 'first',
    ratio = 1,
}: {
    min?: unknown;
    max?: unknown;
    edge?: 'first' | 'last';
    ratio?: unknown;
} = {}): { from: number; to: number } | null {
    const lower = Number(min);
    const upper = Number(max);
    const fraction = Number(ratio);
    if (![lower, upper, fraction].every(Number.isFinite)) return null;
    if (!(upper > lower)) return null;

    const extent = upper - lower;
    const span = Math.min(Math.max(fraction, 0), 1) * extent;
    // The anchored edge is the bound itself and stays exact — `Full` has to be *the* extent, not a
    // rounding of it, or the one button that exists to select everything would select all but the
    // last few metres. Only the free edge, which is a fraction of the extent and so can carry float
    // noise, is quantised.
    const quantum = distanceQuantum(extent);
    const freeEdge = (value: number) => Math.min(upper, Math.max(lower, quantizeDistanceEdge(value, quantum)));
    return edge === 'last' ? { from: freeEdge(upper - span), to: roundDistanceEdge(upper) } : { from: roundDistanceEdge(lower), to: freeEdge(lower + span) };
}

// ~5 round ticks across the extent, at a 1/2/5 × 10ⁿ step — the same family of steps an axis picks,
// so the labels read `0, 1k, 2k, 3k, 4k` rather than `0, 966, 1932, …`.
export function buildDistanceTickValues(min: number, max: number) {
    const span = max - min;
    if (!Number.isFinite(span) || span <= 0) return [];
    const magnitude = 10 ** Math.floor(Math.log10(span / 4));
    const step = [1, 2, 5, 10].map((factor) => factor * magnitude).find((candidate) => span / candidate <= 5) ?? magnitude * 10;
    const ticks: number[] = [];
    // `toPrecision` because a decimal step accumulates float error over the walk (0.1 + 0.2 …), and
    // a tick labelled `0.30000000000000004` is worse than no tick at all.
    for (let value = Math.ceil(min / step) * step, guard = 0; value <= max && guard < 64; value += step, guard += 1) {
        ticks.push(Number(Number(value).toPrecision(12)));
    }
    return ticks;
}

// Compact, for the tick scale only: the readout and the max label spell the number out in full.
export function formatDistanceTickLabel(value: number) {
    const units = [
        { value: 1_000_000_000, suffix: 'b' },
        { value: 1_000_000, suffix: 'm' },
        { value: 1_000, suffix: 'k' },
    ];
    const normalized = Object.is(value, -0) ? 0 : value;
    const unit = units.find((item) => Math.abs(normalized) >= item.value);
    if (!unit) return new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(normalized);
    return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(normalized / unit.value)}${unit.suffix}`;
}

/** The headline number: grouped, spelled out in full, `-` when the edge is not a number at all. */
export const formatDistanceReadout = (value: number | null) =>
    value === null || !Number.isFinite(value) ? '-' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(value);

export const clampDistance = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// The thumb is 8px wide, so a native range input centres it half that far inside each end of the
// rail. Every pixel↔value conversion in the editors works on the inset rail rather than the element
// box, which is what keeps a thumb rendered at the maximum sitting under the pointer that put it there.
export const DISTANCE_THUMB_WIDTH = 8;
// How close a press has to land to count as "on that thumb" rather than as a press on bare track.
// A little wider than the thumb, because an 8px target is not one.
export const DISTANCE_THUMB_GRAB_PX = 10;

// The two quick windows rows, in the order they are drawn. `Full` is the whole extent, expressed as
// the same "first N%" the row above it uses, so there is one rule and no special case.
export const DISTANCE_QUICK_WINDOWS: Array<Array<{ label: string; edge: 'first' | 'last'; ratio: number }>> = [
    [
        { label: 'First 10%', edge: 'first', ratio: 0.1 },
        { label: 'First 25%', edge: 'first', ratio: 0.25 },
        { label: 'First 50%', edge: 'first', ratio: 0.5 },
    ],
    [
        { label: 'Last 50%', edge: 'last', ratio: 0.5 },
        { label: 'Last 25%', edge: 'last', ratio: 0.25 },
        { label: 'Full', edge: 'first', ratio: 1 },
    ],
];

// ── anchored edges ────────────────────────────────────────────────────────────────────────────
// A distance window can be pinned to the data instead of to a coordinate: `last-5000 ~ last` is the
// most recent 5,000 units and follows new rows the way `last-1h ~ last` does on a time axis, and
// `first ~ first+5000` is the opening stretch. The grammar deliberately mirrors the time axis —
// anchor, sign, magnitude — except that the magnitude is a raw number in the base column's own unit
// because a distance has no minutes or hours to name.
const DISTANCE_ANCHOR = /^(first|last)(?:\s*([+-])\s*(\d+(?:\.\d*)?|\.\d+)(?:[eE]([+-]?\d+))?)?$/i;

export type DistanceAnchor = { anchor: 'first' | 'last'; offset: number };

/** `'last-5000'` → `{ anchor: 'last', offset: -5000 }`; anything that is not an anchor → `null`. */
export function parseDistanceAnchor(value: unknown): DistanceAnchor | null {
    if (typeof value !== 'string') return null;
    const sMatch = DISTANCE_ANCHOR.exec(value.trim());
    if (!sMatch) return null;
    const sAnchor = sMatch[1].toLowerCase() as 'first' | 'last';
    if (!sMatch[3]) return { anchor: sAnchor, offset: 0 };
    const sMagnitude = Number(`${sMatch[3]}${sMatch[4] ? `e${sMatch[4]}` : ''}`);
    if (!Number.isFinite(sMagnitude)) return null;
    return { anchor: sAnchor, offset: sMatch[2] === '-' ? -sMagnitude : sMagnitude };
}

/** Is this edge pinned to the data (`first`/`last`) rather than to a fixed coordinate? */
export const isDistanceAnchorEdge = (value: unknown) => parseDistanceAnchor(value) !== null;

/** Has this edge been given a value at all? `''`/null mean "not set" — follow whatever is above. */
export const isDistanceEdgeSet = (value: unknown) => value !== '' && value !== null && value !== undefined;

/**
 * An edge as the number the query will use: a plain number passes through, an anchored one is
 * measured off the data's own extent, and anything else (unset, unparseable) is `null` so the caller
 * can fall back to the bound it would have used anyway.
 *
 * Anchored edges are clamped to the extent: `last-5000` on a 3,000-unit dataset is its beginning,
 * not a coordinate before the data starts.
 */
export function resolveDistanceEdge(value: unknown, bounds?: { min: number; max: number } | null): number | null {
    const sAnchor = parseDistanceAnchor(value);
    if (sAnchor) {
        // The same "is there an extent" test the editors draw by: 0 .. 0 is not an interval to measure
        // an offset against, and answering 0 there would look like a coordinate somebody chose.
        if (!bounds || !Number.isFinite(bounds.min) || !Number.isFinite(bounds.max) || !(bounds.max > bounds.min)) return null;
        const sBase = sAnchor.anchor === 'first' ? bounds.min : bounds.max;
        return clampDistance(roundDistanceEdge(sBase + sAnchor.offset), bounds.min, bounds.max);
    }
    return parseDistanceValue(value);
}

/** Both edges at once, for the callers that always need the pair. */
export const resolveDistanceRange = (from: unknown, to: unknown, bounds?: { min: number; max: number } | null) => ({
    from: resolveDistanceEdge(from, bounds),
    to: resolveDistanceEdge(to, bounds),
});

/** The edge as the user wrote it: an anchor keeps its expression, a number is grouped for reading. */
export const formatDistanceEdgeLabel = (value: unknown) => {
    if (isDistanceAnchorEdge(value)) return String(value).trim().toLowerCase().replace(/\s+/g, '');
    const sNumeric = parseDistanceValue(value);
    return sNumeric === null ? '' : formatDistanceReadout(sNumeric);
};

/**
 * The window a quick-window button writes, as *expressions* rather than coordinates: the fraction is
 * measured once, off the extent at the moment of the click, and then travels with the data. `Full`
 * is `first ~ last`, which is the whole extent however much of it there comes to be.
 */
export function buildDistanceQuickWindowExpression({
    min,
    max,
    edge = 'first',
    ratio = 1,
}: {
    min?: unknown;
    max?: unknown;
    edge?: 'first' | 'last';
    ratio?: unknown;
} = {}): { from: string; to: string } | null {
    const sWindow = buildDistanceQuickWindow({ min, max, edge, ratio });
    if (!sWindow) return null;
    const sSpan = roundDistanceEdge(sWindow.to - sWindow.from);
    const sExtent = Number(max) - Number(min);
    // The whole extent is both anchors at once — no magnitude to drift out of date.
    if (sSpan >= sExtent) return { from: 'first', to: 'last' };
    return edge === 'last' ? { from: `last-${sSpan}`, to: 'last' } : { from: 'first', to: `first+${sSpan}` };
}

/**
 * A distance in SI short form — the same scaling the chart's `SI short` unit applies to its axis
 * labels, so a range shown in the header reads like the axis it belongs to: `25,150,651` → `25.151 M`.
 *
 * Three decimals rather than the axis's one: a header chip is the only place two *nearby* edges are
 * printed side by side, and `25.2 M ~ 25.2 M` would say the window is empty when it is 325 units wide.
 * (`formatDistanceTickLabel` stays as it is — a tick has one number and no neighbour to be confused
 * with, and its labels are deliberately terser.)
 */
export function formatDistanceSiShort(value: unknown, maxDecimals = 3) {
    const numeric = parseDistanceValue(value);
    if (numeric === null) return '-';
    const units = [
        { value: 1_000_000_000, suffix: 'G' },
        { value: 1_000_000, suffix: 'M' },
        { value: 1_000, suffix: 'K' },
    ];
    const normalized = Object.is(numeric, -0) ? 0 : numeric;
    const unit = units.find((item) => Math.abs(normalized) >= item.value);
    const scaled = unit ? normalized / unit.value : normalized;
    const text = new Intl.NumberFormat('en-US', { maximumFractionDigits: maxDecimals }).format(scaled);
    return unit ? `${text} ${unit.suffix}` : text;
}

/**
 * A tick label sized to the scale it sits on.
 *
 * `formatDistanceTickLabel` prints one decimal, which is right for an axis that spans its own decade
 * and wrong for one that does not: an extent of 885 units around 25,150,000 gives five ticks that all
 * read `25.1m`, and a max label spelled out in full (`25,150,885.5`) that is long enough to overlap
 * the tick beside it. Deriving the decimals from the *step* keeps consecutive ticks distinct — and
 * keeps them short, which is the other half of not overlapping.
 */
export function formatDistanceAxisLabel(value: number, step: number) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '-';
    const units = [
        { value: 1_000_000_000, suffix: 'G' },
        { value: 1_000_000, suffix: 'M' },
        { value: 1_000, suffix: 'K' },
    ];
    const normalized = Object.is(numeric, -0) ? 0 : numeric;
    const unit = units.find((item) => Math.abs(normalized) >= item.value);
    const scaled = unit ? normalized / unit.value : normalized;
    const scaledStep = Math.abs(Number(step)) / (unit ? unit.value : 1);
    // One digit past the step: at a step of 0.0002 M that is four decimals, so 25.1509 M and
    // 25.1511 M are two different labels rather than one repeated five times.
    const decimals = Number.isFinite(scaledStep) && scaledStep > 0 ? Math.min(6, Math.max(0, Math.ceil(-Math.log10(scaledStep)))) : 0;
    const text = new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals }).format(scaled);
    return unit ? `${text}${unit.suffix}` : text;
}

/**
 * How many of the tick values to actually draw, given how wide their labels came out. Five labels of
 * `25.1509M` do not fit where five of `50k` do, and a rail with the numbers written over each other
 * is worth less than a rail with three of them.
 */
export function thinDistanceTicks<T>(ticks: T[], labelOf: (aTick: T) => string, maxLabelChars = 6) {
    const longest = ticks.reduce((aMax, aTick) => Math.max(aMax, labelOf(aTick).length), 0);
    const keepEvery = longest > maxLabelChars * 2 ? 3 : longest > maxLabelChars ? 2 : 1;
    return ticks.filter((_, aIndex) => aIndex % keepEvery === 0);
}
