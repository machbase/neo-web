import { PANEL_PACKAGE_FS } from '@/components/side/AppStore/pkgLifecycle/panelPackageScript';

// Module paths are derived from the installed registry, never from the request.
export const READ_PANEL_EXTENSIONS = String.raw`${PANEL_PACKAGE_FS}
function applying(dir) {
    var pending = dir + "/pending.json";
    if (!fs.existsSync(pending)) return false;
    try { return read(pending).phase !== "prepared"; }
    catch (_) { return true; }
}
try {
    var result = [];
    var requestedPackage = $.params.packageId;
    var requestedType = $.params.typeId;
    var requestedRevision = $.params.revision;
    if (fs.existsSync(root)) {
        names(root).filter(safeName).forEach(function (name) {
            var dir = root + "/" + name;
            if (applying(dir) || !fs.existsSync(dir + "/registry.json")) return;
            try {
                var entry = read(dir + "/registry.json");
                if (requestedPackage && entry.packageId !== requestedPackage) return;
                entry.panels.forEach(function (panel) {
                    if (!requestedPackage) {
                        result.push({
                            packageId: entry.packageId, typeId: panel.typeId, label: panel.label,
                            contractVersion: entry.contractVersion, revision: entry.revision, moduleId: panel.moduleId
                        });
                    } else if (entry.revision === requestedRevision && panel.typeId === requestedType && Number.isInteger(panel.moduleId) && panel.moduleId >= 0) {
                        var versionDir = entry.moduleLayout === 1 && safeName(entry.revision) ? entry.revision + "/" : "";
                        var source = fs.readFileSync(dir + "/modules/" + versionDir + panel.moduleId + ".js", "utf8");
                        if (!applying(dir) && read(dir + "/registry.json").revision === entry.revision) result.push(source);
                    }
                });
            } catch (_) { /* An unreadable installation is unavailable independently of the others. */ }
        });
    }
    $.yield(JSON.stringify(result));
} catch (error) { fail(error); }
`;
