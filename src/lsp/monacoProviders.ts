/**
 * Monaco language provider integration for TQL/JSH.
 *
 * Responsibilities:
 *   1. Register Completion, Hover and Signature-help providers that proxy to
 *      the JSON-RPC LSP wrappers in `@/api/repository/lsp`.
 *   2. Wire up debounced diagnostics per model: every content change reschedules
 *      a single `lsp.diagnostics` call and pushes the result to Monaco markers.
 *
 * Why all state lives at module scope (`sRegistered`, `sModelTimers`,
 * `sModelDisposables`):
 *   - Provider registration is global on the Monaco namespace. React StrictMode
 *     double-mounts, HMR re-imports and multiple editor mounts all funnel through
 *     the same Monaco singleton, so we must guard with `sRegistered` to avoid
 *     leaking duplicate providers (each one would fire its own RPC per keystroke).
 *   - Diagnostic debounce timers and content-change disposables are keyed by
 *     `model.uri.toString()` so per-model lifecycle cleanup is O(1).
 *
 * Graceful degradation: every RPC call is wrapped in `try/catch` and returns
 * an empty/null result on failure. This keeps `dev-next` usable even when the
 * backend LSP endpoint is not yet deployed — the editor falls back to plain
 * syntax highlighting + no completions, no error toasts.
 */

import type * as Monaco from 'monaco-editor';
import {
    postLspCompletion,
    postLspDiagnostics,
    postLspHover,
    postLspSignatureHelp,
    type LspCompletionItem,
    type LspDiagnostic,
    type LspHover,
    type LspLanguage,
    type LspRange,
    type LspSignatureHelp,
    type LspSignatureInfo,
} from '@/api/repository/lsp';
import { JSH_LANGUAGE_ID, TQL_LANGUAGE_ID } from '@/lsp/languages';

const DIAGNOSTIC_DELAY = 350;

/**
 * Single source of truth for which Monaco languages receive LSP providers
 * (completion / hover / signature) and diagnostics. Adding a new LSP-backed
 * language is a one-line change in this array. The Set form
 * (`LSP_LANGUAGE_IDS`) is derived for O(1) `has()` lookups in the
 * diagnostics attach/schedule path.
 */
const LSP_LANGUAGES = [TQL_LANGUAGE_ID, JSH_LANGUAGE_ID] as const;
const LSP_LANGUAGE_IDS: ReadonlySet<string> = new Set<string>(LSP_LANGUAGES);

let sRegistered = false;
const sModelTimers = new Map<string, number>();
const sModelDisposables = new Map<string, Monaco.IDisposable>();

/**
 * Idempotently register Monaco LSP providers (completion / hover / signature)
 * and attach diagnostic listeners to all current and future models.
 *
 * Safe to call multiple times — guarded by `sRegistered`.
 */
