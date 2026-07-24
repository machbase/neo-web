type MapRoot = ShadowRoot | HTMLElement | Document;

const disposeMaps = (root: MapRoot) => {
    const nodes = root.querySelectorAll<HTMLElement>('.geomapext-map');
    nodes.forEach((node) => {
        const elem = node as any;
        const map = elem.__geomapextMap;
        if (map && typeof map.remove === 'function') {
            try {
                map.remove();
            } catch {
                // Ignore dispose errors from partially initialized map instances.
            }
        }
        elem.__geomapextMap = null;
        elem.__geomapextTileLayer = null;
    });
};

const executePendingScripts = (root: MapRoot) => {
    const scripts = root.querySelectorAll<HTMLScriptElement>('.geomapext script:not([data-processed])');
    scripts.forEach((script) => {
        const win = window as any;
        const code = script.textContent ?? '';
        script.setAttribute('data-processed', 'true');
        try {
            win.__geomapextCurrentScript = script;
            // Execute map bootstrap script after HTML injection even in Shadow DOM.
            new Function(code)();
        } catch (err: any) {
            const mapNode = script.previousElementSibling as HTMLElement | null;
            if (mapNode) {
                mapNode.innerText = `Geomap script error: ${err?.message ?? String(err)}`;
            }
        } finally {
            win.__geomapextCurrentScript = null;
        }
    });
};

export const disposeGeomap = (root?: ShadowRoot | HTMLElement | null) => {
    disposeMaps(root ?? document);
};

export const resizeGeomap = (root?: ShadowRoot | HTMLElement | null) => {
    const nodes = (root ?? document).querySelectorAll<HTMLElement>('.geomapext-map');
    nodes.forEach((node) => {
        const map = (node as any).__geomapextMap;
        if (map && typeof map.invalidateSize === 'function') {
            map.invalidateSize();
        }
    });
};

const setGeomap = (root?: ShadowRoot | HTMLElement | null) => {
    const target = root ?? document;

    const pendingScripts = target.querySelectorAll<HTMLScriptElement>('.geomapext script:not([data-processed])');
    if (pendingScripts.length === 0) {
        return;
    }

    disposeMaps(target);
    executePendingScripts(target);
};

export default setGeomap;