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
    let curDate = Date.now();
    let trivyWhitelistDir = `${process.env['GITHUB_WORKSPACE']}/containerscan_${curDate}/trivy`;
    fs.mkdirSync(trivyWhitelistDir, { recursive: true });
    trivyWhitelistPath = trivyWhitelistDir + "/whitelist";
    //Dockle expects .dockleignore file at the root of the repo 
    dockleWhitelistPath = `${process.env['GITHUB_WORKSPACE']}/.dockleignore`;
}
function init() {
    console.log("in init");
    const whitelistFilePath = `${process.env['GITHUB_WORKSPACE']}/.github/containerscan/whitelist`;
    if (!fs.existsSync(whitelistFilePath)) {
        console.log("Could not find whitelist file.");
        return;
    }
    initializeWhitelistPaths();
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
            fs.writeFileSync(trivyWhitelistPath, trivyWhitelistContent);
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
            fs.writeFileSync(dockleWhitelistPath, dockleWhitelistContent);
        }
    }
}
exports.init = init;