export const registerLspProviders = (monaco: typeof Monaco) => {
    if (sRegistered) return;
    sRegistered = true;

    // --- Completion ---------------------------------------------------------
    LSP_LANGUAGES.forEach((languageId) => {
        monaco.languages.registerCompletionItemProvider(languageId, {
            triggerCharacters: ['(', ','],
            provideCompletionItems: async (model, position) => {
                const word = model.getWordUntilPosition(position);
                const range = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
                try {
                    const result = await postLspCompletion({
                        language: model.getLanguageId() as LspLanguage,
                        uri: model.uri.toString(),
                        text: model.getValue(),
                        position: { line: position.lineNumber, column: position.column },
                    });
                    const items: LspCompletionItem[] = result?.data?.items ?? [];
                    return {
                        suggestions: items.map((item) => ({
                            label: item.label,
                            kind: toCompletionKind(monaco, item.kind),
                            detail: item.detail,
                            documentation: item.documentation,
                            insertText: item.insertText || item.label,
                            range,
                        })),
                    };
                } catch {
                    return { suggestions: [] };
                }
            },
        });
    });

    // --- Hover --------------------------------------------------------------
    LSP_LANGUAGES.forEach((languageId) => {
        monaco.languages.registerHoverProvider(languageId, {
            provideHover: async (model, position) => {
                try {
                    const result = await postLspHover({
                        language: model.getLanguageId() as LspLanguage,
                        uri: model.uri.toString(),
                        text: model.getValue(),
                        position: { line: position.lineNumber, column: position.column },
                    });
                    const hover: LspHover | undefined = result?.data?.hover;
                    if (!hover) return null;
                    return {
                        range: toMonacoRange(monaco, hover.range),
                        contents: toHoverMarkdown(model.getLanguageId() as LspLanguage, hover.contents),
                    };
                } catch {
                    return null;
                }
            },
        });
    });

    // --- Signature help -----------------------------------------------------
    LSP_LANGUAGES.forEach((languageId) => {
        monaco.languages.registerSignatureHelpProvider(languageId, {
            signatureHelpTriggerCharacters: ['(', ','],
            signatureHelpRetriggerCharacters: [','],
            provideSignatureHelp: async (model, position) => {
                try {
                    const result = await postLspSignatureHelp({
                        language: model.getLanguageId() as LspLanguage,
                        uri: model.uri.toString(),
                        text: model.getValue(),
                        position: { line: position.lineNumber, column: position.column },
                    });
                    const signatureHelp: LspSignatureHelp | undefined = result?.data?.signatureHelp;
                    if (!signatureHelp || signatureHelp.signatures.length === 0) return null;
                    return {
                        value: {
                            signatures: signatureHelp.signatures.map((signature) => toMonacoSignature(signature)),
                            activeSignature: signatureHelp.activeSignature,
                            activeParameter: signatureHelp.activeParameter,
                        },
                        dispose: () => undefined,
                    };
                } catch {
                    return null;
                }
            },
        });
    });

    // --- Diagnostics: per-model lifecycle ----------------------------------
    monaco.editor.onDidCreateModel((model) => attachDiagnostics(monaco, model));
    monaco.editor.onDidChangeModelLanguage((event) => attachDiagnostics(monaco, event.model));
    // `onDidCreateModel` only fires for future models — catch up on the ones
    // that already exist (e.g. when this is called after Monaco has booted).
    monaco.editor.getModels().forEach((model) => attachDiagnostics(monaco, model));
};

/**
 * Attach (or re-attach) the diagnostics pipeline to a model.
 *
 * - For non-LSP languages, clear any existing markers and bail (handles the
 *   case where a model's language changed AWAY from tql/jsh).
 * - For LSP languages, schedule an initial diagnostic and subscribe to content
 *   changes for subsequent debounced runs.
 * - Always dispose the previous listener before adding a new one — guards
 *   against duplicate listeners on language switch.
 */
const attachDiagnostics = (monaco: typeof Monaco, model: Monaco.editor.ITextModel) => {
    const key = model.uri.toString();
    sModelDisposables.get(key)?.dispose();
    sModelDisposables.delete(key);

    if (!LSP_LANGUAGE_IDS.has(model.getLanguageId())) {
        monaco.editor.setModelMarkers(model, markerOwner(model), []);
        return;
    }

    scheduleDiagnostics(monaco, model);
    const disposable = model.onDidChangeContent(() => scheduleDiagnostics(monaco, model));
    sModelDisposables.set(key, disposable);
    model.onWillDispose(() => {
        clearTimer(key);
        sModelDisposables.get(key)?.dispose();
        sModelDisposables.delete(key);
    });
};

/**
 * Debounce diagnostic runs per model. Each new call cancels the pending timer
 * so we never issue more than one RPC per `DIAGNOSTIC_DELAY` window per model
 * regardless of typing speed.
 */
export const scheduleDiagnostics = (monaco: typeof Monaco, model: Monaco.editor.ITextModel) => {
    const key = model.uri.toString();
    clearTimer(key);
    const timer = window.setTimeout(() => runDiagnostics(monaco, model), DIAGNOSTIC_DELAY);
    sModelTimers.set(key, timer);
};

