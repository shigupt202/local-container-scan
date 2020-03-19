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
let trivyWhitelistPath = "";
let dockleWhitelistPath = "";
exports.trivyWhitelistExists = false;
exports.dockleWhitelistExists = false;
function getTrivyWhitelist() {
    if (exports.trivyWhitelistExists)
        return trivyWhitelistPath;
    else
        throw new Error("Could not find whitelist file for common vulnerabilities");
}
exports.getTrivyWhitelist = getTrivyWhitelist;
function getDockleWhitelist() {
    if (exports.dockleWhitelistExists)
        return dockleWhitelistPath;
    else
        throw new Error("Could not find whitelist file for best practice vulnerabilities");
}
exports.getDockleWhitelist = getDockleWhitelist;
function initializeWhitelistPaths() {
    let curDate = Date();
    trivyWhitelistPath = `${process.env['GITHUB_WORKSPACE']}/containerscan_${curDate}/trivy/whitelist`;
    dockleWhitelistPath = `${process.env['GITHUB_WORKSPACE']}/containerscan_${curDate}/dockle/whitelist`;
}
function init() {
    console.log("in init");
    initializeWhitelistPaths();
    const whitelistFilePath = `${process.env['GITHUB_WORKSPACE']}/.github/containerscan/whitelist`;
    if (!fs.existsSync(whitelistFilePath)) {
        console.log("Could not find whitelist file.");
        return;
    }
    var whitelist_yaml = jsyaml.safeLoad(fs.readFileSync(whitelistFilePath, 'utf8'));
    if (whitelist_yaml.general) {
        if (whitelist_yaml.general.common_vulnerabilities) {
            exports.trivyWhitelistExists = true;
            let vulnArray = whitelist_yaml.general.common_vulnerabilities;
            let trivyWhitelistContent = "";
            vulnArray.forEach(vuln => {
                trivyWhitelistContent += vuln;
                trivyWhitelistContent += "\n";
            });
            console.log(trivyWhitelistContent);
            fs.writeFile(trivyWhitelistPath, trivyWhitelistContent, function (error) {
                if (error)
                    throw new Error("Error in creating whitelist file for common vulnerabilities");
            });
        }
        if (whitelist_yaml.general.best_practice_vulnerabilities) {
            exports.dockleWhitelistExists = true;
            let vulnArray = whitelist_yaml.general.best_practice_vulnerabilities;
            let dockleWhitelistContent = "";
            vulnArray.forEach(vuln => {
                dockleWhitelistContent += vuln;
                dockleWhitelistContent += "\n";
            });
            console.log(dockleWhitelistContent);
            fs.writeFile(trivyWhitelistPath, dockleWhitelistContent, function (error) {
                if (error)
                    throw new Error("Error in creating whitelist file for best practice vulnerabilities");
            });
        }
    }
}
exports.init = init;
