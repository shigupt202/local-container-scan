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
const fs = __importStar(require("fs"));
const util = __importStar(require("util"));
const toolrunner_1 = require("@actions/exec/lib/toolrunner");
const dockleHelper = __importStar(require("./dockleHelper"));
const fileHelper = __importStar(require("./fileHelper"));
const gitHubHelper = __importStar(require("./gitHubHelper"));
const inputHelper = __importStar(require("./inputHelper"));
const trivyHelper = __importStar(require("./trivyHelper"));
function getWhitelistFileLoc(whitelistFilePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const githubWorkspace = process.env['GITHUB_WORKSPACE'];
        const whitelistFileLoc = githubWorkspace + "/" + whitelistFilePath;
        if (!fs.existsSync(whitelistFileLoc)) {
            throw new Error("Could not find whitelist file. (Make sure that you use actions/checkout in your workflow)");
        }
        console.log("Whitelist file found at " + whitelistFileLoc);
        return whitelistFileLoc;
    });
}
function getTrivyEnvVariables() {
    return __awaiter(this, void 0, void 0, function* () {
        let trivyEnv = {};
        for (let key in process.env) {
            trivyEnv[key] = process.env[key] || "";
        }
        const githubToken = inputHelper.githubToken;
        trivyEnv["GITHUB_TOKEN"] = githubToken;
        const username = inputHelper.username;
        const password = inputHelper.password;
        if (username && password) {
            trivyEnv["TRIVY_USERNAME"] = username;
            trivyEnv["TRIVY_PASSWORD"] = password;
        }
        trivyEnv["TRIVY_EXIT_CODE"] = trivyHelper.TRIVY_EXIT_CODE.toString();
        trivyEnv["TRIVY_FORMAT"] = "json";
        trivyEnv["TRIVY_OUTPUT"] = fileHelper.getTrivyOutputPath();
        try {
            const whitelistFilePath = inputHelper.whitelistFilePath;
            if (whitelistFilePath) {
                const whitelistFileLoc = yield getWhitelistFileLoc(whitelistFilePath);
                trivyEnv["TRIVY_IGNOREFILE"] = whitelistFileLoc;
            }
        }
        catch (error) {
            throw new Error(util.format("Could not download whitelist file. Error: %s", error.message));
        }
        const severityThreshold = inputHelper.severityThreshold;
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
                    core.warning("Invalid severity-threshold. Showing all the vulnerabilities.");
                    trivyEnv["TRIVY_SEVERITY"] = "UNKNOWN,LOW,MEDIUM,HIGH,CRITICAL";
            }
        }
        return trivyEnv;
    });
}
function getDockleEnvVariables() {
    return __awaiter(this, void 0, void 0, function* () {
        let dockleEnv = {};
        for (let key in process.env) {
            dockleEnv[key] = process.env[key] || "";
        }
        const username = inputHelper.username;
        const password = inputHelper.password;
        if (username && password) {
            dockleEnv["DOCKLE_USERNAME"] = username;
            dockleEnv["DOCKLE_PASSWORD"] = password;
        }
        dockleEnv["DOCKLE_EXIT_CODE"] = "5";
        return dockleEnv;
    });
}
function runTrivy() {
    return __awaiter(this, void 0, void 0, function* () {
        const trivyPath = yield trivyHelper.getTrivy();
        console.log(util.format("Trivy executable found at path ", trivyPath));
        const trivyEnv = yield getTrivyEnvVariables();
        const imageName = inputHelper.imageName;
        const trivyOptions = {
            env: trivyEnv,
            ignoreReturnCode: true
        };
        const trivyToolRunner = new toolrunner_1.ToolRunner(trivyPath, [imageName], trivyOptions);
        const trivyStatus = yield trivyToolRunner.exec();
        return trivyStatus;
    });
}
function runDockle() {
    return __awaiter(this, void 0, void 0, function* () {
        const docklePath = yield dockleHelper.getDockle();
        const dockleEnv = yield getDockleEnvVariables();
        const imageName = inputHelper.imageName;
        const dockleOptions = {
            env: dockleEnv,
            ignoreReturnCode: true
        };
        let dockleArgs = [imageName, '-f', 'json', '-o', fileHelper.getDockleOutputPath(), '--exit-code', dockleHelper.DOCKLE_EXIT_CODE.toString()];
        const dockleToolRunner = new toolrunner_1.ToolRunner(docklePath, dockleArgs, dockleOptions);
        const dockleStatus = yield dockleToolRunner.exec();
        return dockleStatus;
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const trivyStatus = yield runTrivy();
        const addCISChecks = inputHelper.addCISChecks;
        let dockleStatus = -1;
        if (addCISChecks.toLowerCase() === "true") {
            dockleStatus = yield runDockle();
        }
        try {
            console.log("Creating check run...");
            yield gitHubHelper.createCheckRunWithScanResult(trivyStatus, dockleStatus);
            console.log("Check run created successfully...");
        }
        catch (error) {
            core.warning(`An error occured while creating the check run for container scan. Error: ${error}`);
        }
        if (trivyStatus == 0) {
            console.log("No vulnerabilities were detected in the container image");
        }
        else if (trivyStatus == trivyHelper.TRIVY_EXIT_CODE) {
            throw new Error("Vulnerabilities were detected in the container image");
        }
        else {
            throw new Error("An error occured while scanning the container image for vulnerabilities");
        }
    });
}
run().catch(error => core.setFailed(error.message));
