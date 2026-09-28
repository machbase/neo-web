# ECharts v6 미리보기 — 테스트 환경

machbase/neo#1005. 서버 자산을 건드리지 않고 **런타임만 CDN 의 v6 로 갈아끼워** 무엇이 달라지는지 본다.

## 켜고 끄기

dev 서버: <http://localhost:7778/web/ui>

| | URL |
|---|---|
| **v6 켜기** | <http://localhost:7778/web/ui/?echarts=6> |
| **v5 로 되돌리기** | <http://localhost:7778/web/ui/?echarts=5> |

한 번 켜면 `localStorage` 에 남아 **새로고침·재접속해도 유지**된다. 끄려면 `?echarts=5` 로 한 번 들어오면 된다.

확인은 콘솔에서:

```
[echarts] runtime 6.1.0 from https://cdn.jsdelivr.net/npm/echarts@6.1.0/dist/echarts.min.js  (v6 preview)
[echarts] runtime 5.6.0 from /web/echarts/echarts.min.js
```

차트를 하나라도 그려야 런타임이 로드된다(프리로드 없음 — #1439). 로그인 화면에서는 안 뜬다.

## 무엇이 v6 로 바뀌나

| 자산 | v6 미리보기 |
|---|---|
| `echarts.min.js` | CDN `echarts@6.1.0` |
| `echarts-gl` / `wordcloud` / `liquidfill` | 각 CDN 버전 |
| **테마 13종** | **서버 것 그대로** — v5 테마 파일이 v6 에 그대로 등록된다(실측). npm 패키지는 13종 중 6종만 싣는다 |
| geomap / leaflet | 무관, 그대로 |

## 봐야 할 것

이미 기계로 확인한 것(메커니즘): 런타임 단일성, 테마 13종 등록, 절대 px 그리드 배치, 플러그인 3종 렌더.
**아직 안 본 것은 사람이 조작해야 하는 부분이다.**

- **TAG Analyzer** — 드래그 줌, 네비게이터 핸들 커서·드래그, legend 토글, annotation/highlight 클릭, Overlap, FFT 2D/3D
- **Data Viewer** — 드래그 줌, 휠, 네비게이터, 시프트 버튼, JSON key 상세 모달
- **대시보드** — 차트 타입별 렌더, 테마 전환, Liquid fill 패널, geomap 과 공존, 비디오 싱크 타임라인 마커
- **워크시트** — 마크다운 차트(chartext) + TQL 차트 블록 공존
- **Public dashboard** — `/board/<name>.dsh`

### 알려진 차이 (실측)

`visualMap` 컬러바 위치가 v6 에서 약간 위로 이동한다. FFT 3D 옵션이 위치를 지정하지 않아
v6 의 기본 컴포넌트 배치 변경을 그대로 받는다.

**같은 이유로 위치를 지정하지 않은 컴포넌트는 전부 움직일 수 있다** — 특히 사용자가 작성한
TQL·마크다운 차트는 `legend` 위치를 생략하는 경우가 많고, v6 기본값은 아래쪽이다.
우리 코드(TAZ·data viewer·대시보드)는 모두 명시하고 있어 영향이 없다.

## 리포트

`plugin-visual/report.html` — 브라우저로 열면 플러그인 3종의 v5/v6 렌더를 나란히 볼 수 있다.
이미지가 base64 로 박혀 있어 파일 하나로 완결된다.

## 서버는 언제 바꾸나

런타임·테마·플러그인은 machbase-neo 바이너리에 embed 돼 있다(`mods/server/assets/echarts/`).
미리보기로 판정이 끝나면 **neo-web 과 neo-server 를 같은 릴리스에서** 올린다.
그때 `src/plugin/echartsV6Preview.ts` 는 삭제하고 `echartsSrc()` 를 상수로 되돌린다.

전체 조사·설계는 `docs/1005-echarts-v6-migration.md` 참고.
