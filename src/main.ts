import * as core from '@actions/core';
import * as util from 'util';
import { ExecOptions } from '@actions/exec/lib/interfaces';
import { ToolRunner } from '@actions/exec/lib/toolrunner';
import { getTrivy } from './trivyHelper';
import { getDockle } from './dockleHelper';
const download = require('download');

async function getWhitelistFileLoc(whitelistFilePath: string, whitelistFileBranch: string): Promise<string> {
    const whitelistFileUrl = `https://raw.githubusercontent.com/${process.env.GITHUB_REPOSITORY}/${whitelistFileBranch}/${whitelistFilePath}`;
    const whitelistFilePathParts = whitelistFilePath.split('/');
    const whitelistFileName = whitelistFilePathParts[whitelistFilePathParts.length - 1];
    const date = Date.now();
    const whitelistFileDownloadDir = `${process.env['GITHUB_WORKSPACE']}/_temp/containerScanWhitelist_${date}`;
    const githubToken = core.getInput("github-token");
    console.log(util.format("Downloading whitelist file from %s", whitelistFileUrl));

    return download(whitelistFileUrl, whitelistFileDownloadDir, { headers: { Authorization: `token ${githubToken}` } }).then(() => {
        return `${whitelistFileDownloadDir}/${whitelistFileName}`;
    });
}

async function getTrivyEnvVariables(): Promise<{ [key: string]: string }> {
    let trivyEnv: { [key: string]: string } = {};
    for (let key in process.env) {
        trivyEnv[key] = process.env[key] || "";
    }

    const githubToken = core.getInput("github-token");
    trivyEnv["GITHUB_TOKEN"] = githubToken;
    
    const username = core.getInput("username");
    const password = core.getInput("password");
    const registryURL = core.getInput("registry-url");
    if (username && password) {
        trivyEnv["TRIVY_AUTH_URL"] = registryURL;
        trivyEnv["TRIVY_USERNAME"] = username;
        trivyEnv["TRIVY_PASSWORD"] = password;
    }

    trivyEnv["TRIVY_EXIT_CODE"] = "1";

    try {
        const whitelistFilePath = core.getInput("whitelist-file");
        const whitelistFileBranch = core.getInput("whitelist-file-branch");
        if (whitelistFilePath) {
            const whitelistFileLoc = await getWhitelistFileLoc(whitelistFilePath, whitelistFileBranch);
            trivyEnv["TRIVY_IGNOREFILE"] = whitelistFileLoc;
        }
    } catch (error) {
        throw new Error(util.format("Could not download whitelist file. Error: %s", error.message));
    }

    const severityThreshold = core.getInput("severity-threshold");
    if(severityThreshold) {
        switch(severityThreshold.toUpperCase()) {
            case 'UNKNOWN':
                trivyEnv["TRIVY_SEVERITY"] = "UNKNOWN,LOW,MEDIUM,HIGH,CRITICAL";
                break;
            case 'LOW':
                trivyEnv["TRIVY_SEVERITY"] = "LOW,MEDIUM,HIGH,CRITICAL";
                break;
            case 'MEDIUM':
                trivyEnv["TRIVY_SEVERITY"] = "MEDIUM,HIGH,CRITICAL";
                break;
            case 'HIGH':
                trivyEnv["TRIVY_SEVERITY"] = "HIGH,CRITICAL";
                break;
            case 'CRITICAL':
                trivyEnv["TRIVY_SEVERITY"] = "CRITICAL";
                break;
            default:
                console.log("Invalid severity-threshold");
        }
    }

    return trivyEnv;
}

async function setDockleEnvVariables(): Promise<{ [key: string]: string }> {
    let dockleEnv: { [key: string]: string } = {};
    for (let key in process.env) {
        dockleEnv[key] = process.env[key] || "";
    }

    const username = core.getInput("username");
    const password = core.getInput("password");
    if (username && password) {
        dockleEnv["DOCKLE_AUTH_URL"] = "https://registry.hub.docker.com";
        dockleEnv["DOCKLE_USERNAME"] = username;
        dockleEnv["DOCKLE_PASSWORD"] = password;
    }

    dockleEnv["DOCKLE_EXIT_CODE"] = "1";

    return dockleEnv;
}

async function run(): Promise<void> {
    try {
        console.log("Starting");
        const trivyPath = await getTrivy();
        console.log(util.format("Trivy executable found at path ", trivyPath));

        const trivyEnv = await getTrivyEnvVariables();

        const imageName = core.getInput("image-name");
        const trivyOptions: ExecOptions = {
            env: trivyEnv,
            ignoreReturnCode: true
        };
        let trivyArgs = [];
        trivyArgs.push(imageName);
        const trivyToolRunner = new ToolRunner(trivyPath, trivyArgs, trivyOptions);
        console.log("toolrunner created");
        const trivyStatus = await trivyToolRunner.exec();
        console.log("toolrunner executed");
        const addCISChecks = core.getInput("add-CIS-checks");
        if (addCISChecks.toLowerCase() == "true") {
            const docklePath = await getDockle();

            const dockleEnv = await setDockleEnvVariables();

            const dockleOptions: ExecOptions = {
                env: dockleEnv,
                ignoreReturnCode: true
            };

            let dockleArgs = [];
            dockleArgs.push(imageName);

            const dockleToolRunner = new ToolRunner(docklePath, dockleArgs, dockleOptions);

            await dockleToolRunner.exec();
        }

        if (trivyStatus == 0) {
            console.log("No vulnerabilities were detected in the container image");
        } else if (trivyStatus == 1) {
            throw new Error("Vulnerabilities were detected in the container image");
        } else {
            throw new Error("An error occured while scanning the container image for vulnerabilities");
        }

    } catch (error) {
        core.setFailed(error.message);
    }
}

run();