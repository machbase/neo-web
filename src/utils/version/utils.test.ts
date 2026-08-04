import {
    applyOfflineEligibility,
    applyOfflineSelectable,
    compareVersions,
    comparePkgVersions,
    computeEligibility,
    isEligible,
    normalizePkgVersion,
    pickDefaultInstall,
    pickDefaultUpdate,
    resolveActionSource,
    stripVPrefix,
    type PkgVersionInfo,
} from './utils';

describe('normalizePkgVersion', () => {
    test('plain SemVer → 정규형', () => expect(normalizePkgVersion('1.0.4')).toBe('1.0.4'));
    test('v-prefix → strip', () => expect(normalizePkgVersion('v1.0.4')).toBe('1.0.4'));
    test('주변 공백 → trim 후 통과', () => expect(normalizePkgVersion('  1.0.4  ')).toBe('1.0.4'));
    test('빈 문자열 → null', () => expect(normalizePkgVersion('')).toBeNull());
    test('undefined → null', () => expect(normalizePkgVersion(undefined as unknown as string)).toBeNull());
    test('garbage → null', () => expect(normalizePkgVersion('not-a-version')).toBeNull());
    test('CalVer → null', () => expect(normalizePkgVersion('2024.01.15')).toBeNull());
    test('4-segment → null', () => expect(normalizePkgVersion('1.0.4.1')).toBeNull());
});

describe('comparePkgVersions', () => {
    // 핵심 회귀 케이스 (이슈 #1317 직접 재현)
    test('1.0.4 > 1.0.3 → 1', () => expect(comparePkgVersions('1.0.4', '1.0.3')).toBe(1));
    test('1.0.3 < 1.0.4 → -1', () => expect(comparePkgVersions('1.0.3', '1.0.4')).toBe(-1));
    test('동일 버전 → 0', () => expect(comparePkgVersions('1.0.3', '1.0.3')).toBe(0));

    // v-prefix 정규화
    test('v1.0.4 == 1.0.4 → 0', () => expect(comparePkgVersions('v1.0.4', '1.0.4')).toBe(0));
    test('1.0.3 < v1.0.4 → -1', () => expect(comparePkgVersions('1.0.3', 'v1.0.4')).toBe(-1));

    // prerelease precedence (SemVer 11번)
    test('1.0.4-rc.1 < 1.0.4 → -1', () => expect(comparePkgVersions('1.0.4-rc.1', '1.0.4')).toBe(-1));
    test('1.0.0-beta < 1.0.0-rc.1 → -1', () => expect(comparePkgVersions('1.0.0-beta', '1.0.0-rc.1')).toBe(-1));
    test('1.0.4-rc.10 > 1.0.4-rc.2 → 1', () => expect(comparePkgVersions('1.0.4-rc.10', '1.0.4-rc.2')).toBe(1));

    // build metadata 무시
    test('1.0.4+sha.abc == 1.0.4 → 0', () => expect(comparePkgVersions('1.0.4+sha.abc', '1.0.4')).toBe(0));
    test('1.0.4+build.1 == 1.0.4+build.2 → 0', () => expect(comparePkgVersions('1.0.4+build.1', '1.0.4+build.2')).toBe(0));

    // non-SemVer → null
    test('CalVer 2024.01.15 → null', () => expect(comparePkgVersions('2024.01.15', '1.0.0')).toBeNull());
    test('4-segment 1.0.4.1 → null', () => expect(comparePkgVersions('1.0.4.1', '1.0.4')).toBeNull());
    test('빈 문자열 → null', () => expect(comparePkgVersions('', '1.0.0')).toBeNull());
    test('garbage → null', () => expect(comparePkgVersions('not-a-version', '1.0.0')).toBeNull());
});

