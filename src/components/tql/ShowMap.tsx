/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useEffect, useRef } from 'react';
import { loadScriptsSequentially } from '@/assets/ts/ScriptRegister';

interface ShowMapProps {
    pData: any;
    pBodyRef: any;
}

export const ShowMap = (props: ShowMapProps) => {
    const { pData, pBodyRef } = props;
    const mapRef = useRef(null);

    const CreateMap = async () => {
        pData && pData.jsAssets && (await loadScriptsSequentially(pData.jsAssets));
        pData && pData.jsCodeAssets && (await loadScriptsSequentially(pData.jsCodeAssets));
    };

    useEffect(() => {
        CreateMap();
    }, [pData]);

    return (
        <div className="tql-form">
            <link rel="stylesheet" href={pData.cssAssets[0]} />
            <style>.leaflet-tile-pane{`{-webkit-filter: grayscale(${pData.style.grayscale}%); filter: grayscale(${pData.style.grayscale}%);}`}</style>
            <div
                ref={mapRef}
                id={pData.ID}
                style={{
                    display: 'flex',
                    width: pBodyRef.current.clientWidth + 'px',
                    height: pBodyRef.current.clientHeight + 'px',
                }}
            />
        </div>
    );
};
