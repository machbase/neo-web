import { useEffect, useState } from 'react';
import RefList from './RefeList';
import { Side } from '@/design-system/components';
import { fetchReferences } from './referenceActions';

export const ReferenceSide = () => {
    const [sReferences, setReferences] = useState<any>();
    const [sLoadError, setLoadError] = useState<string | undefined>(undefined);
    const init = async () => {
        try {
            setReferences(await fetchReferences());
            setLoadError(undefined);
        } catch (aError) {
            // an empty panel looked like a server with nothing to offer; say it failed and offer
            // another try (issue #1570 F-103)
            setLoadError(aError instanceof Error && aError.message ? aError.message : 'Failed to load the reference list.');
        }
    };

    useEffect(() => {
        init();
    }, []);

    return (
        <Side.Container data-testid="reference-side">
            {sLoadError && (
                <div data-testid="reference-load-error" style={{ padding: '8px 12px', fontSize: '12px', lineHeight: '18px' }}>
                    <div>{`Failed to load references: ${sLoadError}`}</div>
                    <button type="button" data-testid="reference-load-retry" onClick={init} style={{ marginTop: '4px', padding: 0, border: 'none', borderRadius: 0, background: 'transparent', color: 'inherit', textDecoration: 'underline', cursor: 'pointer', fontSize: '12px' }}>
                        Retry
                    </button>
                </div>
            )}
            {sReferences &&
                sReferences.length !== 0 &&
                sReferences.map((aItem: any, aIdx: number) => {
                    return <RefList key={aIdx} pValue={aItem} />;
                })}
        </Side.Container>
    );
};
