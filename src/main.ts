import * as core from '@actions/core'
import * as util from 'util'
import * as fs from 'fs'
import { ExecOptions } from '@actions/exec/lib/interfaces';
import { ToolRunner } from '@actions/exec/lib/toolrunner';
import { getTrivy } from './trivyHelper'
import { getDockle } from './dockleHelper'
const download = require('download');
const fetch = require("node-fetch");

let trivyEnv: { [key: string]: string } = {};
let dockleEnv: { [key: string]: string } = {};
let containerScanDirectory = '';

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

function ensureDirExists(dir: string) {
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
}

function getContainerScanDirectory(): string {
    if(!containerScanDirectory) {
        containerScanDirectory = `${process.env['GITHUB_WORKSPACE']}/_temp/containerscan_${Date.now()}`;
        ensureDirExists(containerScanDirectory);
    }

    return containerScanDirectory;
}

function ensureFileExists(path: string) {
    if(!fs.existsSync(path)) {
        fs.writeFileSync(path, '{}');
    }
}

function getTrivyOutputPath(): string {
    const trivyOutputPath = `${getContainerScanDirectory()}/trivyoutput.json`;
    ensureFileExists(trivyOutputPath);
    return trivyOutputPath;
}

async function setTrivyEnvVariables() {
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
    trivyEnv["TRIVY_FORMAT"] = "json";
    const trivyOutputPath = getTrivyOutputPath();
    trivyEnv["TRIVY_OUTPUT"] = trivyOutputPath;

    try {
        const whitelistFilePath = core.getInput("whitelist-file");
        const whitelistFileBranch = core.getInput("whitelist-file-branch");
        if (whitelistFilePath) {
            const whitelistFileLoc = await getWhitelistFileLoc(whitelistFilePath, whitelistFileBranch);
            trivyEnv["TRIVY_IGNOREFILE"] = whitelistFileLoc;
        }
    } catch (error) {
        // throw new Error(util.format("Could not download whitelist file. Error: %s", error.message));
        core.warning(util.format("Could not download whitelist file. Error: %s", error.message));
    }
}

async function setDockleEnvVariables() {
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
}

function isPullRequestWorkflow(): boolean {
    return true;
}

function getFileJson(path: string): any {
    try {
        const rawContent = fs.readFileSync(path, 'utf-8');
        const json = JSON.parse(rawContent);
        return json;
    } catch(ex) {
        throw new Error(`An error occured while parsing the contents of the file: ${path}. Error: ${ex}`);
    }
}

function getPullRequestHeadSha(): string {
    const eventPath = process.env.GITHUB_EVENT_PATH;
    let headSha = '';
    if(eventPath) {
        const eventJson = getFileJson(eventPath);
        console.log("eventJson: ", eventJson);
        headSha = eventJson["pull_request"]["head"]["sha"];
    }

    return headSha;
}

async function createCheckRun(): Promise<void> {
    const checkRunUrl = `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/check-runs`;
    const githubToken = core.getInput("github-token");
    const pullRequestHeadSha = getPullRequestHeadSha();
    console.log("check run url: ", checkRunUrl);
    const checkRunPayload = {
        "head_sha": pullRequestHeadSha,
        "name": "Container scan",
        "status": "in_progress",
        "output": {
            "title": "Container scan result",
            "summary": "Scan completed. Found 3 vulnerabilities.",
            "text": "CVE-2020-1234\nCVE-2020-2345"
        },
        "actions": [
            {
                "label": "Create PR",
                "identifier": "vuln_wl_pr",
                "description": "Whitelist the vulnerabilities"
            }
        ]
    }

    console.log("checkRunPayload: ", checkRunPayload)

    const result = await fetch(checkRunUrl, {
        method: 'POST',
        body: JSON.stringify(checkRunPayload),
        headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github.antiope-preview+json'
        }
    })

    console.log('Check run created: ', result.json());
}

function getTrivyOutput(): any {
    const path = getTrivyOutputPath();
    return getFileJson(path);
}

function getVulnerabilities(): any[] {
    const trivyOutputJson = getTrivyOutput();
    let vulnerabilities: any[] = [];
    trivyOutputJson.forEach((ele: any) => {
        if(ele && ele["Vulnerabilities"]) {
            ele["Vulnerabilities"].forEach((cve: any) => {
                vulnerabilities.push({
                    id: cve["VulnerabilityID"],
                    package: cve["PkgName"]
                });
            });
        }
    });

    return vulnerabilities;
}

async function createCheckRunThroughProxy(imageName: string): Promise<void> {
    const checkRunProxyUrl = `http://aj-vm-3.westeurope.cloudapp.azure.com:3000/app_proxy/check-run`;
    const githubToken = core.getInput("github-token");
    const pullRequestHeadSha = getPullRequestHeadSha();
    const repository = process.env['GITHUB_REPOSITORY'];
    const vulnerabilities = getVulnerabilities()

    const checkRunPayload = {
        head_sha: pullRequestHeadSha,
        image: imageName,
        repository: repository,
        vulnerabilities: vulnerabilities
    }

    console.log("check run url: ", checkRunProxyUrl);
    console.log("check run payload: ", checkRunPayload)

    const result = await fetch(checkRunProxyUrl, {
        method: 'POST',
        body: JSON.stringify(checkRunPayload),
        headers: {
            Authorization: `Bearer ${githubToken}`
        }
    })

    console.log('Check run created');
}

async function run(): Promise<void> {
    try {
        const trivyPath = await getTrivy();

        await setTrivyEnvVariables();

        const imageName = core.getInput("image-name");
        const trivyOptions: ExecOptions = {
            env: trivyEnv,
            ignoreReturnCode: true
        };
        let trivyArgs = [];
        trivyArgs.push(imageName);

        const trivyToolRunner = new ToolRunner(trivyPath, trivyArgs, trivyOptions);

        const trivyStatus = await trivyToolRunner.exec();

        const addCISChecks = core.getInput("add-CIS-checks");
        if (addCISChecks.toLocaleLowerCase() == "true") {
            const docklePath = await getDockle();

            await setDockleEnvVariables();

            const dockleOptions: ExecOptions = {
                env: dockleEnv,
                ignoreReturnCode: true
            };

            let dockleArgs = [];
            dockleArgs.push(imageName);

            const dockleToolRunner = new ToolRunner(docklePath, dockleArgs, dockleOptions);

            await dockleToolRunner.exec();
        }

        if(isPullRequestWorkflow()) {
            console.log("This is a PR workflow. Trying to create check run")
            // await createCheckRun();
            await createCheckRunThroughProxy(imageName);
            console.log("check run created")
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