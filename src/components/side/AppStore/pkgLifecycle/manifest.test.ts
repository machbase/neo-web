import { isPackageManaged } from './manifest';
import type { PkgManifest } from './types';

describe('isPackageManaged — defaults to true when packageService key absent', () => {
    test('undefined manifest → true (default)', () => {
        expect(isPackageManaged(undefined)).toBe(true);
    });

    test('null manifest → true (default)', () => {
        expect(isPackageManaged(null)).toBe(true);
    });

    test('empty manifest → true (legacy compatibility)', () => {
        expect(isPackageManaged({} as PkgManifest)).toBe(true);
    });

    test('packageService.managed === true → true', () => {
        expect(isPackageManaged({ packageService: { managed: true } } as PkgManifest)).toBe(true);
    });

    test('packageService.managed === false → false', () => {
        expect(isPackageManaged({ packageService: { managed: false } } as PkgManifest)).toBe(false);
    });

    test('packageService.managed === false with reason → false', () => {
        expect(
            isPackageManaged({ packageService: { managed: false, reason: 'x' } } as PkgManifest)
        ).toBe(false);
    });
});
