import { useEffect, useRef } from 'react';
import { loadScriptsSequentially } from '@/assets/ts/ScriptRegister';
interface ShowMapProps {
    pData: any;
    pBodyRef: any;
}

export const ShowMap = (props: ShowMapProps) => {
    const { pData, pBodyRef } = props;
    const wrapRef = useRef<HTMLDivElement>(null);

    const CreateMap = async () => {
        if (pData && pData.jsAssets && wrapRef && wrapRef.current && wrapRef.current.childNodes.length === 0)
            await loadScriptsSequentially({ jsAssets: pData.jsAssets, jsCodeAssets: [] });

        const MapDiv = document.createElement('div');
        MapDiv.id = pData.ID;
        MapDiv.style.width = pBodyRef.current.clientWidth + 'px';
        MapDiv.style.height = pBodyRef.current.clientHeight + 'px';
        wrapRef.current?.appendChild(MapDiv);

        pData && pData.jsCodeAssets && (await loadScriptsSequentially({ jsAssets: [], jsCodeAssets: pData.jsCodeAssets }));
        const tmpNodeList = wrapRef.current?.childNodes;
        if (tmpNodeList && tmpNodeList?.length > 1) tmpNodeList[0].remove();
    };

    useEffect(() => {
        CreateMap();
    }, [pData]);

    return (
        <div className="tql-form">
            <link rel="stylesheet" href={pData.cssAssets[0]} />
            <style>.leaflet-tile-pane{`{-webkit-filter: grayscale(${pData.style.grayscale}%); filter: grayscale(${pData.style.grayscale}%);}`}</style>
            <div id="map-wrapper" ref={wrapRef} />
        </div>
    );
};
