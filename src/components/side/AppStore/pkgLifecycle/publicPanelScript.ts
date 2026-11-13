// Publish only installed display modules. The private registry, pending jobs,
// package lifecycle scripts and settings remain outside the public directory.
export const PUBLIC_PANEL_SCRIPT = String.raw`
function publishPublicPanels() {
    var publicRoot = "/work/public/.dashboard-panels";
    function directory(path) {
        if (fs.existsSync(path) && fs.lstatSync(path).isSymbolicLink()) throw new Error("Public panel directories cannot use symbolic links.");
        fs.mkdirSync(path, { recursive: true });
    }
    directory(publicRoot);
    var entries = [];
    if (fs.existsSync(root)) names(root).filter(safeName).forEach(function (app) {
        var installed = root + "/" + app;
        if (!fs.existsSync(installed + "/registry.json")) return;
        try {
        var registry = read(installed + "/registry.json");
        var published = [];
        if (!safeName(registry.revision)) throw new Error("Invalid public panel revision.");
        var destination = publicRoot + "/" + app;
        directory(destination);
        destination += "/" + registry.revision;
        directory(destination);
        registry.panels.forEach(function (panel) {
            if (!Number.isInteger(panel.moduleId) || panel.moduleId < 0) throw new Error("Invalid public panel module.");
            var file = panel.moduleId + ".js";
            var source = installed + "/modules/" + (registry.moduleLayout === 1 ? registry.revision + "/" : "") + file;
            var target = destination + "/" + file;
            if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) throw new Error("Public panel modules cannot use symbolic links.");
            var pending = target + ".tmp";
            if (fs.existsSync(pending) && fs.lstatSync(pending).isSymbolicLink()) throw new Error("Invalid public panel module temporary file.");
            // Readers must see a complete module even while another package is installed.
            copyFile(source, pending);
            fs.renameSync(pending, target);
            published.push({ packageId: registry.packageId, typeId: panel.typeId, label: panel.label,
                contractVersion: registry.contractVersion, revision: registry.revision, moduleId: panel.moduleId,
                moduleUrl: "/public/.dashboard-panels/" + app + "/" + registry.revision + "/" + file });
        });
        entries = entries.concat(published);
        } catch (error) {
            // A damaged neighboring installation must not hide healthy panels.
            if (app === appName) throw error;
        }
    });
    var temporary = publicRoot + "/registry.tmp";
    if (fs.existsSync(temporary) && fs.lstatSync(temporary).isSymbolicLink()) throw new Error("Invalid public panel registry.");
    writeJson(temporary, entries);
    fs.renameSync(temporary, publicRoot + "/registry.json");
    if (!fs.existsSync(root + "/" + appName + "/registry.json")) remove(publicRoot + "/" + appName);
}
`;
