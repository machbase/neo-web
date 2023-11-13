import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import type { OnChange } from '@monaco-editor/react';
import { PositionType, SelectionType } from '@/utils/sqlQueryParser';
import './MonacoScrollBarTrack.scss';
export interface MonacoEditorProps {
    pText: string;
    pLang: string;
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
    const { pText, pLang, onChange, onRunCode, onSelectLine, setLineHeight } = props;
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
                'editor.background': '#1F2127',
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
        editor.focus();
    };

    const applyRunCode = (aText: string) => {
        if (!sMonaco) return;

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
