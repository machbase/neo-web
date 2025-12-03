import { getReferenceList } from '@/api/repository/api';
import { useEffect, useState } from 'react';
import Reference from './Reference';

const EDUCATION = {
    type: 'url',
    title: 'Education',
    address: 'https://github.com/machbase/education',
};

const ReferenceList = ({ pServer }: any) => {
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
        <div className="side-form">
            <div className="side-title">
                <span>machbase-neo {pServer && pServer.version}</span>
            </div>
            <div className="scrollbar-dark" style={{ height: 'calc(100% - 40px)', overflow: 'auto' }}>
                {sReferences &&
                    sReferences.length !== 0 &&
                    sReferences.map((aItem: any, aIdx: number) => {
                        return <Reference key={aIdx} pValue={aItem} />;
                    })}
            </div>
        </div>
    );
};
export default ReferenceList;
