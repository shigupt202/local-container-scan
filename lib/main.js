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
const toolrunner_1 = require("@actions/exec/lib/toolrunner");
const trivyHelper_1 = require("./trivyHelper");
const dockleHelper_1 = require("./dockleHelper");
const download = require('download');
function getWhitelistFileLoc(whitelistFilePath, whitelistFileBranch) {
    return __awaiter(this, void 0, void 0, function* () {
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
    });
}
function getTrivyEnvVariables() {
    return __awaiter(this, void 0, void 0, function* () {
        let trivyEnv = {};
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
                const whitelistFileLoc = yield getWhitelistFileLoc(whitelistFilePath, whitelistFileBranch);
                trivyEnv["TRIVY_IGNOREFILE"] = whitelistFileLoc;
            }
        }
        catch (error) {
            throw new Error(util.format("Could not download whitelist file. Error: %s", error.message));
        }
        const severityThreshold = core.getInput("severity-threshold");
        if (severityThreshold) {
            switch (severityThreshold.toUpperCase()) {
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
    });
}
function setDockleEnvVariables() {
    return __awaiter(this, void 0, void 0, function* () {
        let dockleEnv = {};
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
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const trivyPath = yield trivyHelper_1.getTrivy();
            console.log(util.format("Trivy executable found at path ", trivyPath));
            const trivyEnv = yield getTrivyEnvVariables();
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
            if (addCISChecks.toLowerCase() == "true") {
                const docklePath = yield dockleHelper_1.getDockle();
                const dockleEnv = yield setDockleEnvVariables();
                const dockleOptions = {
                    env: dockleEnv,
                    ignoreReturnCode: true
                };
                let dockleArgs = [];
                dockleArgs.push(imageName);
                const dockleToolRunner = new toolrunner_1.ToolRunner(docklePath, dockleArgs, dockleOptions);
                yield dockleToolRunner.exec();
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
