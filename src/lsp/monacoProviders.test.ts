/**
 * Unit tests for the pure helpers + scheduling behavior of `monacoProviders.ts`.
 *
 * We do NOT exercise the actual Monaco provider registration — that requires
 * a running editor and a real Monaco runtime; coverage there happens through
 * E2E/manual smoke tests in MonacoEditor. The pure helpers (`toCompletionKind`,
 * `toMarkerSeverity`, `compactTqlHoverMarkdown`) and the per-model debounce
 * logic (`scheduleDiagnostics`) are the parts where mistakes would silently
 * regress LSP UX, so we lock them down here.
 */

import {
    __resetForTests,
    compactTqlHoverMarkdown,
    scheduleDiagnostics,
    toCompletionKind,
    toMarkerSeverity,
} from './monacoProviders';
import { postLspDiagnostics } from '@/api/repository/lsp';

jest.mock('@/api/repository/lsp', () => ({
    postLspDiagnostics: jest.fn(),
    postLspCompletion: jest.fn(),
    postLspHover: jest.fn(),
    postLspSignatureHelp: jest.fn(),
}));

const mockedPostLspDiagnostics = postLspDiagnostics as jest.MockedFunction<typeof postLspDiagnostics>;

// ---------------------------------------------------------------------------
// Minimal Monaco surrogate — only the fields the helpers actually read.
// ---------------------------------------------------------------------------
const mockMonaco = {
    MarkerSeverity: {
        Error: 8,
        Warning: 4,
        Info: 2,
        Hint: 1,
    },
    languages: {
        CompletionItemKind: {
            Function: 1,
            Keyword: 17,
            Snippet: 27,
            Text: 18,
        },
    },
    Range: class {
        constructor(
            public startLineNumber: number,
            public startColumn: number,
            public endLineNumber: number,
            public endColumn: number
        ) {}
    },
    editor: {
        setModelMarkers: jest.fn(),
    },
} as any;

describe('toCompletionKind', () => {
    it('maps LSP CompletionItemKind=3 (Function) to Monaco Function', () => {
        expect(toCompletionKind(mockMonaco, 3)).toBe(mockMonaco.languages.CompletionItemKind.Function);
    });

    it('maps LSP CompletionItemKind=14 (Keyword) to Monaco Keyword', () => {
        expect(toCompletionKind(mockMonaco, 14)).toBe(mockMonaco.languages.CompletionItemKind.Keyword);
    });

    it('maps LSP CompletionItemKind=15 (Snippet) to Monaco Snippet', () => {
        expect(toCompletionKind(mockMonaco, 15)).toBe(mockMonaco.languages.CompletionItemKind.Snippet);
    });

    it('falls back to Text for unmapped kinds (e.g. 1=Method)', () => {
        expect(toCompletionKind(mockMonaco, 1)).toBe(mockMonaco.languages.CompletionItemKind.Text);
        expect(toCompletionKind(mockMonaco, 999)).toBe(mockMonaco.languages.CompletionItemKind.Text);
    });
});

describe('toMarkerSeverity', () => {
    it('maps 1 → Error, 2 → Warning, 3 → Info', () => {
        expect(toMarkerSeverity(mockMonaco, 1)).toBe(mockMonaco.MarkerSeverity.Error);
        expect(toMarkerSeverity(mockMonaco, 2)).toBe(mockMonaco.MarkerSeverity.Warning);
        expect(toMarkerSeverity(mockMonaco, 3)).toBe(mockMonaco.MarkerSeverity.Info);
    });

    it('falls back to Hint for unknown severities', () => {
        expect(toMarkerSeverity(mockMonaco, 4)).toBe(mockMonaco.MarkerSeverity.Hint);
        expect(toMarkerSeverity(mockMonaco, 999)).toBe(mockMonaco.MarkerSeverity.Hint);
    });
});

describe('compactTqlHoverMarkdown', () => {
    it('returns input unchanged when there is no # Title (treated as already-compact)', () => {
        const raw = 'just a tooltip';
        expect(compactTqlHoverMarkdown(raw)).toBe(raw);
    });

    it('compacts a full TQL doc block: title + kind/category badges + description + signature', () => {
        const raw = [
            '# SQL',
            '',
            '## Kind',
            'source',
            '',
            '## Category',
            'database',
            '',
            '## Description',
            'Execute a SQL query against the database.',
            '',
            '## Signatures',
            '```text',
            'SQL(query)',
            '```',
        ].join('\n');

        const compacted = compactTqlHoverMarkdown(raw);

        expect(compacted).toContain('`SQL`');
        expect(compacted).toContain('`source`');
        expect(compacted).toContain('`database`');
        expect(compacted).toContain('Execute a SQL query against the database.');
        expect(compacted).toContain('Signature');
        expect(compacted).toContain('SQL(query)');
    });

    it('extracts a Related comma-list into inline-code', () => {
        const raw = ['# CSV', '', '## Related', 'JSON, MARKDOWN, HTML'].join('\n');
        const compacted = compactTqlHoverMarkdown(raw);
        expect(compacted).toContain('Related:');
        expect(compacted).toContain('`JSON`');
        expect(compacted).toContain('`MARKDOWN`');
        expect(compacted).toContain('`HTML`');
    });

    it('skips placeholder sections that contain only "TODO"', () => {
        const raw = ['# FOO', '', '## Description', 'TODO', '', '## Related', 'TODO'].join('\n');
        const compacted = compactTqlHoverMarkdown(raw);
        expect(compacted).not.toContain('TODO');
        expect(compacted).not.toContain('Related:');
    });
});

describe('scheduleDiagnostics — debounce behavior', () => {
    let model: any;

    beforeEach(() => {
        jest.useFakeTimers();
        __resetForTests();
        mockedPostLspDiagnostics.mockReset();
        mockedPostLspDiagnostics.mockResolvedValue({
            success: true,
            reason: 'success',
            data: { diagnostics: [] },
        } as any);
        mockMonaco.editor.setModelMarkers.mockClear();

        model = {
            uri: { toString: () => 'inmemory://test/1.tql' },
            getLanguageId: () => 'tql',
            getValue: () => 'SELECT 1',
            isDisposed: () => false,
        };
    });

    afterEach(() => {
        jest.useRealTimers();
        __resetForTests();
    });

    it('debounces consecutive calls: only one RPC fires after the delay window', () => {
        scheduleDiagnostics(mockMonaco, model);
        scheduleDiagnostics(mockMonaco, model);
        scheduleDiagnostics(mockMonaco, model);

        // None fire before the delay elapses.
        expect(mockedPostLspDiagnostics).not.toHaveBeenCalled();

        jest.advanceTimersByTime(400);

        // Exactly one call total — the previous two timers were cleared by
        // each subsequent scheduleDiagnostics invocation.
        expect(mockedPostLspDiagnostics).toHaveBeenCalledTimes(1);
    });

    it('does not fire the RPC before the debounce window completes', () => {
        scheduleDiagnostics(mockMonaco, model);
        jest.advanceTimersByTime(100); // less than DIAGNOSTIC_DELAY (350)
        expect(mockedPostLspDiagnostics).not.toHaveBeenCalled();

        jest.advanceTimersByTime(300);
        expect(mockedPostLspDiagnostics).toHaveBeenCalledTimes(1);
    });
});
