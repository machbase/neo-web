/**
 * `<script src>` 를 앱 전역에서 한 번만 실행시키기 위한 원장.
 *
 * 값이 boolean 이 아니라 in-flight promise 인 것이 핵심이다. 이전 구현
 * (`LOADED_COMMON_SCRIPTS`) 은 "로드 성공 후"에 URL 을 기록했기 때문에, 로드가 끝나기
 * 전에 같은 URL 을 요청한 두 번째 소비자에게는 아무 방어가 없었다. echarts UMD 는
 * `globalThis.echarts = {}` 를 조건 없이 대입하므로 재실행되면 런타임이 통째로 새
 * 객체로 바뀌고, 그 전에 만들어진 차트는 `getInstanceByDom()` 으로 영영 찾을 수 없게
 * 된다(dispose·resize 불능, 등록된 테마 소실). 그 창이 곧 사고다.
 *
 * chartext 서버 부트스트랩이 쓰는 `window.__chartextScriptPromises` 와 같은 원장을
 * 공유한다. 어느 쪽이 먼저 로드하든 나머지 한쪽은 재실행하지 않는다.
 */
const SCRIPT_REGISTRY = new Map<string, Promise<unknown>>();

/** chartext 서버 부트스트랩(`renderer_js.tmpl`)의 `__loadScriptOnce` 가 읽는 캐시. */
const chartextRegistry = (): Record<string, Promise<unknown>> => {
    const sWindow = window as any;
    if (!sWindow.__chartextScriptPromises) sWindow.__chartextScriptPromises = {};
    return sWindow.__chartextScriptPromises;
};

export const getRegisteredScript = (url: string): Promise<unknown> | undefined =>
    SCRIPT_REGISTRY.get(url) ?? chartextRegistry()[url];

export const isScriptRegistered = (url: string): boolean => !!getRegisteredScript(url);

/** 두 원장에 동시에 등록한다. 동기. */
export const registerScriptPromise = (url: string, promise: Promise<unknown>): void => {
    SCRIPT_REGISTRY.set(url, promise);
    chartextRegistry()[url] = promise;
};

/** 실패는 캐시하지 않는다 — 일시 장애가 영구 장애가 되면 안 된다. */
export const forgetScript = (url: string): void => {
    SCRIPT_REGISTRY.delete(url);
    delete chartextRegistry()[url];
};

const appendScriptElement = (url: string, marker: string): Promise<void> =>
    new Promise<void>((resolve, reject) => {
        const sScript = document.createElement('script');
        sScript.src = url;
        // 동적 삽입 스크립트는 기본이 async 다. 명시적으로 꺼서 삽입 순서를 보존한다.
        sScript.async = false;
        sScript.dataset.neoScript = marker;
        sScript.onload = () => resolve();
        sScript.onerror = () => reject(new Error(`failed to load script: ${url}`));
        document.head.appendChild(sScript);
    });

/**
 * 원장을 거치지 않는 순수 삽입. `loadEcharts()` 전용이다 — 런타임은 로드 이후
 * "window.echarts 확정 + white 테마 등록" 후처리를 promise 안에 접어 넣은 뒤
 * `registerScriptPromise()` 로 직접 등록해야 하기 때문이다.
 */
export const rawAppendScript = (url: string): Promise<void> => appendScriptElement(url, 'runtime');

/** 공용 자산(theme / plugin)용. 원장 경유 1회 실행. */
export const appendScriptOnce = (url: string): Promise<void> => {
    const sKnown = getRegisteredScript(url);
    if (sKnown) return sKnown as Promise<void>;

    const sPending = appendScriptElement(url, 'common').catch((aError) => {
        forgetScript(url);
        throw aError;
    });

    // 완료가 아니라 append 시점에 공유한다.
    registerScriptPromise(url, sPending);
    return sPending;
};

/**
 * `jsCodeAssets` 전용. 렌더마다 `setOption` 을 다시 돌려야 하므로 중복 제거하지 않는다.
 *
 * 일회성 코드 태그가 `<head>` 에 쌓이지 않도록 직전 것을 치운다. 공용 자산 태그
 * (`data-neo-script="common" | "runtime"`) 는 이 대상이 아니다 — 이전 구현은 모든
 * 스크립트에 `id="tmp-script"` 를 붙이고 다음 로드 때 지웠기 때문에, 런타임 태그까지
 * DOM 에서 사라져 관측이 불가능했다.
 */
export const appendScriptAlways = (url: string): Promise<void> => {
    document.querySelectorAll('script[data-neo-script="code"]').forEach((aNode) => aNode.remove());
    return appendScriptElement(url, 'code');
};
