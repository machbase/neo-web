// This CommonJS module runs in the package's JSH install process.
// Neo appends its path after the arguments already declared by scripts.install.
// Packages can require(process.argv[process.argv.length - 1]) to access this API.
export const INSTALL_EXTENSION_API_SOURCE = String.raw`
var fs = require("fs");
var context = __NEO_INSTALL_CONTEXT__;
var registered = false;
function write(path, value) {
    var temporary = path + ".tmp";
    fs.writeFileSync(temporary, JSON.stringify(value), "utf8");
    fs.renameSync(temporary, path);
}
exports.panels = {
    register: function (registration) {
        try {
            if (registered || fs.existsSync(context.registration)) throw new Error("Panels can only be registered once per installation.");
            if (!registration || typeof registration !== "object" || Array.isArray(registration)) throw new Error("Invalid panel registration.");
            write(context.registration, registration);
            registered = true;
        } catch (error) {
            write(context.failure, { message: String(error.message || error) });
            throw error;
        }
    }
};
`;

// SHELL pipeline success does not prove that its child command succeeded.
export const INSTALL_EXTENSION_RUNNER_SOURCE = String.raw`
var fs = require("fs");
var process = require("process");
var context = __NEO_INSTALL_RUNNER_CONTEXT__;
var result = process.exec("pkg", "run", "-C", context.packagePath, "install", context.api);
if (result instanceof Error) throw result;
if (result !== 0) throw new Error("Package install failed with exit code " + result);
var temporary = context.success + ".tmp";
fs.writeFileSync(temporary, JSON.stringify({ job: context.job, name: context.name }), "utf8");
fs.renameSync(temporary, context.success);
`;
