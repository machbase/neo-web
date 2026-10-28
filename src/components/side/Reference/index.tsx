import { useEffect, useState } from 'react';
import RefList from './RefeList';
import { Side } from '@/design-system/components';
import { fetchReferences } from './referenceActions';

export const ReferenceSide = () => {
    const [sReferences, setReferences] = useState<any>();
    const [sLoadError, setLoadError] = useState<string | undefined>(undefined);
    const [sLoading, setLoading] = useState<boolean>(false);
    const init = async () => {
        setLoading(true);
        try {
            setReferences(await fetchReferences());
            setLoadError(undefined);
        } catch (aError) {
            // an empty panel looked like a server with nothing to offer; say it failed and offer
            // another try (issue #1570 F-103)
            setLoadError(aError instanceof Error && aError.message ? aError.message : 'Failed to load the reference list.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        init();
    }, []);

    return (
        <Side.Container data-testid="reference-side">
            {/* no header here, so the line goes first; there is no earlier list to keep */}
            {sLoadError && <Side.LoadError data-testid="reference-load-error" pReason={sLoadError} pRetrying={sLoading} pOnRetry={init} />}
            {sReferences &&
                sReferences.length !== 0 &&
                sReferences.map((aItem: any, aIdx: number) => {
                    return <RefList key={aIdx} pValue={aItem} />;
                })}
        </Side.Container>
    );
};
