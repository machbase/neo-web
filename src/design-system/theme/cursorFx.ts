// -----------------------------------------------------------------------------
// CURSOR EFFECT — an easter egg a theme switches on, never code a theme brings
// -----------------------------------------------------------------------------
// A theme names one with `--neo-fx-cursor`; the effects are built in, the theme brings no code:
//   sandevistan — the pointer leaves a trail of after-images in shifting neon hues (Cyberpunk does);
//   comet       — glowing gold points fall from where the pointer moves, each shedding glitter —
//                 bit by bit, every one drifting back, spreading and sinking as it twinkles out.
// It takes no pointer events and stays off for anyone who asked for reduced motion.
//
// Sandevistan draws nothing per frame: each after-image is a small layer holding an image drawn once at
// start; a move places one by transform and the browser fades it on the compositor. (A canvas over the
// whole page that blurred every arrow again on every frame kept the main thread busy for seconds after
// one flick.) Comet does draw each frame — its glitter is too many bits going too many ways for
// layers — but never a blur: what glows is drawn once into an image, and a frame stamps it.

import { THEME_CHANGE_EVENT } from './theme';

export const CURSOR_FX_VAR = '--neo-fx-cursor';
export const CURSOR_FX_LAYER_ID = 'neo-fx-cursor';

/** How long an after-image lasts, and how far apart they are dropped along the path. */
const LIFE_MS = 500;
const STEP_PX = 12;
/** The neon run the hues go round — cyan, violet, magenta, amber — in 8 steps from one to the next. */
const HUES = [185, 265, 315, 45];
const HUE_STEPS = HUES.length * 8;
/** One layer per hue step; the trail takes them in turn, so a layer always shows the same hue. */
export const CURSOR_FX_POOL = HUE_STEPS;
/** An after-image's size, and where the arrow's tip sits in it (the rest is room for the glow). */
const SPRITE_PX = 40;
const TIP_X = 12;
const TIP_Y = 10;
/** The fade: from 0.85, as (1 - t)^1.4. */
const FADE: Keyframe[] = [0, 0.25, 0.5, 0.75, 1].map((t) => ({ offset: t, opacity: Math.pow(1 - t, 1.4) * 0.85 }));

/** The arrow of a standard pointer, its tip at (x, y), 1 = 1px. */
const drawArrow = (aCtx: CanvasRenderingContext2D, aX: number, aY: number) => {
    aCtx.beginPath();
    aCtx.moveTo(aX, aY);
    aCtx.lineTo(aX, aY + 17);
    aCtx.lineTo(aX + 4.2, aY + 13.2);
    aCtx.lineTo(aX + 7.2, aY + 19.6);
    aCtx.lineTo(aX + 9.6, aY + 18.5);
    aCtx.lineTo(aX + 6.7, aY + 12.2);
    aCtx.lineTo(aX + 12.2, aY + 12.2);
    aCtx.closePath();
};

const hueAt = (aStep: number) => {
    const sSeg = Math.floor(aStep / 8);
    const sA = HUES[sSeg];
    const sB = HUES[(sSeg + 1) % HUES.length];
    const sTurn = ((sB - sA + 540) % 360) - 180;
    return (sA + (sTurn * (aStep % 8)) / 8 + 360) % 360;
};

/** One glowing arrow as an image. On a light page it is darker, laid on as paint. */
const sprite = (aHue: number, aLight: boolean): string => {
    const sRatio = window.devicePixelRatio || 1;
    const sCanvas = document.createElement('canvas');
    sCanvas.width = sCanvas.height = Math.round(SPRITE_PX * sRatio);
    const sCtx = sCanvas.getContext('2d');
    if (!sCtx) return '';
    sCtx.scale(sRatio, sRatio);
    sCtx.shadowColor = `hsl(${aHue}, 100%, 60%)`;
    sCtx.shadowBlur = 10;
    sCtx.fillStyle = `hsl(${aHue}, 100%, ${aLight ? 45 : 62}%)`;
    drawArrow(sCtx, TIP_X, TIP_Y);
    sCtx.fill();
    return sCanvas.toDataURL();
};

const reducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const lightPage = () => document.documentElement.dataset.neoScheme === 'light';

/** The effect the page's theme names, or '' for none. */
export const themeCursorFx = (): string => getComputedStyle(document.documentElement).getPropertyValue(CURSOR_FX_VAR).trim().toLowerCase();

let sStop: (() => void) | null = null;
let sRunningLight = false;

const startSandevistan = (aLight: boolean) => {
    const sLayer = document.createElement('div');
    sLayer.id = CURSOR_FX_LAYER_ID;
    sLayer.setAttribute('aria-hidden', 'true');
    Object.assign(sLayer.style, { position: 'fixed', left: '0', top: '0', width: '0', height: '0', pointerEvents: 'none', zIndex: '2147483647' });
    const sGhosts = Array.from({ length: CURSOR_FX_POOL }, (_, i) => {
        const sGhost = document.createElement('i');
        const sImage = sprite(hueAt(i), aLight);
        Object.assign(sGhost.style, {
            position: 'absolute',
            left: '0',
            top: '0',
            width: `${SPRITE_PX}px`,
            height: `${SPRITE_PX}px`,
            backgroundImage: sImage && `url(${sImage})`,
            backgroundSize: '100% 100%',
            opacity: '0',
            willChange: 'transform, opacity',
        });
        sLayer.appendChild(sGhost);
        return sGhost;
    });
    const sFades: (Animation | undefined)[] = [];
    document.body.appendChild(sLayer);
    let sNext = 0;
    let sLast = 0;
    let sPrev: { x: number; y: number } | null = null;

    const place = (aX: number, aY: number, aAgeMs: number) => {
        const i = sNext;
        sNext = (sNext + 1) % CURSOR_FX_POOL;
        sFades[i]?.cancel();
        sGhosts[i].style.transform = `translate(${aX - TIP_X}px, ${aY - TIP_Y}px)`;
        // started aAgeMs ago, so the after-images of one fast move fade in order
        if (typeof sGhosts[i].animate === 'function') sFades[i] = sGhosts[i].animate(FADE, { duration: LIFE_MS, delay: -aAgeMs });
    };
    const onMove = (aEvent: PointerEvent) => {
        const sNow = performance.now();
        const sTo = { x: aEvent.clientX, y: aEvent.clientY };
        const sFresh = sPrev !== null && sNow - sLast < 120;
        const sFrom = sFresh && sPrev ? sPrev : sTo;
        const sDist = Math.hypot(sTo.x - sFrom.x, sTo.y - sFrom.y);
        if (sFresh && sDist < STEP_PX) return;
        // fill the path between two pointer events, so a fast flick leaves an unbroken smear
        const sSteps = Math.max(1, Math.min(8, Math.floor(sDist / STEP_PX)));
        for (let i = 1; i <= sSteps; i++) place(sFrom.x + ((sTo.x - sFrom.x) * i) / sSteps, sFrom.y + ((sTo.y - sFrom.y) * i) / sSteps, (sSteps - i) * 6);
        sPrev = sTo;
        sLast = sNow;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
        window.removeEventListener('pointermove', onMove);
        sFades.forEach((f) => f?.cancel());
        sLayer.remove();
    };
};

// ---- comet -------------------------------------------------------------------------------------
// Glowing gold points fall down and to the left from where the pointer moves. Each sheds glitter as
// it falls — a hundred-odd bits a second, one in five a four-pointed sparkle — and every bit goes its
// own way: drifting back along the fall, spreading, sinking, twinkling out. That loose, sinking
// cloud is the effect, so the bits are drawn one by one on a canvas each frame, while any are left.
// What is costly to draw — a head's glow, a sparkle's halo — is drawn once into an image at start;
// a frame only stamps those images and fills small dots (no blur is drawn per frame).

