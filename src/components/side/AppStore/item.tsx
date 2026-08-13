import './item.scss';
import { APP_INFO, isGrandfatheredPkg, PKG_STATUS } from '@/api/repository/appStore';
import { useMemo, useState } from 'react';
import { MdVerified } from 'react-icons/md';
import { VscArchive, VscBeaker, VscChevronDown, VscWarning } from 'react-icons/vsc';
import { useRecoilValue } from 'recoil';
import { isCurUserEqualAdmin } from '@/utils';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { gActivePkgView, gCatalogStatus, gOpenPkgViews, gPkgBusy, gPkgHealth, gServerVersion } from '@/recoil/appStore';
import { Loader } from '@/components/loader';
import { Side } from '@/design-system/components';
import { applyOfflineEligibility, computeEligibility, resolveActionSource, stripVPrefix } from '@/utils/version/utils';
import { useExperiment } from '@/hooks/useExperiment';
import { usePkgCommand } from './pkgLifecycle/usePkgCommand';
import { useStrayRemove } from './pkgLifecycle/useStrayRemove';
import { strayDisplayPath } from './pkgLifecycle/strayRemove';
import { ConfirmCommandModal, type ConfirmableCommand } from './ConfirmCommandModal';
import { PkgVersionMenu } from './PkgVersionMenu';
import { ServiceSummaryChip } from './ServiceSummaryChip';
import { PkgIcon } from './PkgIcon';
import { APP_STORE_TAB_TYPE, APP_VIEW_TAB_TYPE, useAppStoreTabs } from './appTabs';
import { probePkgHtml } from './pkgHtml';
import { useOpenPkgView } from './pkgViews';

type RunSwitchProps = {
    on: boolean;
    onClick: (e: React.MouseEvent) => void;
    loading?: boolean;
    disabled?: boolean;
};

const RunSwitch = ({ on, onClick, loading, disabled }: RunSwitchProps) => (
    <button
        type="button"
        title={on ? 'Stop' : 'Start'}
        className={`app-store-item-switch${on ? ' app-store-item-switch--on' : ''}${loading ? ' app-store-item-switch--loading' : ''}`}
        onClick={onClick}
        disabled={disabled || loading}
        aria-pressed={on}
    >
        <span className="app-store-item-switch-thumb">{loading ? <Loader width="6px" height="6px" /> : null}</span>
    </button>
);

type TextActionProps = {
    label: string;
    onClick: (e: React.MouseEvent) => void;
    loading?: boolean;
    disabled?: boolean;
    variant?: 'default' | 'primary' | 'danger';
};

const TextAction = ({ label, onClick, loading, disabled, variant = 'default' }: TextActionProps) => (
    <button
        type="button"
        className={`app-store-item-text-action app-store-item-text-action--${variant}`}
        onClick={onClick}
        disabled={disabled || loading}
    >
        {loading ? <Loader width="12px" height="12px" /> : label}
    </button>
);

type SplitActionProps = {
    label: string;
    onPrimary: (e: React.MouseEvent) => void;
    onToggle: (e: React.MouseEvent) => void;
    loading?: boolean;
    disabled?: boolean;
    // Disables the primary action while leaving the caret usable — for the case
    // where the catalog offers no default target but the menu still has something
    // to offer (the experiment-mode custom-version input).
    primaryDisabled?: boolean;
    variant?: 'primary' | 'update';
};

// Install/Update split button (issue #1369): primary applies the default target,
// the caret opens the version-selection menu.
const SplitAction = ({ label, onPrimary, onToggle, loading, disabled, primaryDisabled, variant = 'primary' }: SplitActionProps) => (
    <div className={`app-store-item-split app-store-item-split--${variant}`}>
        <button type="button" className="app-store-item-split-main" onClick={onPrimary} disabled={disabled || loading || primaryDisabled}>
            {loading ? <Loader width="12px" height="12px" /> : label}
        </button>
        <button type="button" className="app-store-item-split-caret" onClick={onToggle} disabled={disabled || loading} aria-label="Select version">
            <VscChevronDown size={12} />
        </button>
    </div>
);

