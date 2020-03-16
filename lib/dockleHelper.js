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
const semver = require('semver');
const stableDockleVersion = "0.2.4";
const dockleLatestReleaseUrl = "https://api.github.com/repos/goodwithtech/dockle/releases/latest";
const dockleToolName = "dockle";
function getDockle() {
    return __awaiter(this, void 0, void 0, function* () {
        const latestDockleVersion = yield getLatestDockleVersion();
        let cachedToolPath = toolCache.find(dockleToolName, latestDockleVersion);
        if (!cachedToolPath) {
            let dockleDownloadPath;
            const dockleDownloadUrl = getDockleDownloadUrl(latestDockleVersion);
            const dockleDownloadDir = `${process.env['GITHUB_WORKSPACE']}/_temp/tools/dockle`;
            console.log(util.format("Could not find dockle in cache, downloading from %s", dockleDownloadUrl));
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
    const arch = process.arch;
    switch (arch) {
        case "x32":
            switch (curOS) {
                case "Linux":
                    return util.format("https://github.com/goodwithtech/dockle/releases/download/v%s/dockle_%s_Linux-32bit.tar.gz", dockleVersion, dockleVersion);
                case "Darwin":
                    return util.format("https://github.com/goodwithtech/dockle/releases/download/v%s/dockle_%s_macOS-32bit.tar.gz", dockleVersion, dockleVersion);
                default:
                    throw new Error(util.format("Container scanning is not supported on %s currently", curOS));
            }
        case "x64":
            switch (curOS) {
                case "Linux":
                    return util.format("https://github.com/goodwithtech/dockle/releases/download/v%s/dockle_%s_Linux-64bit.tar.gz", dockleVersion, dockleVersion);
                case "Darwin":
                    return util.format("https://github.com/goodwithtech/dockle/releases/download/v%s/dockle_%s_macOS-64bit.tar.gz", dockleVersion, dockleVersion);
                default:
                    throw new Error(util.format("Container scanning is not supported on %s currently", curOS));
            }
        case "arm":
            switch (curOS) {
                case "Linux":
                    return util.format("https://github.com/goodwithtech/dockle/releases/download/v%s/dockle_%s_Linux-ARM.tar.gz", dockleVersion, dockleVersion);
                case "Darwin":
                    throw new Error(util.format("Container scanning is not supported for %s on %s currently", arch, curOS));
                default:
                    throw new Error(util.format("Container scanning is not supported on %s currently", curOS));
            }
        case "arm64":
            switch (curOS) {
                case "Linux":
                    return util.format("https://github.com/goodwithtech/dockle/releases/download/v%s/dockle_%s_Linux-ARM64.tar.gz", dockleVersion, dockleVersion);
                case "Darwin":
                    throw new Error(util.format("Container scanning is not supported for %s on %s currently", arch, curOS));
                default:
                    throw new Error(util.format("Container scanning is not supported on %s currently", curOS));
            }
        default:
            throw new Error(util.format("Container scanning is not supported for %s currently", arch));
    }
}
