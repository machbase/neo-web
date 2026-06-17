# DB Explorer Data Viewer Asset Design

## Goal

DB Explorer table view에서 여는 Data Viewer를 최신 `neo-pkg-opcua-client` Data Viewer와 맞춘다.

핵심은 두 가지다.

1. `Tags` 탭은 DB table의 tag meta에서 가져온 태그를 평평한 리스트로 보여준다.
2. tag meta 안에 asset hierarchy 정보가 있을 때만 `Asset` 탭을 추가하고, 이 탭에서만 asset 트리를 보여준다.

즉, OPC-UA Client의 원래 node/tag 트리를 DB Explorer에 그대로 가져오지 않는다.

## Current Problem

`ASSET_TEST_TAG` 같은 테이블에서 neo-web Data Viewer는 현재 asset JSON을 태그 이름처럼 보여준다.

원인은 table meta column을 고를 때 `NAME`이 아니라 첫 metadata column을 tag column으로 잡을 수 있기 때문이다. 이 경우 `ASSET` JSON 값이 tag list에 그대로 들어가서 화면에 `{...}` 형태가 보인다.

또 최신 OPC-UA Data Viewer에는 `Tags / Asset` 탭과 asset hierarchy 처리가 추가되었지만, neo-web 쪽에는 아직 없다.

## Target UI

### Tags Area

- asset hierarchy가 없는 일반 tag table: 지금처럼 검색 input 아래에 tag list만 보인다.
- asset hierarchy가 있는 tag table: 검색 input 바로 위에 `Tags` / `Asset` 탭이 보인다.
- 기본 탭은 `Tags`다.
- `Tags` 탭은 평평한 리스트다.
- `Asset` 탭만 접고 펼치는 트리다.
- `__machbase_hierarchy__` 같은 내부 메타 행은 사용자 목록에 보이지 않는다.
- JSON 문자열은 tag name으로 보이지 않는다.

### Form Controls

OPC-UA 최신 Data Viewer와 같은 느낌으로 맞춘다.

- `Backward / Forward`는 기존 OPC-UA Data Viewer의 switch 스타일과 크기를 따른다.
- check box, switch, segmented tab, select, date/time control의 높이와 정렬이 왼쪽 필터 영역과 결과 영역에서 어색하게 다르지 않게 맞춘다.
- `Filter tags` input과 tag list의 가로 길이는 같아야 한다.

## Data Rules

### Tag Names

DB Explorer Data Viewer의 tag name은 tag meta table의 `NAME` column을 우선 사용한다.

`metaTagColumn`이 metadata column인 `ASSET`, `SPEC` 등을 잘못 가리켜도 JSON을 tag name으로 쓰지 않는다.

### Asset Hierarchy

Asset hierarchy는 tag meta row에서 읽는다.

- hierarchy marker row: `NAME = '__machbase_hierarchy__'`
- hierarchy JSON은 metadata column 중 JSON 형태인 값을 검사해서 찾는다.
- hierarchy JSON에는 `column`, `schema`, `tree`가 들어갈 수 있다.
- `column`이 없으면 OPC-UA 최신 변경처럼 기본값은 `asset`으로 본다.
- tag row의 asset 정보는 hierarchy JSON의 `column`이 가리키는 metadata column에서 읽는다.

예시:

```json
{
  "column": "asset",
  "schema": ["country", "city", "factory", "equipment", "sensor"],
  "tree": []
}
```

이 경우 각 tag row의 `ASSET` JSON을 읽어서 `Asset` 탭 트리를 만든다.

## Component Boundaries

### `tablePage.tsx`

DB Explorer table에서 Data Viewer 내부 탭을 연다.

- Data Viewer tab에는 database/table 정보만 안정적으로 넘긴다.
- tag column은 `NAME`을 기본으로 넘긴다.
- metadata column 첫 번째 값을 tag column처럼 쓰지 않는다.

### `dataViewerApi.ts`

DB에서 tag meta를 읽고 Data Viewer가 쓰기 쉬운 구조로 바꾼다.

반환 데이터는 다음을 포함한다.

- `tags`: 화면에 보여줄 tag list
- `assetHierarchy`: hierarchy 설정이 있으면 반환, 없으면 `undefined`

### `dataViewerModel.ts`

화면 로직을 순수 함수로 분리한다.

- hierarchy row 숨기기
- asset hierarchy 유무 판단
- asset tree row 만들기
- 검색어로 `Tags` / `Asset` row 필터링

### `DataViewerPage.tsx`

상태와 화면을 담당한다.

- `activeTagTab`: `tags` 또는 `asset`
- asset hierarchy가 있을 때만 탭 UI 노출
- `Tags`는 평평한 list
- `Asset`은 tree list

## Error Handling

- hierarchy JSON parse 실패 시 Data Viewer 전체를 깨지 않는다.
- 잘못된 hierarchy row는 무시하고 `Tags` 리스트만 보여준다.
- tag meta query 실패는 기존처럼 화면 에러 상태로 보여준다.

## Testing

### Browser / Playwright

`ASSET_TEST_TAG`:

- Data Viewer를 내부 tab으로 연다.
- `Tags` / `Asset` 탭이 보인다.
- 기본은 `Tags` 탭이다.
- `Tags` 탭에는 JSON 문자열이 보이지 않는다.
- `__machbase_hierarchy__`가 보이지 않는다.
- `Asset` 탭을 누르면 `Korea`, `Seoul`, `Factory-A`, `Boiler-01` 같은 asset tree가 보인다.
- `Filter tags` input과 list의 가로 길이가 같다.
- `Backward / Forward` switch, checkbox, tab control은 OPC-UA 최신 화면과 같은 label 위치, control 높이, vertical align을 가진다.

`EXAMPLE_OPCUA_TAG`:

- `Asset` 탭이 보이지 않는다.
- tag list는 DB tag meta 기반의 평평한 list다.
- OPC-UA node tree처럼 folder가 생기지 않는다.

### Build

- `tsc --noEmit`
- Data Viewer Playwright test
- `npm run build`

## Out Of Scope

- DB Explorer에 OPC-UA node tree를 추가하지 않는다.
- Data Viewer를 외부 URL navigation으로 열지 않는다.
- 이번 범위에서 chart library를 다시 바꾸지 않는다. 이미 Highcharts 쪽으로 맞춘 상태를 유지한다.
