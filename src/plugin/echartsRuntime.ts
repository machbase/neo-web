import { useEffect, useState } from 'react';
import type * as EChartsNS from 'echarts';
import {
    appendScriptAlways,
    appendScriptOnce,
    forgetScript,
    getRegisteredScript,
    rawAppendScript,
    registerScriptPromise,
} from '@/assets/ts/ScriptRegister';

export type EChartsRuntime = typeof EChartsNS;

/**
 * 앱 전체가 공유하는 단 하나의 ECharts 런타임. 번들(`import * as echarts`)이 아니라
 * 서버가 주는 스크립트다 — 서버가 만드는 `jsCodeAssets` 와 chartext 부트스트랩이 모두
 * 전역 `echarts` 를 참조하므로, 클라이언트가 별도 사본을 들면 사본이 두 벌이 되고
 * `window.echarts` 의 주인이 로드 순서에 따라 바뀐다(machbase/neo#1439).
 */
export const ECHARTS_SRC = '/web/echarts/echarts.min.js';

/**
 * 전역 슬롯 접근자.
 *
 * `declare global { interface Window { echarts?: ... } }` 로 증강하지 않는다. DOM 환경에서
 * `window` 는 `Window & typeof globalThis` 라서, Window 를 증강하면 그 멤버가 globalThis
 * 쪽에 **필수** 속성으로도 올라온다. 그러면 `window.echarts` 가 "항상 존재"하는 타입이 되어
 * 런타임이 아직 없는 구간을 타입이 가려버린다 — 이 설계 전체가 "없을 수 있다"를 전제로
 * 하는데 말이다. 전역 타입 오염은 `@types/echarts` 가 이미 저지른 실수이기도 하다.
 */
const globalSlot = (): { echarts?: EChartsRuntime } =>
    window as unknown as { echarts?: EChartsRuntime };

// 진행 중 promise 는 모듈이 아니라 공유 원장이 들고 있다. 모듈 스코프에 따로 두면
// chartext 원장과 두 벌이 되어 선점이 깨진다.
let whiteRegistered = false;

/**
 * 동기 조회. 런타임이 아직 없으면 `undefined` 다 — 호출부는 반드시 그 경우를 처리한다.
 *
 * 항상 `window.echarts` 를 다시 읽는다. 모듈에 런타임 참조를 캐시해두면 사본 추적
 * 로직(`chartext.ts` 의 `lastEcWithWhiteTheme` 같은 것)이 되살아난다.
 */
export const getEcharts = (): EChartsRuntime | undefined => globalSlot().echarts;

/**
 * `white` 는 ECharts 내장 테마가 아니고 서버도 `themes/white.js` 를 주지 않는다
 * (`chart.go` 가 white 일 때만 테마 자산을 건너뛴다). 등록해두지 않으면 서버 부트스트랩의
 * `echarts.init(dom, "white")` 이 조용히 기본 테마로 떨어지고, 기본 테마는 배경이
 * 투명이라 어두운 표면 위에서 차트가 보이지 않는다.
 *
 * 가드가 boolean 인 것이 중요하다 — 런타임 참조를 들고 비교하면 위 사본 추적 문제가
 * 돌아온다. 런타임이 단 하나뿐이므로 boolean 으로 충분하다.
 */
const ensureWhiteTheme = (aEcharts: EChartsRuntime): void => {
    if (whiteRegistered) return;
    try {
        aEcharts.registerTheme('white', { backgroundColor: '#ffffff' });
        whiteRegistered = true;
    } catch {
        // 등록 실패는 치명적이지 않다 — 차트는 기본 테마로 그려진다.
    }
};

type ThemeObject = Record<string, any>;
type AxisOption = Record<string, any>;

/** Cartesian axes the v5 AxisBuilder label rule applies to, and the theme key each axis type reads. */
const LABELLED_AXES = ['xAxis', 'yAxis'] as const;
const themeAxisKey = (aAxis: AxisOption, aMain: (typeof LABELLED_AXES)[number]): string =>
    `${aAxis?.type ?? (aMain === 'xAxis' ? 'category' : 'value')}Axis`;
