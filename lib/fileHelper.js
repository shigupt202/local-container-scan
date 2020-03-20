"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
let containerScanDirectory = '';
function getFileJson(path) {
    try {
        const rawContent = fs.readFileSync(path, 'utf-8');
//         console.log("rawContent: ", rawContent);
        const json = JSON.parse(rawContent);
        return json;
    }
    catch (ex) {
        throw new Error(`An error occured while parsing the contents of the file: ${path}. Error: ${ex}`);
    }
}
exports.getFileJson = getFileJson;
function getContainerScanDirectory() {
    if (!containerScanDirectory) {
        containerScanDirectory = `${process.env['GITHUB_WORKSPACE']}/_temp/containerscan_${Date.now()}`;
        ensureDirExists(containerScanDirectory);
    }
    return containerScanDirectory;
}
exports.getContainerScanDirectory = getContainerScanDirectory;
function getTrivyOutputPath() {
    const trivyOutputPath = `${getContainerScanDirectory()}/trivyoutput.json`;
    ensureFileExists(trivyOutputPath);
    return trivyOutputPath;
}
exports.getTrivyOutputPath = getTrivyOutputPath;
function getDockleOutputPath() {
    const dockleOutputPath = `${getContainerScanDirectory()}/dockleoutput.json`;
    ensureFileExists(dockleOutputPath);
    return dockleOutputPath;
}
exports.getDockleOutputPath = getDockleOutputPath;
function ensureDirExists(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}
function ensureFileExists(path) {
    if (!fs.existsSync(path)) {
        fs.writeFileSync(path, '{}');
    }
}
