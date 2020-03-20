import * as fs from 'fs'

let containerScanDirectory = '';

export function getFileJson(path: string): any {
    try {
        const rawContent = fs.readFileSync(path, 'utf-8');
        const json = JSON.parse(rawContent);
        return json;
    } catch(ex) {
        throw new Error(`An error occured while parsing the contents of the file: ${path}. Error: ${ex}`);
    }
}

export function getContainerScanDirectory(): string {
    if(!containerScanDirectory) {
        containerScanDirectory = `${process.env['GITHUB_WORKSPACE']}/_temp/containerscan_${Date.now()}`;
        ensureDirExists(containerScanDirectory);
    }

    return containerScanDirectory;
}

export function getTrivyOutputPath(): string {
    const trivyOutputPath = `${getContainerScanDirectory()}/trivyoutput.json`;
    ensureFileExists(trivyOutputPath);
    return trivyOutputPath;
}

export function getDockleOutputPath(): string {
    const dockleOutputPath = `${getContainerScanDirectory()}/dockleoutput.json`;
    ensureFileExists(dockleOutputPath);
    return dockleOutputPath;
}

function ensureDirExists(dir: string) {
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
}

function ensureFileExists(path: string) {
    if(!fs.existsSync(path)) {
        fs.writeFileSync(path, '{}');
    }
}