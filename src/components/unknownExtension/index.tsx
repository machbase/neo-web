import './index.scss';
import { useState, useEffect } from 'react';
import { MonacoEditor } from '@/components/monaco/MonacoEditor';

export const UnknownExtension = ({ pIsActiveTab, pCode }: { pIsActiveTab: boolean; pCode: unknown }) => {
    const [sText, setText] = useState<any>('');

    useEffect(() => {
        if (typeof pCode === 'object') setText(JSON.stringify(pCode, null, 4));
        else setText(pCode);
    }, []);

    return (
        <div className="unknown-extension-editor">
            <div className="unknown-extension-editor-header" />
            <div className={`unknown-extension-editor-content${pIsActiveTab ? ' disabled-interaction' : ''}`}>
                <MonacoEditor pIsReadOnly={true} pIsActiveTab={pIsActiveTab} pText={sText} pLang="go" onSelectLine={() => null} onChange={() => null} onRunCode={() => null} />
            </div>
        </div>
    );
};
