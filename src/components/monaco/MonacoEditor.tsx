import { useEffect, useState } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import type { OnChange } from '@monaco-editor/react';
import { useRecoilValue } from 'recoil';
import { gSelectedTab } from '@/recoil/recoil';
import { PositionType, SelectionType } from '@/utils/sqlQueryParser';

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
}

export const MonacoEditor = (props: MonacoEditorProps) => {
    const { pText, pLang, onChange, onRunCode, onSelectLine } = props;
    const monaco = useMonaco();
    const sSelectedTab = useRecoilValue(gSelectedTab);
    const [sCurrnetTab, setCurrentTab] = useState<any>();
    const [sEditor, setEditor] = useState<any>(null);

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
        scrollBeyondLastLine: false,
    };

    useEffect(() => {
        setCurrentTab(sSelectedTab);
    }, []);

    useEffect(() => {
        if (!monaco) return;

        monaco.editor.defineTheme('my-theme', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#1F2127',
            },
        });
        monaco.editor.setTheme('my-theme');

        new monaco.Position(0, 0);
        new monaco.Selection(0, 0, 0, 0);
    }, [monaco]);

    useEffect(() => {
        if (!monaco) return;
        const sId = sCurrnetTab === undefined ? sSelectedTab : sCurrnetTab;
        if (sId === sSelectedTab) {
            applyRunCode(pText);
        }
    }, [monaco, pText, sSelectedTab]);

    const handleMount = (editor: any) => {
        console.log('handleMount');
        setEditor(editor);
        editor.focus();
    };

    const applyRunCode = (aText: string) => {
        if (!monaco) return;

        const runCode = {
            id: 'run-code',
            label: 'Run Code',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
            run: () =>
                onRunCode(aText, {
                    position: sEditor ? sEditor.getPosition() : sPositionDefaultValue,
                    selection: sEditor ? sEditor.getSelection() : sSelectionDefaultValue,
                }),
        };

        monaco.editor.addEditorAction(runCode);
    };

    const selectionLine = () => {
        if (!monaco) return;

        onSelectLine({
            position: sEditor ? sEditor.getPosition() : sPositionDefaultValue,
            selection: sEditor ? sEditor.getSelection() : sSelectionDefaultValue,
        });
    };

    return (
        <div style={{ width: '100%', height: '100%' }} onFocus={() => applyRunCode(pText)} onClick={selectionLine}>
            <Editor height="100%" width="100%" language={pLang} value={pText} theme="my-theme" onChange={onChange} onMount={handleMount} options={monacoOptions} />
        </div>
    );
};
