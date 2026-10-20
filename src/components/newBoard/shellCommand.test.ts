import { isCustomShell, shortenShellCommand } from './shellCommand';

describe('shortenShellCommand', () => {
    it('drops the directory of a quoted binary path', () => {
        expect(shortenShellCommand('"/Users/kev/work/machbase-neo" shell -v "/work=/Users/kev/work" -server 127.0.0.1:5654')).toBe(
            'machbase-neo shell -v "/work=/Users/kev/work" -server 127.0.0.1:5654'
        );
    });

    it('handles unquoted, single-quoted and Windows paths', () => {
        expect(shortenShellCommand('/bin/bash -l')).toBe('bash -l');
        expect(shortenShellCommand("'/opt/neo bin/machbase-neo' jsh")).toBe('machbase-neo jsh');
        expect(shortenShellCommand('C:\\neo\\machbase-neo.exe shell')).toBe('machbase-neo.exe shell');
    });

    it('leaves a bare command alone and tolerates nothing', () => {
        expect(shortenShellCommand('zsh')).toBe('zsh');
        expect(shortenShellCommand(undefined)).toBe('');
    });
});

describe('isCustomShell', () => {
    it('tells a shell the user made from the built-in ones', () => {
        expect(isCustomShell({ attributes: [{ removable: true }, { cloneable: true }, { editable: true }] })).toBe(true);
        expect(isCustomShell({ attributes: [{ cloneable: true }] })).toBe(false);
        expect(isCustomShell({ attributes: [] })).toBe(false);
        expect(isCustomShell({})).toBe(false);
    });
});
