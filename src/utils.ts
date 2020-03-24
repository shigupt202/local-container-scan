import * as dockleHelper from './dockleHelper';
import * as gitHubHelper from './gitHubHelper';
import * as inputHelper from './inputHelper';
import * as trivyHelper from './trivyHelper';

export function getCheckRunPayloadWithScanResult(trivyStatus: number, dockleStatus: number): any {
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
    }

    return checkRunPayload;
}

function getCheckConclusion(trivyStatus: number, dockleStatus: number): string {
    const checkConclusion = trivyStatus != 0 ? 'failure' : 'success';
    return checkConclusion;
}

function getCheckSummary(trivyStatus: number, dockleStatus: number): string {
    const header: string = `Container scan report for \`${inputHelper.imageName}\`-`;
    const trivySummary = trivyHelper.getSummary(trivyStatus);
    let summary = `${header}\n\n${trivySummary}`;

    if (inputHelper.isCisChecksEnabled()) {
        const dockleSummary = dockleHelper.getSummary(dockleStatus);
        summary = `${summary}\n\n${dockleSummary}`;
    }

    return summary;
}

function getCheckText(trivyStatus: number, dockleStatus: number): string {
    const separator = '___';
    const trivyText = trivyHelper.getText(trivyStatus);
    let text = trivyText;

    if (inputHelper.isCisChecksEnabled()) {
        const dockleText = dockleHelper.getText(dockleStatus);
        text = `${text}\n${separator}\n${dockleText}`;
    }

    return text;
}

export function getConfigForTable(col1_width: number, col2_width: number, col3_width: number, col4_width: number): any {
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