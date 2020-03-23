import * as os from 'os';
import * as util from 'util';
import * as fs from 'fs';
import * as toolCache from '@actions/tool-cache';
import * as core from '@actions/core';
import * as fileHelper from './fileHelper';
const semver = require('semver');

export const TRIVY_EXIT_CODE = 5;
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

export function getOutputPath(): string {
    const trivyOutputPath = `${fileHelper.getContainerScanDirectory()}/trivyoutput.json`;
    return trivyOutputPath;
}

export function getText(trivyStatus: number): string {
    const vulnerabilityIds = getVulnerabilityIds(trivyStatus);
    return `**CVE's** -\n${vulnerabilityIds.join('\n')}`;
}

export function getSummary(trivyStatus: number): string {
    let summary = '';
    switch (trivyStatus) {
        case 0:
            summary = 'No vulnerabilities were detected in the container image'
            break;
        case TRIVY_EXIT_CODE:
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

    return summary;
}

function getVulnerabilityIds(trivyStatus: number): string[] {
    let vulnerabilityIds: string[] = [];
    if (trivyStatus == TRIVY_EXIT_CODE) {
        const vulnerabilities = getVulnerabilities();
        vulnerabilityIds = vulnerabilities.map(v => v['VulnerabilityID']);
    }

    return vulnerabilityIds;
}

function getTrivyOutput(): any {
    const path = getOutputPath();
    return fileHelper.getFileJson(path);
}

function getVulnerabilities(): any[] {
    const trivyOutputJson = getTrivyOutput();
    let vulnerabilities: any[] = [];
    trivyOutputJson.forEach((ele: any) => {
        if (ele && ele["Vulnerabilities"]) {
            ele["Vulnerabilities"].forEach((cve: any) => {
                vulnerabilities.push(cve);
            });
        }
    });

    return vulnerabilities;
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
    switch (curOS) {
        case "Linux":
            return util.format("https://github.com/aquasecurity/trivy/releases/download/v%s/trivy_%s_Linux-64bit.tar.gz", trivyVersion, trivyVersion);

        case "Darwin":
            return util.format("https://github.com/aquasecurity/trivy/releases/download/v%s/trivy_%s_macOS-64bit.tar.gz", trivyVersion, trivyVersion);

        default:
            throw new Error(util.format("Container scanning is not supported on %s currently", curOS));
    }
}
