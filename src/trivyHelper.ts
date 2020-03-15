import * as os from 'os';
import * as util from 'util';
import * as fs from 'fs';
import * as toolCache from '@actions/tool-cache';
import * as core from '@actions/core';
const semver = require('semver');

const stableTrivyVersion = "0.5.0";
const trivyLatestReleaseUrl = 'https://api.github.com/repos/aquasecurity/trivy/releases/latest';
const trivyToolName = "trivy";

export async function getTrivy(): Promise<string> {
    const latestTrivyVersion = await getLatestTrivyVersion();
    const cachedToolName = trivyToolName + "_" + os.type();
    let cachedToolPath = toolCache.find(cachedToolName, latestTrivyVersion);
    if (!cachedToolPath) {
        let trivyDownloadPath;
        const trivyDownloadUrl = getTrivyDownloadUrl(latestTrivyVersion);
        const trivyDownloadDir = `${process.env['GITHUB_WORKSPACE']}/_temp/tools/${cachedToolName}`;
        console.log(util.format("Could not find trivy in cache, downloading from %s", trivyDownloadUrl));

        try {
            trivyDownloadPath = await toolCache.downloadTool(trivyDownloadUrl, trivyDownloadDir);
        } catch (error) {
            throw new Error(util.format("Failed to download trivy from %s", trivyDownloadUrl));
        }

        const untarredTrivyPath = await toolCache.extractTar(trivyDownloadPath);
        cachedToolPath = await toolCache.cacheDir(untarredTrivyPath, cachedToolName, latestTrivyVersion);
    }

    const trivyToolPath = cachedToolPath + "/" + cachedToolName;
    fs.chmodSync(trivyToolPath, "777");

    return trivyToolPath;
}

async function getLatestTrivyVersion(): Promise<string> {
    try {
        console.log("in getLatestTrivyVersion");
        let downloadPath = await toolCache.downloadTool(trivyLatestReleaseUrl);
        console.log("download path" + downloadPath);
        const response = JSON.parse(fs.readFileSync(downloadPath, 'utf8').toString().trim());
        console.log("response: " + response);
        if (!response.tag_name) {
            return stableTrivyVersion;
        }

        return semver.clean(response.tag_name);
    }
    catch (error) {
        core.debug(error);
        core.warning(util.format("Failed to read latest trivy verison from %s. Using default stable version %s", trivyLatestReleaseUrl, stableTrivyVersion));
        return stableTrivyVersion;
    };
}

function getTrivyDownloadUrl(trivyVersion: string): string {
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