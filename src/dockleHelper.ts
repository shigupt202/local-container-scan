import * as os from 'os';
import * as util from 'util';
import * as fs from 'fs';
import * as toolCache from '@actions/tool-cache';
import * as core from '@actions/core';
const semver = require('semver');

const stableDockleVersion = '0.2.4';
const dockleLatestReleaseUrl = 'https://api.github.com/repos/goodwithtech/dockle/releases/latest';
const dockleToolName = 'dockle';

export async function getDockle(): Promise<string> {
    const latestDockleVersion = await getLatestDockleVersion();
    const cachedToolName = dockleToolName + "_" + os.type();
    let cachedToolPath = toolCache.find(cachedToolName, latestDockleVersion);
    console.log("cached tool path: " + cachedToolPath);
    if (!cachedToolPath) {
        let dockleDownloadPath;
        const dockleDownloadUrl = getDockleDownloadUrl(latestDockleVersion);
        const dockleDownloadDir = `${process.env['GITHUB_WORKSPACE']}/_temp/tools/dockle`;
        console.log(util.format("Could not find dockle in cache, downloading from %s", dockleDownloadUrl));

        try {
            dockleDownloadPath = await toolCache.downloadTool(dockleDownloadUrl, dockleDownloadDir);
        } catch (error) {
            throw new Error(util.format("Failed to download dockle from %s", dockleDownloadUrl));
        }

        const untarredDocklePath = await toolCache.extractTar(dockleDownloadPath);
        cachedToolPath = await toolCache.cacheDir(untarredDocklePath, cachedToolName, latestDockleVersion);
        console.log("cached tool path 2: " + cachedToolPath);
    }

    const dockleToolPath = cachedToolPath + "/" + dockleToolName;
    fs.chmodSync(dockleToolPath, "777");

    return dockleToolPath;
}

async function getLatestDockleVersion(): Promise<string> {
    return toolCache.downloadTool(dockleLatestReleaseUrl).then((downloadPath) => {
        const response = JSON.parse(fs.readFileSync(downloadPath, 'utf8').toString().trim());
        if (!response.tag_name) {
            return stableDockleVersion;
        }

        return semver.clean(response.tag_name);
    }, (error) => {
        core.debug(error);
        core.warning(util.format("Failed to read latest dockle verison from %s. Using default stable version %s", dockleLatestReleaseUrl, stableDockleVersion));
        return stableDockleVersion;
    });
}

function getDockleDownloadUrl(dockleVersion: string): string {
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
                    return util.format("https://github.com/goodwithtech/dockle/releases/download/v%s/dockle_%macOS-64bit.tar.gz", dockleVersion, dockleVersion);

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