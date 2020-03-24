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
const table = __importStar(require("table"));
const semver = __importStar(require("semver"));
exports.DOCKLE_EXIT_CODE = 5;
const stableDockleVersion = "0.2.4";
const dockleLatestReleaseUrl = "https://api.github.com/repos/goodwithtech/dockle/releases/latest";
const dockleToolName = "dockle";
const DETAILS = "details";
const CODE = "code";
const TITLE = "title";
const LEVEL = "level";
const ALERTS = "alerts";
const TITLE_VULNERABILITY_ID = "VULNERABILITY ID";
const TITLE_TITLE = "TITLE";
const TITLE_SEVERITY = "SEVERITY";
const TITLE_DESCRIPTION = "DESCRIPTION";
function getDockle() {
    return __awaiter(this, void 0, void 0, function* () {
        const latestDockleVersion = yield getLatestDockleVersion();
        let cachedToolPath = toolCache.find(dockleToolName, latestDockleVersion);
        if (!cachedToolPath) {
            let dockleDownloadPath;
            const dockleDownloadUrl = getDockleDownloadUrl(latestDockleVersion);
            const dockleDownloadDir = `${process.env['GITHUB_WORKSPACE']}/_temp/tools/dockle`;
            core.debug(util.format("Could not find dockle in cache, downloading from %s", dockleDownloadUrl));
            try {
                dockleDownloadPath = yield toolCache.downloadTool(dockleDownloadUrl, dockleDownloadDir);
            }
            catch (error) {
                throw new Error(util.format("Failed to download dockle from %s", dockleDownloadUrl));
            }
            const untarredDocklePath = yield toolCache.extractTar(dockleDownloadPath);
            cachedToolPath = yield toolCache.cacheDir(untarredDocklePath, dockleToolName, latestDockleVersion);
        }
        const dockleToolPath = cachedToolPath + "/" + dockleToolName;
        fs.chmodSync(dockleToolPath, "777");
        return dockleToolPath;
    });
}
exports.getDockle = getDockle;
function getOutputPath() {
    const dockleOutputPath = `${fileHelper.getContainerScanDirectory()}/dockleoutput.json`;
    return dockleOutputPath;
}
exports.getOutputPath = getOutputPath;
function getSummary(dockleStatus) {
    let summary = '';
    switch (dockleStatus) {
        case 0:
            summary = 'No CIS benchmark violations were detected in the container image.';
            break;
        case exports.DOCKLE_EXIT_CODE:
            summary = getCisSummary();
            break;
        default:
            summary = 'An error occured while scanning the container image for CIS benchmark violations.';
            break;
    }
    return `- ${summary}`;
}
exports.getSummary = getSummary;
function getText(dockleStatus) {
    const cisIds = getCisIds(dockleStatus);
    return `**Best Practices Violations** -\n${cisIds.join('\n')}`;
}
exports.getText = getText;
function getCisIds(dockleStatus) {
    let cisIds = [];
    if (dockleStatus === exports.DOCKLE_EXIT_CODE) {
        const dockleOutputJson = getDockleOutput();
        cisIds = dockleOutputJson['details'].map(dd => dd['code']);
    }
    return cisIds;
}
function getDockleOutput() {
    const path = getOutputPath();
    return fileHelper.getFileJson(path);
}
function getCisSummary() {
    const dockleOutputJson = getDockleOutput();
    let cisSummary = '';
    const dockleSummary = dockleOutputJson['summary'];
    if (dockleSummary) {
        cisSummary = `Best practices test summary -\n"fatal": ${dockleSummary["fatal"]}\n"warn": ${dockleSummary["warn"]}\n"info": ${dockleSummary["info"]}\n"pass": ${dockleSummary["pass"]}`;
    }
    return cisSummary;
}
function getLatestDockleVersion() {
    return __awaiter(this, void 0, void 0, function* () {
        return toolCache.downloadTool(dockleLatestReleaseUrl).then((downloadPath) => {
            const response = JSON.parse(fs.readFileSync(downloadPath, 'utf8').toString().trim());
            if (!response.tag_name) {
                return stableDockleVersion;
            }
            return semver.clean(response.tag_name);
        }, (error) => {
            core.warning(util.format("Failed to read latest dockle verison from %s. Using default stable version %s", dockleLatestReleaseUrl, stableDockleVersion));
            return stableDockleVersion;
        });
    });
}
function getDockleDownloadUrl(dockleVersion) {
    const curOS = os.type();
    switch (curOS) {
        case "Linux":
            return util.format("https://github.com/goodwithtech/dockle/releases/download/v%s/dockle_%s_Linux-64bit.tar.gz", dockleVersion, dockleVersion);
        case "Darwin":
            return util.format("https://github.com/goodwithtech/dockle/releases/download/v%s/dockle_%s_macOS-64bit.tar.gz", dockleVersion, dockleVersion);
        default:
            throw new Error(util.format("Container scanning is not supported on %s currently", curOS));
    }
}
function printFormattedOutput() {
    const dockleOutputJson = getDockleOutput();
    let rows = [];
    let titles = [TITLE_VULNERABILITY_ID, TITLE_TITLE, TITLE_SEVERITY, TITLE_DESCRIPTION];
    rows.push(titles);
    dockleOutputJson[DETAILS].forEach(ele => {
        let row = [];
        row.push(ele[CODE]);
        row.push(ele[TITLE]);
        row.push(ele[LEVEL]);
        row.push(ele[ALERTS][0]);
        rows.push(row);
    });
    console.log(table.table(rows, utils.getConfigForTable(25, 25, 25, 65)));
}
exports.printFormattedOutput = printFormattedOutput;