describe('stripVPrefix (display helper)', () => {
    test('소문자 v 제거', () => expect(stripVPrefix('v1.0.4')).toBe('1.0.4'));
    test('대문자 V 제거', () => expect(stripVPrefix('V1.0.4')).toBe('1.0.4'));
    test('prerelease + v 접두사', () => expect(stripVPrefix('v1.0.4-rc.1')).toBe('1.0.4-rc.1'));
    test('non-SemVer + v 접두사', () => expect(stripVPrefix('v1.0.4.1')).toBe('1.0.4.1'));
    test('v 없으면 원본 유지', () => expect(stripVPrefix('1.0.4')).toBe('1.0.4'));
    test('첫 v 만 제거 (vvv1.0.4 → vv1.0.4)', () => expect(stripVPrefix('vvv1.0.4')).toBe('vv1.0.4'));
    test('빈 문자열 → 빈 문자열', () => expect(stripVPrefix('')).toBe(''));
    test('undefined → 빈 문자열', () => expect(stripVPrefix(undefined)).toBe(''));
    test('null → 빈 문자열', () => expect(stripVPrefix(null)).toBe(''));
});

describe('기존 compareVersions 회귀 (절대 깨지면 안 됨)', () => {
    test('1.0.1 > 1.0.0 → 1', () => expect(compareVersions('1.0.1', '1.0.0')).toBe(1));
    test('1.0.0 == 1.0.0 → 0', () => expect(compareVersions('1.0.0', '1.0.0')).toBe(0));
    test('invalid → 0 (기존 동작)', () => expect(compareVersions('not-a-version', '1.0.0')).toBe(0));
});

describe('isEligible (minServer 게이트, #1369)', () => {
    test('minServer < server → true', () => expect(isEligible('8.0.30', '8.0.45')).toBe(true));
    test('minServer > server → false', () => expect(isEligible('8.0.60', '8.0.45')).toBe(false));
    test('minServer == server → true (lte)', () => expect(isEligible('8.0.45', '8.0.45')).toBe(true));
    test('prerelease ordering: 8.0.0-alpha.1 ≤ 8.0.0 → true', () => expect(isEligible('8.0.0-alpha.1', '8.0.0')).toBe(true));
    test('snapshot server: 8.5.0 ≤ 8.5.4-snapshot → true', () => expect(isEligible('8.5.0', '8.5.4-snapshot')).toBe(true));
    // 서버 prerelease는 coerce(정식 베이스)로 비교 — snapshot 빌드가 자기 라인 패키지를 설치 가능해야 함
    test('snapshot 서버: 8.5.4 ≤ 8.5.4-snapshot → true (coerce)', () => expect(isEligible('8.5.4', '8.5.4-snapshot')).toBe(true));
    test('snapshot 서버: 8.5.5 > 8.5.4-snapshot → false', () => expect(isEligible('8.5.5', '8.5.4-snapshot')).toBe(false));
    test('v접두사 snapshot 서버: v8.5.4-snapshot → 8.5.4 coerce', () => expect(isEligible('8.5.4', 'v8.5.4-snapshot')).toBe(true));
    test('rc 서버: 8.5.4 ≤ 8.5.4-rc.1 → true (coerce)', () => expect(isEligible('8.5.4', '8.5.4-rc.1')).toBe(true));
    test('빈 minServer(구 스키마) → true (게이트 통과)', () => expect(isEligible('', '8.0.45')).toBe(true));
    test('비-semver minServer → true (제약 무시)', () => expect(isEligible('not-a-ver', '8.0.45')).toBe(true));
    test('비-semver server → true (차단하지 않음)', () => expect(isEligible('8.0.30', '')).toBe(true));
    test('v 접두사 정규화', () => expect(isEligible('v8.0.30', 'v8.0.45')).toBe(true));
});

