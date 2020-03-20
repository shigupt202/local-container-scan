import * as core from '@actions/core';
import * as dockleHelper from './dockleHelper';
import * as fileHelper from './fileHelper';
import * as inputHelper from './inputHelper';
import * as trivyHelper from './trivyHelper';
import { WebRequest, WebResponse, sendRequest } from "./httpClient";

export async function createCheckRunWithScanResult(trivyStatus: number, dockleStatus: number): Promise<void> {
    const checkRunUrl = `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/check-runs`;
    const gitHubToken = core.getInput("github-token");
    const pullRequestHeadSha = getPullRequestHeadSha();
    const checkConclusion = trivyStatus == 0 ? 'success' : 'failure';
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
    }

    core.debug(`Creating check run with scan result against head_sha: ${pullRequestHeadSha}...`);
    // const result: any = await fetch(checkRunUrl, {
    //     method: 'POST',
    //     body: JSON.stringify(checkRunPayload),
    //     headers: {
    //         Authorization: `Bearer ${gitHubToken}`,
    //         Accept: 'application/vnd.github.antiope-preview+json'
    //     }
    // })

    let webRequest = new WebRequest();
    webRequest.method = "POST";
    webRequest.uri = checkRunUrl;
    webRequest.body = JSON.stringify(checkRunPayload);
    webRequest.headers = {        
            Authorization: `Bearer ${gitHubToken}`,
            Accept: 'application/vnd.github.antiope-preview+json'
    };

    const response: WebResponse = await sendRequest(webRequest);
    if (response.statusCode != 201) {
        throw Error(`Statuscode: ${response.statusCode}, StatusMessage: ${response.statusMessage}, Url: ${checkRunUrl}, head_sha: ${pullRequestHeadSha}`);
    }

    console.log(`Created check run with container scan results.\nId: ${response.body['id']}, Url: ${response.body['html_url']}`)
}

function getPullRequestHeadSha(): string {
    const eventJson = getEventJson();
    return eventJson["pull_request"]["head"]["sha"];
}

function getEventJson(): any {
    const eventPath = process.env['GITHUB_EVENT_PATH'];
    let eventJson: any;
    if(eventPath) {
        eventJson = fileHelper.getFileJson(eventPath);
        core.debug(`Event json: ${eventJson}`);
    }
    
    return eventJson;
}

function getCheckSummary(trivyStatus: number, dockleStatus: number): string {
    const header: string = `Container scan report for \`${inputHelper.imageName}\`:`;
    const trivySummary = trivyHelper.getOutputSummary(trivyStatus);
    const dockleSummary = dockleHelper.getOutputSummary(dockleStatus);
    const summary = `${header}\n\n${trivySummary}\n\n${dockleSummary}`;
    return summary;
}

function getCheckText(trivyStatus: number, dockleStatus: number): string {
    const separator = '---';    
    const trivyText = trivyHelper.getVulnerabilityText(trivyStatus);
    const dockleText = dockleHelper.getCisText(dockleStatus);
    const text = `${trivyText}\n${separator}\n${dockleText}`;

    return text;
}