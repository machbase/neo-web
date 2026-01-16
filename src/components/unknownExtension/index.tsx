// import './index.scss';
import { useState, useEffect } from 'react';
import { MonacoEditor } from '@/components/monaco/MonacoEditor';
import { Page } from '@/design-system/components';

export const UnknownExtension = ({ pIsActiveTab, pCode }: { pIsActiveTab: boolean; pCode: unknown }) => {
    const [sText, setText] = useState<any>('');

    useEffect(() => {
        if (typeof pCode === 'object') setText(JSON.stringify(pCode, null, 4));
        else setText(pCode);
    }, []);

    return (
        <Page>
            <Page.Header />
            <Page.Body>
                <MonacoEditor pIsReadOnly={true} pIsActiveTab={pIsActiveTab} pText={sText} pLang="go" onSelectLine={() => null} onChange={() => null} onRunCode={() => null} />
            </Page.Body>
        </Page>
    );
};
