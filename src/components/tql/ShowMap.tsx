/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useEffect, useState } from 'react';
import { loadScriptsSequentially } from '@/assets/ts/ScriptRegister';

interface ShowMapProps {
    pData: any;
    pBodyRef: any;
}

export const ShowMap = (props: ShowMapProps) => {
    const { pData, pBodyRef } = props;
    const [sIsLoad, setIsLoad] = useState<boolean>(false);

    const CreateMap = async () => {
        pData && pData.jsAssets && (await loadScriptsSequentially(pData.jsAssets));
        setIsLoad(() => false);
        pData && pData.jsCodeAssets && (await loadScriptsSequentially(pData.jsCodeAssets));
    };

    useEffect(() => {
        setIsLoad(() => true);
        CreateMap();
    }, [pData]);

    return (
        <div className="tql-form">
            <link rel="stylesheet" href={pData.cssAssets[0]} />
            <style>.leaflet-tile-pane{`{-webkit-filter: grayscale(${pData.style.grayscale}%); filter: grayscale(${pData.style.grayscale}%);}`}</style>
            {pData && !sIsLoad && (
                <div
                    id={pData.ID}
                    style={{
                        display: 'flex',
                        width: pBodyRef.current.clientWidth + 'px',
                        height: pBodyRef.current.clientHeight + 'px',
                    }}
                />
            )}
        </div>
    );
};
