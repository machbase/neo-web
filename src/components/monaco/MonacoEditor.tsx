import './MonacoScrollBarTrack.scss';
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import type { OnChange } from '@monaco-editor/react';
import { PositionType, SelectionType } from '@/utils/sqlQueryParser';
import scrollbar from '@/design-system/tokens/scrollbar.module.scss';
import { currentScheme, resolveCssColor, useThemeVersion } from '@/design-system/theme';
import { registerLspLanguages } from '@/lsp/languages';
import { registerLspProviders } from '@/lsp/monacoProviders';
export interface MonacoEditorProps {
    pIsActiveTab: boolean;
    pText: string;
    pLang: string;
    pIsReadOnly?: boolean;
    onChange: OnChange;
    onRunCode: (
        aText: string,
        aLocation: {
            position: PositionType;
            selection: SelectionType;
        }
    ) => void;
    onSelectLine: (aLocation: { position: PositionType; selection: SelectionType }) => void;
    onBlur?: () => void;
    setLineHeight?: Dispatch<SetStateAction<number>>;
}

export const MonacoEditor = (props: MonacoEditorProps) => {
    const { pIsActiveTab, pText, pLang, pIsReadOnly = false, onChange, onRunCode, onSelectLine, onBlur, setLineHeight } = props;
    const sMonaco = useMonaco();
    const [sEditor, setEditor] = useState<any>(null);
    const [sCurrentLang, setCurrentLang] = useState<string>('');
    const monacoRef = useRef<HTMLDivElement>(null);

    const sPositionDefaultValue = { column: 1, lineNumber: 1 };
    const sSelectionDefaultValue = {
        endColumn: 1,
        endLineNumber: 1,
        positionColumn: 1,
        positionLineNumber: 1,
        selectionStartColumn: 1,
        selectionStartLineNumber: 1,
        startColumn: 1,
        startLineNumber: 1,
    };

    const monacoOptions = {
        minimap: {
            enabled: false,
        },
        fontSize: 14,
        fontFamily: 'D2Coding',
        scrollBeyondLastLine: false,
        // The ruler's 1px left border runs right beside the split-pane line next to the editor.
        overviewRulerBorder: false,
        readOnly: pIsReadOnly,
        hover: {
            enabled: !pIsReadOnly,
        },
        fixedOverflowWidgets: true,
        scrollbar: {
            vertical: 'auto' as const,
            horizontal: 'auto' as const,
            verticalScrollbarSize: 5,
            horizontalScrollbarSize: 5,
            alwaysConsumeMouseWheel: false,
        },
    };

    useEffect(() => {
        if (!sMonaco) return;
        setCurrentLang(pLang);
    }, [pLang]);

    useEffect(() => {
        if (!sMonaco) return;
        registerLspLanguages(sMonaco);
        registerLspProviders(sMonaco);

        new sMonaco.Position(0, 0);
        new sMonaco.Selection(0, 0, 0, 0);
        setCurrentLang(pLang);
    }, [sMonaco]);

    // Monaco takes hex colours, not CSS variables: resolve the tokens against the theme in
    // force, again whenever it changes. The editor theme is global to Monaco, so every editor
    // defining it once per change is the same definition.
    const sThemeVersion = useThemeVersion();
    useEffect(() => {
        if (!sMonaco) return;
        const sMenuBorder = resolveCssColor('var(--neo-menu-border, var(--neo-border-color-default, rgba(255, 255, 255, 0.13)))', '#ffffff21');
        sMonaco.editor.defineTheme('my-theme', {
            base: currentScheme() === 'light' ? 'vs' : 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': resolveCssColor('var(--neo-bg-secondary, #252525)', '#252525'),
                // the box around the current line: a small step from the editor's colour toward its text, faint under
                // any theme (left to Monaco, a fixed #eeeeee showed as a white box on a gray editor); with no theme both
                // sides fall back to the line the dark screen has
                'editor.lineHighlightBorder': resolveCssColor('color-mix(in srgb, var(--neo-text-primary, #282828) 4%, var(--neo-bg-secondary, #282828))', '#282828'),
                // the right-click menu is a menu: the app's menu colours (left to Monaco, white on every light theme)
                'menu.background': resolveCssColor('var(--neo-menu-bg, #2d2d2d)', '#2d2d2d'),
                'menu.foreground': resolveCssColor('var(--neo-text-primary, #f1f1f1)', '#f1f1f1'),
                'menu.selectionBackground': resolveCssColor('var(--neo-menu-item-hover-bg, #3d3d3d)', '#3d3d3d'),
                'menu.selectionForeground': resolveCssColor('var(--neo-text-primary, #f1f1f1)', '#f1f1f1'),
                'menu.border': sMenuBorder,
                'menu.separatorBackground': sMenuBorder,
                'scrollbarSlider.background': resolveCssColor(scrollbar.thumb, '#5c5c5c'),
                'scrollbarSlider.hoverBackground': resolveCssColor(scrollbar.thumbHover, '#868686'),
                'scrollbarSlider.activeBackground': resolveCssColor(scrollbar.thumbHover, '#868686'),
                // the command palette and the suggest list are menus: the menu's colours, a chosen row the selection's
                // (left to Monaco, a light theme got Monaco's blue row under the app's dark text)
                'quickInput.background': resolveCssColor('var(--neo-menu-bg, #2d2d2d)', '#2d2d2d'),
                'quickInput.foreground': resolveCssColor('var(--neo-text-primary, #f1f1f1)', '#f1f1f1'),
                'quickInputList.focusBackground': resolveCssColor('var(--neo-selected-bg, rgb(0, 83, 160))', '#0053a0'),
                'quickInputList.focusForeground': resolveCssColor('var(--neo-selected-text, rgb(243, 243, 243))', '#f3f3f3'),
                'list.activeSelectionBackground': resolveCssColor('var(--neo-selected-bg, rgb(0, 83, 160))', '#0053a0'),
                'list.activeSelectionForeground': resolveCssColor('var(--neo-selected-text, rgb(243, 243, 243))', '#f3f3f3'),
                'editorSuggestWidget.background': resolveCssColor('var(--neo-menu-bg, #2d2d2d)', '#2d2d2d'),
                'editorSuggestWidget.foreground': resolveCssColor('var(--neo-text-primary, #f1f1f1)', '#f1f1f1'),
                'editorSuggestWidget.selectedBackground': resolveCssColor('var(--neo-selected-bg, rgb(0, 83, 160))', '#0053a0'),
                'editorSuggestWidget.selectedForeground': resolveCssColor('var(--neo-selected-text, rgb(243, 243, 243))', '#f3f3f3'),
            },
        });
        sMonaco.editor.setTheme('my-theme');
    }, [sMonaco, sThemeVersion]);

    useEffect(() => {
        if (!sMonaco) return;
        applyRunCode(pText);
    }, [sMonaco, pText]);

    useEffect(() => {
        if (sEditor) {
            if (monacoRef.current && monacoRef.current.querySelector('.view-line')) {
                const height = Number((monacoRef.current.querySelector('.view-line') as HTMLDivElement).style.height.replace(/[^0-9.]/g, ''));
                if (setLineHeight) {
                    setLineHeight(height);
                }
            }
            applyRunCode(pText);
        }
    }, [sEditor]);

    const handleMount = (editor: any) => {
        setEditor(editor);
        if (onBlur) editor.onDidBlurEditorText(() => onBlur());
        if (pIsActiveTab && !pIsReadOnly) editor.focus();
    };

    useEffect(() => {
        if (pIsActiveTab && sEditor && !pIsReadOnly) sEditor.focus();
    }, [pIsActiveTab]);

    const applyRunCode = (aText: string) => {
        if (!sMonaco || !pIsActiveTab || pIsReadOnly) return;

        const runCode = {
            id: 'run-code',
            label: 'Run Code',
            keybindings: [sMonaco.KeyMod.CtrlCmd | sMonaco.KeyCode.Enter],
            run: () =>
                onRunCode(aText, {
                    position: sEditor ? sEditor.getPosition() : sPositionDefaultValue,
                    selection: sEditor ? sEditor.getSelection() : sSelectionDefaultValue,
                }),
        };

        sMonaco.editor.addEditorAction(runCode);
    };

    const selectionLine = () => {
        if (!sMonaco) return;

        onSelectLine({
            position: sEditor ? sEditor.getPosition() : sPositionDefaultValue,
            selection: sEditor ? sEditor.getSelection() : sSelectionDefaultValue,
        });
    };

    return (
        <div data-testid="monaco-editor" ref={monacoRef} style={{ width: '100%', height: '100%' }} onFocus={() => applyRunCode(pText)} onClick={selectionLine}>
            <Editor height="100%" width="100%" language={sCurrentLang} value={pText} theme="my-theme" onChange={onChange} onMount={handleMount} options={monacoOptions} />
        </div>
    );
};
