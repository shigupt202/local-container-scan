import * as os from 'os';
import * as util from 'util';
import * as fs from 'fs';
import * as toolCache from '@actions/tool-cache';
import * as core from '@actions/core';
const semver = require('semver');

const stableTrivyVersion = "0.5.2";
const trivyLatestReleaseUrl = "https://api.github.com/repos/aquasecurity/trivy/releases/latest";
const trivyToolName = "trivy";

export async function getTrivy(): Promise<string> {
    const latestTrivyVersion = await getLatestTrivyVersion();

    let cachedToolPath = toolCache.find(trivyToolName, latestTrivyVersion);
    if (!cachedToolPath) {
        let trivyDownloadPath;
        const trivyDownloadUrl = getTrivyDownloadUrl(latestTrivyVersion);
        const trivyDownloadDir = `${process.env['GITHUB_WORKSPACE']}/_temp/tools/trivy`;
        console.log(util.format("Could not find trivy in cache, downloading from %s", trivyDownloadUrl));

        try {
            trivyDownloadPath = await toolCache.downloadTool(trivyDownloadUrl, trivyDownloadDir);
        } catch (error) {
            throw new Error(util.format("Failed to download trivy from %s", trivyDownloadUrl));
        }

        const untarredTrivyPath = await toolCache.extractTar(trivyDownloadPath);
        cachedToolPath = await toolCache.cacheDir(untarredTrivyPath, trivyToolName, latestTrivyVersion);
    }

    const trivyToolPath = cachedToolPath + "/" + trivyToolName;
    fs.chmodSync(trivyToolPath, "777");

    return trivyToolPath;
}

async function getLatestTrivyVersion(): Promise<string> {
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
}

function getTrivyDownloadUrl(trivyVersion: string): string {
    const curOS = os.type();
    const arch = process.arch;
    switch (arch) {
        case "x32":
            switch (curOS) {
                case "Linux":
                    return util.format("https://github.com/aquasecurity/trivy/releases/download/v%s/trivy_%s_Linux-32bit.tar.gz", trivyVersion, trivyVersion);

                case "Darwin":
                    return util.format("https://github.com/aquasecurity/trivy/releases/download/v%s/trivy_%s_macOS-32bit.tar.gz", trivyVersion, trivyVersion);

                default:
                    throw new Error(util.format("Container scanning is not supported on %s currently", curOS));
            }
        case "x64":
            switch (curOS) {
                case "Linux":
                    return util.format("https://github.com/aquasecurity/trivy/releases/download/v%s/trivy_%s_Linux-64bit.tar.gz", trivyVersion, trivyVersion);

                case "Darwin":
                    return util.format("https://github.com/aquasecurity/trivy/releases/download/v%s/trivy_%s_macOS-64bit.tar.gz", trivyVersion, trivyVersion);

                default:
                    throw new Error(util.format("Container scanning is not supported on %s currently", curOS));
            }
        case "arm":
            switch (curOS) {
                case "Linux":
                    return util.format("https://github.com/aquasecurity/trivy/releases/download/v%s/trivy_%s_Linux-ARM.tar.gz", trivyVersion, trivyVersion);

                case "Darwin":
                    throw new Error(util.format("Container scanning is not supported for %s on %s currently", arch, curOS));

                default:
                    throw new Error(util.format("Container scanning is not supported on %s currently", curOS));
            }
        case "arm64":
            switch (curOS) {
                case "Linux":
                    return util.format("https://github.com/aquasecurity/trivy/releases/download/v%s/trivy_%s_Linux-ARM64.tar.gz", trivyVersion, trivyVersion);

                case "Darwin":
                    throw new Error(util.format("Container scanning is not supported for %s on %s currently", arch, curOS));

                default:
                    throw new Error(util.format("Container scanning is not supported on %s currently", curOS));
            }
        default:
            throw new Error(util.format("Container scanning is not supported for %s currently", arch));
    }
}