const runDiagnostics = async (monaco: typeof Monaco, model: Monaco.editor.ITextModel) => {
    if (model.isDisposed() || !LSP_LANGUAGE_IDS.has(model.getLanguageId())) return;
    try {
        const result = await postLspDiagnostics({
            language: model.getLanguageId() as LspLanguage,
            uri: model.uri.toString(),
            text: model.getValue(),
        });
        const diagnostics: LspDiagnostic[] = result?.data?.diagnostics ?? [];
        monaco.editor.setModelMarkers(
            model,
            markerOwner(model),
            diagnostics.map((diagnostic) => ({
                ...toMarkerRange(diagnostic.range),
                severity: toMarkerSeverity(monaco, diagnostic.severity),
                code: diagnostic.code,
                source: diagnostic.source,
                message: diagnostic.message,
            }))
        );
    } catch {
        monaco.editor.setModelMarkers(model, markerOwner(model), []);
    }
};

const clearTimer = (key: string) => {
    const timer = sModelTimers.get(key);
    if (timer !== undefined) window.clearTimeout(timer);
    sModelTimers.delete(key);
};

// -----------------------------------------------------------------------------
// Conversion helpers (exported for unit testing)
// -----------------------------------------------------------------------------

export const toMonacoRange = (monaco: typeof Monaco, range: LspRange) =>
    new monaco.Range(range.start.line, range.start.column, range.end.line, range.end.column);

interface MonacoHoverMarkdown {
    value: string;
}

const toHoverMarkdown = (language: LspLanguage, contents: string): MonacoHoverMarkdown[] => {
    if (language !== TQL_LANGUAGE_ID) return [{ value: contents }];
    return [{ value: compactTqlHoverMarkdown(contents) || contents }];
};

/**
 * Compact TQL hover markdown for the small Monaco hover widget.
 *
 * The backend serves verbose docs with `# Title`, `## Kind`, `## Category`,
 * `## Description`, `## Signatures` (fenced code), `## Slots` (table),
 * `## Examples` (`### Sub-title` + fenced), and `## Related` (comma list).
 * We extract the load-bearing pieces and reflow them into a compact format
 * that fits the popup without clipping.
 *
 * If the input has no `# Title` we treat it as already-compact and return
 * the raw string unchanged (signaled by an empty return, which the caller
 * falls back from).
 */
export const compactTqlHoverMarkdown = (contents: string): string => {
    const title = contents.match(/^#\s+(.+)$/m)?.[1]?.trim();
    if (!title) return contents;

    const sections = markdownSections(contents);
    const kind = sectionText(sections.get('Kind'));
    const category = sectionText(sections.get('Category'));
    const description = sectionText(sections.get('Description'));
    const signatures = fencedCode(sections.get('Signatures'));
    const slots = compactSlots(sections.get('Slots'));
    const examples = compactExamples(sections.get('Examples'));
    const related = inlineList(sections.get('Related'));

    const parts: string[] = [`\`${title}\``];
    const badges = [kind, category].filter(Boolean).map((item) => `\`${item}\``);
    if (badges.length > 0) parts.push(badges.join(' . '));
    if (description) parts.push(description);
    if (signatures) parts.push(['Signature', '```text', signatures, '```'].join('\n'));
    if (slots.length > 0) parts.push(['Parameters', ...slots].join('\n'));
    if (examples.length > 0) parts.push(['Examples', ...examples].join('\n\n'));
    if (related.length > 0) parts.push(`Related: ${related.map((item) => `\`${item}\``).join(', ')}`);

    return parts.join('\n\n');
};

const markdownSections = (contents: string) => {
    const sections = new Map<string, string>();
    let current = '';
    let buffer: string[] = [];
    const flush = () => {
        if (current) sections.set(current, buffer.join('\n').trim());
        buffer = [];
    };

    contents.split('\n').forEach((line) => {
        const match = line.match(/^##\s+(.+)\s*$/);
        if (match && !line.startsWith('###')) {
            flush();
            current = match[1].trim();
            return;
        }
        if (current) buffer.push(line);
    });
    flush();
    return sections;
};

const sectionText = (section?: string) => {
    const text = section?.trim() ?? '';
    if (!text || text.toUpperCase() === 'TODO') return '';
    return text;
};

const fencedCode = (section?: string) => {
    if (!section) return '';
    const match = section.match(/```[^\n]*\n([\s\S]*?)\n```/);
    return match?.[1]?.trim() ?? '';
};

const compactSlots = (section?: string) => {
    if (!section) return [];
    return section
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('|') && !line.includes('---') && !line.includes('Slot | Required'))
        .map((line) => normalizeSlotColumns(line.split('|').slice(1, -1).map((column) => column.trim())))
        .filter((columns) => columns.length === 5 && columns[0].toLowerCase() !== 'none')
        .map(([slot, required, repeat, accepts, suggestions]) => {
            const details = [accepts && `accepts ${accepts}`, yes(required) && 'required', yes(repeat) && 'repeatable', compactSuggestions(suggestions)]
                .filter(Boolean)
                .join('; ');
            return details ? `- \`${slot}\`: ${details}` : `- \`${slot}\``;
        });
};

