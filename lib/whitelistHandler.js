"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const jsyaml = __importStar(require("js-yaml"));
let trivyWhitelistExists = false;
let dockleWhitelistExists = false;
// let trivyWhitelistPath;
// let dockleWhitelistPath;
// function getTrivyWhitelist(): string {
//     if (trivyWhitelistExists)
//         return trivyWhitelistPath;
//     else
//         throw new Error("Could not find whitelist file for common vulnerabilities");
// }
// function getDockleWhitelist() {
//     if (dockleWhitelistExists)
//         return dockleWhitelistPath;
//     else
//         throw new Error("Could not find whitelist file for best practice vulnerabilities");
// }
function init() {
    console.log("in init");
    const whitelistFilePath = `${process.env['GITHUB_WORKSPACE']}/.github/containerscan/whitelist`;
    if (!fs.existsSync(whitelistFilePath)) {
        console.log("Could not find whitelist file.");
        return;
    }
    var whitelist_yaml = jsyaml.safeLoad(fs.readFileSync(whitelistFilePath, 'utf8'));
    console.log("yaml: " + whitelist_yaml);
    if (whitelist_yaml.general) {
        if (whitelist_yaml.general.common_vulnerabilities) {
            trivyWhitelistExists = true;
            console.log(whitelist_yaml.general.common_vulnerabilities);
        }
        if (whitelist_yaml.general.best_practice_vulnerabilities) {
            dockleWhitelistExists = true;
            console.log(whitelist_yaml.best_practice_vulnerabilities);
        }
    }
}
exports.init = init;
