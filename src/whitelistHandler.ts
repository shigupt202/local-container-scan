import * as fs from 'fs';
import * as jsyaml from 'js-yaml';

let trivyWhitelistPath = "";
let dockleWhitelistPath = "";
export let trivyWhitelistExists = false;
export let dockleWhitelistExists = false;

export function getTrivyWhitelist(): string {
    if (trivyWhitelistExists)
        return trivyWhitelistPath;
    else
        throw new Error("Could not find whitelist file for common vulnerabilities");
}

export function getDockleWhitelist(): string {
    if (dockleWhitelistExists)
        return dockleWhitelistPath;
    else
        throw new Error("Could not find whitelist file for best practice vulnerabilities");
}

function initializeWhitelistPaths() {
    let curDate = Date.now();
    trivyWhitelistPath = `${process.env['GITHUB_WORKSPACE']}/containerscan_${curDate}/trivy/whitelist`;
    dockleWhitelistPath = `${process.env['GITHUB_WORKSPACE']}/containerscan_${curDate}/dockle/whitelist`;
}

export function init() {
    console.log("in init");
    initializeWhitelistPaths();
    const whitelistFilePath = `${process.env['GITHUB_WORKSPACE']}/.github/containerscan/whitelist`;
    if (!fs.existsSync(whitelistFilePath)) {
        console.log("Could not find whitelist file.");
        return;
    }
    var whitelist_yaml = jsyaml.safeLoad(fs.readFileSync(whitelistFilePath, 'utf8'));
    if (whitelist_yaml.general) {
        if (whitelist_yaml.general.common_vulnerabilities) {
            trivyWhitelistExists = true;
            let vulnArray: string[] = whitelist_yaml.general.common_vulnerabilities;
            let trivyWhitelistContent = "";
            vulnArray.forEach(vuln => {
                trivyWhitelistContent += vuln;
                trivyWhitelistContent += "\n";
            });
            console.log(trivyWhitelistContent);
            fs.writeFileSync(trivyWhitelistPath, trivyWhitelistContent);
        }
        if (whitelist_yaml.general.best_practice_vulnerabilities) {
            dockleWhitelistExists = true;
            let vulnArray: string[] = whitelist_yaml.general.best_practice_vulnerabilities;
            let dockleWhitelistContent = "";
            vulnArray.forEach(vuln => {
                dockleWhitelistContent += vuln;
                dockleWhitelistContent += "\n";
            });
            console.log(dockleWhitelistContent);
            fs.writeFileSync(trivyWhitelistPath, dockleWhitelistContent);
        }
    }

}