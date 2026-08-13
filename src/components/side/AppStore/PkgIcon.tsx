// issue #1452 — package icon with a local-first source chain.
//
// The catalog used to render `pItem.icon` directly. That URL is whatever the hub
// entry carries — in practice a raw.githubusercontent link — so on an air-gapped
// server EVERY card fired a request that could only ever fail, and the slot was
// left showing a broken <img> rather than the fallback glyph, for packages that
// are installed and running right now.
//
// The candidate ordering lives in ./pkgIconSource; this component is only the
// "try the next one when the current one errors" wrapper around it.
//
// CLASS NAME IS A REQUIRED PROP, ON PURPOSE
// -----------------------------------------
// The two call sites size the thumbnail completely differently and their rules
// are *nested* under different parents:
//
//   item.scss  `.app-store-item .app-store-item-head .app-store-item-thumb`  → 42px
//   info.scss  `.app-store-item-info .app-store-item-info-thumb`             → 100px
//
// Hardcoding either class here would silently resize the other view, and merging
// them into one class with a size variant would mean rewriting both scss files
// (including the descendant selectors the surrounding layouts rely on) for no
// behavioural gain. Taking the class as a required prop keeps this component
// purely about *which src to try* and leaves layout ownership where it already is.

import { useMemo, useState } from 'react';
import { VscExtensions } from 'react-icons/vsc';
import { pkgIconSources } from './pkgIconSource';

export interface PkgIconProps {
    /** Package name; used to build the installed copy's icon path. */
    pName?: string;
    /** Remote icon URL from the catalog entry (hub or local archive). */
    pIcon?: string;
    /** Whether `/public/{pName}/` exists on this server. */
    pInstalled?: boolean;
    /**
     * May `pIcon` (a remote URL) be requested at all? issue #1452.
     *
     * A PROP, NOT A RECOIL READ, ON PURPOSE. This is a leaf component with its own
     * test suite and two call sites that size it differently; reaching into
     * `gCatalogStatus` from here would drag a store into every render of it and
     * force a RecoilRoot around each of those tests for one boolean. The call sites
     * (`item.tsx`, `info.tsx`) already read the catalog status, so they pass the
     * answer down.
     *
     * Defaults to `true` — the pre-#1452 behaviour — so nothing that does not know
     * about local-only mode changes.
     */
    pAllowRemote?: boolean;
    /**
     * The installed copy's icon FILE NAME (`APP_INFO.installed_icon`), e.g.
     * `icon.svg`. issue #1452.
     *
     * A PROP FOR THE SAME REASON AS `pAllowRemote`: the value is a field on the
     * card the call site already holds, and this stays a store-free leaf.
     *
     * Three-valued — `''` means "the scan looked and there is no icon", which is
     * NOT the same as `undefined` ("nobody looked"). See `pkgIconSources`, which
     * owns the rule; passing it straight through is all this component does.
     */
    pInstalledIcon?: string;
    /** Container class. Required — see the note at the top of this file. */
    className: string;
}

export const PkgIcon = ({ pName, pIcon, pInstalled, pAllowRemote = true, pInstalledIcon, className }: PkgIconProps) => {
    const sources = useMemo(
        () => pkgIconSources(pName, pIcon, pInstalled, pAllowRemote, pInstalledIcon),
        [pName, pIcon, pInstalled, pAllowRemote, pInstalledIcon]
    );
    const key = sources.join('|');

    // Render-time reset instead of a useEffect: when the component is reused for a
    // different package (the detail pane does exactly this), the candidate list
    // changes and the failure count must go back to 0 in the SAME render — an
    // effect would let one frame paint the previous package's exhausted state.
    const [attempt, setAttempt] = useState<{ key: string; idx: number }>({ key, idx: 0 });
    const idx = attempt.key === key ? attempt.idx : 0;
    const src = sources[idx];

    return (
        <div className={className}>
            {src ? <img key={src} src={src} alt="" onError={() => setAttempt({ key, idx: idx + 1 })} /> : <VscExtensions />}
        </div>
    );
};