describe('computeEligibility (#1369)', () => {
    const V = (version: string, minServer: string): PkgVersionInfo => ({ version, minServer });

    test('install default = eligible 중 최신 (latest가 ineligible이면 그 다음)', () => {
        // opcua-client 픽스처: 1.0.5(8.0.60)는 ineligible, 1.0.4(8.0.45)가 default
        const e = computeEligibility([V('1.0.5', '8.0.60'), V('1.0.4', '8.0.45'), V('1.0.3', '8.0.30')], '8.0.45');
        expect(e.defaultInstall).toBe('1.0.4');
        expect(e.rows.find((r) => r.version === '1.0.5')?.state).toBe('ineligible');
        expect(e.rows.find((r) => r.version === '1.0.4')?.state).toBe('default');
    });

    test('update default = eligible && pkgVer > installed 중 최신', () => {
        const e = computeEligibility([V('1.0.5', '8.0.60'), V('1.0.4', '8.0.45'), V('1.0.3', '8.0.30')], '8.0.45', '1.0.3');
        expect(e.defaultUpdate).toBe('1.0.4'); // 1.0.5 ineligible 제외
        expect(e.rows.find((r) => r.version === '1.0.3')?.state).toBe('current');
        expect(e.rows.find((r) => r.version === '1.0.4')?.state).toBe('default');
    });

    test('현재 이하 버전은 belowCurrent (다운그레이드 미지원)', () => {
        const e = computeEligibility([V('1.0.4', '8.0.30'), V('1.0.3', '8.0.20'), V('1.0.2', '8.0.10')], '8.0.45', '1.0.4');
        expect(e.rows.find((r) => r.version === '1.0.3')?.state).toBe('belowCurrent');
        expect(e.rows.find((r) => r.version === '1.0.3')?.selectable).toBe(false);
        expect(e.defaultUpdate).toBeUndefined(); // 모두 ≤ installed
    });

    test('prerelease 정렬: 2.4.0 < 2.5.0-beta < 2.5.0', () => {
        const e = computeEligibility([V('2.5.0', '8.0.50'), V('2.5.0-beta', '8.0.45'), V('2.4.0', '8.0.40')], '8.0.45');
        // 2.5.0(8.0.50) ineligible → default install = 2.5.0-beta(8.0.45)
        expect(e.defaultInstall).toBe('2.5.0-beta');
        expect(e.rows[0].version).toBe('2.5.0'); // 최신 정렬 first
    });

    test('eligible 0개 → defaultInstall undefined', () => {
        const e = computeEligibility([V('1.0.5', '9.0.0'), V('1.0.4', '9.0.0')], '8.0.45');
        expect(e.defaultInstall).toBeUndefined();
        expect(e.rows.every((r) => r.state === 'ineligible')).toBe(true);
    });

    test('서버 다운그레이드 → isIncompatible', () => {
        const e = computeEligibility([V('1.0.5', '8.0.60')], '8.0.45', '1.0.5');
        expect(e.isIncompatible).toBe(true);
        expect(e.installedMinServer).toBe('8.0.60');
    });

    test('구 스키마(minServer 빈값) → 전부 eligible', () => {
        const e = computeEligibility([V('v1.0.9', '')], '8.0.45');
        expect(e.defaultInstall).toBe('v1.0.9');
        expect(e.rows[0].eligible).toBe(true);
    });

    test('서버 버전 미수신(빈 문자열) → 차단 없음', () => {
        const e = computeEligibility([V('1.0.5', '8.0.60')], '');
        expect(e.defaultInstall).toBe('1.0.5');
    });

    test('source 필드는 rows로 그대로 보존된다', () => {
        const e = computeEligibility(
            [
                { version: '1.3.0', minServer: '8.0.10', source: 'hub' },
                { version: '1.2.0', minServer: '8.0.10', source: 'local' },
                { version: '1.1.0', minServer: '8.0.10' }, // 태그 없음 → 그대로 undefined
            ],
            '8.0.45'
        );
        expect(e.rows.map((r) => r.source)).toEqual(['hub', 'local', undefined]);
    });
});

