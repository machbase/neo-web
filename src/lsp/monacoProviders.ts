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
const LSP_LANGUAGE_IDS = new Set<string>([TQL_LANGUAGE_ID, JSH_LANGUAGE_ID]);

let sRegistered = false;
const sModelTimers = new Map<string, number>();
const sModelDisposables = new Map<string, Monaco.IDisposable>();

export const registerLspProviders = (monaco: typeof Monaco) => {
    if (sRegistered) return;
    sRegistered = true;

    [TQL_LANGUAGE_ID, JSH_LANGUAGE_ID].forEach((languageId) => {
        monaco.languages.registerCompletionItemProvider(languageId, {
            triggerCharacters: ['(', ','],
            provideCompletionItems: async (model, position) => {
                const word = model.getWordUntilPosition(position);
                const range = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
                try {
                    const result: any = await postLspCompletion({
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

    [TQL_LANGUAGE_ID, JSH_LANGUAGE_ID].forEach((languageId) => {
        monaco.languages.registerHoverProvider(languageId, {
            provideHover: async (model, position) => {
                try {
                    const result: any = await postLspHover({
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

    [TQL_LANGUAGE_ID, JSH_LANGUAGE_ID].forEach((languageId) => {
        monaco.languages.registerSignatureHelpProvider(languageId, {
            signatureHelpTriggerCharacters: ['(', ','],
            signatureHelpRetriggerCharacters: [','],
            provideSignatureHelp: async (model, position) => {
                try {
                    const result: any = await postLspSignatureHelp({
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

    monaco.editor.onDidCreateModel((model) => attachDiagnostics(monaco, model));
    monaco.editor.onDidChangeModelLanguage((event) => attachDiagnostics(monaco, event.model));
    monaco.editor.getModels().forEach((model) => attachDiagnostics(monaco, model));
};

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

const scheduleDiagnostics = (monaco: typeof Monaco, model: Monaco.editor.ITextModel) => {
    const key = model.uri.toString();
    clearTimer(key);
    const timer = window.setTimeout(() => runDiagnostics(monaco, model), DIAGNOSTIC_DELAY);
    sModelTimers.set(key, timer);
};

const runDiagnostics = async (monaco: typeof Monaco, model: Monaco.editor.ITextModel) => {
    if (model.isDisposed() || !LSP_LANGUAGE_IDS.has(model.getLanguageId())) return;
    try {
        const result: any = await postLspDiagnostics({
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

const toMonacoRange = (monaco: typeof Monaco, range: LspRange) => new monaco.Range(range.start.line, range.start.column, range.end.line, range.end.column);

interface MonacoHoverMarkdown {
    value: string;
}

const toHoverMarkdown = (language: LspLanguage, contents: string): MonacoHoverMarkdown[] => {
    if (language !== TQL_LANGUAGE_ID) return [{ value: contents }];
    return [{ value: compactTqlHoverMarkdown(contents) || contents }];
};

const compactTqlHoverMarkdown = (contents: string) => {
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

const toMarkerSeverity = (monaco: typeof Monaco, severity: number) => {
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

const toCompletionKind = (monaco: typeof Monaco, kind: number) => {
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

const toMonacoSignature = (signature: LspSignatureInfo) => ({
    label: signature.label,
    documentation: signature.documentation,
    parameters: (signature.parameters ?? []).map((parameter) => ({
        label: parameter.label,
        documentation: parameter.documentation,
    })),
});
