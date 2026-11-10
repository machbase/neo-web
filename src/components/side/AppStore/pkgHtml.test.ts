import { pkgPageUrl } from './pkgHtml';

// A package's page is framed at an address with the installed version in it: the server sends no
// Cache-Control, so after an update the browser kept showing the page it had cached (the theme
// builder 1.9.2 beside a web UI whose tokens had moved on — its console preview went black).
describe('pkgPageUrl', () => {
    test('the installed version is in the address, so an update is a new one', () => {
        expect(pkgPageUrl('neo-pkg-theme-builder', 'main.html', '1.13.0')).toBe('/public/neo-pkg-theme-builder/main.html?v=1.13.0');
        expect(pkgPageUrl('neo-pkg-theme-builder', 'main.html', '1.13.1')).not.toBe(pkgPageUrl('neo-pkg-theme-builder', 'main.html', '1.13.0'));
        expect(pkgPageUrl('my-pkg', 'side.html', '2.0.0')).toBe('/public/my-pkg/side.html?v=2.0.0');
    });

    test('a version is written as a query value', () => {
        expect(pkgPageUrl('p', 'main.html', '1.0.0-beta+1 &x')).toBe('/public/p/main.html?v=1.0.0-beta%2B1%20%26x');
    });

    test('no version (the manifest could not be read): the bare path', () => {
        expect(pkgPageUrl('p', 'main.html', '')).toBe('/public/p/main.html');
    });
});
