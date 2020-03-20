import * as core from '@actions/core';

export const imageName = core.getInput("image-name");
export const username = core.getInput("username");
export const password = core.getInput("password");
export const severityThreshold = core.getInput("severity-threshold");
export const addCISChecks = core.getInput("add-CIS-checks");