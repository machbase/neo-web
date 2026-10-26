import { readViewPath } from './loginRedirect';

// F-48: a broken stored 'view' threw inside sign-in, leaving the login form on screen.
describe('readViewPath', () => {
    it('reads the path the app writes', () => {
        expect(readViewPath(JSON.stringify({ path: '/view/a/b.dsh' }))).toBe('/view/a/b.dsh');
    });
    it.each([null, '{bad json', 'null', '{}', '{"path":1}', '{"path":""}', '"x"'])('nothing to follow for %p', (aStored) => {
        expect(readViewPath(aStored)).toBeNull();
    });
});