/** Pointer travel, and the least time, between two comets. */
const COMET_SPAWN_PX = 34;
const COMET_SPAWN_MS = 70;
/** The fall: degrees clockwise from → (down and a little to the left), give or take the jitter. */
const COMET_ANGLE = 118;
const COMET_JITTER = 12;
/** How fast (px/s) and how long (s) a comet falls: somewhere between the two. */
const COMET_SPEED: [number, number] = [180, 220];
const COMET_LIFE: [number, number] = [0.8, 1.0];
/** A comet sheds over the first 85% of its fall, this many bits a second; this share are sparkles. */
const COMET_SHED = 0.85;
const COMET_SHED_PER_S = 110;
const COMET_SPARKLE_SHARE = 0.22;
/** Most bits on screen at once: past it, a comet sheds nothing more until some go out. */
export const COMET_MAX_BITS = 2400;
/**
 * A bit of glitter: how far from the head it starts (px), how fast it drifts back along the fall and
 * spreads (px/s), how fast it sinks (px/s²), its size (px) and how long it lasts (s).
 */
const DUST = { jitter: 2.5, back: 22, spreadX: [-16, 16], spreadY: [-12, 16], sink: 52, r: [0.7, 1.7], life: [0.45, 1.0] } as const;
const SPARKLE = { jitter: 3, back: 18, spreadX: [-14, 14], spreadY: [-10, 14], sink: 46, r: [2, 4.2], life: [0.5, 0.9] } as const;
/** Image sizes: a head's glow; a sparkle drawn at its largest, room left for its halo. */
const HEAD_PX = 36;
const SPARKLE_R = 4.2;
const SPARKLE_PX = 32;

/** White and gold light on a dark page; amber, deep enough to show, on a light one. */
const COMET_COLORS = {
    dark: {
        glow: ['rgba(255, 245, 200, 0.9)', 'rgba(255, 210, 80, 0.45)', 'rgba(255, 190, 40, 0)'],
        core: ['#ffffff', 'rgba(255, 255, 230, 0.6)'],
        dust: ['#ffffff', '#fff6c4', '#ffe066', '#ffcb3d'],
        sparkle: '#fffbe6',
        halo: 'rgba(255, 210, 70, 1)',
    },
    light: {
        glow: ['rgba(255, 190, 40, 0.85)', 'rgba(240, 150, 0, 0.4)', 'rgba(240, 150, 0, 0)'],
        core: ['#e08a00', 'rgba(255, 190, 40, 0.7)'],
        dust: ['#e89f00', '#d98200', '#f5b400', '#c26f00'],
        sparkle: '#f0a000',
        halo: 'rgba(255, 190, 40, 0.8)',
    },
};
type CometColors = (typeof COMET_COLORS)['dark'];

const between = (aRange: readonly number[], aRandom: () => number) => aRange[0] + aRandom() * (aRange[1] - aRange[0]);

export interface Comet {
    x: number;
    y: number;
    /** The direction of the fall. */
    dx: number;
    dy: number;
    speed: number;
    life: number;
    age: number;
    /** Bits owed to the shedding, fractions included. */
    owed: number;
}
export interface CometBit {
    sparkle: boolean;
    x: number;
    y: number;
    vx: number;
    vy: number;
    sink: number;
    r: number;
    age: number;
    life: number;
    color: string;
    /** A sparkle's turn (rad) and spin (rad/s); how fast a bit twinkles (rad/s). */
    rot: number;
    spin: number;
    twinkle: number;
}

/** Where a comet's head is now: falling along its direction, speeding up a little. */
export const cometHead = (aComet: Comet) => {
    const sDistance = aComet.speed * aComet.age * (0.75 + 0.5 * (aComet.age / aComet.life));
    return { x: aComet.x + aComet.dx * sDistance, y: aComet.y + aComet.dy * sDistance };
};