describe('applyOfflineSelectable / 오프라인 게이팅 (#1452)', () => {
    // hub 1.3.0(최신) + local 1.2.0 + local 1.1.0 — 오프라인에서 hub 행만 막혀야 한다
    const catalog: PkgVersionInfo[] = [
        { version: '1.3.0', minServer: '8.0.10', source: 'hub' },
        { version: '1.2.0', minServer: '8.0.10', source: 'local' },
        { version: '1.1.0', minServer: '8.0.10', source: 'local' },
    ];
    const rowOf = (e: { rows: { version: string }[] }, version: string) => e.rows.find((r) => r.version === version) as any;

    test('online=false → source=hub 행만 selectable=false, local 행은 원래 값 유지', () => {
        const rows = computeEligibility(catalog, '8.0.45').rows;
        const masked = applyOfflineSelectable(rows, false);
        expect(masked.find((r) => r.version === '1.3.0')?.selectable).toBe(false);
        expect(masked.find((r) => r.version === '1.2.0')?.selectable).toBe(true);
        expect(masked.find((r) => r.version === '1.1.0')?.selectable).toBe(true);
        // eligible/state는 서버 호환성 판정이므로 손대지 않는다
        expect(masked.find((r) => r.version === '1.3.0')?.eligible).toBe(true);
    });

    test('online=true → 어떤 행도 변경되지 않는다 (배열 동일성까지)', () => {
        const rows = computeEligibility(catalog, '8.0.45').rows;
        const masked = applyOfflineSelectable(rows, true);
        expect(masked).toBe(rows);
        expect(masked.map((r) => r.selectable)).toEqual(rows.map((r) => r.selectable));
    });

    test('마스킹 후 defaultInstall = selectable local 중 최신', () => {
        const e = applyOfflineEligibility(computeEligibility(catalog, '8.0.45'), false);
        expect(e.defaultInstall).toBe('1.2.0');
        expect(rowOf(e, '1.2.0').state).toBe('default'); // default 뱃지도 함께 이동
        expect(rowOf(e, '1.3.0').state).toBe('eligible'); // 더 이상 default 아님
    });

    test('마스킹 후 defaultUpdate = selectable local 중 최신 (설치본보다 위)', () => {
        const online = computeEligibility(catalog, '8.0.45', '1.1.0');
        expect(online.defaultUpdate).toBe('1.3.0'); // 온라인이면 hub 최신
        const e = applyOfflineEligibility(online, false, '1.1.0');
        expect(e.defaultUpdate).toBe('1.2.0'); // 오프라인이면 로컬 아카이브 최신
        expect(rowOf(e, '1.1.0').state).toBe('current');
        expect(rowOf(e, '1.2.0').state).toBe('default');
    });

    test('설치 가능한 local이 없으면 오프라인에서 default 없음 → Update 버튼이 사라진다', () => {
        const hubOnly: PkgVersionInfo[] = [
            { version: '1.3.0', minServer: '8.0.10', source: 'hub' },
            { version: '1.1.0', minServer: '8.0.10', source: 'hub' },
        ];
        const e = applyOfflineEligibility(computeEligibility(hubOnly, '8.0.45', '1.1.0'), false, '1.1.0');
        expect(e.defaultUpdate).toBeUndefined();
        expect(e.defaultInstall).toBeUndefined();
        expect(e.rows.every((r) => !r.selectable)).toBe(true);
    });

    test('minServer 미충족 local 행은 오프라인이어도 ineligible + selectable=false 유지', () => {
        const e = applyOfflineEligibility(
            computeEligibility(
                [
                    { version: '2.0.0', minServer: '9.0.0', source: 'local' }, // 서버 미달
                    { version: '1.2.0', minServer: '8.0.10', source: 'local' },
                ],
                '8.0.45'
            ),
            false
        );
        expect(rowOf(e, '2.0.0').state).toBe('ineligible');
        expect(rowOf(e, '2.0.0').selectable).toBe(false);
        expect(e.defaultInstall).toBe('1.2.0');
    });

    test('설치 버전이 versions[]에 있으면 isIncompatible이 오프라인 후에도 그대로 계산된다', () => {
        const e = applyOfflineEligibility(
            computeEligibility([{ version: '1.5.0', minServer: '8.0.60', source: 'hub' }], '8.0.45', '1.5.0'),
            false,
            '1.5.0'
        );
        expect(e.isIncompatible).toBe(true);
        expect(e.installedMinServer).toBe('8.0.60');
        expect(rowOf(e, '1.5.0').state).toBe('current'); // 설치본 행은 계속 보인다
    });

    test('source 미지정(레거시) 행은 오프라인에서도 마스킹되지 않는다', () => {
        // hub 태깅은 카탈로그가 명시적으로 채운다(catalog.ts mergeVersions).
        // 태그가 없는 행은 이 계층에서 임의로 hub로 간주하지 않는다.
        const rows = computeEligibility([{ version: '1.0.0', minServer: '' }], '8.0.45').rows;
        expect(applyOfflineSelectable(rows, false)[0].selectable).toBe(true);
    });

    test('pickDefaultInstall / pickDefaultUpdate 순수 함수 규약', () => {
        const rows = applyOfflineSelectable(computeEligibility(catalog, '8.0.45', '1.1.0').rows, false);
        expect(pickDefaultInstall(rows)).toBe('1.2.0');
        expect(pickDefaultUpdate(rows, '1.1.0')).toBe('1.2.0');
        expect(pickDefaultUpdate(rows, undefined)).toBeUndefined(); // 설치 전에는 update 대상 없음
        expect(pickDefaultInstall([])).toBeUndefined();
    });
});

