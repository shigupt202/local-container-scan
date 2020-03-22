import * as fs from 'fs';
import * as jsyaml from 'js-yaml';

let trivyWhitelistPath = "";
let dockleWhitelistPath = "";
export let trivyWhitelistExists = false;

export function getTrivyWhitelist(): string {
    if (trivyWhitelistExists)
        return trivyWhitelistPath;
    else
        throw new Error("Could not find whitelist file for common vulnerabilities");
}

function initializeTrivyWhitelistPath() {
    let curDate = Date.now();
    let trivyWhitelistDir = `${process.env['GITHUB_WORKSPACE']}/containerscan_${curDate}/trivy`;
    fs.mkdirSync(trivyWhitelistDir, { recursive: true });
    trivyWhitelistPath = trivyWhitelistDir + "/.trivyignore";
}

function initializeDockleWhitelistPath() {
    //Dockle expects .dockleignore file at the root of the repo 
    dockleWhitelistPath = `${process.env['GITHUB_WORKSPACE']}/.dockleignore`;
}

export function init() {
    const whitelistFilePath = `${process.env['GITHUB_WORKSPACE']}/.github/containerscan/whitelist.yaml`;
    if (!fs.existsSync(whitelistFilePath)) {
        console.log("Could not find whitelist file.");
        return;
    }

    initializeTrivyWhitelistPath();
    initializeDockleWhitelistPath();

    try {
        const whitelistYaml = jsyaml.safeLoad(fs.readFileSync(whitelistFilePath, 'utf8'));
        if (whitelistYaml.general) {
            if (whitelistYaml.general.commonVulnerabilities) {
                trivyWhitelistExists = true;
                const vulnArray: string[] = whitelistYaml.general.commonVulnerabilities;
                let trivyWhitelistContent = "";
                vulnArray.forEach(vuln => {
                    trivyWhitelistContent += vuln;
                    trivyWhitelistContent += "\n";
                });
                fs.writeFileSync(trivyWhitelistPath, trivyWhitelistContent);
            }
            if (whitelistYaml.general.bestPracticeVulnerabilities) {
                const vulnArray: string[] = whitelistYaml.general.bestPracticeVulnerabilities;
                let dockleWhitelistContent = "";
                vulnArray.forEach(vuln => {
                    dockleWhitelistContent += vuln;
                    dockleWhitelistContent += "\n";
                });
                fs.writeFileSync(dockleWhitelistPath, dockleWhitelistContent);
            }
        }
    } catch (error) {
        throw new Error("Error while parsing whitelist file. Error: " + error);
    }
}