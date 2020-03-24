import * as os from 'os';
import * as util from 'util';
import * as fs from 'fs';
import * as toolCache from '@actions/tool-cache';
import * as core from '@actions/core';
import * as fileHelper from './fileHelper';
import * as table from 'table';
import * as semver from 'semver';

export const DOCKLE_EXIT_CODE = 5;
const stableDockleVersion = "0.2.4";
const dockleLatestReleaseUrl = "https://api.github.com/repos/goodwithtech/dockle/releases/latest";
const dockleToolName = "dockle";

export async function getDockle(): Promise<string> {
    const latestDockleVersion = await getLatestDockleVersion();
    let cachedToolPath = toolCache.find(dockleToolName, latestDockleVersion);
    if (!cachedToolPath) {
        let dockleDownloadPath;
        const dockleDownloadUrl = getDockleDownloadUrl(latestDockleVersion);
        const dockleDownloadDir = `${process.env['GITHUB_WORKSPACE']}/_temp/tools/dockle`;
        core.debug(util.format("Could not find dockle in cache, downloading from %s", dockleDownloadUrl));

        try {
            dockleDownloadPath = await toolCache.downloadTool(dockleDownloadUrl, dockleDownloadDir);
        } catch (error) {
            throw new Error(util.format("Failed to download dockle from %s", dockleDownloadUrl));
        }

        const untarredDocklePath = await toolCache.extractTar(dockleDownloadPath);
        cachedToolPath = await toolCache.cacheDir(untarredDocklePath, dockleToolName, latestDockleVersion);
    }

    const dockleToolPath = cachedToolPath + "/" + dockleToolName;
    fs.chmodSync(dockleToolPath, "777");

    return dockleToolPath;
}

export function getOutputPath(): string {
    const dockleOutputPath = `${fileHelper.getContainerScanDirectory()}/dockleoutput.json`;
    return dockleOutputPath;
}

export function getSummary(dockleStatus: number): string {
    let summary = '';
    switch (dockleStatus) {
        case 0:
            summary = 'No CIS benchmark violations were detected in the container image.'
            break;
        case DOCKLE_EXIT_CODE:
            summary = getCisSummary();
            break;
        default:
            summary = 'An error occured while scanning the container image for CIS benchmark violations.';
            break;
    }

    return `- ${summary}`;
}

export function getText(dockleStatus: number): string {
    const cisIds = getCisIds(dockleStatus);
    return `**Best Practices Violations** -\n${cisIds.join('\n')}`;
}

function getCisIds(dockleStatus: number): string[] {
    let cisIds: string[] = [];
    if (dockleStatus === DOCKLE_EXIT_CODE) {
        const dockleOutputJson = getDockleOutput();
        cisIds = dockleOutputJson['details'].map(dd => dd['code']);
    }

    return cisIds;
}

function getDockleOutput(): any {
    const path = getOutputPath();
    return fileHelper.getFileJson(path);
}

function getCisSummary(): any {
    const dockleOutputJson = getDockleOutput();
    let cisSummary = '';
    const dockleSummary = dockleOutputJson['summary'];
    if (dockleSummary) {
        cisSummary = `Best practices test summary -\n"fatal": ${dockleSummary["fatal"]}\n"warn": ${dockleSummary["warn"]}\n"info": ${dockleSummary["info"]}\n"pass": ${dockleSummary["pass"]}`;
    }

    return cisSummary;
}

async function getLatestDockleVersion(): Promise<string> {
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
}

function getDockleDownloadUrl(dockleVersion: string): string {
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

export function printFormattedOutput() {
    const dockleOutputJson = getDockleOutput();
    let rows = [];
    let titles = ["VULNERABILITY ID", "TITLE", "SEVERITY", "DESCRIPTION"];
    rows.push(titles);
    dockleOutputJson["details"].forEach(ele => {
                let row = [];
                row.push(ele["code"]);
                row.push(ele["title"]);
                row.push(ele["level"]);
                row.push(ele["alerts"][0]);
                rows.push(row);           
    });
    
    let config = {
        columns: {
          0: {
            width: 25,
            wrapWord: true
          },
          1: {
            width: 25,
            wrapWord: true
          },
          2: {
            width: 25,
            wrapWord: true
          },
          3: {
            width: 65,
            wrapWord: true
          }
        }
      };
    console.log(table.table(rows, config));
}