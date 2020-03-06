import * as core from '@actions/core'
import { ExecOptions } from '@actions/exec/lib/interfaces';
import { ToolRunner } from "@actions/exec/lib/toolrunner";
import { getTrivy } from './trivyHelper'

let trivyEnv: { [key: string]: string } = {};

function setEnvVariables() {
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

}

async function run(): Promise<void> {
    try {
        const trivyPath = getTrivy();
        console.log("Trivy executable found at path ", trivyPath);

        setEnvVariables();

        const imageName = core.getInput("imageName");
        const options: ExecOptions = {
            env: trivyEnv,
            ignoreReturnCode: true
        };

        const toolRunner = new ToolRunner(trivyPath, [imageName], options);
        const status = await toolRunner.exec();

        if (status == 0) {
            console.log("No vulnerabilities were detected in the container image");
        } else if (status == 1) {
            console.log("Vulnerabilities were detected in the container image");
            throw new Error("Vulnerabilities were detected in the container image");
        } else {
            throw new Error("An error occured while scanning the container image for vulnerabilities");
        }

    } catch (error) {
        core.setFailed(error.message);
    }
}

run();