/** A label colour in either form echarts accepts — gallery themes (chalk, essos…) still write the v4 `axisLabel.textStyle.color`. */
const hasLabelColor = (aAxis: AxisOption | undefined): boolean =>
    aAxis?.axisLabel?.color !== undefined || aAxis?.axisLabel?.textStyle?.color !== undefined;

/**
 * v5 의 축 라벨 색 결정을 v6 옵션에 명시로 옮긴다 (machbase/neo#1005).
 *
 * v5 AxisBuilder: `axisLabel.color || textStyle.color(전역) || axisLine.lineStyle.color`, 각 단계는
 * 사용자 옵션이 테마보다 앞선다. v6 는 `axisLabel.color` 기본값을 `#54555a` 로 두어 첫 단계에서 끝난다.
 * 그래서 서버의 v5 시절 테마(dark 는 textStyle, macarons 는 축선 색만 가짐)와 사용자가 준 전역 글자색·
 * 축선 색이 라벨에 닿지 않는다. 사용자도 테마도 라벨 색을 정하지 않은 축에 한해, v5 가 도달했을 값을
 * 사용자 옵션에 적어 넣는다. 어느 단계에도 값이 없으면 손대지 않는다(v5 기본 축 색 → v6 기본 색은
 * 기본 테마 개편으로 수용). `aUserTextColor` 는 이전 setOption 에서 받은 전역 글자색(부분 갱신 대비).
 */
export const resolveV5AxisLabelColors = (aOption: unknown, aTheme: ThemeObject | undefined, aUserTextColor?: string): unknown => {
    if (!aOption || typeof aOption !== 'object') return aOption;
    const sOption = aOption as Record<string, any>;
    const sTextColor = sOption.textStyle?.color ?? aUserTextColor ?? aTheme?.textStyle?.color;
    let sPatched: Record<string, any> | undefined;
    for (const aMain of LABELLED_AXES) {
        const sRaw = sOption[aMain];
        if (!sRaw) continue;
        const sList: AxisOption[] = Array.isArray(sRaw) ? sRaw : [sRaw];
        let sChanged = false;
        const sNext = sList.map((aAxis) => {
            if (!aAxis || typeof aAxis !== 'object' || hasLabelColor(aAxis)) return aAxis;
            const sThemeAxis = aTheme?.[themeAxisKey(aAxis, aMain)];
            if (hasLabelColor(sThemeAxis)) return aAxis;
            const sColor = sTextColor ?? aAxis.axisLine?.lineStyle?.color ?? sThemeAxis?.axisLine?.lineStyle?.color;
            if (typeof sColor !== 'string') return aAxis;
            sChanged = true;
            return { ...aAxis, axisLabel: { ...aAxis.axisLabel, color: sColor } };
        });
        if (!sChanged) continue;
        sPatched ??= { ...sOption };
        sPatched[aMain] = Array.isArray(sRaw) ? sNext : sNext[0];
    }
    return sPatched ?? aOption;
};

type Wrapped<T> = T & { __v5AxisLabels?: true };

/**
 * v6 런타임에만 위 보정을 건다 — v5 는 원래 이 순서로 동작하므로 건드리지 않는다.
 * registerTheme 를 감싸 이름별 테마 원본을 기억하고, init 을 감싸 인스턴스의 setOption 에서 보정한다.
 * 테마 UMD 는 런타임 확정 뒤에만 실행되므로(loadChartAssets 가 먼저 기다린다) 서버 테마는 빠짐없이
 * 기록된다. v6 내장 테마(dark 등)는 기록되지 않지만, 내장 테마는 라벨 색을 스스로 정한다.
 */