export const AppItem = ({ pItem }: { pItem: APP_INFO }) => {
    const isInstalled = !!pItem?.installed_frontend;
    const sServerVersion = useRecoilValue(gServerVersion);

    const sCatalogStatus = useRecoilValue(gCatalogStatus);
    // issue #1452 — the version gating asks one binary question ("can this row be
    // fetched right now?"), and BOTH non-online modes answer no to a hub row: one
    // because the hub is down, the other because it is switched off. So the mode is
    // collapsed to a boolean here rather than threaded through the eligibility
    // helpers, which have no business knowing why.
    const isHubUsable = sCatalogStatus.mode === 'online';
    const isLocalOnly = sCatalogStatus.mode === 'localOnly';
    const installedVersion = isInstalled ? pItem?.installed_version : undefined;

    // issue #1369: classify the hub `versions[]` against the current server version
    // and the installed version → eligible set, default install/update targets,
    // and server-downgrade incompatibility. Replaces the old single-`latest_version`
    // SemVer compare; minServer-aware throughout.
    //
    // issue #1452: then drop the rows that cannot be fetched right now. With the
    // hub unreachable only locally archived versions are installable, and the
    // default install/update targets are RECOMPUTED over what survives — without
    // that the card would keep advertising `Update ↑v<hub version>` and the click
    // would fail on a GitHub request that cannot leave the network.
    const eligibility = useMemo(
        () =>
            applyOfflineEligibility(computeEligibility(pItem?.versions ?? [], sServerVersion, installedVersion), isHubUsable, installedVersion),
        [pItem?.versions, sServerVersion, installedVersion, isHubUsable]
    );

    // issue #1438: this card is only on screen because the package is already
    // installed — the experiment gate would otherwise have removed it. Keep it
    // removable (uninstall / stop stay untouched below) but stop advertising
    // change: the package was pulled back for revalidation, so pushing its newer
    // unvalidated versions at a non-experiment user defeats the recall.
    const { getExperiment } = useExperiment();
    const experimentOn = getExperiment();
    const isGated = isGrandfatheredPkg(pItem, experimentOn);

    const hasUpdate = isInstalled && !!eligibility.defaultUpdate && !isGated;
    const canInstall = !!eligibility.defaultInstall && !isGated; // false when every version is ineligible

    // In experiment mode the version menu carries a free-form "Custom version"
    // input, so it is worth opening even when the catalog offers no installable
    // target. That happens whenever versions[] is empty — most commonly because
    // the package's only GitHub release is a pre-release, which `releases/latest`
    // skips, so the hub publishes no version at all. Without this the caret never
    // renders and the input is unreachable, leaving the package impossible to
    // install from the UI.
    const canPickCustomVersion = experimentOn && !isGated;
    const isIncompatible = isInstalled && eligibility.isIncompatible;

    // issue #1452: say on the card itself — before the user opens the version
    // menu — that the version the default button targets comes from the server's
    // local archive rather than GitHub. Derived from the current scan only; no
    // install provenance is stored anywhere.
    const isLocalSource = resolveActionSource(eligibility, installedVersion) === 'local';
    const sIsAdmin = isCurUserEqualAdmin();

    const sBusy = useRecoilValue(gPkgBusy);
    const sHealth = useRecoilValue(gPkgHealth);
    const runCommand = usePkgCommand();
    // issue #1452 — the stray path. Both hooks are called unconditionally (the
    // stray branch returns further down, after every hook has run) because a card
    // can flip between stray and installed across a rebuild.
    const removeStrayDir = useStrayRemove();
    const [sRemoving, setRemoving] = useState<boolean>(false);

    const busyCmd = sBusy[pItem?.name] ?? null;
    const isBusy = busyCmd !== null;
    const health = sHealth[pItem?.name];
    const isReachable = !!health?.reachable;
    const isRunning = !!health?.running;

    // Slot policy: only `packageService.managed === false` (explicit opt-out
    // in package.json) hides the RunSwitch and shows ServiceSummaryChip
    // instead. Every other case — managed=true, missing key, unreachable
    // health controller — keeps the RunSwitch visible; cgi-bin/health
    // failures just disable the toggle so the user gets a clear "BE not
    // responding" affordance rather than an empty slot.
    const isUnmanaged = pItem?.installed_packageService?.managed === false;
    const showRunSwitch = sIsAdmin && isInstalled && !isUnmanaged;
    const showInstall = sIsAdmin && !isInstalled;
    const showUpdate = sIsAdmin && hasUpdate;
    const showUninstall = sIsAdmin && isInstalled;

    // install/update/uninstall all confirm first; install/update carry the chosen version.
    const [pending, setPending] = useState<{ cmd: ConfirmableCommand; version?: string } | null>(null);
    const [menu, setMenu] = useState<{ mode: 'install' | 'update'; pos: { x: number; y: number } } | null>(null);

    // start/stop run immediately (no confirmation).
    const handleRunSwitch = (cmd: 'start' | 'stop') => (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isBusy) return;
        runCommand(pItem, cmd);
    };

    // install/update primary button → confirm the default target.
    const handlePrimary = (cmd: 'install' | 'update') => (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isBusy) return;
        setPending({ cmd, version: cmd === 'install' ? eligibility.defaultInstall : eligibility.defaultUpdate });
    };

    // caret toggles the version-selection menu anchored under it.
    const handleToggleMenu = (mode: 'install' | 'update') => (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isBusy) return;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setMenu((prev) => (prev?.mode === mode ? null : { mode, pos: { x: rect.left, y: rect.bottom + 4 } }));
    };

    // picking a version from the menu → confirm that specific version.
    const handleSelectVersion = (cmd: 'install' | 'update', version: string) => {
        setMenu(null);
        if (isBusy) return;
        setPending({ cmd, version });
    };

    const handleUninstall = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isBusy) return;
        setPending({ cmd: 'uninstall' });
    };

    // issue #1452: look the picked version up in the (already offline-masked) rows
    // to decide how it must be fetched. A version typed into the experiment-mode
    // custom input is in no row, so it resolves to `undefined` and keeps the GitHub
    // path — the same behaviour it had before this existed.
    //
    // The source is ALL that is resolved here. There is no archive path to look up
    // any more: `runCommand` passes the version along as `ctx.tag` and the offline
    // install finds the matching zip on the server (pkgLifecycle/archiveScript.ts).
    const resolveSource = (version?: string): { source?: 'hub' | 'local' } | undefined => {
        if (!version) return undefined;
        return { source: eligibility.rows.find((r) => r.version === version)?.source };
    };

    // confirmed → run with the chosen version (when set).
    const confirmPending = () => {
        if (!pending) return;
        const { cmd, version } = pending;
        setPending(null);
        // issue #1452 — the stray card's only action. It shares the confirmation
        // modal and this handler, and NOTHING else with the lifecycle commands:
        // `runCommand` is never reached with it.
        if (cmd === 'removeDirectory') {
            const dir = pItem?.stray?.dir;
            if (!dir) return;
            setRemoving(true);
            void removeStrayDir(dir).finally(() => setRemoving(false));
            return;
        }
        runCommand(pItem, cmd, version, resolveSource(version));
    };

    // ---------------------------------------------------------------------------
    // THE STRAY CARD (issue #1452) — a package that is PRESENT but not installed
    // ---------------------------------------------------------------------------
    // `/public/{dir}/` holds an identifiable package that never went through the
    // App Store: an archive unpacked by hand, or a developer's clone. It is not a
    // leftover — `/public/` is statically served, so that tree's cgi-bin answers
    // requests right now — but nothing registered it, so it has no services.
    //
    // NO Install / Update / Uninstall / RunSwitch, and this is not a style choice.
    // Every one of them acts on `/public/{package name}`, which for this card is a
    // DIFFERENT directory (possibly a real install of the same package). Rendering
    // them would offer to start services that do not exist and to uninstall a
    // directory the user is not looking at.
    const stray = pItem?.stray;
    if (stray) {
        // ---------------------------------------------------------------------
        // ONE LINE ON THE CARD, THE REST IN THE TOOLTIP (issue #1452)
        // ---------------------------------------------------------------------
        // This note used to spell out the whole mechanism inline ("Its install
        // script never ran, so nothing is registered — but /public/<dir>/ is still
        // served, so this unmanaged copy can answer requests."). In a side panel
        // that is three wrapped lines PER CARD, and a server with several strays
        // turned the list into an essay with the actions buried in it.
        //
        // The card now says the one thing a reader must take away — it is not an
        // install — and the path is NOT repeated here because it is already on the
        // card, in monospace, right above. Everything else is a `title`: available
        // to whoever wants it, costing no vertical space to whoever does not.
        //
        // The qualifiers stay CLAUSES, not sentences. Stacking "A separate,
        // properly installed copy also exists." onto "It looks like a git working
        // copy, so it is left alone…" is how the original grew.
        const strayNote =
            [
                'Not installed by the App Store — still served from this path',
                stray.duplicate ? 'a managed copy is installed separately' : '',
                stray.removable ? '' : 'a git clone, so it is left as is',
            ]
                .filter(Boolean)
                .join('; ') + '.';

        const strayNoteDetail = [
            `Its install script never ran, so nothing is registered — but ${strayDisplayPath(stray.dir)} is still served, so this unmanaged copy can answer requests.`,
            stray.duplicate ? `A separate, properly installed copy of ${pItem?.name ?? 'this package'} also exists.` : '',
            stray.removable ? '' : 'It looks like a git working copy, so it is left alone — remove it from the file explorer if you meant to.',
        ]
            .filter(Boolean)
            .join(' ');

        return (
            <div className="app-store-item app-store-item--stray">
                <div className="app-store-item-head">
                    <PkgIcon
                        className="app-store-item-thumb"
                        pName={stray.dir}
                        pIcon={pItem?.icon}
                        // The DIRECTORY exists and may well ship an icon, so the
                        // local candidate is real — it just hangs off `stray.dir`
                        // rather than off the package name.
                        pInstalled={true}
                        pAllowRemote={!isLocalOnly}
                        pInstalledIcon={pItem?.installed_icon}
                    />
                    <div className="app-store-item-head-contents">
                        <div className="app-store-item-head-top">
                            <div className="app-store-item-head-title">
                                <span>{pItem?.name ?? ''}</span>
                            </div>
                            <div className="app-store-item-version">
                                {pItem?.latest_version ? <span>v{stripVPrefix(pItem.latest_version)}</span> : null}
                                <span
                                    className="stray"
                                    title="This directory was not installed through the App Store, so its install script never ran and it has no registered services."
                                >
                                    <VscWarning size={11} /> not installed
                                </span>
                            </div>
                        </div>
                        <div className="app-store-item-head-publisher">
                            <div className="app-store-item-stray-dir" title={strayDisplayPath(stray.dir)}>
                                {strayDisplayPath(stray.dir)}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="app-store-item-foot">
                    <div className="app-store-item-stray-note" title={strayNoteDetail}>
                        {strayNote}
                    </div>
                    <div className="app-store-item-actions" onClick={(e) => e.stopPropagation()}>
                        {sIsAdmin && stray.removable && (
                            <TextAction
                                label="Remove directory"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (sRemoving) return;
                                    setPending({ cmd: 'removeDirectory' });
                                }}
                                loading={sRemoving}
                                disabled={sRemoving}
                                variant="danger"
                            />
                        )}
                    </div>
                </div>
                <ConfirmCommandModal
                    pendingCmd={pending?.cmd ?? null}
                    pkgName={pItem?.name ?? ''}
                    path={strayDisplayPath(stray.dir)}
                    onConfirm={confirmPending}
                    onCancel={() => setPending(null)}
                />
            </div>
        );
    }

    return (
        <div className="app-store-item">
            <div className="app-store-item-head">
                {/* issue #1452 — in local-only mode the remote icon candidate is not
                    passed at all, so no request is even attempted (PkgIcon falls
                    straight through to the glyph). The mode is read here, at the
                    call site, rather than inside the leaf component. */}
                <PkgIcon
                    className="app-store-item-thumb"
                    pName={pItem?.name}
                    pIcon={pItem?.icon}
                    pInstalled={!!pItem?.installed_frontend}
                    pAllowRemote={!isLocalOnly}
                    pInstalledIcon={pItem?.installed_icon}
                />
                <div className="app-store-item-head-contents">
                    <div className="app-store-item-head-top">
                        <div className="app-store-item-head-title">
                            <span>{pItem?.name ?? ''}</span>
                        </div>
                        <div className="app-store-item-version">
                            {isInstalled && pItem?.installed_version ? (
                                <span className="install">v{stripVPrefix(pItem.installed_version)}</span>
                            ) : (
                                <span>{pItem?.latest_version ? `v${stripVPrefix(pItem.latest_version)}` : 'N/A'}</span>
                            )}
                            {hasUpdate && eligibility.defaultUpdate && <span className="update">↑v{stripVPrefix(eligibility.defaultUpdate)}</span>}
                            {isLocalSource && (
                                <span className="local" title="This version comes from the server's local package archive — installing it needs no network access.">
                                    <VscArchive size={11} /> local
                                </span>
                            )}
                            {isGated && (
                                <span className="experiment" title="This package is under validation. Updates are unavailable until it is released.">
                                    <VscBeaker size={11} /> under validation
                                </span>
                            )}
                            {isIncompatible && (
                                <span
                                    className="incompat"
                                    title={`Current server ${sServerVersion || 'unknown'} < required ${eligibility.installedMinServer ?? ''}`}
                                >
                                    <VscWarning size={11} /> incompatible
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="app-store-item-head-publisher">
                        <div className="app-store-item-head-publisher-name">
                            {pItem?.github?.organization === 'machbase' && (
                                <MdVerified size={12} className="app-store-item-verified" title="Verified publisher" />
                            )}
                            <span>{pItem?.github?.organization ?? ''}</span>
                        </div>
                        <div className="app-store-item-head-status" onClick={(e) => e.stopPropagation()}>
                            {showRunSwitch && (
                                <RunSwitch
                                    on={isRunning}
                                    onClick={handleRunSwitch(isRunning ? 'stop' : 'start')}
                                    loading={busyCmd === 'start' || busyCmd === 'stop'}
                                    disabled={isBusy || !isReachable}
                                />
                            )}
                            {isInstalled && isUnmanaged && (
                                <ServiceSummaryChip summary={health?.serviceSummary} pkgName={pItem?.name ?? ''} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="app-store-item-foot">
                <div className="app-store-item-desc">
                    <span>{pItem?.github.description ?? ''}</span>
                </div>
                {/* THE CARD IS THE OPEN BUTTON NOW (spec §2), so every control on it
                    has to say so explicitly: without this, Install / Update /
                    Uninstall would each ALSO open the package view behind their own
                    confirmation modal. The run switch and the version caret already
                    stop propagation individually; this covers the group. */}
                <div className="app-store-item-actions" onClick={(e) => e.stopPropagation()}>
                    {showInstall && canInstall && (
                        <SplitAction
                            label="Install"
                            onPrimary={handlePrimary('install')}
                            onToggle={handleToggleMenu('install')}
                            loading={busyCmd === 'install'}
                            disabled={isBusy}
                            variant="primary"
                        />
                    )}
                    {showInstall && !canInstall && canPickCustomVersion && (
                        <SplitAction
                            label="Install"
                            onPrimary={(e) => e.stopPropagation()}
                            onToggle={handleToggleMenu('install')}
                            primaryDisabled
                            loading={busyCmd === 'install'}
                            disabled={isBusy}
                            variant="primary"
                        />
                    )}
                    {showInstall && !canInstall && !canPickCustomVersion && (
                        <TextAction
                            label="Install"
                            onClick={(e) => e.stopPropagation()}
                            disabled
                            variant="primary"
                        />
                    )}
                    {showUpdate && (
                        <SplitAction
                            label="Update"
                            onPrimary={handlePrimary('update')}
                            onToggle={handleToggleMenu('update')}
                            loading={busyCmd === 'update'}
                            disabled={isBusy}
                            variant="update"
                        />
                    )}
                    {showUninstall && (
                        <TextAction
                            label="Uninstall"
                            onClick={handleUninstall}
                            loading={busyCmd === 'uninstall'}
                            disabled={isBusy}
                            variant="default"
                        />
                    )}
                </div>
            </div>
            {menu && (
                <PkgVersionMenu
                    isOpen={true}
                    position={menu.pos}
                    mode={menu.mode}
                    serverVersion={sServerVersion}
                    online={isHubUsable}
                    localOnly={isLocalOnly}
                    rows={eligibility.rows}
                    onSelect={(version) => handleSelectVersion(menu.mode, version)}
                    onClose={() => setMenu(null)}
                />
            )}
            <ConfirmCommandModal
                pendingCmd={pending?.cmd ?? null}
                pkgName={pItem?.name ?? ''}
                version={pending?.version}
                onConfirm={confirmPending}
                onCancel={() => setPending(null)}
            />
        </div>
    );
};

export const AppList = ({ pList, pStatus }: { pList: APP_INFO[] | string[]; pStatus: PKG_STATUS }) => {
    const sBoardList = useRecoilValue<any[]>(gBoardList);
    const sSelectedTab = useRecoilValue<any>(gSelectedTab);
    const sOpenPkgViews = useRecoilValue(gOpenPkgViews);
    const sActivePkgView = useRecoilValue(gActivePkgView);
    const openPkgView = useOpenPkgView();
    const { openPkgDetailTab, openAppViewTab } = useAppStoreTabs();
    const sSelectedBoard = sBoardList.find((b: any) => b.id === sSelectedTab);
    const sSelectedAppName = sSelectedBoard?.type === APP_STORE_TAB_TYPE ? sSelectedBoard?.code?.app?.name : undefined;
    const sSelectedAppViewName = sSelectedBoard?.type === APP_VIEW_TAB_TYPE ? sSelectedBoard?.code?.appName : undefined;

    const handleSelectApp = async (app: APP_INFO) => {
        // issue #1452 — A STRAY CARD IS NOT SELECTABLE, and this guard is the
        // backstop for the one below in the row (a second call site is one edit
        // away). The detail tab is a view of an INSTALLED package: it is keyed by
        // `app.name`, and a stray shares that name with the real install. Opening it
        // from here would therefore show the installed package's tab — the wrong
        // tree — for a directory that has no services, no versions to install and
        // nothing to uninstall. `Remove directory` on the card is the whole
        // interaction.
        if (app?.stray) return;

        // NOT INSTALLED → THE DETAIL TAB, and only that. There is no app to open
        // and no `side.html` to show, so the tab's README and version list are the
        // entire answer to clicking this card.
        if (!app?.installed_frontend) {
            openPkgDetailTab(app, pStatus);
            return;
        }

        // INSTALLED → THE PACKAGE'S OWN SURFACES, AND NO DETAIL TAB.
        //
        // The detail tab used to open for every card. Once a package is installed
        // it has nothing left to say there: the README moved into the app view's
        // drawer (components/appView/AppReadmePanel.tsx), and Update / Uninstall /
        // the version menu are on the card itself. Opening it anyway spent a
        // main-area tab, every click, on a page the user did not ask for.
        const { main, side } = await probePkgHtml(app.name);
        if (main) openAppViewTab(app.name);
        // A PILL ONLY EXISTS FOR A PACKAGE THAT SHIPS `side.html`. The panel's
        // package view IS that file; without one there is nothing for the pill to
        // show, and opening it anyway parks an empty panel in the switcher that
        // the user has to close again.
        if (side) openPkgView(app.name);

        // AN INSTALLED PACKAGE THAT SHIPS NEITHER still has to answer the click.
        // `installed_frontend` only means the directory exists — a package can be
        // installed with no HTML at all, and for that one the detail tab is the
        // only surface there is. Without this the card would be inert: no tab, no
        // pill, nothing.
        if (!main && !side) openPkgDetailTab(app, pStatus);
    };
    // THE "CATALOG" / "SEARCH RESULTS" COLLAPSE ROW IS GONE.
    //
    // It was a section header from when the panel could show several lists at
    // once (installed / exact / possible). The panel now shows exactly one list,
    // under a pill bar that already says which view this is and a search band
    // that already says whether the list is filtered — so the row restated a
    // heading nobody needed and offered to collapse the only content on screen,
    // leaving a panel with nothing in it and no clue why.
    return pList && pList.length > 0 ? (
        <Side.List>
            {pList.map((aItem: any, aIdx: number) => {
                // issue #1452 — THE SELECTED ROW IS IDENTIFIED BY NAME, AND A STRAY
                // SHARES ITS PACKAGE'S NAME. `neo-pkg-opcua-client` (installed) and
                // `neo-pkg-opcua-client-main/` (unpacked by hand) both answer to
                // `aItem.name`, so the name comparison below matched BOTH and
                // highlighted two rows for one open tab. Observed on a real server.
                //
                // The fix is the stray flag, not a composite key. A synthetic identity
                // (`name + stray.dir`) would have to be minted here AND written into
                // the tab's `code.app` for the two to ever compare equal — and it would
                // be inventing an identity for a row that must never be selected in the
                // first place. The real invariant is simpler and is asserted in the
                // tests: a stray is not selectable, therefore it is never the
                // selection, therefore it never highlights.
                const isStray = !!aItem?.stray;
                // OPEN vs SELECTED are two different facts and get two different marks.
                // A package can be open in the pill bar while the panel is showing the
                // catalog — the accent border says "there is a pill for this"; the
                // filled background is reserved for the one the panel is actually on.
                const isOpen = !isStray && sOpenPkgViews.includes(aItem?.name);
                // "Selected" stays what it has always been — the package the user is
                // currently looking at — now with the panel's own package view as a
                // third way to be looking at one.
                const isSelected =
                    !isStray && (sActivePkgView === aItem?.name || sSelectedAppViewName === aItem?.name || sSelectedAppName === aItem?.name);
                return (
                    <div
                        key={'pStatus-' + aIdx}
                        // No handler at all rather than a no-op one: it is also what
                        // `.app-store-row--static` keys off to drop the pointer cursor
                        // and the hover tint, so the row cannot look clickable while
                        // being inert.
                        onClick={isStray ? undefined : () => handleSelectApp(aItem)}
                        className={
                            isStray
                                ? 'app-store-row--static'
                                : `${isOpen ? 'app-store-row--open' : ''}${isSelected ? ' app-store-row--selected' : ''}`.trim() || undefined
                        }
                    >
                        <AppItem pItem={aItem} />
                    </div>
                );
            })}
        </Side.List>
    ) : null;
};
