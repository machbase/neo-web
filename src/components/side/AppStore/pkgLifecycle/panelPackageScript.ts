import { PUBLIC_PANEL_SCRIPT } from './publicPanelScript';
import { COPY_PACKAGE_FILE } from './archiveScript';
import { PANEL_CONTRACT_VERSIONS } from '@/components/dashboard/extensions/contracts';
import { SCRIPT_ERROR_SENTINEL } from './types';
import { INSTALL_EXTENSION_API_SOURCE, INSTALL_EXTENSION_RUNNER_SOURCE } from './installExtensionApi';

export const PANEL_EXTENSIONS_CHANGED = 'neo:dashboard-panel-extensions-changed';
export const PANEL_PACKAGE_ROOT = '/work/.extension/dashboard-panels';

export const PANEL_PACKAGE_FS = String.raw`
var fs = require("fs");
var root = "${PANEL_PACKAGE_ROOT}";
var names = function (dir) {
    return fs.readdirSync(dir).filter(function (name) { return name !== "." && name !== ".."; });
};
var safeName = function (name) { return typeof name === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name); };
var read = function (path) { return JSON.parse(fs.readFileSync(path, "utf8")); };
var remove = function (path) { if (fs.existsSync(path)) fs.rmSync(path, { recursive: true, force: true }); };
var fail = function (error) { $.yield("${SCRIPT_ERROR_SENTINEL} " + error.message); };
`;

