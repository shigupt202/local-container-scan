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
const core = __importStar(require("@actions/core"));
const util = __importStar(require("util"));
const fs = __importStar(require("fs"));
const toolrunner_1 = require("@actions/exec/lib/toolrunner");
const trivyHelper_1 = require("./trivyHelper");
const dockleHelper_1 = require("./dockleHelper");
const download = require('download');
const fetch = require("node-fetch");
let trivyEnv = {};
let dockleEnv = {};
let containerScanDirectory = '';
function getWhitelistFileLoc(whitelistFilePath, whitelistFileBranch) {
    return __awaiter(this, void 0, void 0, function* () {
        const whitelistFileUrl = `https://raw.githubusercontent.com/${process.env.GITHUB_REPOSITORY}/${whitelistFileBranch}/${whitelistFilePath}`;
        const whitelistFilePathParts = whitelistFilePath.split('/');
        const whitelistFileName = whitelistFilePathParts[whitelistFilePathParts.length - 1];
        const whitelistFileDownloadDir = `${process.env['GITHUB_WORKSPACE']}/_temp/containerScanWhitelist`;
        const githubToken = core.getInput("github-token");
        console.log(util.format("Downloading whitelist file from %s", whitelistFileUrl));
        return download(whitelistFileUrl, whitelistFileDownloadDir, { headers: { Authorization: `token ${githubToken}` } }).then(() => {
            return `${whitelistFileDownloadDir}/${whitelistFileName}`;
        });
    });
}
function getContainerScanDirectory() {
    if (!containerScanDirectory) {
        containerScanDirectory = `${process.env['GITHUB_WORKSPACE']}/_temp/containerscan_${Date.now()}`;
    }
    return containerScanDirectory;
}
function getTrivyOutputPath() {
    return `${getContainerScanDirectory()}/trivyOutput`;
}
function setTrivyEnvVariables() {
    return __awaiter(this, void 0, void 0, function* () {
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
                const whitelistFileLoc = yield getWhitelistFileLoc(whitelistFilePath, whitelistFileBranch);
                trivyEnv["TRIVY_IGNOREFILE"] = whitelistFileLoc;
            }
        }
        catch (error) {
            throw new Error(util.format("Could not download whitelist file. Error: %s", error.message));
        }
    });
}
function setDockleEnvVariables() {
    return __awaiter(this, void 0, void 0, function* () {
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
    });
}
function isPullRequestWorkflow() {
    return true;
}
function getPullRequestHeadSha() {
    const eventPath = process.env.GITHUB_EVENT_PATH;
    let headSha = '';
    if (eventPath) {
        const eventRaw = fs.readFileSync(eventPath, 'utf-8');
        const eventJson = JSON.parse(eventRaw);
        console.log("eventJson: ", eventJson);
        headSha = eventJson["pull_request"]["head"]["sha"];
    }
    return headSha;
}
function createCheckRun() {
    return __awaiter(this, void 0, void 0, function* () {
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
        };
        console.log("checkRunPayload: ", checkRunPayload);
        const result = yield fetch(checkRunUrl, {
            method: 'POST',
            body: JSON.stringify(checkRunPayload),
            headers: {
                Authorization: `Bearer ${githubToken}`,
                Accept: 'application/vnd.github.antiope-preview+json'
            }
        });
        console.log('Check run created: ', result.json());
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const trivyPath = yield trivyHelper_1.getTrivy();
            yield setTrivyEnvVariables();
            const imageName = core.getInput("image-name");
            const trivyOptions = {
                env: trivyEnv,
                ignoreReturnCode: true
            };
            let trivyArgs = [];
            trivyArgs.push(imageName);
            const trivyToolRunner = new toolrunner_1.ToolRunner(trivyPath, trivyArgs, trivyOptions);
            const trivyStatus = yield trivyToolRunner.exec();
            const addCISChecks = core.getInput("add-CIS-checks");
            if (addCISChecks.toLocaleLowerCase() == "true") {
                const docklePath = yield dockleHelper_1.getDockle();
                yield setDockleEnvVariables();
                const dockleOptions = {
                    env: dockleEnv,
                    ignoreReturnCode: true
                };
                let dockleArgs = [];
                dockleArgs.push(imageName);
                const dockleToolRunner = new toolrunner_1.ToolRunner(docklePath, dockleArgs, dockleOptions);
                yield dockleToolRunner.exec();
            }
            if (isPullRequestWorkflow()) {
                console.log("This is a PR workflow. Trying to create check run");
                yield createCheckRun();
                console.log("check run created");
            }
            if (trivyStatus == 0) {
                console.log("No vulnerabilities were detected in the container image");
            }
            else if (trivyStatus == 1) {
                throw new Error("Vulnerabilities were detected in the container image");
            }
            else {
                throw new Error("An error occured while scanning the container image for vulnerabilities");
            }
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
