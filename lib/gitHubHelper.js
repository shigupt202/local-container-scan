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
const dockleHelper = __importStar(require("./dockleHelper"));
const fileHelper = __importStar(require("./fileHelper"));
const inputHelper = __importStar(require("./inputHelper"));
const trivyHelper = __importStar(require("./trivyHelper"));
const httpClient_1 = require("./httpClient");
function createCheckRunWithScanResult(trivyStatus, dockleStatus) {
    return __awaiter(this, void 0, void 0, function* () {
        const checkRunUrl = `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/check-runs`;
        const gitHubToken = core.getInput("github-token");
        const pullRequestHeadSha = getPullRequestHeadSha();
        const checkConclusion = getCheckConclusion(trivyStatus, dockleStatus);
        const checkSummary = getCheckSummary(trivyStatus, dockleStatus);
        const checkText = getCheckText(trivyStatus, dockleStatus);
        const checkRunPayload = {
            head_sha: pullRequestHeadSha,
            name: inputHelper.imageName,
            status: "completed",
            conclusion: checkConclusion,
            output: {
                title: "Container scan result",
                summary: checkSummary,
                text: checkText
            }
        };
        core.debug(`Creating check run with scan result against head_sha: ${pullRequestHeadSha}...`);
        let webRequest = new httpClient_1.WebRequest();
        webRequest.method = "POST";
        webRequest.uri = checkRunUrl;
        webRequest.body = JSON.stringify(checkRunPayload);
        webRequest.headers = {
            Authorization: `Bearer ${gitHubToken}`,
            Accept: 'application/vnd.github.antiope-preview+json'
        };
        const response = yield httpClient_1.sendRequest(webRequest);
        if (response.statusCode != 201) {
            throw Error(`Statuscode: ${response.statusCode}, StatusMessage: ${response.statusMessage}, Url: ${checkRunUrl}, head_sha: ${pullRequestHeadSha}`);
        }
        console.log(`Created check run with container scan results.\nId: ${response.body['id']}, Url: ${response.body['html_url']}`);
    });
}
exports.createCheckRunWithScanResult = createCheckRunWithScanResult;
function getCheckConclusion(trivyStatus, dockleStatus) {
    let checkConclusion;
    if (trivyStatus != 0 || (dockleHelper.isCisChecksEnabled() && dockleStatus != 0)) {
        checkConclusion = 'failure';
    }
    else {
        checkConclusion = 'success';
    }
    return checkConclusion;
}
function getPullRequestHeadSha() {
    const eventJson = getEventJson();
    return eventJson["pull_request"]["head"]["sha"];
}
function getEventJson() {
    const eventPath = process.env['GITHUB_EVENT_PATH'];
    let eventJson;
    if (eventPath) {
        eventJson = fileHelper.getFileJson(eventPath);
        core.debug(`Event json: ${eventJson}`);
    }
    return eventJson;
}
function getCheckSummary(trivyStatus, dockleStatus) {
    const header = `Container scan report for \`${inputHelper.imageName}\`-`;
    const trivySummary = trivyHelper.getSummary(trivyStatus);
    let summary = `${header}\n\n${trivySummary}`;
    if (dockleHelper.isCisChecksEnabled()) {
        const dockleSummary = dockleHelper.getSummary(dockleStatus);
        summary = `${summary}\n\n${dockleSummary}`;
    }
    return summary;
}
function getCheckText(trivyStatus, dockleStatus) {
    const separator = '___';
    const trivyText = trivyHelper.getText(trivyStatus);
    let text = trivyText;
    if (dockleHelper.isCisChecksEnabled()) {
        const dockleText = dockleHelper.getText(dockleStatus);
        text = `${text}\n${separator}\n${dockleText}`;
    }
    return text;
}
