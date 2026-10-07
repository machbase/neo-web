import { useEffect, useState } from 'react';
import RefList from './RefeList';
import { Side } from '@/design-system/components';
import { fetchReferences } from './referenceActions';

export const ReferenceSide = () => {
    const [sReferences, setReferences] = useState<any>();
    const init = async () => {
        try {
            setReferences(await fetchReferences());
        } catch {
            // The panel stays empty when the list cannot be read.
        }
    };

    useEffect(() => {
        init();
    }, []);

    return (
        <Side.Container>
            {sReferences &&
                sReferences.length !== 0 &&
                sReferences.map((aItem: any, aIdx: number) => {
                    return <RefList key={aIdx} pValue={aItem} />;
                })}
        </Side.Container>
    );
};