const ensureV5AxisLabels = (aEcharts: EChartsRuntime): void => {
    if (!(parseInt(String(aEcharts.version), 10) >= 6)) return;
    const sRuntime = aEcharts as any;
    if ((sRuntime.init as Wrapped<unknown>)?.__v5AxisLabels) return;
    const sThemes: Record<string, ThemeObject> = {};
    const sRegister = sRuntime.registerTheme;
    const sInit = sRuntime.init;
    if (typeof sRegister !== 'function' || typeof sInit !== 'function') return;
    const sWrappedRegister = function (aName: string, aTheme: ThemeObject) {
        sThemes[aName] = aTheme;
        return sRegister.call(aEcharts, aName, aTheme);
    };
    const sWrappedInit: Wrapped<(...a: any[]) => any> = function (aDom: unknown, aTheme?: unknown, ...aRest: unknown[]) {
        const sChart = sInit.call(aEcharts, aDom, aTheme, ...aRest);
        if (!sChart || sChart.__v5AxisLabels) return sChart;
        const sThemeObj = typeof aTheme === 'string' ? () => sThemes[aTheme] : () => aTheme as ThemeObject | undefined;
        const sSetOption = sChart.setOption;
        let sUserTextColor: string | undefined;
        sChart.setOption = function (aOption: any, ...aArgs: unknown[]) {
            if (aOption?.textStyle?.color !== undefined) sUserTextColor = aOption.textStyle.color;
            return sSetOption.call(this, resolveV5AxisLabelColors(aOption, sThemeObj(), sUserTextColor), ...aArgs);
        };
        sChart.__v5AxisLabels = true;
        return sChart;
    };
    sWrappedInit.__v5AxisLabels = true;
    try {
        sRuntime.registerTheme = sWrappedRegister;
        sRuntime.init = sWrappedInit;
    } catch {
        // 읽기 전용이면 보정 없이 간다.
    }
};

/**
 * 런타임을 확보한다. 세 진입점(`setChartext` / `loadChartAssets` / `useEcharts`)이 각자
 * 호출하며, 누가 먼저 오든 결과가 같아야 한다.
 *
 * 원장에 넣는 promise 자체가 "런타임 확정 + white 등록"까지 끝난 뒤 resolve 한다.
 * chartext 서버 부트스트랩의 `__loadScriptOnce()` 는 `window.__chartextScriptPromises[src]`
 * 를 그대로 반환해 await 하므로, 그 자리에 이 promise 가 있으면 부트스트랩의
 * `echarts.init(dom, "white")` 은 구조적으로 white 등록 이후가 된다. microtask 등록
 * 순서나 체인 깊이에 기대지 않는다.
 */
export const loadEcharts = (): Promise<EChartsRuntime> => {
    const sKnown = getRegisteredScript(ECHARTS_SRC);
    if (sKnown) return sKnown as Promise<EChartsRuntime>;

    // 우리가 아니라 chartext 의 CDN 폴백이 이미 설치했을 수도 있다.
    const sExisting = globalSlot().echarts;
    if (sExisting) {
        ensureV5AxisLabels(sExisting);
        ensureWhiteTheme(sExisting);
        return Promise.resolve(sExisting);
    }

    const sPending = rawAppendScript(ECHARTS_SRC)
        .then(() => {
            const sEcharts = globalSlot().echarts;
            if (!sEcharts) {
                // UMD 는 `define.amd` 가 있으면 AMD 분기를 타고 전역을 설정하지 않는다.
                // 지금은 monaco 를 ESM 인스턴스로 주입해 AMD 로더가 없지만, 그 전제가
                // 깨지면 모든 차트가 한꺼번에 죽으므로 원인을 남긴다.
                throw new Error(
                    'echarts.min.js loaded but window.echarts is undefined (AMD define detected?)'
                );
            }
            ensureV5AxisLabels(sEcharts);
            ensureWhiteTheme(sEcharts);
            return sEcharts;
        })
        .catch((aError) => {
            forgetScript(ECHARTS_SRC);
            throw aError;
        });

    // 여기까지 await 가 하나도 없다. 호출자가 `setChartext()` 진입부든
    // `loadChartAssets()` 첫 줄이든, 이 함수가 반환되는 시점에 원장은 이미 선점돼 있다.
    registerScriptPromise(ECHARTS_SRC, sPending);
    return sPending;
};

