import * as core from '@actions/core';
import * as fs from 'fs';
import * as util from 'util';
import { ExecOptions } from '@actions/exec/lib/interfaces';
import { ToolRunner } from '@actions/exec/lib/toolrunner';
import { getTrivy } from './trivyHelper';
import { getDockle } from './dockleHelper';
import * as inputHelper from './inputHelper';
import * as whitelistHandler from './whitelistHandler';

async function getTrivyEnvVariables(): Promise<{ [key: string]: string }> {
    let trivyEnv: { [key: string]: string } = {};
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

    trivyEnv["TRIVY_EXIT_CODE"] = "5";

    // if(whitelistHandler.trivyWhitelistExists)
    //     trivyEnv["TRIVY_IGNOREFILE"] = whitelistHandler.getTrivyWhitelist();

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
}

async function setDockleEnvVariables(): Promise<{ [key: string]: string }> {
    let dockleEnv: { [key: string]: string } = {};
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
}

async function runTrivy(): Promise<number> {
    whitelistHandler.init();
    const trivyPath = await getTrivy();
    console.log(util.format("Trivy executable found at path ", trivyPath));
    const trivyEnv = await getTrivyEnvVariables();

    const imageName = inputHelper.imageName;
    const trivyOptions: ExecOptions = {
        env: trivyEnv,
        ignoreReturnCode: true
    };

    const trivyToolRunner = new ToolRunner(trivyPath, [imageName], trivyOptions);
    const trivyStatus = await trivyToolRunner.exec();
    return trivyStatus;
}

async function runDockle(): Promise<void> {
    const docklePath = await getDockle();
    const dockleEnv = await setDockleEnvVariables();
    const imageName = inputHelper.imageName;

    const dockleOptions: ExecOptions = {
        env: dockleEnv,
        ignoreReturnCode: true
    };

    const dockleToolRunner = new ToolRunner(docklePath, [imageName], dockleOptions);
    await dockleToolRunner.exec();
}

async function run(): Promise<void> {
    const trivyStatus = await runTrivy();
    const addCISChecks = inputHelper.addCISChecks;
    if (addCISChecks.toLowerCase() === "true") {
        await runDockle();
    }

    if (trivyStatus == 0) {
        console.log("No vulnerabilities were detected in the container image");
    } else if (trivyStatus == 5) {
        throw new Error("Vulnerabilities were detected in the container image");
    } else {
        throw new Error("An error occured while scanning the container image for vulnerabilities");
    }
}

run().catch(error => core.setFailed(error.message));