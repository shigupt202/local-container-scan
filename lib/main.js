"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const toolrunner_1 = require("@actions/exec/lib/toolrunner");
const trivyHelper_1 = require("./trivyHelper");
let trivyEnv = {};
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
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const trivyPath = yield trivyHelper_1.getTrivy();
            console.log("Trivy executable found at path ", trivyPath);
            setEnvVariables();
            const imageName = core.getInput("imageName");
            const options = {
                env: trivyEnv,
                ignoreReturnCode: true
            };
            const toolRunner = new toolrunner_1.ToolRunner(trivyPath, [imageName], options);
            const status = yield toolRunner.exec();
            if (status == 0) {
                console.log("No vulnerabilities were detected in the container image");
            }
            else if (status == 1) {
                console.log("Vulnerabilities were detected in the container image");
                throw new Error("Vulnerabilities were detected in the container image");
            }
            else {
                throw new Error("An error occured while scanning the container image for vulnerabilities");
            }
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