export const PANEL_PACKAGE_SCRIPT = String.raw`${PANEL_PACKAGE_FS}
${COPY_PACKAGE_FILE}
${PUBLIC_PANEL_SCRIPT}
var action = $.params.action;
var appName = $.params.name;
var job = $.params.job;

function registrationFor(stage, publicPath) {
    var base = stage + "/body";
    if (fs.existsSync(stage + "/registration-error.json")) throw new Error("The package extension registration failed.");
    var declaration = stage + "/registration.json";
    if (!fs.existsSync(declaration)) return null;
    var registration = read(declaration);
    if (!registration || typeof registration.packageId !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(registration.packageId) ||
        ${JSON.stringify(PANEL_CONTRACT_VERSIONS)}.indexOf(registration.contractVersion) === -1 || !Array.isArray(registration.panels) || registration.panels.length === 0) {
        throw new Error("Invalid dashboard panel extension registration.");
    }
    var seen = Object.create(null);
    var moduleIds = Object.create(null);
    var modules = stage + "/modules";
    remove(modules);
    fs.mkdirSync(modules, { recursive: true });
    var panels = registration.panels.map(function (panel, index) {
        if (!panel || typeof panel.typeId !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(panel.typeId) ||
            seen[panel.typeId] || typeof panel.label !== "string" || !panel.label.trim() ||
            typeof panel.module !== "string" || !/^\.\/(?:[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\/)*[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\.(?:js|mjs)$/.test(panel.module)) {
            throw new Error("Invalid or duplicate dashboard panel registration.");
        }
        seen[panel.typeId] = true;
        var relative = panel.module.slice(2).split("/");
        var path = base;
        // Each part must be a real file or directory in the shipped tree.
        [base, publicPath, declaration].forEach(function (part) {
            if (fs.lstatSync(part).isSymbolicLink()) throw new Error("Dashboard panel declarations cannot use symbolic links.");
        });
        relative.forEach(function (part) {
            path += "/" + part;
            if (fs.lstatSync(path).isSymbolicLink()) throw new Error("Dashboard panel modules cannot use symbolic links.");
        });
        if (!fs.statSync(path).isFile() || !fs.readFileSync(path, "utf8").trim()) throw new Error("Empty or invalid dashboard panel module.");
        var installedPath = publicPath;
        relative.forEach(function (part) {
            installedPath += "/" + part;
            if (fs.lstatSync(installedPath).isSymbolicLink()) throw new Error("Dashboard panel modules cannot use symbolic links.");
        });
        if (!fs.statSync(installedPath).isFile() || fs.readFileSync(installedPath, "utf8") !== fs.readFileSync(path, "utf8")) throw new Error("The installed dashboard panel module differs from the prepared package.");
        if (moduleIds[path] === undefined) {
            moduleIds[path] = index;
            copyFile(path, modules + "/" + index + ".js");
        }
        return { typeId: panel.typeId, label: panel.label, moduleId: moduleIds[path] };
    });
    return { packageId: registration.packageId, contractVersion: registration.contractVersion, revision: job, panels: panels };
}

function copyModules(from, to) {
    fs.mkdirSync(to, { recursive: true });
    names(from).forEach(function (name) {
        copyFile(from + "/" + name, to + "/" + name);
    });
}

function pendingPackages() {
    return fs.existsSync(root) ? names(root).filter(safeName).reduce(function (pending, name) {
        var file = root + "/" + name + "/pending.json";
        if (fs.existsSync(file)) {
            try { pending.push({ name: name, target: read(file) }); } catch (_) {}
        }
        return pending;
    }, []) : [];
}

function writeJson(path, value) {
    fs.writeFileSync(path, JSON.stringify(value), "utf8");
}

function execute() {
    if (action === "list-pending") return pendingPackages();
    if (!safeName(appName)) throw new Error("Invalid package name.");
    if (["prepare", "copy", "body-ready", "finish", "remove"].indexOf(action) !== -1) {
        // Package IDs are shared across all apps, so reservations and registry writes share a lock.
        var locks = root + "/.locks";
        var lock = locks + "/registry";
        fs.mkdirSync(locks, { recursive: true });
        if (fs.existsSync(lock)) {
            var modified = fs.statSync(lock).mtime;
            var time = typeof modified.unixMilli === "function" ? modified.unixMilli() : Number(modified);
            if (Date.now() - time > 10 * 60 * 1000) fs.unlinkSync(lock);
        }
        // The filesystem timestamp exists as soon as the empty lock is created.
        var fd;
        try { fd = fs.openSync(lock, "wx"); }
        catch (_) { throw new Error("The dashboard panel registry is being changed. Try again shortly."); }
        try { return applyAction(); }
        finally {
            fs.closeSync(fd);
            fs.unlinkSync(lock);
        }
    }
    return applyAction();
}

function applyAction() {
    var installed = root + "/" + appName;
    var pendingPath = installed + "/pending.json";
    var publicPath = "/work/public/" + appName;
    var pending = fs.existsSync(pendingPath) ? read(pendingPath) : null;
    if (action === "pending") return pending;
    if (action === "remove") {
        if (fs.existsSync(publicPath)) throw new Error("The package directory still exists.");
        if (pending && safeName(pending.job)) remove(root + "/.staging/" + pending.job);
        remove(installed);
        publishPublicPanels();
        return null;
    }
    if (!safeName(job)) throw new Error("Invalid package staging ID.");
    var stage = root + "/.staging/" + job;
    if (action === "cleanup") {
        if (!pending || pending.job !== job) remove(stage);
        return null;
    }
    function savePending(value) {
        fs.mkdirSync(installed, { recursive: true });
        var temporary = installed + "/pending-" + job + ".tmp";
        writeJson(temporary, value);
        fs.renameSync(temporary, pendingPath);
    }
    if (action === "prepare") {
        if (pending) throw new Error("Another package deployment is incomplete.");
        if ($.params.mode === "install" && fs.existsSync(publicPath)) throw new Error("The package directory already exists.");
        var pkg = read(stage + "/body/package.json");
        if (pkg.name !== appName) throw new Error("The staged package name does not match the selected package.");
        writeJson(stage + "/registry.json", null);
        var context = { registration: stage + "/registration.json", failure: stage + "/registration-error.json" };
        fs.writeFileSync(stage + "/neo-install-api.js", ${JSON.stringify(INSTALL_EXTENSION_API_SOURCE)}.replace("__NEO_INSTALL_CONTEXT__", JSON.stringify(context)), "utf8");
        var runner = { api: stage + "/neo-install-api.js", packagePath: publicPath, success: stage + "/install-success.json", job: job, name: appName };
        fs.writeFileSync(stage + "/run-install.js", ${JSON.stringify(INSTALL_EXTENSION_RUNNER_SOURCE)}.replace("__NEO_INSTALL_RUNNER_CONTEXT__", JSON.stringify(runner)), "utf8");
        savePending({
            job: job, tag: $.params.tag || "", source: $.params.source, mode: $.params.mode,
            fullName: $.params.fullName || "", phase: "prepared", packageId: null
        });
        return null;
    }
    if (!pending || pending.job !== job) throw new Error("The pending package deployment changed or another package deployment is incomplete.");
    function requireInstallSuccess() {
        var marker = stage + "/install-success.json";
        if (!fs.existsSync(marker)) throw new Error("The package install did not complete successfully.");
        var completed = read(marker);
        if (completed.job !== job || completed.name !== appName) throw new Error("The package install result does not match this deployment.");
    }
    if (action === "install-result") {
        requireInstallSuccess();
        return null;
    }
    if (action === "copy") {
        // A retry starts a fresh registration attempt; the committed registry stays intact.
        remove(stage + "/registration.json");
        remove(stage + "/registration-error.json");
        remove(stage + "/install-success.json");
        if (!fs.existsSync(stage + "/registry.json") || !fs.existsSync(stage + "/body/package.json")) {
            throw new Error("The prepared package files are unavailable.");
        }
        if (pending.phase === "prepared") {
            if (pending.mode === "install" && fs.existsSync(publicPath)) throw new Error("The package directory already exists.");
            pending.phase = "applying";
            pending.restartAfterCopy = $.params.restartAfterCopy === "1";
            savePending(pending);
        }
        return null;
    }
    if (action === "body-ready") {
        if (pending.phase === "prepared") throw new Error("The package body has not started installing.");
        var installedPackage = read(publicPath + "/package.json");
        var preparedPackage = read(stage + "/body/package.json");
        if (installedPackage.name !== appName || installedPackage.version !== preparedPackage.version) {
            throw new Error("The installed package version differs from the prepared package.");
        }
        if (preparedPackage.scripts && typeof preparedPackage.scripts.install === "string" && preparedPackage.scripts.install.trim()) requireInstallSuccess();
        var registry = registrationFor(stage, publicPath);
        if (registry) {
            if (fs.existsSync(installed + "/registry.json") && read(installed + "/registry.json").packageId !== registry.packageId) {
                throw new Error("The package ID cannot change during an update.");
            }
            if (fs.existsSync(root)) names(root).filter(safeName).forEach(function (name) {
                var file = root + "/" + name + "/registry.json";
                if (name === appName) return;
                var reservation = root + "/" + name + "/pending.json";
                if ((fs.existsSync(file) && read(file).packageId === registry.packageId) ||
                    (fs.existsSync(reservation) && read(reservation).packageId === registry.packageId)) {
                    throw new Error("The dashboard panel package ID is already installed or reserved.");
                }
            });
        }
        writeJson(stage + "/registry.json", registry);
        pending.packageId = registry ? registry.packageId : null;
        pending.phase = "body-ready";
        savePending(pending);
        return null;
    }
    if (action === "finish") {
        if (pending.phase !== "body-ready") throw new Error("The package body has not finished installing.");
        var next = read(stage + "/registry.json");
        if (next) {
            next.moduleLayout = 1;
            var current = fs.existsSync(installed + "/registry.json") ? read(installed + "/registry.json") : null;
            if (current && current.revision === next.revision) {
                // Publication already succeeded; retry only the remaining cleanup.
                if (JSON.stringify(current) !== JSON.stringify(next)) throw new Error("The published dashboard panel registration differs from the prepared registration.");
            } else {
                copyModules(stage + "/modules", installed + "/modules/" + next.revision);
                var temporary = installed + "/registry-" + job + ".tmp";
                writeJson(temporary, next);
                fs.renameSync(temporary, installed + "/registry.json");
            }
        } else {
            remove(installed + "/registry.json");
        }
        publishPublicPanels();
        fs.unlinkSync(pendingPath);
        try { remove(stage); } catch (_) { /* The deployment is already committed. */ }
        return null;
    }
    throw new Error("Unknown dashboard panel package operation.");
}

try { $.yield(JSON.stringify(execute())); }
catch (error) { fail(error); }
`;