/** The comets and their glitter, moved by time alone — what a frame draws. */
export const cometWorld = (aDustColors: readonly string[], aRandom: () => number = Math.random) => {
    const comets: Comet[] = [];
    const bits: CometBit[] = [];
    const shed = (aComet: Comet) => {
        const sHead = cometHead(aComet);
        const sSparkle = aRandom() < COMET_SPARKLE_SHARE;
        const k = sSparkle ? SPARKLE : DUST;
        bits.push({
            sparkle: sSparkle,
            x: sHead.x + between([-k.jitter, k.jitter], aRandom),
            y: sHead.y + between([-k.jitter, k.jitter], aRandom),
            vx: -aComet.dx * k.back + between(k.spreadX, aRandom),
            vy: -aComet.dy * k.back + between(k.spreadY, aRandom),
            sink: k.sink,
            r: between(k.r, aRandom),
            age: 0,
            life: between(k.life, aRandom),
            color: aDustColors[Math.floor(aRandom() * aDustColors.length)],
            rot: aRandom() * Math.PI * 2,
            spin: between([-3, 3], aRandom),
            twinkle: sSparkle ? between([18, 30], aRandom) : between([15, 35], aRandom),
        });
    };
    return {
        comets,
        bits,
        /** A comet from (x, y), give or take a few px. */
        spawn(aX: number, aY: number) {
            const sAngle = ((COMET_ANGLE + between([-COMET_JITTER, COMET_JITTER], aRandom)) * Math.PI) / 180;
            comets.push({
                x: aX + between([-6, 6], aRandom),
                y: aY + between([-6, 6], aRandom),
                dx: Math.cos(sAngle),
                dy: Math.sin(sAngle),
                speed: between(COMET_SPEED, aRandom),
                life: between(COMET_LIFE, aRandom),
                age: 0,
                owed: 0,
            });
        },
        /** Moves everything on by aDt seconds: the heads fall and shed, the bits drift, sink and turn; the spent go. */
        step(aDt: number) {
            for (const b of bits) {
                b.age += aDt;
                b.vy += b.sink * aDt;
                b.x += b.vx * aDt;
                b.y += b.vy * aDt;
                b.rot += b.spin * aDt;
            }
            for (const c of comets) {
                c.age += aDt;
                if (c.age > c.life * COMET_SHED) continue;
                c.owed += aDt * COMET_SHED_PER_S;
                for (; c.owed >= 1; c.owed -= 1) if (bits.length < COMET_MAX_BITS) shed(c);
            }
            for (let i = comets.length - 1; i >= 0; i--) if (comets[i].age >= comets[i].life) comets.splice(i, 1);
            for (let i = bits.length - 1; i >= 0; i--) if (bits[i].age >= bits[i].life) bits.splice(i, 1);
        },
    };
};

