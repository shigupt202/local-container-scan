"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PIPE = '|';
function getTableHeader(titles) {
    const titleCount = titles.length;
    const dashesArray = new Array(titleCount).fill('---');
    return `${titles.join(PIPE)}\n${dashesArray.join(PIPE)}`;
}
exports.getTableHeader = getTableHeader;
function getTableRow(values, bold) {
    const processedValues = values.map(v => getProcessedValue(v, bold));
    return `${processedValues.join(PIPE)}`;
}
exports.getTableRow = getTableRow;
function getProcessedValue(value, bold) {
    return bold ? `**${value}**` : value;
}
