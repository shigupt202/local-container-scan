import * as core from '@actions/core'
import { getTrivy } from './trivyHelper'

async function run(): Promise<void> {
    try {
        const trivyPath = getTrivy();
        console.log("Trivy executable found at path ", trivyPath);
    } catch (error) {
        core.setFailed(error.message);
    }
}

run()