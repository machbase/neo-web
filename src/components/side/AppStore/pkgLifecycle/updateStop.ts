// A prepared package may replace an unsafe stop from an older installed version.
// Validation happens before stopping anything and again before executing the hook.
export const UPDATE_STOP_VALIDATION_SOURCE = String.raw`
function validateUpdateStop(packagePath, manifest) {
    if (!manifest.scripts || !Object.prototype.hasOwnProperty.call(manifest.scripts, "update-stop")) return false;
    var script = manifest.scripts["update-stop"];
    if (typeof script !== "string" || !/^\.\/(?:[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\/)*[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\.js$/.test(script)) {
        throw new Error("Invalid update-stop script path.");
    }
    var current = packagePath;
    try {
        if (fs.lstatSync(current).isSymbolicLink()) throw new Error("symbolic links are not allowed");
        script.slice(2).split("/").forEach(function (part) {
            current += "/" + part;
            if (fs.lstatSync(current).isSymbolicLink()) throw new Error("symbolic links are not allowed");
        });
        if (!fs.statSync(current).isFile() || !fs.readFileSync(current, "utf8").trim()) throw new Error("expected a nonempty JavaScript file");
    } catch (error) { throw new Error("Invalid update-stop script: " + error.message); }
    return true;
}
`;

export const UPDATE_STOP_RUNNER_SOURCE = String.raw`
var fs = require("fs");
var process = require("process");
var context = __NEO_UPDATE_STOP_CONTEXT__;
${UPDATE_STOP_VALIDATION_SOURCE}
if (fs.existsSync(context.success)) fs.unlinkSync(context.success);
var prepared = JSON.parse(fs.readFileSync(context.preparedPath + "/package.json", "utf8"));
var installed = JSON.parse(fs.readFileSync(context.installedPath + "/package.json", "utf8"));
if (prepared.name !== context.name || installed.name !== context.name) throw new Error("The update-stop package name changed.");
var usePrepared = validateUpdateStop(context.preparedPath, prepared);
var result = usePrepared
    ? process.exec("pkg", "run", "-C", context.preparedPath, "update-stop", context.installedPath)
    : process.exec("pkg", "run", "-C", context.installedPath, "stop");
if (result instanceof Error) throw result;
if (result !== 0) throw new Error("Package update stop failed with exit code " + result);
var temporary = context.success + ".tmp";
fs.writeFileSync(temporary, JSON.stringify({ job: context.job, name: context.name, source: usePrepared ? "prepared" : "installed" }), "utf8");
fs.renameSync(temporary, context.success);
`;