/**
 * 서버가 준 자산을 규약대로 로드한다.
 *
 * 테마/플러그인 UMD 는 실행 시점의 `window.echarts` 를 한 번 캡처하는 일회성
 * 부수효과다 — 런타임이 없으면 `console.error` 만 남기고 아무것도 등록하지 않은 채
 * `<script>` 는 성공으로 끝난다. 그래서 런타임을 먼저 기다린다.
 */
export const loadChartAssets = async (aJsAssets?: string[], aJsCodeAssets?: string[]): Promise<void> => {
    // Only when the payload actually involves ECharts. A GEOMAP() response ships leaflet and proj4
    // and nothing else, and making it wait on a 1 MB runtime it never calls would undo the reason
    // there is no boot preload. Callers that need the runtime for their own bookkeeping — the
    // theme override in ShowVisualization, say — ask for it themselves.
    if ((aJsAssets ?? []).some((aUrl) => aUrl === ECHARTS_SRC || aUrl.startsWith('/web/echarts/'))) {
        await loadEcharts();
    }

    for (const sRaw of aJsAssets ?? []) {
        if (sRaw === ECHARTS_SRC) continue; // 위에서 이미 책임졌다
        await appendScriptOnce(sRaw);
    }

    // jsCodeAssets 는 차트별 일회성 코드다. 렌더마다 다시 실행돼야 하므로 중복 제거하지 않는다.
    for (const sUrl of aJsCodeAssets ?? []) {
        await appendScriptAlways(sUrl);
    }
};

export type EChartsGate =
    | { status: 'loading'; echarts: undefined; error: undefined; retry: undefined }
    | { status: 'ready'; echarts: EChartsRuntime; error: undefined; retry: undefined }
    | { status: 'error'; echarts: undefined; error: Error; retry: () => void };

const LOADING_GATE: EChartsGate = {
    status: 'loading',
    echarts: undefined,
    error: undefined,
    retry: undefined,
};

/** 클라이언트가 옵션을 만드는 차트(TAZ / data viewer)용 게이트. */
export const useEcharts = (): EChartsGate => {
    const [sGate, setGate] = useState<EChartsGate>(() => {
        const sReady = getEcharts();
        return sReady ? { status: 'ready', echarts: sReady, error: undefined, retry: undefined } : LOADING_GATE;
    });
    const [sAttempt, setAttempt] = useState(0);

    useEffect(() => {
        if (sGate.status === 'ready') return;

        let sAlive = true;
        setGate(LOADING_GATE);
        loadEcharts()
            .then((aEcharts) => {
                if (sAlive) setGate({ status: 'ready', echarts: aEcharts, error: undefined, retry: undefined });
            })
            .catch((aError) => {
                if (!sAlive) return;
                setGate({
                    status: 'error',
                    echarts: undefined,
                    error: aError instanceof Error ? aError : new Error(String(aError)),
                    retry: () => setAttempt((aPrev) => aPrev + 1),
                });
            });

        return () => {
            sAlive = false;
        };
        // sGate.status 는 의도적으로 제외한다 — 여기서 setGate 를 하므로 넣으면 루프가 된다.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sAttempt]);

    return sGate;
};

/**
 * 테스트 전용. 런타임은 프로덕션에서 `<script>` 로 오지만 jsdom 에는 그 서버가 없다.
 * `jest.mock('echarts')` 는 더 이상 이 경로를 가로채지 못하므로 직접 주입한다.
 */
export const __setEchartsRuntimeForTest = (aEcharts: EChartsRuntime | undefined): void => {
    globalSlot().echarts = aEcharts;
    whiteRegistered = false;
    forgetScript(ECHARTS_SRC);
};
