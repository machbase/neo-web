/**
 * ECharts v6 미리보기 — **임시 스캐폴딩이다. 전환이 끝나면 통째로 지운다.**
 *
 * 런타임·테마·플러그인은 machbase-neo 바이너리에 embed 돼 있어서(`mods/server/assets/echarts/`)
 * neo-web 혼자서는 버전을 올릴 수 없다. 서버 자산 교체는 나중에 같은 릴리스에서 하고, 그 전에
 * 무엇이 깨지는지 보려고 **CDN 의 v6 로 갈아끼워** 돌린다(machbase/neo#1005).
 *
 * 왜 단순 URL 교체로는 안 되는가:
 *
 *   서버는 `jsAssets` 에 `/web/echarts/echarts.min.js` 를 담아 보내고, 우리 스크립트 원장은
 *   URL 문자열을 키로 중복을 막는다(#1439). ECHARTS_SRC 만 CDN 으로 바꾸면 키가 갈라져
 *   v6(우리가 로드) 와 v5(서버 목록을 보고 로드) 가 **동시에** 실행되고, UMD 가 전역을 덮어써서
 *   #1439 를 그대로 재현한다. 그래서 서버가 준 URL 도 같은 표로 치환해 키를 하나로 유지한다.
 */

/** 서버가 embed 한 것과 같은 경로 체계를 CDN 에 매핑한다. */
const V6 = 'https://cdn.jsdelivr.net/npm';
export const V6_ECHARTS_VERSION = '6.1.0';

const PLUGIN_MAP: Record<string, string> = {
    '/web/echarts/echarts-gl.min.js': `${V6}/echarts-gl@2.1.0/dist/echarts-gl.min.js`,
    '/web/echarts/echarts-wordcloud.min.js': `${V6}/echarts-wordcloud@2.1.0/dist/echarts-wordcloud.min.js`,
    '/web/echarts/echarts-liquidfill.min.js': `${V6}/echarts-liquidfill@3.1.0/dist/echarts-liquidfill.min.js`,
};

export const V6_ECHARTS_SRC = `${V6}/echarts@${V6_ECHARTS_VERSION}/dist/echarts.min.js`;

/**
 * 미리보기를 켤지. 쿼리스트링이나 localStorage 로 한 세션만 켤 수 있게 해서, 기본 동작은
 * 건드리지 않고 같은 빌드로 v5/v6 를 오갈 수 있게 한다.
 *
 *   ?echarts=6   한 번 켜고 localStorage 에 기억
 *   ?echarts=5   끄기
 */
export const isV6Preview = (): boolean => {
    try {
        const sParam = new URLSearchParams(window.location.search).get('echarts');
        if (sParam === '6') localStorage.setItem('neo.echartsPreview', '6');
        if (sParam === '5') localStorage.removeItem('neo.echartsPreview');
        return localStorage.getItem('neo.echartsPreview') === '6';
    } catch {
        return false;
    }
};

/** 서버가 준 자산 URL 을 v6 대응 URL 로 바꾼다. 매핑에 없는 것(테마·leaflet 등)은 그대로 둔다. */
export const toV6AssetUrl = (aUrl: string): string => {
    if (!isV6Preview()) return aUrl;
    if (aUrl === '/web/echarts/echarts.min.js') return V6_ECHARTS_SRC;
    if (PLUGIN_MAP[aUrl]) return PLUGIN_MAP[aUrl];

    // 테마는 **치환하지 않는다.** npm echarts 패키지는 dark·infographic·macarons·roma·shine·
    // vintage 6종만 싣고, 서버가 쓰는 13종 중 나머지 7종(chalk·essos·purple-passion·romantic·
    // walden·westeros·wonderland)은 테마 갤러리에서 받아 neo-server 가 vendoring 한 것이다.
    // v5/v6 CDN 모두 404 인 것을 실측했다. 그리고 그 v5 테마 파일들은 v6 런타임에도 그대로
    // 등록된다(실측) — 테마 자산은 서버 것을 계속 쓰면 된다.
    return aUrl;
};