/** A canvas aW × aH (CSS px), sharp on this screen; null where there is none. */
const paper = (aW: number, aH: number) => {
    const sRatio = window.devicePixelRatio || 1;
    const sCanvas = document.createElement('canvas');
    sCanvas.width = Math.round(aW * sRatio);
    sCanvas.height = Math.round(aH * sRatio);
    const sCtx = sCanvas.getContext('2d');
    if (!sCtx) return null;
    sCtx.scale(sRatio, sRatio);
    return { sCanvas, sCtx };
};
const glowDisc = (aCtx: CanvasRenderingContext2D, aC: number, aR: number, aStops: string[]) => {
    const sGrad = aCtx.createRadialGradient(aC, aC, 0, aC, aC, aR);
    aStops.forEach((s, i) => sGrad.addColorStop(i / (aStops.length - 1), s));
    aCtx.fillStyle = sGrad;
    aCtx.beginPath();
    aCtx.arc(aC, aC, aR, 0, Math.PI * 2);
    aCtx.fill();
};
/** A comet's head: a soft gold glow round a bright point. */
const headImage = (aColors: CometColors) => {
    const sPaper = paper(HEAD_PX, HEAD_PX);
    if (!sPaper) return null;
    glowDisc(sPaper.sCtx, HEAD_PX / 2, 15, aColors.glow);
    glowDisc(sPaper.sCtx, HEAD_PX / 2, 3, aColors.core);
    return sPaper.sCanvas;
};
/** A four-pointed sparkle at its largest, with its halo. */
const sparkleImage = (aColors: CometColors) => {
    const sPaper = paper(SPARKLE_PX, SPARKLE_PX);
    if (!sPaper) return null;
    const { sCanvas, sCtx } = sPaper;
    const c = SPARKLE_PX / 2;
    const r = SPARKLE_R;
    const w = r * 0.2;
    sCtx.shadowColor = aColors.halo;
    sCtx.shadowBlur = r * 1.8;
    sCtx.fillStyle = aColors.sparkle;
    sCtx.beginPath();
    sCtx.moveTo(c, c - r);
    sCtx.quadraticCurveTo(c + w, c - w, c + r, c);
    sCtx.quadraticCurveTo(c + w, c + w, c, c + r);
    sCtx.quadraticCurveTo(c - w, c + w, c - r, c);
    sCtx.quadraticCurveTo(c - w, c - w, c, c - r);
    sCtx.fill();
    return sCanvas;
};

const startComet = (aLight: boolean) => {
    const sColors = COMET_COLORS[aLight ? 'light' : 'dark'];
    const sLayer = document.createElement('canvas');
    sLayer.id = CURSOR_FX_LAYER_ID;
    sLayer.setAttribute('aria-hidden', 'true');
    Object.assign(sLayer.style, { position: 'fixed', left: '0', top: '0', width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: '2147483647' });
    document.body.appendChild(sLayer);
    const sCtx = sLayer.getContext('2d');
    const sHead = headImage(sColors);
    const sSparkle = sparkleImage(sColors);
    const sWorld = cometWorld(sColors.dust);
    let sRatio = 1;
    const fit = () => {
        sRatio = window.devicePixelRatio || 1;
        sLayer.width = Math.round(window.innerWidth * sRatio);
        sLayer.height = Math.round(window.innerHeight * sRatio);
    };
    fit();
    /** One frame: everything drawn where it is now — light added on a dark page, paint on a light one. */
    const draw = () => {
        if (!sCtx) return;
        sCtx.setTransform(1, 0, 0, 1, 0, 0);
        sCtx.clearRect(0, 0, sLayer.width, sLayer.height);
        sCtx.globalCompositeOperation = aLight ? 'source-over' : 'lighter';
        for (const c of sWorld.comets) {
            if (!sHead) break;
            const k = c.age / c.life;
            const h = cometHead(c);
            sCtx.globalAlpha = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
            sCtx.setTransform(sRatio, 0, 0, sRatio, 0, 0);
            sCtx.drawImage(sHead, h.x - HEAD_PX / 2, h.y - HEAD_PX / 2, HEAD_PX, HEAD_PX);
        }
        for (const b of sWorld.bits) {
            const k = b.age / b.life;
            if (b.sparkle) {
                if (!sSparkle) continue;
                // it swells and shrinks once, twinkling as it turns
                const sAlpha = Math.sin(Math.PI * k) * (0.65 + 0.35 * Math.sin(b.age * b.twinkle));
                const sScale = (b.r * (0.45 + 0.55 * Math.sin(Math.PI * k))) / SPARKLE_R;
                if (sAlpha <= 0 || sScale <= 0) continue;
                const sCos = Math.cos(b.rot) * sScale * sRatio;
                const sSin = Math.sin(b.rot) * sScale * sRatio;
                sCtx.globalAlpha = sAlpha;
                sCtx.setTransform(sCos, sSin, -sSin, sCos, b.x * sRatio, b.y * sRatio);
                sCtx.drawImage(sSparkle, -SPARKLE_PX / 2, -SPARKLE_PX / 2, SPARKLE_PX, SPARKLE_PX);
            } else {
                // a dot that shrinks as it fades, flickering
                const sAlpha = (1 - k) * (0.6 + 0.4 * Math.sin(b.age * b.twinkle));
                if (sAlpha <= 0) continue;
                sCtx.globalAlpha = sAlpha;
                sCtx.setTransform(sRatio, 0, 0, sRatio, 0, 0);
                sCtx.fillStyle = b.color;
                sCtx.beginPath();
                sCtx.arc(b.x, b.y, b.r * (1 - k * 0.5), 0, Math.PI * 2);
                sCtx.fill();
            }
        }
        sCtx.globalAlpha = 1;
    };
    let sFrame = 0;
    let sLast: number | null = null;
    const tick = (aNow: number) => {
        sWorld.step(sLast === null ? 1 / 60 : Math.min(0.05, (aNow - sLast) / 1000));
        sLast = aNow;
        draw();
        // runs only while something is falling or fading
        sFrame = sWorld.comets.length || sWorld.bits.length ? requestAnimationFrame(tick) : 0;
        if (!sFrame) sLast = null;
    };
    let sTravel = 0;
    let sLastSpawn = 0;
    let sPrev: { x: number; y: number } | null = null;
    const onMove = (aEvent: PointerEvent) => {
        const sNow = performance.now();
        const sTo = { x: aEvent.clientX, y: aEvent.clientY };
        if (sPrev) sTravel += Math.hypot(sTo.x - sPrev.x, sTo.y - sPrev.y);
        sPrev = sTo;
        if (sTravel < COMET_SPAWN_PX || sNow - sLastSpawn < COMET_SPAWN_MS) return;
        sTravel = 0;
        sLastSpawn = sNow;
        sWorld.spawn(sTo.x, sTo.y);
        if (!sFrame && typeof requestAnimationFrame === 'function') sFrame = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('resize', fit);
    return () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('resize', fit);
        if (sFrame) cancelAnimationFrame(sFrame);
        sLayer.remove();
    };
};

