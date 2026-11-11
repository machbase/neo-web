import { COPY_PACKAGE_FILE } from './archiveScript';
import { PANEL_CONTRACT_VERSIONS } from '@/components/dashboard/extensions/contracts';
import { SCRIPT_ERROR_SENTINEL } from './types';

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
var action = $.params.action;
var appName = $.params.name;
var job = $.params.job;

function manifestFor(stage) {
    var base = stage + "/body/.extension/dashboard-panels";
    var declaration = base + "/manifest.json";
    if (!fs.existsSync(declaration)) return null;
    var manifest = read(declaration);
    if (!manifest || typeof manifest.packageId !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(manifest.packageId) ||
        ${JSON.stringify(PANEL_CONTRACT_VERSIONS)}.indexOf(manifest.contractVersion) === -1 || !Array.isArray(manifest.panels) || manifest.panels.length === 0) {
        throw new Error("Invalid dashboard panel extension manifest.");
    }
    var seen = Object.create(null);
    var moduleIds = Object.create(null);
    var modules = stage + "/modules";
    fs.mkdirSync(modules, { recursive: true });
    var panels = manifest.panels.map(function (panel, index) {
        if (!panel || typeof panel.typeId !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(panel.typeId) ||
            seen[panel.typeId] || typeof panel.label !== "string" || !panel.label.trim() ||
            typeof panel.module !== "string" || !/^\.\/(?:[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\/)*[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\.(?:js|mjs)$/.test(panel.module)) {
            throw new Error("Invalid or duplicate dashboard panel declaration.");
        }
        seen[panel.typeId] = true;
        var relative = panel.module.slice(2).split("/");
        var path = base;
        // Each part must be a real file or directory in the shipped tree.
        [stage + "/body/.extension", base, declaration].forEach(function (part) {
            if (fs.lstatSync(part).isSymbolicLink()) throw new Error("Dashboard panel declarations cannot use symbolic links.");
        });
        relative.forEach(function (part) {
            path += "/" + part;
            if (fs.lstatSync(path).isSymbolicLink()) throw new Error("Dashboard panel modules cannot use symbolic links.");
        });
        if (!fs.statSync(path).isFile() || !fs.readFileSync(path, "utf8").trim()) throw new Error("Empty or invalid dashboard panel module.");
        if (moduleIds[path] === undefined) {
            moduleIds[path] = index;
            copyFile(path, modules + "/" + index + ".js");
        }
        return { typeId: panel.typeId, label: panel.label, moduleId: moduleIds[path] };
    });
    return { packageId: manifest.packageId, contractVersion: manifest.contractVersion, revision: job, panels: panels };
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
        var registry = manifestFor(stage);
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
        savePending({
            job: job, tag: $.params.tag || "", source: $.params.source, mode: $.params.mode,
            fullName: $.params.fullName || "", phase: "prepared", packageId: registry ? registry.packageId : null
        });
        return null;
    }
    if (!pending || pending.job !== job) throw new Error("The pending package deployment changed or another package deployment is incomplete.");
    if (action === "copy") {
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
        var prepared = read(stage + "/registry.json");
        if (prepared) {
            var shipped = publicPath + "/.extension/dashboard-panels";
            var source = stage + "/body/.extension/dashboard-panels";
            var declaration = fs.readFileSync(source + "/manifest.json", "utf8");
            if (fs.readFileSync(shipped + "/manifest.json", "utf8") !== declaration) {
                throw new Error("The installed dashboard panel declaration differs from the prepared package.");
            }
            JSON.parse(declaration).panels.forEach(function (panel) {
                var path = panel.module.slice(2);
                if (fs.readFileSync(shipped + "/" + path, "utf8") !== fs.readFileSync(source + "/" + path, "utf8")) {
                    throw new Error("The installed dashboard panel module differs from the prepared package.");
                }
            });
        }
        pending.phase = "body-ready";
        savePending(pending);
        return null;
    }
    if (action === "finish") {
        if (pending.phase !== "body-ready") throw new Error("The package body has not finished installing.");
        var next = read(stage + "/registry.json");
        remove(installed + "/modules");
        remove(installed + "/registry.json");
        if (next) {
            // The original installer copies the shipped declaration with the body.
            // Remove only the reserved extension directory after verifying its contents.
            remove(publicPath + "/.extension/dashboard-panels");
            copyModules(stage + "/modules", installed + "/modules/" + next.revision);
            next.moduleLayout = 1;
            writeJson(installed + "/registry.json", next);
        }
        fs.unlinkSync(pendingPath);
        try { remove(stage); } catch (_) { /* The deployment is already committed. */ }
        return null;
    }
    throw new Error("Unknown dashboard panel package operation.");
}

try { $.yield(JSON.stringify(execute())); }
catch (error) { fail(error); }
`;
