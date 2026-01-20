import { getReferenceList } from '@/api/repository/api';
import { useEffect, useState } from 'react';
import RefList from './RefeList';
import { Side } from '@/design-system/components';

const EDUCATION = {
    type: 'url',
    title: 'Education',
    address: 'https://github.com/machbase/education',
};

export const ReferenceSide = () => {
    const [sReferences, setReferences] = useState<any>();
    const init = async () => {
        try {
            const sData = await getReferenceList();
            sData?.data?.refs?.forEach((ref: any) => {
                if (ref?.label?.toUpperCase() === 'REFERENCES') {
                    const sAlreadyExistEdu = ref?.items.find((item: any) => item?.address === EDUCATION.address);
                    if (!sAlreadyExistEdu) ref?.items?.push(EDUCATION);
                }
            });
            setReferences(sData?.data?.refs);
        } catch (err) {
            console.log(err);
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
