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
const dockleHelper = __importStar(require("./dockleHelper"));
const gitHubHelper = __importStar(require("./gitHubHelper"));
const inputHelper = __importStar(require("./inputHelper"));
const trivyHelper = __importStar(require("./trivyHelper"));
const httpClient_1 = require("./httpClient");
function getCheckRunPayloadWithScanResult(trivyStatus, dockleStatus) {
    const headSha = gitHubHelper.getHeadSha();
    const checkConclusion = getCheckConclusion(trivyStatus, dockleStatus);
    const checkSummary = getCheckSummary(trivyStatus, dockleStatus);
    const checkText = getCheckText(trivyStatus, dockleStatus);
    const checkRunPayload = {
        head_sha: headSha,
        name: `[container-scan] ${inputHelper.imageName}`,
        status: "completed",
        conclusion: checkConclusion,
        output: {
            title: "Container scan result",
            summary: checkSummary,
            text: checkText
        },
        actions: [
            {
                label: "Update whitelist",
                description: "Update whitelist in PR",
                identifier: "update_whitelist"
            }
        ]
    };
    return checkRunPayload;
}
exports.getCheckRunPayloadWithScanResult = getCheckRunPayloadWithScanResult;
function createCheckRunThroughProxy(checkRunPayload) {
    return __awaiter(this, void 0, void 0, function* () {
        const checkRunProxyUrl = `http://20.44.40.168/app_proxy/check-run`;
        const githubToken = inputHelper.githubToken;
        const proxyPayload = {
            checkRunPayload: checkRunPayload,
            repository: process.env['GITHUB_REPOSITORY']
        };
        const webRequest = new httpClient_1.WebRequest();
        webRequest.method = "POST";
        webRequest.uri = checkRunProxyUrl;
        webRequest.body = JSON.stringify(proxyPayload);
        webRequest.headers = {
            Authorization: `Bearer ${githubToken}`
        };
        console.log("Creating check run. Check run url: ", checkRunProxyUrl);
        console.log("Check run payload: ", proxyPayload);
        const response = yield httpClient_1.sendRequest(webRequest);
        if (response.statusCode != httpClient_1.StatusCodes.OK) {
            throw Error(`Statuscode: ${response.statusCode}, StatusMessage: ${response.statusMessage}, Url: ${checkRunProxyUrl}, head_sha: ${checkRunPayload['head_sha']}`);
        }
        console.log('Check run created');
    });
}
exports.createCheckRunThroughProxy = createCheckRunThroughProxy;
function getCheckConclusion(trivyStatus, dockleStatus) {
    const checkConclusion = trivyStatus != 0 ? 'failure' : 'success';
    return checkConclusion;
}
function getCheckSummary(trivyStatus, dockleStatus) {
    const header = `Scanned image \`${inputHelper.imageName}\`.\nSummary:`;
    const trivySummary = trivyHelper.getSummary(trivyStatus);
    let summary = `${header}\n\n${trivySummary}`;
    if (inputHelper.isCisChecksEnabled()) {
        const dockleSummary = dockleHelper.getSummary(dockleStatus);
        summary = `${summary}\n\n${dockleSummary}`;
    }
    return summary;
}
function getCheckText(trivyStatus, dockleStatus) {
    const separator = '___';
    const trivyText = trivyHelper.getText(trivyStatus);
    let text = trivyText;
    if (inputHelper.isCisChecksEnabled()) {
        const dockleText = dockleHelper.getText(dockleStatus);
        text = `${text}\n${separator}\n${dockleText}`;
    }
    return text;
}
function getConfigForTable(widths) {
    let config = {
        columns: {
            0: {
                width: widths[0],
                wrapWord: true
            },
            1: {
                width: widths[1],
                wrapWord: true
            },
            2: {
                width: widths[2],
                wrapWord: true
            },
            3: {
                width: widths[3],
                wrapWord: true
            }
        }
    };
    return config;
}
exports.getConfigForTable = getConfigForTable;