describe('resolveActionSource — 카드 기본 버튼이 설치할 버전의 출처 (#1452)', () => {
    const mixed: PkgVersionInfo[] = [
        { version: '1.3.0', minServer: '8.0.10', source: 'hub' },
        { version: '1.2.0', minServer: '8.0.10', source: 'local' },
        { version: '1.1.0', minServer: '8.0.10', source: 'local' },
    ];

    test('업데이트 있음 + 대상이 local 행 → local', () => {
        const localNewest: PkgVersionInfo[] = [
            { version: '1.3.0', minServer: '8.0.10', source: 'local' },
            { version: '1.1.0', minServer: '8.0.10', source: 'hub' },
        ];
        const e = computeEligibility(localNewest, '8.0.45', '1.1.0');
        expect(e.defaultUpdate).toBe('1.3.0');
        expect(resolveActionSource(e, '1.1.0')).toBe('local');
    });

    test('업데이트 있음 + 대상이 hub 행 → hub (defaultInstall이 local이어도 update가 우선)', () => {
        const e = computeEligibility(mixed, '8.0.45', '1.1.0');
        expect(e.defaultUpdate).toBe('1.3.0');
        expect(resolveActionSource(e, '1.1.0')).toBe('hub');
    });

    test('미설치 + defaultInstall이 local → local', () => {
        const e = computeEligibility(
            [
                { version: '1.2.0', minServer: '8.0.10', source: 'local' },
                { version: '1.1.0', minServer: '8.0.10', source: 'hub' },
            ],
            '8.0.45'
        );
        expect(e.defaultUpdate).toBeUndefined();
        expect(resolveActionSource(e, undefined)).toBe('local');
    });

    test('설치됨 + 업데이트 없음 → 설치 버전 행의 출처를 본다 (local)', () => {
        // 최신이 곧 설치본이라 defaultUpdate 없음. "같은 버전의 로컬 아카이브가 있다"는 정보.
        const e = computeEligibility([{ version: '1.2.0', minServer: '8.0.10', source: 'local' }], '8.0.45', '1.2.0');
        expect(e.defaultUpdate).toBeUndefined();
        expect(resolveActionSource(e, '1.2.0')).toBe('local');
    });

    test('대응하는 행이 없으면 undefined', () => {
        // 실험 모드 커스텀 버전처럼 versions[]에 없는 설치본
        const e = computeEligibility([], '8.0.45', '9.9.9-dev');
        expect(resolveActionSource(e, '9.9.9-dev')).toBeUndefined();
        // 대상 자체가 없는 경우(미설치 + 설치 가능 버전 없음)
        expect(resolveActionSource(computeEligibility([], '8.0.45'), undefined)).toBeUndefined();
    });

    test('source 태그 없는 레거시 행 → undefined (hub로 넘겨짚지 않는다)', () => {
        const e = computeEligibility([{ version: '1.0.0', minServer: '' }], '8.0.45');
        expect(resolveActionSource(e, undefined)).toBeUndefined();
    });

    test('오프라인 마스킹으로 hub 대상이 빠지면 local이 대상이 되어 local', () => {
        const online = computeEligibility(mixed, '8.0.45', '1.1.0');
        expect(resolveActionSource(online, '1.1.0')).toBe('hub'); // 온라인: hub 1.3.0

        const offline = applyOfflineEligibility(online, false, '1.1.0');
        expect(offline.defaultUpdate).toBe('1.2.0');
        expect(resolveActionSource(offline, '1.1.0')).toBe('local'); // 오프라인: local 1.2.0
    });

    test('설치본이 v-prefix여도 카탈로그 행과 매칭된다', () => {
        const e = computeEligibility([{ version: '1.2.0', minServer: '8.0.10', source: 'local' }], '8.0.45', 'v1.2.0');
        expect(resolveActionSource(e, 'v1.2.0')).toBe('local');
    });
});
