import { compareVersions, comparePkgVersions, normalizePkgVersion, stripVPrefix } from './utils';

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
