import * as core from '@actions/core'
import * as util from 'util'
import { ExecOptions } from '@actions/exec/lib/interfaces';
import { ToolRunner } from '@actions/exec/lib/toolrunner';
import { getTrivy } from './trivyHelper'
const download = require('download');

let trivyEnv: { [key: string]: string } = {};

async function getWhitelistFileLoc(whitelistFilePath: string, whitelistFileBranch: string): Promise<string> {
    const whitelistFileUrl = `https://raw.githubusercontent.com/${process.env.GITHUB_REPOSITORY}/${whitelistFileBranch}/${whitelistFilePath}`;
    const whitelistFilePathParts = whitelistFilePath.split('/');
    const whitelistFileName = whitelistFilePathParts[whitelistFilePathParts.length - 1];
    const whitelistFileDownloadDir = `${process.env['GITHUB_WORKSPACE']}/_temp/containerScanWhitelist`;
    const githubToken = core.getInput("github-token");
    console.log(util.format("Downloading whitelist file from %s", whitelistFileUrl));

    return download(whitelistFileUrl, whitelistFileDownloadDir, { headers: { Authorization: `token ${githubToken}` } }).then(() => {
        return `${whitelistFileDownloadDir}/${whitelistFileName}`;
    });
}

async function setEnvVariables() {
    for (let key in process.env) {
        trivyEnv[key] = process.env[key] || "";
    }

    const username = core.getInput("username");
    const password = core.getInput("password");
    if (username && password) {
        trivyEnv["TRIVY_AUTH_URL"] = "https://registry.hub.docker.com";
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
}

async function run(): Promise<void> {
    try {
        console.log("Starting scan action");
        const trivyPath = await getTrivy();
        console.log(util.format("Trivy executable found at path ", trivyPath));

        await setEnvVariables();

        const imageName = core.getInput("imageName");
        const options: ExecOptions = {
            env: trivyEnv,
            ignoreReturnCode: true
        };
        let args = [];
        args.push(imageName);
        const toolRunner = new ToolRunner(trivyPath, args, options);

        const status = await toolRunner.exec();

        if (status == 0) {
            console.log("No vulnerabilities were detected in the container image");
        } else if (status == 1) {
            console.log("Vulnerabilities were detected in the container image");
            throw new Error("Vulnerabilities were detected in the container image");
        } else {
            throw new Error("An error occured while scanning the container image for vulnerabilities");
        }

    } catch (error) {
        core.setFailed(error.message);
    }
}

run();