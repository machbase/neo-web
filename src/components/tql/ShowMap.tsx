/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useEffect, useRef, useState } from 'react';
import { loadScriptsSequentially } from '@/assets/ts/ScriptRegister';

interface ShowMapProps {
    pData: any;
    pBodyRef: any;
}

export const ShowMap = (props: ShowMapProps) => {
    const { pData, pBodyRef } = props;
    const [sMap, setMap] = useState<any>();
    const mapRef = useRef(null);
    const sDefaultOptions = {
        center: [37.5, 127.024],
        zoomLevel: 16,
        maxZoom: 19,
        title: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    };

    const CreateMap = async () => {
        pData && pData.jsAssets && (await loadScriptsSequentially(pData.jsAssets));
        // @ts-ignore
        const map = await L.map(mapRef.current, {
            center: pData && pData.view.center ? pData.view.center : sDefaultOptions.center,
            zoom: pData && pData.view.zoomLevel ? pData.view.zoomLevel : sDefaultOptions.zoomLevel,
        });
        // @ts-ignore
        await L.tileLayer(pData && pData.tile.template ? pData.tile.template : sDefaultOptions.title, {
            maxZoom: pData && pData.tile.option.maxZoom ? pData.tile.option.maxZoom : sDefaultOptions.maxZoom,
        }).addTo(map);

        const sIconList = [...pData.icons];
        pData.layers.map(async (layer: any) => {
            let sParsedLayer = undefined;
            if (layer.option && layer.option.icon) {
                // @ts-ignore
                const ICONs = await L.icon(
                    sIconList.find((aIcon: any) => {
                        if (aIcon.name === layer.option.icon) return aIcon;
                    })
                );
                // @ts-ignore
                sParsedLayer = await L[layer.type](JSON.parse(layer.coord), { icon: ICONs, zIndexOffset: layer.option.zIndexOffset }).addTo(map);
            } else {
                // @ts-ignore
                sParsedLayer = await L[layer.type](JSON.parse(layer.coord), layer.option ? layer.option : {}).addTo(map);
            }

            if (layer.popup) sParsedLayer.bindPopup(layer.popup.content);
            if (layer.popup && layer.popup.open) sParsedLayer.openPopup();
        });
        setMap(map);
    };

    useEffect(() => {
        if (!sMap) CreateMap();
        if (sMap) sMap.remove() && CreateMap();
    }, [pData]);

    return (
        <div className="tql-form">
            <link rel="stylesheet" href={pData.cssAssets[0]} />
            <style>.leaflet-tile-pane{`{-webkit-filter: grayscale(${pData.style.grayscale}%); filter: grayscale(${pData.style.grayscale}%);}`}</style>
            <div
                ref={mapRef}
                id="leafletmap"
                style={{
                    display: 'flex',
                    width: pBodyRef.current.clientWidth + 'px',
                    height: pBodyRef.current.clientHeight + 'px',
                }}
            />
        </div>
    );
};
