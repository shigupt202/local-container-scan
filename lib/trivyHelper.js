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
const path = __importStar(require("path"));
const util = __importStar(require("util"));
const fs = __importStar(require("fs"));
const toolCache = __importStar(require("@actions/tool-cache"));
const core = __importStar(require("@actions/core"));
const stableTrivyVersion = "0.5.0";
const trivyLatestReleaseUrl = "https://api.github.com/repos/aquasecurity/trivy/releases/latest";
const trivyToolName = "trivy";
function getTrivy() {
    return __awaiter(this, void 0, void 0, function* () {
        const latestTrivyVersion = yield getLatestTrivyVersion();
        let cachedToolPath = toolCache.find(trivyToolName, latestTrivyVersion);
        if (!cachedToolPath) {
            let trivyDownloadPath;
            const trivyDownloadUrl = getTrivyDownloadUrl(latestTrivyVersion);
            try {
                trivyDownloadPath = yield toolCache.downloadTool(trivyDownloadUrl);
            }
            catch (error) {
                throw new Error(util.format("Failed to download trivy from ", trivyDownloadUrl));
            }
            fs.chmodSync(trivyDownloadPath, "777");
            const untarredTrivyPath = yield toolCache.extractTar(trivyDownloadPath);
            cachedToolPath = yield toolCache.cacheDir(untarredTrivyPath, trivyToolName, latestTrivyVersion);
        }
        const trivyToolPath = findTrivy(cachedToolPath);
        console.log("Found at " + trivyToolPath);
        fs.chmodSync(trivyToolPath, "777");
        return trivyToolPath;
    });
}
exports.getTrivy = getTrivy;
function getLatestTrivyVersion() {
    return __awaiter(this, void 0, void 0, function* () {
        return toolCache.downloadTool(trivyLatestReleaseUrl).then((downloadPath) => {
            const response = JSON.parse(fs.readFileSync(downloadPath, 'utf8').toString().trim());
            if (!response.tag_name) {
                return stableTrivyVersion;
            }
            return response.tag_name.substring(1);
        }, (error) => {
            core.debug(error);
            core.warning(util.format("Failed to read latest trivy verison from %s. Using default stable version %s", trivyLatestReleaseUrl, stableTrivyVersion));
            return stableTrivyVersion;
        });
    });
}
function getTrivyDownloadUrl(trivyVersion) {
    const curOS = os.type();
    switch (curOS) {
        case "Linux":
            return util.format("https://github.com/aquasecurity/trivy/releases/download/v%s/trivy_%s_Linux-32bit.tar.gz", trivyVersion, trivyVersion);
        case "Darwin":
            return util.format("https://github.com/aquasecurity/trivy/releases/download/v%s/trivy_%s_macOS-32bit.tar.gz", trivyVersion, trivyVersion);
        default:
            throw new Error(util.format("Container scanning is not supported for %s currently", curOS));
    }
}
function findTrivy(rootFolder) {
    fs.chmodSync(rootFolder, '777');
    var filelist = [];
    walkSync(rootFolder, filelist, trivyToolName);
    if (!filelist) {
        throw new Error(util.format("Trivy executable not found in path ", rootFolder));
    }
    else {
        return filelist[0];
    }
}
var walkSync = function (dir, filelist, fileToFind) {
    var files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function (file) {
        if (fs.statSync(path.join(dir, file)).isDirectory()) {
            filelist = walkSync(path.join(dir, file), filelist, fileToFind);
        }
        else {
            core.debug(file);
            if (file == fileToFind) {
                filelist.push(path.join(dir, file));
            }
        }
    });
    return filelist;
};