const normalizeSlotColumns = (columns: string[]) => {
    if (columns.length <= 5) return columns;
    return [columns[0], columns[1], columns[2], columns.slice(3, -1).join('|'), columns[columns.length - 1]];
};

const yes = (value: string) => ['yes', 'true'].includes(value.trim().toLowerCase());

const compactSuggestions = (value: string) => {
    const items = inlineList(value);
    if (items.length === 0) return '';
    return `suggests ${items.map((item) => `\`${item}\``).join(', ')}`;
};

const compactExamples = (section?: string): string[] => {
    if (!section) return [];
    const examples: string[] = [];
    const pattern = /^###\s+(.+)\s*$([\s\S]*?)(?=^###\s+|\s*$)/gm;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(section)) !== null) {
        const title = match[1]?.trim() || 'Example';
        const code = fencedCode(match[2]);
        if (code) examples.push([`---`, `Example: ${title}`, '```js', code, '```'].join('\n'));
    }
    if (examples.length > 0) return examples;

    const code = fencedCode(section);
    return code ? [[`---`, 'Example', '```js', code, '```'].join('\n')] : [];
};

const inlineList = (value?: string) => {
    const text = sectionText(value);
    if (!text) return [];
    return text
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item && item.toUpperCase() !== 'TODO' && item.toLowerCase() !== 'none');
};

const markerOwner = (model: Monaco.editor.ITextModel) => `neo-${model.getLanguageId()}-lsp`;

const toMarkerRange = (range: LspRange) => ({
    startLineNumber: range.start.line,
    startColumn: range.start.column,
    endLineNumber: range.end.line,
    endColumn: range.end.column,
});

/**
 * Map LSP DiagnosticSeverity (1=Error, 2=Warning, 3=Info, 4=Hint) to Monaco
 * MarkerSeverity. Unknown values fall through to Hint to avoid surprising
 * red squiggles on a forward-compat severity code.
 */
export const toMarkerSeverity = (monaco: typeof Monaco, severity: number) => {
    switch (severity) {
        case 1:
            return monaco.MarkerSeverity.Error;
        case 2:
            return monaco.MarkerSeverity.Warning;
        case 3:
            return monaco.MarkerSeverity.Info;
        default:
            return monaco.MarkerSeverity.Hint;
    }
};

/**
 * Map LSP CompletionItemKind to Monaco CompletionItemKind for the kinds the
 * backend actually emits today (Function=3, Keyword=14, Snippet=15). Other
 * values fall back to Text so the dropdown still shows a generic icon
 * instead of breaking.
 */
export const toCompletionKind = (monaco: typeof Monaco, kind: number) => {
    switch (kind) {
        case 3:
            return monaco.languages.CompletionItemKind.Function;
        case 14:
            return monaco.languages.CompletionItemKind.Keyword;
        case 15:
            return monaco.languages.CompletionItemKind.Snippet;
        default:
            return monaco.languages.CompletionItemKind.Text;
    }
};

export const toMonacoSignature = (signature: LspSignatureInfo) => ({
    label: signature.label,
    documentation: signature.documentation,
    parameters: (signature.parameters ?? []).map((parameter) => ({
        label: parameter.label,
        documentation: parameter.documentation,
    })),
});

/**
 * Test-only: reset module state. Production code never calls this.
 * Exposed so unit tests can run `registerLspProviders` once per test in
 * isolation without pulling in the previous test's `sRegistered` guard.
 */
export const __resetForTests = () => {
    sRegistered = false;
    sModelTimers.forEach((timer) => window.clearTimeout(timer));
    sModelTimers.clear();
    sModelDisposables.forEach((disposable) => disposable.dispose());
    sModelDisposables.clear();
};
