import './MonacoScrollBarTrack.scss';
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import type { OnChange } from '@monaco-editor/react';
import { PositionType, SelectionType } from '@/utils/sqlQueryParser';
import scrollbar from '@/design-system/tokens/scrollbar.module.scss';
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
    setLineHeight?: Dispatch<SetStateAction<number>>;
}

export const MonacoEditor = (props: MonacoEditorProps) => {
    const { pIsActiveTab, pText, pLang, pIsReadOnly = false, onChange, onRunCode, onSelectLine, setLineHeight } = props;
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
        readOnly: pIsReadOnly,
        hover: {
            enabled: !pIsReadOnly,
        },
        scrollbar: {
            vertical: 'auto' as const,
            horizontal: 'auto' as const,
            verticalScrollbarSize: 5,
            horizontalScrollbarSize: 5,
        },
    };

    useEffect(() => {
        if (!sMonaco) return;
        setCurrentLang(pLang);
    }, [pLang]);

    useEffect(() => {
        if (!sMonaco) return;
        sMonaco.editor.defineTheme('my-theme', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#252525',
                'scrollbarSlider.background': scrollbar.thumb,
                'scrollbarSlider.hoverBackground': scrollbar.thumbHover,
                'scrollbarSlider.activeBackground': scrollbar.thumbHover,
            },
        });
        sMonaco.editor.setTheme('my-theme');

        new sMonaco.Position(0, 0);
        new sMonaco.Selection(0, 0, 0, 0);
        setCurrentLang(pLang);
    }, [sMonaco]);

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
        <div ref={monacoRef} style={{ width: '100%', height: '100%' }} onFocus={() => applyRunCode(pText)} onClick={selectionLine}>
            <Editor height="100%" width="100%" language={sCurrentLang} value={pText} theme="my-theme" onChange={onChange} onMount={handleMount} options={monacoOptions} />
        </div>
    );
};
