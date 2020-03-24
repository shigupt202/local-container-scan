"use strict";
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
function getCheckRunPayloadWithScanResult(trivyStatus, dockleStatus) {
    const headSha = gitHubHelper.getHeadSha();
    const checkConclusion = getCheckConclusion(trivyStatus, dockleStatus);
    const checkSummary = getCheckSummary(trivyStatus, dockleStatus);
    const checkText = getCheckText(trivyStatus, dockleStatus);
    const checkRunPayload = {
        head_sha: headSha,
        name: inputHelper.imageName,
        status: "completed",
        conclusion: checkConclusion,
        output: {
            title: "Container scan result",
            summary: checkSummary,
            text: checkText
        }
    };
    return checkRunPayload;
}
exports.getCheckRunPayloadWithScanResult = getCheckRunPayloadWithScanResult;
function getCheckConclusion(trivyStatus, dockleStatus) {
    const checkConclusion = trivyStatus != 0 ? 'failure' : 'success';
    return checkConclusion;
}
function getCheckSummary(trivyStatus, dockleStatus) {
    const header = `Container scan report for \`${inputHelper.imageName}\`-`;
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
function getConfigForTable(col1_width, col2_width, col3_width, col4_width) {
    let config = {
        columns: {
            0: {
                width: col1_width,
                wrapWord: true
            },
            1: {
                width: col2_width,
                wrapWord: true
            },
            2: {
                width: col3_width,
                wrapWord: true
            },
            3: {
                width: col4_width,
                wrapWord: true
            }
        }
    };
    return config;
}
exports.getConfigForTable = getConfigForTable;
