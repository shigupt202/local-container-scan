"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const os = __importStar(require("os"));
const util = __importStar(require("util"));
const fs = __importStar(require("fs"));
const toolCache = __importStar(require("@actions/tool-cache"));
const core = __importStar(require("@actions/core"));
const fileHelper = __importStar(require("./fileHelper"));
const semver = require('semver');
exports.TRIVY_EXIT_CODE = 5;
const stableTrivyVersion = "0.5.2";
const trivyLatestReleaseUrl = "https://api.github.com/repos/aquasecurity/trivy/releases/latest";
const trivyToolName = "trivy";
function getTrivy() {
    return __awaiter(this, void 0, void 0, function* () {
        const latestTrivyVersion = yield getLatestTrivyVersion();
        let cachedToolPath = toolCache.find(trivyToolName, latestTrivyVersion);
        if (!cachedToolPath) {
            let trivyDownloadPath;
            const trivyDownloadUrl = getTrivyDownloadUrl(latestTrivyVersion);
            const trivyDownloadDir = `${process.env['GITHUB_WORKSPACE']}/_temp/tools/trivy`;
            console.log(util.format("Could not find trivy in cache, downloading from %s", trivyDownloadUrl));
            try {
                trivyDownloadPath = yield toolCache.downloadTool(trivyDownloadUrl, trivyDownloadDir);
            }
            catch (error) {
                throw new Error(util.format("Failed to download trivy from %s", trivyDownloadUrl));
            }
            const untarredTrivyPath = yield toolCache.extractTar(trivyDownloadPath);
            cachedToolPath = yield toolCache.cacheDir(untarredTrivyPath, trivyToolName, latestTrivyVersion);
        }
        const trivyToolPath = cachedToolPath + "/" + trivyToolName;
        fs.chmodSync(trivyToolPath, "777");
        return trivyToolPath;
    });
}
exports.getTrivy = getTrivy;
function getOutputPath() {
    const trivyOutputPath = `${fileHelper.getContainerScanDirectory()}/trivyoutput.json`;
    return trivyOutputPath;
}
exports.getOutputPath = getOutputPath;
function getText(trivyStatus) {
    const vulnerabilityIds = getVulnerabilityIds(trivyStatus);
    return `**Common Vulnerabilities** -\n${vulnerabilityIds.join('\n')}`;
}
exports.getText = getText;
function getSummary(trivyStatus) {
    let summary = '';
    switch (trivyStatus) {
        case 0:
            summary = 'No vulnerabilities were detected in the container image';
            break;
        case exports.TRIVY_EXIT_CODE:
            const vulnerabilities = getVulnerabilities();
            const total = vulnerabilities.length;
            const unknownCount = vulnerabilities.filter(v => v['Severity'].toUpperCase() === 'UNKNOWN').length;
            const lowCount = vulnerabilities.filter(v => v['Severity'].toUpperCase() === 'LOW').length;
            const mediumCount = vulnerabilities.filter(v => v['Severity'].toUpperCase() === 'MEDIUM').length;
            const highCount = vulnerabilities.filter(v => v['Severity'].toUpperCase() === 'HIGH').length;
            const criticalCount = vulnerabilities.filter(v => v['Severity'].toUpperCase() === 'CRITICAL').length;
            summary = `Found ${total} vulnerabilities -\nUNKNOWN: ${unknownCount}\nLOW: ${lowCount}\nMEDIUM: ${mediumCount}\nHIGH: ${highCount}\nCRITICAL: ${criticalCount}`;
            break;
        default:
            summary = 'An error occured while scanning the container image for vulnerabilities';
            break;
    }
    return `- ${summary}`;
}
exports.getSummary = getSummary;
function getVulnerabilityIds(trivyStatus) {
    let vulnerabilityIds = [];
    if (trivyStatus == exports.TRIVY_EXIT_CODE) {
        const vulnerabilities = getVulnerabilities();
        vulnerabilityIds = vulnerabilities.map(v => v['VulnerabilityID']);
    }
    return vulnerabilityIds;
}
function getTrivyOutput() {
    const path = getOutputPath();
    return fileHelper.getFileJson(path);
}
function getVulnerabilities() {
    const trivyOutputJson = getTrivyOutput();
    let vulnerabilities = [];
    trivyOutputJson.forEach((ele) => {
        if (ele && ele["Vulnerabilities"]) {
            ele["Vulnerabilities"].forEach((cve) => {
                vulnerabilities.push(cve);
            });
        }
    });
    return vulnerabilities;
}
function getLatestTrivyVersion() {
    return __awaiter(this, void 0, void 0, function* () {
        return toolCache.downloadTool(trivyLatestReleaseUrl).then((downloadPath) => {
            const response = JSON.parse(fs.readFileSync(downloadPath, 'utf8').toString().trim());
            if (!response.tag_name) {
                return stableTrivyVersion;
            }
            return semver.clean(response.tag_name);
        }, (error) => {
            core.warning(util.format("Failed to read latest trivy verison from %s. Using default stable version %s", trivyLatestReleaseUrl, stableTrivyVersion));
            return stableTrivyVersion;
        });
    });
}
function getTrivyDownloadUrl(trivyVersion) {
    const curOS = os.type();
    switch (curOS) {
        case "Linux":
            return util.format("https://github.com/aquasecurity/trivy/releases/download/v%s/trivy_%s_Linux-64bit.tar.gz", trivyVersion, trivyVersion);
        case "Darwin":
            return util.format("https://github.com/aquasecurity/trivy/releases/download/v%s/trivy_%s_macOS-64bit.tar.gz", trivyVersion, trivyVersion);
        default:
            throw new Error(util.format("Container scanning is not supported on %s currently", curOS));
    }
}
