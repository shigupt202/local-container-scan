import * as fs from 'fs';
import * as jsyaml from 'js-yaml';

let trivyWhitelistExists = false;
let dockleWhitelistExists = false;
// let trivyWhitelistPath;
// let dockleWhitelistPath;

// function getTrivyWhitelist(): string {
//     if (trivyWhitelistExists)
//         return trivyWhitelistPath;
//     else
//         throw new Error("Could not find whitelist file for common vulnerabilities");
// }

// function getDockleWhitelist() {
//     if (dockleWhitelistExists)
//         return dockleWhitelistPath;
//     else
//         throw new Error("Could not find whitelist file for best practice vulnerabilities");
// }

export function init() {
    const whitelistFilePath = `${process.env['GITHUB_WORKSPACE']}/.github/containerscan/whitelist}`;
    if (!fs.existsSync(whitelistFilePath)) {
        console.log("Could not find whitelist file.");
        return;
    }
    var whitelist_yaml = jsyaml.safeLoad(fs.readFileSync(whitelistFilePath, 'utf8'));
    if (whitelist_yaml.general) {
        if (whitelist_yaml.general.common_vulnerabilities) {
            trivyWhitelistExists = true;
            console.log(whitelist_yaml.general.common_vulnerabilities);
        }
        if (whitelist_yaml.general.best_practice_vulnerabilities) {
            dockleWhitelistExists = true;
            console.log(whitelist_yaml.best_practice_vulnerabilities);
        }
    }

}