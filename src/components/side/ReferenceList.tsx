import { getReferenceList } from '@/api/repository/api';
import { useEffect, useState } from 'react';
import Reference from './Reference';

const ReferenceList = ({ pServer }: any) => {
    const [sReferences, setReferences] = useState<any>();

    const init = async () => {
        try {
            const sData = await getReferenceList();
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
            <div style={{ height: 'calc(100% - 40px)', overflow: 'auto' }}>
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
