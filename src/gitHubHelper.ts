import * as core from '@actions/core';
import * as fileHelper from './fileHelper';
import * as inputHelper from './inputHelper';
import * as trivyHelper from './trivyHelper';
import { WebRequest, WebResponse, sendRequest } from "./httpClient";

export async function createCheckRunWithScanResult(trivyStatus: number): Promise<void> {
    const checkRunUrl = `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/check-runs`;
    const gitHubToken = core.getInput("github-token");
    const pullRequestHeadSha = getPullRequestHeadSha();
    const checkConclusion = trivyStatus == 0 ? 'success' : 'failure';
    const checkSummary = getCheckSummary(trivyStatus);
    const checkText = getCheckText(trivyStatus);

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

function getCheckSummary(trivyStatus: number): string {
    let summary: string = `Container scan report for \`${inputHelper.imageName}\`:`;
    const trivySummary = trivyHelper.getOutputSummary(trivyStatus);
    summary = summary + '\n' + trivySummary;
    return summary;
}

function getCheckText(trivyStatus: number): string {
    let text: string = '';
    if(trivyStatus == trivyHelper.TRIVY_EXIT_CODE) {
        const trivyList = trivyHelper.getVulnerabilityIds();
        if(trivyList.length > 0) {
            text = text + trivyList.join('\n');
        }
    }

    return text;
}