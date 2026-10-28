// issue #1570 F-26 — catalog links must not run scripts in this tab nor keep a
// handle back to it.
import { isHttpUrl, openExternalUrl } from './externalUrl';

describe('isHttpUrl', () => {
    test.each(['https://example.com', 'http://example.com/a?b=1', '  https://example.com  ', 'HTTPS://EXAMPLE.COM'])('accepts %s', (u) => {
        expect(isHttpUrl(u)).toBe(true);
    });
    test.each(['javascript:alert(1)', ' javascript:opener.document.title=1', 'JaVaScRiPt:alert(1)', 'data:text/html,<b>x</b>', 'vbscript:x', 'file:///etc/passwd', '//example.com', 'example.com', '', undefined, null, 1])(
        'rejects %p',
        (u) => {
            expect(isHttpUrl(u)).toBe(false);
        }
    );
});

describe('openExternalUrl', () => {
    let open: jest.SpyInstance;
    beforeEach(() => {
        open = jest.spyOn(window, 'open').mockImplementation(() => null);
    });
    afterEach(() => open.mockRestore());

    test('opens an https address detached from this window', () => {
        expect(openExternalUrl('https://github.com/machbase/neo')).toBe(true);
        expect(open).toHaveBeenCalledWith('https://github.com/machbase/neo', '_blank', 'noopener,noreferrer');
    });

    test('never opens a script address', () => {
        expect(openExternalUrl("javascript:opener.document.title='x'")).toBe(false);
        expect(open).not.toHaveBeenCalled();
    });
});