const EFFECTS = new Map<string, (aLight: boolean) => () => void>([
    ['sandevistan', startSandevistan],
    ['comet', startComet],
]);
let sRunningName = '';

/** Starts or stops the effect the theme in force names (and redraws it when the page turns light or dark). */
export const syncCursorFx = () => {
    const sWanted = reducedMotion() ? '' : themeCursorFx();
    const sStart = EFFECTS.get(sWanted);
    const sRunning = document.getElementById(CURSOR_FX_LAYER_ID) !== null;
    if (sStart) {
        const sLight = lightPage();
        if (sRunning && sWanted === sRunningName && sLight === sRunningLight) return;
        sStop?.();
        sStop = sStart(sLight);
        sRunningName = sWanted;
        sRunningLight = sLight;
        return;
    }
    sStop?.();
    sStop = null;
    sRunningName = '';
};

/** Follows the theme (and a change of the reduced-motion setting). Called once at startup. */
export const listenForCursorFx = () => {
    // The theme's stylesheet may still be loading at startup; THEME_CHANGE_EVENT fires once it is in.
    const sOnTheme = () => syncCursorFx();
    window.addEventListener(THEME_CHANGE_EVENT, sOnTheme);
    const sMotion = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    sMotion?.addEventListener?.('change', sOnTheme);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sOnTheme, { once: true });
    else syncCursorFx();
    return () => {
        window.removeEventListener(THEME_CHANGE_EVENT, sOnTheme);
        sMotion?.removeEventListener?.('change', sOnTheme);
        sStop?.();
        sStop = null;
        sRunningName = '';
    };
};
