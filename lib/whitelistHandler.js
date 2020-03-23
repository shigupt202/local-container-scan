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
function getTrivyWhitelist() {
    if (exports.trivyWhitelistExists)
        return trivyWhitelistPath;
    else
        throw new Error("Could not find whitelist file for common vulnerabilities");
}
exports.getTrivyWhitelist = getTrivyWhitelist;
function initializeTrivyWhitelistPath() {
    let curDate = Date.now();
    let trivyWhitelistDir = `${process.env['GITHUB_WORKSPACE']}/containerscan_${curDate}/trivy`;
    fs.mkdirSync(trivyWhitelistDir, { recursive: true });
    trivyWhitelistPath = trivyWhitelistDir + "/.trivyignore";
}
function initializeDockleWhitelistPath() {
    //Dockle expects .dockleignore file at the root of the repo 
    dockleWhitelistPath = `${process.env['GITHUB_WORKSPACE']}/.dockleignore`;
}
function init() {
    const whitelistFilePath = `${process.env['GITHUB_WORKSPACE']}/.github/containerscan/whitelist.yaml`;
    if (!fs.existsSync(whitelistFilePath)) {
        console.log("Could not find whitelist file.");
        return;
    }
    initializeTrivyWhitelistPath();
    initializeDockleWhitelistPath();
    try {
        const whitelistYaml = jsyaml.safeLoad(fs.readFileSync(whitelistFilePath, 'utf8'));
        if (whitelistYaml.general) {
            if (whitelistYaml.general.commonVulnerabilities) {
                exports.trivyWhitelistExists = true;
                const vulnArray = whitelistYaml.general.commonVulnerabilities;
                let trivyWhitelistContent = "";
                vulnArray.forEach(vuln => {
                    trivyWhitelistContent += vuln;
                    trivyWhitelistContent += "\n";
                });
                fs.writeFileSync(trivyWhitelistPath, trivyWhitelistContent);
            }
            if (whitelistYaml.general.bestPracticeVulnerabilities) {
                const vulnArray = whitelistYaml.general.bestPracticeVulnerabilities;
                let dockleWhitelistContent = "";
                vulnArray.forEach(vuln => {
                    dockleWhitelistContent += vuln;
                    dockleWhitelistContent += "\n";
                });
                fs.writeFileSync(dockleWhitelistPath, dockleWhitelistContent);
            }
        }
    }
    catch (error) {
        throw new Error("Error while parsing whitelist file. Error: " + error);
    }
}
exports.init = init;
