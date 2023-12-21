import { useEffect, useState, useRef } from 'react';
import { loadScriptsSequentially } from '@/assets/ts/ScriptRegister';

interface ShowMapProps {
    pData: any;
    pBodyRef: any;
}

export const ShowMap = (props: ShowMapProps) => {
    const { pData, pBodyRef } = props;
    const [sSize, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
    const [sIsLoad, setIsLoad] = useState<boolean>(false);
    const mapRef = useRef<HTMLDivElement>(null);

    const CreateMap = async () => {
        console.log(mapRef);
        pData && pData.jsAssets && (await loadScriptsSequentially({ jsAssets: pData.jsAssets, jsCodeAssets: [] }));
        setIsLoad(() => false);
        // pData && pData.jsCodeAssets && (await loadScriptsSequentially({ jsAssets: [], jsCodeAssets: pData.jsCodeAssets }));
    };

    useEffect(() => {
        if (!sIsLoad) pData && pData.jsCodeAssets && loadScriptsSequentially({ jsAssets: [], jsCodeAssets: pData.jsCodeAssets });
    }, [sIsLoad]);

    useEffect(() => {
        console.log(pData.ID);
        setSize({ width: pBodyRef.current.clientWidth, height: pBodyRef.current.clientHeight });
        setIsLoad(() => true);
        CreateMap();
    }, [pData]);

    return (
        <div className="tql-form">
            <link rel="stylesheet" href={pData.cssAssets[0]} />
            <style>.leaflet-tile-pane{`{-webkit-filter: grayscale(${pData.style.grayscale}%); filter: grayscale(${pData.style.grayscale}%);}`}</style>
            {pData && !sIsLoad && (
                <div
                    ref={mapRef}
                    id={pData.ID}
                    style={{
                        display: 'flex',
                        width: sSize.width + 'px',
                        height: sSize.height + 'px',
                    }}
                />
            )}
        </div>
    );
};
